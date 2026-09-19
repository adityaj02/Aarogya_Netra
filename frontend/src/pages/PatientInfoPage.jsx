import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  Eye,
  Heart,
  Lock,
  ShieldCheck,
  User,
  Activity,
  Check,
  Phone,
} from "lucide-react";

/* =========================================================
   MAIN PAGE
========================================================= */

import { useLanguage } from '../context/LanguageContext';
import Stepper from '../components/Stepper';

const PatientInfoPage = ({ initialData, onContinue, onBack }) => {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: initialData?.name || "",
    dob: initialData?.dob || "",
    gender: initialData?.gender || "",
    diabetesDuration: initialData?.diabetesDuration || "",
    mobile: initialData?.mobile || "",
  });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 && age <= 125 ? age : null;
  };

  const age = calculateAge(form.dob);

  const handleContinue = () => {
    if (!form.name || !form.dob || !form.gender || !form.diabetesDuration) {
      alert("Please complete all required fields.");
      return;
    }
    onContinue({
      name: form.name,
      dob: form.dob,
      age: age !== null ? String(age) : "",
      gender: form.gender,
      diabetesDuration: form.diabetesDuration,
      mobile: form.mobile,
    });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ backgroundColor: "#ebf5fc", fontFamily: "'Inter', sans-serif", color: "#1e293b" }}>

      {/* ── Background ── */}
      <Background />

      {/* ── Main 3-Column Layout ── */}
      <main className="relative z-10 w-full mx-auto px-6 lg:px-12 py-8 flex-1 flex flex-col justify-center min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-[1680px] mx-auto w-full">

          {/* ── LEFT PANEL ── */}
          <LeftPanel />

          {/* ── CENTER FORM CARD ── */}
          <section className="lg:col-span-6 w-full max-w-[620px] mx-auto" data-purpose="form-main-card">
            <div style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255,255,255,0.95)",
              boxShadow: "0 20px 45px -15px rgba(28,95,160,0.14), 0 0 0 1px rgba(190,215,240,0.45)",
              borderRadius: "24px",
              padding: "36px",
            }}>

              {/* Card Header */}
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.025em", margin: 0 }}>
                  {t("patientInfoTitle", "Patient Information")}
                </h2>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px", fontWeight: 400 }}>
                  {t("patientInfoSubtitle", "Please enter basic details required for the screening record.")}
                </p>
              </div>

              {/* ── Stepper ── */}
              <Stepper currentStep={1} />

              {/* ── Form Fields ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Full Name */}
                <FieldWrapper label={t("fullName", "Full Name")} required>
                  <InputField
                    icon={<User size={16} color="#0ea5e9" />}
                    placeholder={t("fullNamePlaceholder", "Enter patient's full name")}
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </FieldWrapper>

                {/* DOB + Gender row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

                  {/* Date of Birth */}
                  <FieldWrapper label={t("dob", "Date of Birth")} required>
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", zIndex: 1 }}>
                        <Calendar size={16} color="#0ea5e9" />
                      </div>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) => updateField("dob", e.target.value)}
                        style={{
                          width: "100%",
                          height: "40px",
                          paddingLeft: "38px",
                          paddingRight: "12px",
                          borderRadius: "12px",
                          border: "1px solid #cbd5e1",
                          background: "rgba(255,255,255,0.7)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#1e293b",
                          outline: "none",
                          boxSizing: "border-box",
                          fontFamily: "'Inter', sans-serif",
                          transition: "border 0.15s, box-shadow 0.15s",
                        }}
                        onFocus={(e) => { e.target.style.border = "1px solid #0ea5e9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.15)"; }}
                        onBlur={(e) => { e.target.style.border = "1px solid #cbd5e1"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                    <p style={{
                      fontSize: "0.65rem",
                      marginTop: "4px",
                      fontWeight: age !== null ? 600 : 400,
                      color: age !== null ? "#0284c7" : "#94a3b8",
                    }}>
                      {age !== null ? `Calculated Age: ${age} years old` : "Age will be calculated automatically"}
                    </p>
                  </FieldWrapper>

                  {/* Gender Segmented Selector */}
                  <FieldWrapper label={t("gender", "Gender")} required>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "6px",
                      padding: "4px",
                      background: "rgba(241,245,249,0.9)",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      height: "40px",
                      alignItems: "center",
                    }}>
                      {[["male", t("genderMale", "Male")], ["female", t("genderFemale", "Female")], ["other", t("genderOther", "Other")]].map(([val, lbl]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => updateField("gender", val)}
                          style={{
                            height: "30px",
                            borderRadius: "8px",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            border: form.gender === val ? "1px solid rgba(14,165,233,0.35)" : "none",
                            background: form.gender === val ? "#ffffff" : "transparent",
                            color: form.gender === val ? "#0284c7" : "#64748b",
                            boxShadow: form.gender === val ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          <User size={12} color={form.gender === val ? "#0284c7" : "#94a3b8"} />
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </FieldWrapper>

                </div>

                {/* Diabetes Duration */}
                <FieldWrapper label={t("diabetesDuration", "Diabetes Duration")} required>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", zIndex: 1 }}>
                      <Activity size={16} color="#0ea5e9" />
                    </div>
                    <select
                      value={form.diabetesDuration}
                      onChange={(e) => updateField("diabetesDuration", e.target.value)}
                      style={{
                        width: "100%",
                        height: "40px",
                        paddingLeft: "38px",
                        paddingRight: "36px",
                        borderRadius: "12px",
                        border: "1px solid #cbd5e1",
                        background: "rgba(255,255,255,0.7)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: form.diabetesDuration ? "#1e293b" : "#94a3b8",
                        outline: "none",
                        appearance: "none",
                        WebkitAppearance: "none",
                        cursor: "pointer",
                        boxSizing: "border-box",
                        fontFamily: "'Inter', sans-serif",
                        transition: "border 0.15s, box-shadow 0.15s",
                      }}
                      onFocus={(e) => { e.target.style.border = "1px solid #0ea5e9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.15)"; }}
                      onBlur={(e) => { e.target.style.border = "1px solid #cbd5e1"; e.target.style.boxShadow = "none"; }}
                    >
                      <option value="" disabled>{t("diabetesDurationSelect", "Select duration")}</option>
                      <option value="&lt;1">{t("durationUnder1", "Less than 1 year")}</option>
                      <option value="1-5">1–5 years</option>
                      <option value="5-10">5–10 years</option>
                      <option value="10-15">10–15 years</option>
                      <option value="15+">{t("durationOver10", "More than 15 years")}</option>
                    </select>
                    <ChevronDown size={15} color="#94a3b8" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  </div>
                </FieldWrapper>

                {/* Mobile Number */}
                <FieldWrapper label={t("mobileNumber", "Mobile Number")} optional>
                  <div style={{ display: "flex", height: "40px", borderRadius: "12px", border: "1px solid #cbd5e1", overflow: "hidden", background: "rgba(255,255,255,0.7)" }}>
                    {/* Country code */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "0 12px",
                      borderRight: "1px solid #cbd5e1",
                      background: "rgba(241,245,249,0.9)",
                      flexShrink: 0,
                      userSelect: "none",
                    }}>
                      <span style={{ fontSize: "1rem", lineHeight: 1 }}>🇮🇳</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a" }}>+91</span>
                      <ChevronDown size={12} color="#94a3b8" />
                    </div>
                    {/* Phone input */}
                    <input
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                      placeholder={t("mobilePlaceholder", "Enter 10-digit mobile number")}
                      value={form.mobile}
                      onChange={(e) => updateField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "0 14px",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#1e293b",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    />
                  </div>
                </FieldWrapper>

              </div>

              {/* ── Action Buttons ── */}
              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "12px" }}>
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    style={{
                      width: "38%",
                      height: "44px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      borderRadius: "12px",
                      border: "1px solid rgba(203,213,225,0.9)",
                      background: "rgba(255,255,255,0.8)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#334155",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#94a3b8"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.8)"; e.currentTarget.style.borderColor = "rgba(203,213,225,0.9)"; }}
                  >
                    <ArrowLeft size={16} />
                    {t("back", "Back")}`n                  </button>
                )}

                <button
                  type="button"
                  onClick={handleContinue}
                  style={{
                    flex: 1,
                    height: "44px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    borderRadius: "12px",
                    background: "linear-gradient(to right, #078dcc, #218cf0)",
                    border: "none",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#ffffff",
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(14,165,233,0.3)",
                    transition: "all 0.15s",
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 12px 25px rgba(14,165,233,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.boxShadow = "0 8px 20px rgba(14,165,233,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {t("continue", "Continue")}`n                  <ArrowRight size={16} style={{ transition: "transform 0.15s" }} />
                </button>
              </div>

            </div>
          </section>

          {/* ── RIGHT GUIDANCE PANEL ── */}
          <RightPanel />

        </div>
      </main>
    </div>
  );
};


/* =========================================================
   BACKGROUND
========================================================= */

const Background = () => (
  <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
    {/* Grid pattern */}
    <div style={{
      position: "absolute",
      inset: 0,
      backgroundSize: "53px 53px",
      backgroundImage: "linear-gradient(to right, rgba(147,197,253,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(147,197,253,0.22) 1px, transparent 1px)",
    }} />
    {/* Glow blobs */}
    <div style={{
      position: "absolute",
      top: "-10%", left: "15%",
      width: "650px", height: "650px",
      background: "radial-gradient(circle, rgba(184,227,255,0.6) 0%, rgba(201,217,255,0.3) 50%, transparent 70%)",
      filter: "blur(60px)",
    }} />
    <div style={{
      position: "absolute",
      bottom: "-10%", left: "-5%",
      width: "600px", height: "600px",
      background: "radial-gradient(circle, rgba(216,245,255,0.75) 0%, rgba(186,230,253,0.35) 60%, transparent 75%)",
      filter: "blur(50px)",
    }} />
    <div style={{
      position: "absolute",
      top: "25%", right: "-10%",
      width: "700px", height: "700px",
      background: "radial-gradient(circle, rgba(198,231,255,0.5) 0%, rgba(219,234,254,0.3) 55%, transparent 75%)",
      filter: "blur(70px)",
    }} />
  </div>
);


/* =========================================================
   LEFT PANEL
========================================================= */

const LeftPanel = () => (
  <section className="hidden lg:flex lg:col-span-3 flex-col justify-between h-full py-4 space-y-6">
    {/* Editorial */}
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ width: "48px", height: "6px", borderRadius: "9999px", background: "#0ea5e9" }} />
      <h2 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.15, letterSpacing: "-0.035em", margin: 0 }}>
        Early Detection<br />Brighter Tomorrows
      </h2>
      <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
        Accurate screening.<br />Better decisions.<br />Healthier lives.
      </p>
    </div>

    {/* Retina visual */}
    <div style={{ position: "relative", padding: "16px 0", display: "flex", alignItems: "center" }}>
      {/* Concentric rings */}
      <div style={{ position: "absolute", left: "-56px", width: "340px", height: "340px", borderRadius: "9999px", border: "1px solid rgba(147,197,253,0.4)", animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />
      <div style={{ position: "absolute", left: "-36px", width: "300px", height: "300px", borderRadius: "9999px", border: "2px dashed rgba(56,189,248,0.3)" }} />
      {/* Scan arcs */}
      <div style={{ position: "absolute", left: "224px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "96px", borderRadius: "9999px", borderRight: "4px solid rgba(56,189,248,0.8)" }} />
      <div style={{ position: "absolute", left: "256px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "64px", borderRadius: "9999px", borderRight: "2px solid rgba(125,211,252,0.7)" }} />

      {/* Fundus globe */}
      <div style={{
        position: "relative",
        width: "250px",
        height: "250px",
        borderRadius: "9999px",
        flexShrink: 0,
        background: "radial-gradient(circle at 62% 48%, #ff8c5a 0%, #d84315 28%, #871400 65%, #3b0600 100%)",
        boxShadow: "0 0 50px rgba(255,120,60,0.35), inset 0 0 40px rgba(0,0,0,0.75), 0 0 0 10px rgba(186,230,253,0.25), 0 0 0 20px rgba(186,230,253,0.12)",
        overflow: "hidden",
      }}>
        {/* Lens glow */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at 68% 46%, rgba(255,243,200,0.85) 0%, rgba(255,150,80,0.4) 22%, transparent 55%)",
          mixBlendMode: "screen",
        }} />
        {/* Vessels */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.85 }} fill="none" stroke="rgba(100,2,0,0.7)" strokeLinecap="round" viewBox="0 0 250 250">
          <path d="M165,115 C150,105 130,90 90,80 C65,74 35,85 10,75" strokeWidth="3.5" />
          <path d="M165,115 C145,125 110,140 85,175 C65,200 40,210 15,225" strokeWidth="3" />
          <path d="M165,115 C175,90 185,60 170,30 C160,12 145,5 130,0" strokeWidth="2.5" />
          <path d="M165,115 C180,140 195,175 190,210 C185,230 175,245 160,250" strokeWidth="2.5" />
          <path d="M130,90 C120,70 100,50 75,40" stroke="rgba(120,10,0,0.6)" strokeWidth="1.8" />
          <path d="M90,80 C80,95 65,110 45,115" stroke="rgba(120,10,0,0.6)" strokeWidth="1.5" />
          <path d="M110,140 C105,160 85,180 60,185" stroke="rgba(120,10,0,0.6)" strokeWidth="1.8" />
          <path d="M175,90 C195,85 215,80 235,90" stroke="rgba(120,10,0,0.6)" strokeWidth="1.6" />
          <path d="M180,140 C205,150 220,165 240,160" stroke="rgba(120,10,0,0.6)" strokeWidth="1.5" />
        </svg>
        {/* Optic disc */}
        <div style={{ position: "absolute", top: "102px", left: "152px", width: "28px", height: "28px", borderRadius: "9999px", background: "rgba(255,243,196,0.9)", filter: "blur(1px)", boxShadow: "0 0 20px #fff3c4" }} />
        <div style={{ position: "absolute", top: "104px", left: "154px", width: "12px", height: "12px", borderRadius: "9999px", background: "#fff", filter: "blur(0.5px)" }} />
      </div>
    </div>

    {/* Trust badge */}
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "14px",
      maxWidth: "240px",
      borderRadius: "16px",
      background: "rgba(255,255,255,0.7)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.85)",
      boxShadow: "0 10px 30px -10px rgba(37,99,235,0.08)",
    }}>
      <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #0ea5e9, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(14,165,233,0.3)" }}>
        <ShieldCheck size={20} color="#fff" />
      </div>
      <div>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1.3 }}>Trusted by Clinicians</p>
        <p style={{ fontSize: "0.625rem", fontWeight: 500, color: "#64748b", margin: "2px 0 0", letterSpacing: "0.02em" }}>Screen • Detect • Care</p>
      </div>
    </div>
  </section>
);


