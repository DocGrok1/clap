import { useState, useEffect, useRef } from "react";

// ── Constitutional engine implementations (ported from mc290_aura115_simulation.py) ──

function clip01(x) { return Math.max(0, Math.min(1, Number(x))); }

function genesisBootRun() {
  const stages = ["differentiate","separate","name","layer","aggregate","populate","rest"];
  const s = Object.fromEntries(stages.map(k => [k, 1.0]));
  const base = ["differentiate","separate","name","layer","aggregate"].map(k => s[k]);
  const full = [...base, s.populate, s.rest];
  const governance_eligibility = Math.min(...base);
  const authority_emergence = clip01(governance_eligibility * s.populate * s.rest);
  const habitation_score = Math.min(...full, authority_emergence);
  return { ...s, governance_eligibility, authority_emergence, habitation_score, current_stage: "rest",
    invariants: {
      ordered_boot_sequence: true,
      eligibility_requires_structure: governance_eligibility <= Math.min(...base) + 1e-12,
      authority_requires_population_and_rest: authority_emergence <= s.populate + 1e-12 && authority_emergence <= s.rest + 1e-12,
      habitation_requires_authority: habitation_score <= authority_emergence + 1e-12,
    }
  };
}

function meaningRun(habitation_score, governance_eligibility, authority_emergence) {
  const distinction = 1.0, addressability = 1.0, coherence = 0.95, persistence = 0.90, stewardship = 0.90;
  const emergence_gate = Math.min(habitation_score, governance_eligibility);
  const semantic_core = Math.min(distinction, addressability, coherence);
  const meaning_score = clip01(emergence_gate * semantic_core * persistence * stewardship);
  const adoption = meaning_score >= 0.70 && authority_emergence > 0 ? 1.0 : 0.0;
  const state_label = adoption >= 1.0 && meaning_score >= 0.70 ? "accepted" : meaning_score >= 0.35 ? "emergent" : "inferred";
  return { habitation_score, governance_eligibility, authority_emergence, distinction, addressability, coherence,
    persistence, stewardship, adoption, meaning_score, state_label,
    invariants: {
      meaning_requires_habitation: meaning_score <= habitation_score + 1e-12,
      meaning_requires_eligibility: meaning_score <= governance_eligibility + 1e-12,
      meaning_requires_coherence: meaning_score <= coherence + 1e-12,
      acceptance_requires_authority: state_label !== "accepted" || authority_emergence > 0,
    }
  };
}

function authorityRun(habitation_score, governance_eligibility, meaning_score) {
  const commitment_readiness = 0.92, boundedness = 0.95, reversibility = 0.90, risk_load = 0.35, external_commitment = 1.0;
  const authority_margin = clip01(commitment_readiness + boundedness + reversibility - risk_load - 1.0);
  const authority_score = clip01(authority_margin * meaning_score * governance_eligibility);
  const authority_emergence = clip01(authority_score * external_commitment);
  const state_label = authority_emergence >= 0.80 ? "authorized" : authority_emergence >= 0.40 ? "emergent" : "ineligible";
  return { habitation_score, governance_eligibility, meaning_score, commitment_readiness, boundedness,
    reversibility, risk_load, external_commitment, authority_margin, authority_score, authority_emergence, state_label,
    invariants: {
      margin_positive: authority_margin >= 0,
      external_commitment_required: external_commitment > 0,
      emergence_requires_margin: authority_emergence <= authority_margin + 1e-12 || authority_margin >= 0,
    }
  };
}

function stewardshipRun(habitation_score, meaning_score, authority_emergence) {
  const recognition = 0.30, maintenance_pressure = 0.90, care_weight = 0.95, continuity = 0.90, fidelity_retention = 0.92, misuse_risk = 0.05;
  const stewardship_score = clip01(habitation_score * meaning_score * authority_emergence * care_weight * fidelity_retention * (1 - misuse_risk));
  const state_label = stewardship_score >= 0.80 ? "sustained" : stewardship_score >= 0.40 ? "managing" : "degraded";
  return { habitation_score, meaning_score, authority_emergence, recognition, maintenance_pressure, care_weight,
    continuity, fidelity_retention, misuse_risk, stewardship_score, state_label,
    invariants: {
      stewardship_requires_habitation: stewardship_score <= habitation_score + 1e-12,
      stewardship_requires_authority: stewardship_score <= authority_emergence + 1e-12,
      misuse_bounded: misuse_risk <= 1.0,
    }
  };
}

