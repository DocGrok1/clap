import { useState, useCallback } from "react";

const C = {
  gov: "#534AB7", stable: "#1D9E75", warn: "#BA7517", danger: "#A32D2D",
  info: "#185FA5", teal: "#0F6E56", pink: "#993556",
  text: "var(--color-text-primary)", muted: "var(--color-text-secondary)",
  card: "var(--color-background-primary)", bg: "var(--color-background-secondary)",
  border: "var(--color-border-tertiary)",
};

const PATIENTS = [
  {
    id: "p1", name: "Robert M., 67", mrn: "VA-2847163", dob: "1957-03-12",
    conditions: ["COPD (Stage III)", "Type 2 Diabetes", "Hypertension", "Agent Orange exposure"],
    meds: ["Metformin 1000mg BID", "Lisinopril 10mg QD", "Spiriva 18mcg QD", "Aspirin 81mg QD"],
    allergies: ["Penicillin (anaphylaxis)", "Sulfa drugs (rash)"],
    lastVisit: "Feb 12, 2026", nextVisit: "Apr 1, 2026",
    drift: 0.71, manifold: 0.54, regime: "deteriorating",
    driftAlert: "COPD exacerbation risk rising — FEV1 trend ↓8% over 6 weeks + wearable activity drop",
    sources: ["VA Blue Button", "Epic/MyChart", "TRICARE", "Apple Watch"],
    vitals: { bp: "148/92", hr: "88", spo2: "91%", weight: "194 lbs", hba1c: "8.1%" },
    timeline: [
      { date: "Mar 2026", event: "Wearable: activity drop 40%, SpO2 trending 91–93%", flag: "warn" },
      { date: "Feb 2026", event: "Visit: FEV1 62% predicted. BP elevated. HbA1c 8.1%", flag: "warn" },
      { date: "Dec 2025", event: "ER visit: COPD exacerbation. Prednisone burst.", flag: "danger" },
      { date: "Oct 2025", event: "Labs: LDL 142, eGFR 58 (CKD Stage 2 borderline)", flag: "warn" },
      { date: "Jun 2025", event: "Ophthalmology: early diabetic retinopathy noted", flag: "warn" },
      { date: "2019", event: "VA: Agent Orange exposure confirmed. Type 2 DM diagnosed.", flag: "info" },
    ],
  },
  {
    id: "p2", name: "Sandra K., 54", mrn: "EP-1039284", dob: "1971-08-24",
    conditions: ["Breast cancer (remission, 2yr)", "Hypothyroidism", "Anxiety disorder"],
    meds: ["Levothyroxine 100mcg QD", "Tamoxifen 20mg QD", "Sertraline 50mg QD"],
    allergies: ["Latex", "Codeine (nausea)"],
    lastVisit: "Mar 5, 2026", nextVisit: "Jun 10, 2026",
    drift: 0.18, manifold: 0.89, regime: "stable",
    driftAlert: null,
    sources: ["Epic/MyChart", "Cerner", "Quest Diagnostics"],
    vitals: { bp: "118/74", hr: "72", spo2: "98%", weight: "142 lbs", tsh: "2.1 mIU/L" },
    timeline: [
      { date: "Mar 2026", event: "Annual mammo: negative. TSH stable at 2.1.", flag: "ok" },
      { date: "Jan 2026", event: "Labs: CBC normal. Tamoxifen adherence confirmed.", flag: "ok" },
      { date: "Sep 2025", event: "Oncology: 2yr remission milestone. Surveillance continued.", flag: "ok" },
      { date: "2024", event: "Completed adjuvant chemo + radiation. Tamoxifen started.", flag: "info" },
      { date: "2023", event: "Diagnosis: ER+ breast cancer, Stage IIA. Lumpectomy.", flag: "danger" },
    ],
  },
  {
    id: "p3", name: "David T., 41", mrn: "EP-7723910", dob: "1984-11-02",
    conditions: ["Type 1 Diabetes", "Celiac disease", "Peripheral neuropathy"],
    meds: ["Insulin glargine 24u QHS", "Insulin lispro sliding scale", "B12 1000mcg QD"],
    allergies: ["None known"],
    lastVisit: "Mar 18, 2026", nextVisit: "Apr 22, 2026",
    drift: 0.44, manifold: 0.71, regime: "watchlist",
    driftAlert: "Glucose variability ↑ over 3 weeks. Neuropathy symptom log increasing. Review insulin regimen.",
    sources: ["Epic/MyChart", "Dexcom CGM", "MyFitnessPal"],
    vitals: { bp: "122/78", hr: "76", spo2: "99%", weight: "178 lbs", hba1c: "7.8%" },
    timeline: [
      { date: "Mar 2026", event: "CGM: time-in-range dropped to 58%. Nocturnal hypoglycemia x3", flag: "warn" },
      { date: "Feb 2026", event: "Neuropathy: burning feet score ↑ from 2/10 to 5/10", flag: "warn" },
      { date: "Jan 2026", event: "Visit: HbA1c 7.8%. Celiac adherence good. B12 low-normal.", flag: "warn" },
      { date: "Nov 2025", event: "Labs: eGFR 84. Microalbumin borderline.", flag: "warn" },
      { date: "2018", event: "Celiac confirmed. Gluten-free diet initiated.", flag: "info" },
      { date: "2009", event: "Type 1 DM diagnosed. Insulin therapy started.", flag: "info" },
    ],
  },
];