/* =========================================================
   RIGHT GUIDANCE PANEL
========================================================= */

const RightPanel = () => (
  <section className="hidden lg:flex lg:col-span-3 flex-col justify-between h-full py-4 space-y-6">

    {/* Heart pill */}
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 14px",
        borderRadius: "9999px",
        background: "rgba(255,255,255,0.8)",
        border: "1px solid rgba(255,255,255,0.9)",
        boxShadow: "0 4px 12px rgba(186,230,253,0.4)",
      }}>
        <Heart size={14} color="#0ea5e9" fill="#0ea5e9" />
        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#334155", lineHeight: 1.3 }}>
          Your Eyes<br /><span style={{ color: "#64748b", fontWeight: 500 }}>Matter</span>
        </div>
      </div>
    </div>

    {/* Info card */}
    <div style={{
      borderRadius: "24px",
      padding: "24px",
      background: "rgba(255,255,255,0.7)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.9)",
      boxShadow: "0 10px 30px -10px rgba(37,99,235,0.08)",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    }}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Eye size={16} color="#0284c7" />
        </div>
        <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Why we collect this information?</h3>
      </div>

      {/* Benefits */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
        {[
          "Helps in accurate risk assessment",
          "Personalizes AI analysis for better results",
          "Maintains secure clinical records",
          "Used only for screening purposes",
        ].map((text) => (
          <li key={text} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "9999px", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
              <Check size={10} color="#fff" strokeWidth={3} />
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#475569", lineHeight: 1.5 }}>{text}</span>
          </li>
        ))}
      </ul>

      <div style={{ height: "1px", background: "#e2e8f0" }} />

      {/* Lock / confidentiality */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ width: "24px", height: "24px", borderRadius: "8px", background: "#e0f2fe", border: "1px solid #bae6fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Lock size={12} color="#0284c7" />
        </div>
        <div>
          <p style={{ fontSize: "0.7rem", fontWeight: 500, color: "#475569", margin: 0 }}>Your data is secure and confidential</p>
          <button style={{ fontSize: "0.7rem", fontWeight: 700, color: "#0284c7", background: "none", border: "none", padding: 0, cursor: "pointer", marginTop: "2px", display: "inline-flex", alignItems: "center", gap: "2px" }}>
            Learn more <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>

    {/* Closing quote */}
    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
      <p style={{ fontSize: "0.75rem", fontStyle: "italic", fontWeight: 500, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
        "Clearer insights<br />for a healthier tomorrow"
      </p>
      <div style={{ width: "32px", height: "4px", borderRadius: "9999px", background: "rgba(56,189,248,0.8)" }} />
    </div>

  </section>
);


/* =========================================================
   FIELD WRAPPER
========================================================= */

const FieldWrapper = ({ label, required, optional, children }) => (
  <div>
    <label style={{
      display: "block",
      fontSize: "0.75rem",
      fontWeight: 700,
      color: "#334155",
      marginBottom: "6px",
    }}>
      {label}
      {required && <span style={{ color: "#ef4444", marginLeft: "3px" }}>*</span>}
      {optional && <span style={{ color: "#94a3b8", fontWeight: 400, marginLeft: "4px" }}>(Optional)</span>}
    </label>
    {children}
  </div>
);


/* =========================================================
   INPUT FIELD
========================================================= */

const InputField = ({ icon, placeholder, value, onChange, type = "text" }) => (
  <div style={{ position: "relative" }}>
    <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", zIndex: 1 }}>
      {icon}
    </div>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%",
        height: "40px",
        paddingLeft: "38px",
        paddingRight: "12px",
        borderRadius: "12px",
        border: "1px solid #cbd5e1",
        background: "rgba(255,255,255,0.7)",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "#1e293b",
        outline: "none",
        boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif",
        transition: "border 0.15s, box-shadow 0.15s",
      }}
      onFocus={(e) => { e.target.style.border = "1px solid #0ea5e9"; e.target.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.15)"; e.target.style.background = "#ffffff"; }}
      onBlur={(e) => { e.target.style.border = "1px solid #cbd5e1"; e.target.style.boxShadow = "none"; e.target.style.background = "rgba(255,255,255,0.7)"; }}
    />
  </div>
);


export default PatientInfoPage;