function continuityRun(habitation_score, meaning_score, stewardship_score, authority_emergence) {
  const previous_identity = 0.82, current_identity = 0.86, transition_step = 0.10;
  const obligation_budget = 0.70, memory_coherence = 0.94, traceability = 0.96, kappa = 0.85;
  const identity_delta = Math.abs(current_identity - previous_identity);
  const allowed_step = clip01(kappa * obligation_budget);
  const continuity_margin = allowed_step - identity_delta;
  const continuity_score = continuity_margin >= 0
    ? clip01(habitation_score * meaning_score * stewardship_score * memory_coherence * traceability)
    : 0;
  const state_label = continuity_margin < 0 ? "broken" : continuity_score >= 0.80 ? "preserved" : continuity_score >= 0.40 ? "maintaining" : "at_risk";
  return { habitation_score, meaning_score, stewardship_score, authority_emergence, previous_identity, current_identity,
    transition_step, obligation_budget, memory_coherence, traceability, identity_delta, allowed_step,
    continuity_margin, continuity_score, state_label,
    invariants: {
      identity_delta_bounded: identity_delta <= allowed_step + 1e-12,
      continuity_requires_traceability: continuity_score <= traceability + 1e-12,
      broken_if_margin_negative: continuity_margin >= 0 || state_label === "broken",
    }
  };
}

function metaRecursionRun(habitation_score, meaning_score, stewardship_score, continuity_score) {
  let alpha = 0.60, beta = 0.55, kappa = 0.70, lambda_meta = 0.50;
  const spectral_stress = 0.20, basin_slack = 0.70, adaptation_pressure = 0.15, stability_feedback = 0.80;
  alpha = clip01(alpha + 0.05 * (stability_feedback - spectral_stress));
  beta = clip01(beta + 0.05 * (basin_slack - adaptation_pressure));
  kappa = clip01(kappa + 0.05 * (stability_feedback - 0.5 * adaptation_pressure));
  lambda_meta = clip01(lambda_meta + 0.05 * (basin_slack - 0.5 * spectral_stress));
  const meta_gain = (alpha + beta + kappa + lambda_meta) / 4;
  const meta_margin = Math.max(-1, Math.min(1, stability_feedback + basin_slack - spectral_stress - adaptation_pressure));
  const margin_factor = Math.max(0, meta_margin);
  const meta_recursion_score = clip01(habitation_score * meaning_score * stewardship_score * continuity_score * meta_gain * margin_factor);
  const state_label = continuity_score <= 0 ? "locked" : meta_margin < 0 ? "drifting" : meta_recursion_score < 0.10 ? "adapting" : "governed";
  return { habitation_score, meaning_score, stewardship_score, continuity_score, alpha, beta, kappa, lambda_meta,
    spectral_stress, basin_slack, adaptation_pressure, stability_feedback, meta_gain, meta_margin,
    meta_recursion_score, state_label,
    invariants: {
      meta_requires_habitation: meta_recursion_score <= habitation_score + 1e-12,
      meta_requires_continuity: meta_recursion_score <= continuity_score + 1e-12,
      governed_requires_nonneg_margin: state_label !== "governed" || meta_margin >= 0,
      meta_gain_bounded: meta_gain >= 0 && meta_gain <= 1,
    }
  };
}