async function callClaude(sys, user) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1000,
      system: sys, messages: [{ role: "user", content: user }]
    })
  });
  const d = await r.json();
  return d.content?.[0]?.text || "";
}

function Tag({ color, children, small }) {
  return <span style={{ fontSize: small ? 9 : 11, fontWeight: 500, padding: small ? "1px 6px" : "3px 9px", borderRadius: 5, background: color + "20", color, border: `0.5px solid ${color}44` }}>{children}</span>;
}

function DriftMeter({ val }) {
  const color = val > 0.5 ? C.danger : val > 0.3 ? C.warn : C.stable;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${Math.round(val * 100)}%`, height: "100%", background: color, transition: "width 0.5s", borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color, minWidth: 34 }}>{Math.round(val * 100)}%</span>
    </div>
  );
}

function FlagDot({ flag }) {
  const map = { ok: C.stable, warn: C.warn, danger: C.danger, info: C.info };
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: map[flag] || C.muted, display: "inline-block", marginRight: 8, flexShrink: 0, marginTop: 4 }} />;
}

export default function App() {
  const [selId, setSelId] = useState("p1");
  const [tab, setTab] = useState("vault");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState({});

  const pt = PATIENTS.find(p => p.id === selId);
  const driftColor = pt.drift > 0.5 ? C.danger : pt.drift > 0.3 ? C.warn : C.stable;
  const manifoldColor = pt.manifold < 0.6 ? C.danger : pt.manifold < 0.8 ? C.warn : C.stable;

  const runAnalysis = useCallback(async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalysis(prev => ({ ...prev, [selId]: null }));

    const ctx = `Patient: ${pt.name}. MRN: ${pt.mrn}.
Conditions: ${pt.conditions.join(", ")}.
Medications: ${pt.meds.join(", ")}.
Allergies: ${pt.allergies.join(", ")}.
Vitals: ${JSON.stringify(pt.vitals)}.
Drift index: ${pt.drift}. Manifold integrity: ${pt.manifold}. Regime: ${pt.regime}.
Recent timeline: ${pt.timeline.slice(0, 3).map(t => t.event).join(" | ")}.
Data sources: ${pt.sources.join(", ")}.`;

    const [summary, drift, recommend] = await Promise.all([
      callClaude(
        "You are AURORA, a clinical AI companion for physicians. You provide longitudinal patient summaries — analysis only, never diagnosis. 4 sentences max. Focus on what the physician needs to know before the visit.",
        `${ctx}\nProvide a pre-visit longitudinal summary. What is the key clinical story? What has changed since the last visit?`
      ),
      callClaude(
        "You are AURORA's clinical drift detection engine. 3 sentences. Identify which assumptions in the current care plan may be collapsing. This is analysis only — not a diagnosis.",
        `${ctx}\nWhat clinical drift signals are present? Which care plan assumptions are at risk? Be specific about trends.`
      ),
      callClaude(
        "You are AURORA's clinical decision support layer. 3 sentences. Suggest what the physician should consider reviewing. End with: PRIORITY: HIGH, MEDIUM, or LOW. This is analysis only — not a diagnosis or prescription.",
        `${ctx}\nWhat should the physician prioritize at the next visit? What follow-up or review items are flagged by the data?`
      ),
    ]);

    const priMatch = recommend.match(/PRIORITY:\s*(HIGH|MEDIUM|LOW)/i);
    const priority = priMatch ? priMatch[1].toUpperCase() : "MEDIUM";
    setAnalysis(prev => ({ ...prev, [selId]: { summary, drift, recommend, priority } }));
    setAnalyzing(false);
  }, [pt, selId, analyzing]);

  const currAnalysis = analysis[selId];
  const tabs = [["vault", "Patient Vault"], ["drift", "Drift Monitor"], ["ehr", "EHR Sources"], ["support", "Clinical Support"]];

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: C.text, padding: "6px 0", maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>AURORA Clinical</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>Doc Grok · Physician Platform · Analysis, not diagnosis</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Tag color={C.gov}>HIPAA-aligned</Tag>
          <Tag color={C.teal}>Zero-knowledge vault</Tag>
          <Tag color={C.stable}>Clinician-first</Tag>
        </div>
      </div>

      {/* Patient selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {PATIENTS.map(p => {
          const dc = p.drift > 0.5 ? C.danger : p.drift > 0.3 ? C.warn : C.stable;
          const isSel = selId === p.id;
          return (
            <div key={p.id} onClick={() => { setSelId(p.id); setTab("vault"); }} style={{
              padding: "12px 14px", borderRadius: 10, cursor: "pointer",
              background: isSel ? C.gov + "10" : C.card,
              border: `${isSel ? "1.5px" : "0.5px"} solid ${isSel ? C.gov : C.border}`,
              transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</span>
                <Tag color={dc} small>{p.regime}</Tag>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>MRN: {p.mrn}</div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Drift</div>
              <DriftMeter val={p.drift} />
              {p.driftAlert && <div style={{ fontSize: 10, color: C.warn, marginTop: 6, lineHeight: 1.4 }}>⚠ {p.driftAlert.slice(0, 60)}…</div>}
            </div>
          );
        })}
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: tab === id ? 500 : 400,
            cursor: "pointer", border: `${tab === id ? "1.5px" : "0.5px"} solid ${tab === id ? C.gov : C.border}`,
            background: tab === id ? C.gov + "14" : "none", color: tab === id ? C.gov : C.muted,
          }}>{label}</button>
        ))}
        <button onClick={runAnalysis} disabled={analyzing} style={{
          marginLeft: "auto", padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 500,
          cursor: analyzing ? "not-allowed" : "pointer", background: C.gov, color: "#fff", border: "none", opacity: analyzing ? 0.7 : 1,
        }}>{analyzing ? "Analyzing…" : "Run AURORA Analysis"}</button>
      </div>

      {/* VAULT TAB */}
      {tab === "vault" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Vitals + meta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Patient Overview</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{pt.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>DOB: {pt.dob} · MRN: {pt.mrn}</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Active conditions</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                {pt.conditions.map(c => <Tag key={c} color={C.info} small>{c}</Tag>)}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Allergies</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {pt.allergies.map(a => <Tag key={a} color={C.danger} small>{a}</Tag>)}
              </div>
            </div>
            <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Current Vitals & Labs</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(pt.vitals).map(([k, v]) => (
                  <div key={k} style={{ background: C.bg, borderRadius: 7, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{k.toUpperCase()}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Medications */}
          <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Current Medications</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {pt.meds.map(m => <Tag key={m} color={C.teal}>{m}</Tag>)}
            </div>
          </div>

          {/* Timeline */}
          <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Lifetime Vault Timeline</div>
            {pt.timeline.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                <FlagDot flag={t.flag} />
                <div>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{t.date}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>{t.event}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DRIFT MONITOR TAB */}
      {tab === "drift" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Drift Index", val: pt.drift, color: driftColor, sub: "Assumption collapse risk" },
              { label: "Manifold Integrity", val: pt.manifold, color: manifoldColor, sub: "Care plan validity" },
              { label: "Clinical Regime", val: pt.regime, color: driftColor, sub: "Current trajectory", text: true },
            ].map(m => (
              <div key={m.label} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{m.label}</div>
                {m.text
                  ? <div style={{ fontSize: 16, fontWeight: 500, color: m.color, marginBottom: 4 }}>{m.val}</div>
                  : <><div style={{ fontSize: 22, fontWeight: 500, color: m.color, marginBottom: 6 }}>{Math.round(m.val * 100)}%</div>
                    <DriftMeter val={m.val} /></>}
                <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {pt.driftAlert && (
            <div style={{ background: C.warn + "0d", border: `1px solid ${C.warn}44`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.warn, marginBottom: 6 }}>⚠ AURORA Drift Alert</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{pt.driftAlert}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>This is analysis only — not a diagnosis. Consult clinical judgment before action.</div>
            </div>
          )}
          {!pt.driftAlert && (
            <div style={{ background: C.stable + "0d", border: `0.5px solid ${C.stable}44`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, color: C.stable }}>✓ No active drift alerts. Care plan assumptions appear valid based on current data.</div>
            </div>
          )}

          <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Recent Signal Events</div>
            {pt.timeline.filter(t => t.flag === "warn" || t.flag === "danger").map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <FlagDot flag={t.flag} />
                <div>
                  <div style={{ fontSize: 10, color: C.muted }}>{t.date}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>{t.event}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EHR SOURCES TAB */}
      {tab === "ehr" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {pt.sources.map(src => {
              const icons = { "VA Blue Button": ["🏥", C.info], "Epic/MyChart": ["⬡", C.gov], "TRICARE": ["🛡", C.teal], "Apple Watch": ["⌚", C.stable], "Cerner": ["◈", C.warn], "Quest Diagnostics": ["🔬", C.pink], "Dexcom CGM": ["📡", C.stable], "MyFitnessPal": ["🥗", C.teal] };
              const [icon, color] = icons[src] || ["◎", C.muted];
              return (
                <div key={src} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{src}</div>
                    <Tag color={color} small>Connected · FHIR</Tag>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <Tag color={C.stable} small>✓ Synced</Tag>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ background: C.gov + "0d", border: `0.5px solid ${C.gov}33`, borderRadius: 10, padding: "13px 16px" }}>
            <div style={{ fontSize: 12, color: C.gov, lineHeight: 1.65 }}>
              All records unified into this patient's Lifetime Vault via FHIR R4. Data encrypted on-device. Patient consent logged. Zero-knowledge architecture — AURORA never stores plaintext records.
            </div>
          </div>
        </div>
      )}

      {/* CLINICAL SUPPORT TAB */}
      {tab === "support" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!currAnalysis && !analyzing && (
            <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "32px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>No analysis run yet for {pt.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>Click "Run AURORA Analysis" above to generate clinical decision support.</div>
            </div>
          )}
          {analyzing && (
            <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "32px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: C.gov }}>AURORA analyzing {pt.name}…</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Running longitudinal summary · Drift analysis · Priority recommendations</div>
            </div>
          )}
          {currAnalysis && (
            <>
              {[
                { title: "Pre-visit Longitudinal Summary", text: currAnalysis.summary, color: C.gov },
                { title: "Clinical Drift Analysis", text: currAnalysis.drift, color: currAnalysis.priority === "HIGH" ? C.danger : C.warn },
                { title: "Decision Support & Priority Flags", text: currAnalysis.recommend, color: currAnalysis.priority === "HIGH" ? C.danger : currAnalysis.priority === "LOW" ? C.stable : C.warn },
              ].map(a => (
                <div key={a.title} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderLeft: `3px solid ${a.color}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: a.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{a.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a.text}</div>
                </div>
              ))}
              <div style={{ padding: "10px 14px", borderRadius: 8, background: C.muted + "10", border: `0.5px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.muted }}>⚕ AURORA provides analysis only — not diagnosis, prescription, or treatment decisions. All outputs require clinician review. HIPAA-aligned · Zero-knowledge · Consent-gated.</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
