# AarogyaNetra

AarogyaNetra is an advanced AI-assistive retinal screening tool designed for the Smart India Hackathon 2026. It provides a hierarchical, multi-stage Deep Learning pipeline to detect and classify Diabetic Retinopathy (DR) from retinal fundus images, coupled with a robust Explainable AI (XAI) and Large Language Model (LLM) explanation system to assist clinical decision-making.

## ✨ Key Features

### 🧠 Advanced AI Inference Pipeline
* **Hierarchical DR Screening:** 
  * **Stage 1:** Binary screening (No DR vs. DR Detected) using an optimized `EfficientNet-B0` architecture with boundary validation (0 vs 1+).
  * **Stage 2:** Fine-grained Severity Classification (Grades 1 through 4) using localized boundary-aware models (M12, M23, M34).
* **Decision Fusion Logic:** Implements both Weighted Probability Fusion and LogOdds Fusion for robust probability calibration.
* **Dual-Engine Image Quality Assessment (IQA):** Validates fundus images before inference. Uses a primary compiled MATLAB engine for exact metrics, with a seamless fallback to a Python/OpenCV implementation if MATLAB is unavailable.

### 🔍 Explainable AI (XAI)
* **Grad-CAM Heatmaps:** Generates visual attention maps highlighting the precise regions the deep learning models focused on, aiding clinical trust and model transparency.
* **LLM Clinical Explanations:** Integrates with the Groq API (Qwen model) to provide grounded, easy-to-understand clinical explanations of the AI findings using Retrieval-Augmented Generation (RAG).

### 🌐 Accessibility & Internationalization
* **Multi-Lingual Support:** Full user interface and clinical report translation in English, Hindi, Punjabi, Bengali, Tamil, Telugu, and Marathi.
* **Text-to-Speech (TTS):** Audio playback of screening results to enhance accessibility.

### 🏥 Clinical Workflow Integration
* **Doctor Validation Panel:** Allows ophthalmologists to review the AI's findings and submit verified clinical feedback.
* **Comprehensive PDF Reports:** One-click PDF generation of screening reports containing patient details, Grad-CAM overlays, and LLM explanations for physical record-keeping.

### 🚀 Architecture & Deployment
* **Backend:** FastAPI (Python) with high-performance asynchronous endpoints and integrated SQLite/MongoDB data layers.
* **Frontend:** Modern, responsive React application built with Vite and Tailwind-style modular CSS.
* **Dockerized:** Fully containerized using `docker-compose` for seamless, environment-agnostic deployment on AWS EC2 or local setups. Persistent volume mounts ensure data and image retention across updates.

## 🛠️ Technology Stack
* **Frontend:** React, Vite, Framer Motion, Lucide-React
* **Backend:** FastAPI, Uvicorn, PyTorch, Timm (EfficientNet), OpenCV
* **Database:** SQLite (Patient Records) & MongoDB (Clinical Feedback)
* **AI/ML:** PyTorch, Groq API (LLM)
* **Infra:** Docker, Nginx, AWS EC2

## 🚀 Getting Started

### Prerequisites
* Docker and Docker Compose installed.
* API key for Groq (for LLM generation).

### Installation (Local)
1. Clone the repository.
2. Create a `.env` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_key_here
   GROQ_MODEL=qwen/qwen3.8-27b
   IQA_ENGINE=matlab
   ```
3. Run `docker-compose up --build -d`
4. Access the frontend at `http://localhost` and the API docs at `http://localhost:8000/docs`.