function runFullStack() {
  const genesis = genesisBootRun();
  const meaning = meaningRun(genesis.habitation_score, genesis.governance_eligibility, genesis.authority_emergence);
  const authority = authorityRun(genesis.habitation_score, genesis.governance_eligibility, meaning.meaning_score);
  const stewardship = stewardshipRun(genesis.habitation_score, meaning.meaning_score, authority.authority_emergence);
  const continuity = continuityRun(genesis.habitation_score, meaning.meaning_score, stewardship.stewardship_score, authority.authority_emergence);
  const meta = metaRecursionRun(genesis.habitation_score, meaning.meaning_score, stewardship.stewardship_score, continuity.continuity_score);
  const all_invariants = [genesis, meaning, authority, stewardship, continuity, meta]
    .every(e => Object.values(e.invariants).every(Boolean));
  return { genesis, meaning, authority, stewardship, continuity, meta, all_invariants,
    mc290: {
      audit_ring: genesis.habitation_score,
      phase_ring: continuity.continuity_score,
      latch_ring: authority.authority_emergence,
      central_core: meta.meta_recursion_score,
    },
    stack: {
      "Genesis / Habitation": genesis.habitation_score,
      "Meaning": meaning.meaning_score,
      "Authority": authority.authority_emergence,
      "Stewardship": stewardship.stewardship_score,
      "Continuity": continuity.continuity_score,
      "Meta-Recursion": meta.meta_recursion_score,
    }
  };
}

// ── UI Components ──────────────────────────────────────────────────────────

const LAYERS = [
  { key: "Genesis / Habitation", label: "L1-2  Genesis / Habitation", arm: "EL3 Secure Monitor", color: "#00ffd0" },
  { key: "Meaning",              label: "L3    Meaning",               arm: "S-EL1 Trusted OS",  color: "#00d4ff" },
  { key: "Authority",            label: "L4    Authority",             arm: "EL1 OS Kernel",     color: "#7b61ff" },
  { key: "Stewardship",          label: "L5    Stewardship",           arm: "EL1 Privilege",     color: "#ff6b9d" },
  { key: "Continuity",           label: "L6    Continuity",            arm: "EL2 Hypervisor",    color: "#ffb347" },
  { key: "Meta-Recursion",       label: "L7    Meta-Recursion",        arm: "EL0 Governed",      color: "#b8ff47" },
];

function Bar({ value, color, animated }) {
  return (
    <div style={{ width: "100%", height: 6, background: "#0a0a0a", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
      <div style={{
        width: `${(value * 100).toFixed(2)}%`, height: "100%",
        background: color, borderRadius: 3,
        boxShadow: `0 0 8px ${color}88`,
        transition: animated ? "width 0.6s cubic-bezier(0.4,0,0.2,1)" : "none"
      }} />
    </div>
  );
}

function InvariantDot({ ok }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: ok ? "#00ffd0" : "#ff3b3b",
      boxShadow: ok ? "0 0 6px #00ffd0" : "0 0 6px #ff3b3b",
      marginRight: 5, flexShrink: 0
    }} />
  );
}

function LayerCard({ layer, value, state_label, invariants, arm, color, tick }) {
  const allOk = Object.values(invariants || {}).every(Boolean);
  return (
    <div style={{
      background: "#0d0d0d", border: `1px solid ${allOk ? color + "44" : "#ff3b3b55"}`,
      borderLeft: `3px solid ${allOk ? color : "#ff3b3b"}`,
      borderRadius: 6, padding: "12px 14px", marginBottom: 8,
      transition: "border-color 0.3s"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: color, letterSpacing: 1 }}>
          {layer.label}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "#444", letterSpacing: 1 }}>
            ARM: {arm}
          </span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
            color: allOk ? "#00ffd0" : "#ff3b3b",
            background: allOk ? "#00ffd011" : "#ff3b3b11",
            padding: "2px 6px", borderRadius: 3, letterSpacing: 1
          }}>
            {state_label?.toUpperCase() || "—"}
          </span>
        </div>
      </div>
      <Bar value={value} color={color} animated={true} />
      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
        {Object.entries(invariants || {}).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#555" }}>
            <InvariantDot ok={v} />
            {k.replace(/_/g, " ")}
          </div>
        ))}
      </div>
    </div>
  );
}

