import os
import json
from pathlib import Path
from typing import Dict, Any, Tuple

try:
    from groq import Groq
except ImportError:
    Groq = None

from dotenv import load_dotenv
load_dotenv()

class LLMExplainer:
    def __init__(self, kb_path: str = "src/knowledge_base.json"):
        self.api_key = os.environ.get("GROQ_API_KEY")
        self.model_name = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b")
        
        self.client = Groq(api_key=self.api_key) if self.api_key and Groq else None
        self.kb_path = Path(kb_path)
        
        if self.kb_path.exists():
            with open(self.kb_path, 'r', encoding='utf-8') as f:
                self.kb = json.load(f)
        else:
            self.kb = {}

    def is_available(self) -> bool:
        return self.client is not None and bool(self.kb)

    def _extract_grade_number(self, final_grade_str: str) -> str:
        # e.g., "Grade 1" -> "1"
        for char in final_grade_str:
            if char.isdigit():
                return char
        return ""

    def _validate_explanation(self, explanation_text: str, ml_grade_num: str, target_language: str = "English") -> bool:
        """
        Validates the LLM output to ensure it doesn't hallucinate unsupported claims.
        """
        if target_language != "English":
            # Heuristic checks are English-specific; skip for localized generation
            return True
            
        text_lower = explanation_text.lower()
        
        # 1. Disclaimer check:
        if "not a definitive diagnosis" not in text_lower and "screening assessment" not in text_lower and "ai screening result" not in text_lower:
            return False
            
        # 2. Heatmap hallucination check (negative):
        if "heatmap shows hemorrhages" in text_lower or "heatmap shows microaneurysms" in text_lower:
            return False

        return True

    def generate_explanation(self, inference_result: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_available():
            return {
                "generated": False,
                "error": "Groq API key missing or Knowledge Base not found."
            }
            
        final_grade_str = inference_result.get("Final_Grade", "")
        if not final_grade_str or "UNGRADABLE" in final_grade_str.upper():
            return {
                "generated": False,
                "error": "Image is ungradable. No explanation generated."
            }
            
        grade_num = self._extract_grade_number(final_grade_str)
        if grade_num not in self.kb.get("grades", {}):
            return {
                "generated": False,
                "error": f"Grade {grade_num} not found in Knowledge Base."
            }

        # Retrieve knowledge
        kb_entry = self.kb["grades"][grade_num]
        kb_metadata = self.kb.get("metadata", {})
        kb_version = self.kb.get("knowledge_base_version", "unknown")
        
        # Map language code to full language name
        lang_code = inference_result.get("language", "en")
        lang_map = {
            "en": "English",
            "hi": "Hindi",
            "pa": "Punjabi",
            "bn": "Bengali",
            "ta": "Tamil",
            "te": "Telugu",
            "mr": "Marathi"
        }
        target_language = lang_map.get(lang_code, "English")

        # Extract model matrix (probabilities) for the prompt
        stage1_probs = inference_result.get('Stage1', {})
        stage2_probs = inference_result.get('Stage2', {})
        
        prob_matrix = f"Stage 1 (DR Detection Probability): {stage1_probs.get('Fused_DR_Prob', 'N/A')}\n"
        if 'Fused_Probs' in stage2_probs:
            prob_matrix += f"Stage 2 (Severity Grading Probabilities): {stage2_probs['Fused_Probs']}\n"

        # Construct strict system prompt
        system_prompt = f"""You are a highly professional medical AI explanation assistant for AarogyaNetra.
Your task is to translate the following structured Diabetic Retinopathy screening result into a clear, empathetic, and professional explanation for the patient or health worker.

CRITICAL RULES:
1. You MUST state clearly that this is an AI screening result and NOT a definitive diagnosis.
2. Tell the user WHY the AI made this decision. Reference the provided 'Model Confidence Matrix' to personalize the explanation and explain the AI's confidence levels for its decision.
3. DO NOT invent or claim the presence of specific lesions (e.g. hemorrhages, exudates). Speak generally about patterns associated with the predicted grade.
4. The XAI/Grad-CAM heatmap is an attribution visualization only. You may ONLY say: "The heatmap highlights regions that contributed to the model's prediction. The visualization does not independently establish the presence of a specific retinal lesion."
5. Incorporate the following clinical knowledge seamlessly without altering the core medical advice:
   - Definition: {kb_entry['definition']}
   - Screening Guidance: {kb_entry['screening_guidance']}
6. IMPORTANT: You MUST output the entire explanation strictly in {target_language}. Do not use English unless the requested language is English.

Output ONLY the explanation text. Maintain a professional, reassuring, and clear tone. Do not include any pleasantries or introductory phrases.
"""

        user_prompt = f"""Structured Result:
- Final Grade: {final_grade_str} ({kb_entry['name']})
- Stage 1 Status: {inference_result.get('Stage1', {}).get('Status')}
- XAI Available: {'Yes' if 'xai' in inference_result else 'No'}

Model Confidence Matrix:
{prob_matrix}

Please generate the personalized explanation."""

        # Non-English scripts (Hindi, Tamil, Telugu, etc.) are token-dense:
        # 256 tokens cuts off mid-sentence. Scale up for all non-English targets.
        max_tok = 256 if target_language == "English" else 512

        try:
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=self.model_name,
                temperature=0.1, # Keep it deterministic and strict
                max_tokens=max_tok
            )
            
            explanation_text = response.choices[0].message.content.strip()
            
            # Grounding Validation
            if not self._validate_explanation(explanation_text, grade_num, target_language):
                # Fallback to a safe deterministic string if LLM hallucinates
                explanation_text = (
                    f"The AI screening system identified findings consistent with Grade {grade_num} "
                    f"({kb_entry['name']}). This is a screening assessment and not a definitive diagnosis. "
                    f"Professional evaluation is recommended. The heatmap highlights regions that contributed "
                    f"to the model's prediction. The visualization does not independently establish the presence of a specific retinal lesion. "
                    f"Guidance: {kb_entry['screening_guidance']}"
                )

            return {
                "generated": True,
                "model": self.model_name,
                "knowledge_base_version": kb_version,
                "sources": [kb_metadata.get("source", "Unknown Source")],
                "text": explanation_text
            }
            
        except Exception as e:
            return {
                "generated": False,
                "error": f"LLM Generation failed: {str(e)}"
            }