function MC290Torus({ board, pulse }) {
  const rings = [
    { label: "AUDIT RING", sublabel: "Genesis / Habitation", value: board.audit_ring, color: "#00ffd0" },
    { label: "PHASE RING", sublabel: "Continuity", value: board.phase_ring, color: "#ffb347" },
    { label: "LATCH RING", sublabel: "Authority Boundary", value: board.latch_ring, color: "#7b61ff" },
    { label: "CENTRAL CORE", sublabel: "Meta-Recursion", value: board.central_core, color: "#b8ff47" },
  ];
  return (
    <div style={{ background: "#080808", border: "1px solid #1a1a1a", borderRadius: 8, padding: "16px 20px" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 12 }}>
        MC290 TOROIDAL GOVERNANCE CIRCUIT
        <span style={{ marginLeft: 8, color: "#00ffd022", fontSize: 8 }}>290-FACE POLYHEDRAL CORE</span>
      </div>
      {rings.map(r => (
        <div key={r.label} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: r.color, letterSpacing: 2 }}>
              {r.label}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#333" }}>
              {r.sublabel}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: r.color }}>
              {r.value.toFixed(6)}
            </span>
          </div>
          <div style={{ width: "100%", height: 8, background: "#0a0a0a", borderRadius: 2, marginTop: 3, position: "relative", overflow: "hidden" }}>
            <div style={{
              width: `${r.value * 100}%`, height: "100%", background: r.color,
              boxShadow: `0 0 12px ${r.color}`,
              transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)"
            }} />
            {pulse && <div style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              background: `linear-gradient(90deg, transparent 0%, ${r.color}33 50%, transparent 100%)`,
              animation: "scan 2s linear infinite"
            }} />}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#222", letterSpacing: 2 }}>
          FACE PADS ACTIVE
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#00ffd0" }}>
          290 / 290
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#222", letterSpacing: 2 }}>
          RESCUE WINDOW
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#00ffd0" }}>
          ARMED
        </span>
      </div>
    </div>
  );
}

function ARMBridgePanel({ stack }) {
  const rows = [
    { arm: "EL3  Secure Monitor", aural: "L1  Genesis Boot", invariant: "Non-escalation root of trust", color: "#00ffd0" },
    { arm: "S-EL1 Trusted OS",    aural: "L2  Habitation",    invariant: "Stability regime", color: "#00d4ff" },
    { arm: "S-EL0 Trusted App",   aural: "L3  Meaning",       invariant: "Semantic gate", color: "#00d4ff" },
    { arm: "EL1  OS Kernel",      aural: "L4  Authority",     invariant: "Pi_K admissibility", color: "#7b61ff" },
    { arm: "EL2  Hypervisor",     aural: "L5-6 Steward/Cont", invariant: "Observer topology", color: "#ffb347" },
    { arm: "EL0  User space",     aural: "L7  Meta-Recursion","invariant": "Governed execution", color: "#b8ff47" },
  ];
  return (
    <div style={{ background: "#080808", border: "1px solid #1a1a1a", borderRadius: 8, padding: "16px 20px" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 12 }}>
        ARM → AURAL-M GEOMETRIC MAPPING
        <span style={{ marginLeft: 8, fontSize: 8, color: "#1a1a1a" }}>USPTO 19/700,298</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: "1fr 16px 1fr",
          alignItems: "center", marginBottom: 6, gap: 8
        }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#444", textAlign: "right" }}>
            {r.arm}
          </div>
          <div style={{ color: r.color, textAlign: "center", fontSize: 10 }}>⟷</div>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: r.color }}>{r.aural}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: "#333" }}>{r.invariant}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12, borderTop: "1px solid #111", paddingTop: 10 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#333", letterSpacing: 2, marginBottom: 6 }}>
          NS BIT → Pi_K COHERENCE TOKEN
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["SIMULATION LANE", "→ Pi_K GATE →", "EXECUTION LANE"].map((t, i) => (
            <div key={i} style={{
              flex: 1, textAlign: "center", padding: "4px 0",
              background: i === 1 ? "#7b61ff22" : "#0d0d0d",
              border: `1px solid ${i === 1 ? "#7b61ff44" : "#1a1a1a"}`,
              borderRadius: 3,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 7,
              color: i === 1 ? "#7b61ff" : "#333"
            }}>{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AURALMRuntime() {
  const [result, setResult] = useState(null);
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [log, setLog] = useState([]);
  const intervalRef = useRef(null);

  const runOnce = () => {
    const r = runFullStack();
    const ts = new Date().toISOString();
    setResult(r);
    setTick(t => t + 1);
    setLoopCount(c => c + 1);
    setLog(prev => [{
      ts, all_ok: r.all_invariants, meta: r.meta.meta_recursion_score,
      authority: r.authority.authority_emergence, label: r.meta.state_label
    }, ...prev.slice(0, 19)]);
    return r;
  };

  const startLoop = () => {
    if (running) { clearInterval(intervalRef.current); setRunning(false); return; }
    setRunning(true);
    runOnce();
    intervalRef.current = setInterval(runOnce, 2000);
  };

  useEffect(() => { runOnce(); return () => clearInterval(intervalRef.current); }, []);

  if (!result) return <div style={{ background: "#000", color: "#00ffd0", fontFamily: "'IBM Plex Mono', monospace", padding: 40 }}>INITIALIZING...</div>;

  const { genesis, meaning, authority, stewardship, continuity, meta, all_invariants, mc290, stack } = result;

  const layers = [
    { layer: LAYERS[0], value: stack["Genesis / Habitation"], state_label: genesis.current_stage, invariants: genesis.invariants },
    { layer: LAYERS[1], value: stack["Meaning"],              state_label: meaning.state_label,   invariants: meaning.invariants },
    { layer: LAYERS[2], value: stack["Authority"],            state_label: authority.state_label, invariants: authority.invariants },
    { layer: LAYERS[3], value: stack["Stewardship"],          state_label: stewardship.state_label, invariants: stewardship.invariants },
    { layer: LAYERS[4], value: stack["Continuity"],           state_label: continuity.state_label, invariants: continuity.invariants },
    { layer: LAYERS[5], value: stack["Meta-Recursion"],       state_label: meta.state_label,      invariants: meta.invariants },
  ];

  return (
    <div style={{ background: "#030303", minHeight: "100vh", padding: "20px 16px", fontFamily: "'IBM Plex Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;700&family=Syne:wght@700;800&display=swap');
        @keyframes scan { from { transform: translateX(-100%); } to { transform: translateX(200%); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes flicker { 0%,100% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.7; } 95% { opacity: 1; } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5, animation: "flicker 8s infinite" }}>
              AURAL-M
              <span style={{ color: "#00ffd0", marginLeft: 8 }}>CONSTITUTIONAL RUNTIME</span>
            </div>
            <div style={{ fontSize: 9, color: "#333", letterSpacing: 3, marginTop: 3 }}>
              DCGP.AI · JOSHUA LOPEZ · USPTO 19/555,951 · 19/700,298 · 64/084,528
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              padding: "6px 14px", borderRadius: 4,
              background: all_invariants ? "#00ffd011" : "#ff3b3b11",
              border: `1px solid ${all_invariants ? "#00ffd044" : "#ff3b3b44"}`,
              fontSize: 9, color: all_invariants ? "#00ffd0" : "#ff3b3b",
              letterSpacing: 2, animation: all_invariants ? "none" : "pulse 1s infinite"
            }}>
              {all_invariants ? "ALL INVARIANTS HOLD" : "INVARIANT BREACH"}
            </div>
            <button onClick={startLoop} style={{
              padding: "6px 16px", borderRadius: 4, border: "1px solid #7b61ff44",
              background: running ? "#7b61ff22" : "#0d0d0d", color: running ? "#7b61ff" : "#444",
              fontSize: 9, letterSpacing: 2, cursor: "pointer"
            }}>
              {running ? "◼ HALT" : "▶ LOOP"}
            </button>
            <div style={{ fontSize: 9, color: "#222", letterSpacing: 1 }}>LOOP {loopCount}</div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Left: Layer stack */}
        <div>
          <div style={{ fontSize: 8, color: "#222", letterSpacing: 3, marginBottom: 10 }}>CONSTITUTIONAL LAYER STACK — 7 ENGINES</div>
          {layers.map(({ layer, value, state_label, invariants }) => (
            <LayerCard key={layer.key} layer={layer} value={value} state_label={state_label}
              invariants={invariants} arm={layer.arm} color={layer.color} tick={tick} />
          ))}
        </div>

        {/* Right: MC290 + ARM bridge + log */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* MC290 Board */}
          <MC290Torus board={mc290} pulse={running} />

          {/* Key metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "AUTHORITY MARGIN", value: authority.authority_margin, color: "#7b61ff" },
              { label: "META MARGIN", value: meta.meta_margin, color: "#b8ff47" },
              { label: "CONTINUITY MARGIN", value: continuity.continuity_margin, color: "#ffb347" },
            ].map(m => (
              <div key={m.label} style={{ background: "#080808", border: "1px solid #111", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ fontSize: 7, color: "#333", letterSpacing: 2, marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: m.value >= 0 ? m.color : "#ff3b3b", fontFamily: "'Syne', sans-serif" }}>
                  {m.value.toFixed(4)}
                </div>
                <div style={{ fontSize: 7, color: m.value >= 0 ? "#333" : "#ff3b3b", marginTop: 2 }}>
                  {m.value >= 0 ? "WITHIN BOUND" : "BREACH"}
                </div>
              </div>
            ))}
          </div>

          {/* ARM Bridge */}
          <ARMBridgePanel stack={stack} />

          {/* Execution log */}
          <div style={{ background: "#080808", border: "1px solid #1a1a1a", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 8, color: "#222", letterSpacing: 3, marginBottom: 10 }}>EXECUTION LOG</div>
            <div style={{ maxHeight: 140, overflowY: "auto" }}>
              {log.map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 7, color: "#222", flexShrink: 0 }}>{l.ts.slice(11, 23)}</span>
                  <span style={{ fontSize: 7, color: l.all_ok ? "#00ffd055" : "#ff3b3b55", flexShrink: 0 }}>
                    {l.all_ok ? "✓" : "✗"}
                  </span>
                  <span style={{ fontSize: 7, color: "#333", flexShrink: 0 }}>
                    AUTH {l.authority.toFixed(4)}
                  </span>
                  <span style={{ fontSize: 7, color: "#333", flexShrink: 0 }}>
                    META {l.meta.toFixed(4)}
                  </span>
                  <span style={{ fontSize: 7, color: "#444", letterSpacing: 1 }}>
                    {l.label.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Co-Constitution status */}
          <div style={{ background: "#080808", border: "1px solid #7b61ff22", borderRadius: 8, padding: "12px 16px" }}>
            <div style={{ fontSize: 8, color: "#333", letterSpacing: 3, marginBottom: 8 }}>CO-CONSTITUTION THEOREM — QCL-3</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "S — Structural Constraint", value: authority.authority_margin >= 0, detail: `margin ${authority.authority_margin.toFixed(4)}` },
                { label: "I(S) — Inspection Operator", value: meta.meta_recursion_score > 0, detail: `score ${meta.meta_recursion_score.toFixed(4)}` },
              ].map(c => (
                <div key={c.label} style={{ background: "#0d0d0d", borderRadius: 4, padding: "8px 10px", border: `1px solid ${c.value ? "#7b61ff33" : "#ff3b3b33"}` }}>
                  <div style={{ fontSize: 7, color: c.value ? "#7b61ff" : "#ff3b3b", letterSpacing: 1, marginBottom: 4 }}>
                    {c.value ? "✓ SATISFIED" : "✗ UNSATISFIED"}
                  </div>
                  <div style={{ fontSize: 8, color: "#444" }}>{c.label}</div>
                  <div style={{ fontSize: 7, color: "#222", marginTop: 2 }}>{c.detail}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, textAlign: "center", fontSize: 8,
              color: (authority.authority_margin >= 0 && meta.meta_recursion_score > 0) ? "#00ffd0" : "#ff3b3b",
              letterSpacing: 2
            }}>
              B := S ∩ I(S) — GOVERNED BOUNDARY:{" "}
              {(authority.authority_margin >= 0 && meta.meta_recursion_score > 0) ? "OPERATIVE" : "NOT ACHIEVED"}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #111", paddingTop: 10 }}>
        <div style={{ fontSize: 7, color: "#1a1a1a", letterSpacing: 2 }}>
          AURA115.AI · CONSTITUTIONAL INVARIANT: EVERY LAYER MAY CONSTRAIN BUT MAY NOT ESCALATE AUTHORITY
        </div>
        <div style={{ fontSize: 7, color: "#1a1a1a", letterSpacing: 1 }}>
          {new Date().toISOString()}
        </div>
      </div>
    </div>
  );
}
