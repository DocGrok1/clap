import { useState, useEffect, useRef } from "react";

const LAYER_TAXONOMY = {
  1: { label: "Layer 1 — Distinction", desc: "A = B", color: "#888", note: "Pure difference. No direction, no order." },
  2: { label: "Layer 2 — Order", desc: "A → B", color: "#4A9EFF", note: "Static asymmetric relation. Directed, but not enacted." },
  3: { label: "Layer 3 — Passage", desc: "traversal(A → B)", color: "#9B6BFF", note: "Enactment of the relation. Mechanism required." },
};

const TEST_ACCOUNTS = [
  {
    id: "qcl3",
    title: "QCL-3 Boundary Determination Gate",
    formalism: "B := S ∩ I(S)",
    prose: "The system transitions from representation to enactment when the intersection of the state manifold and the inspection operator image is non-empty. The Gate enforces this boundary via Pi_K coherence token verification before any Layer 3 traversal is authorized.",
    verb: "transitions",
    mechanism: "Pi_K coherence token: T_valid iff ‖Pi_K(ψ) - ψ‖ < ε. Gate blocks traversal when T_valid = false.",
    discharged: true,
    rewriting: "The traversal is authorized iff Pi_K(ψ) ∈ B, where B := S ∩ I(S). No traversal occurs absent token verification.",
    layer: 3,
  },
  {
    id: "stochastic",
    title: "Stochastic Matrix Update (Audit §5.3)",
    formalism: "P = T · P",
    prose: "The system evolves along the probability simplex as the stochastic matrix updates the agent's credence.",
    verb: "evolves",
    mechanism: null,
    discharged: false,
    rewriting: null,
    layer: 3,
  },
  {
    id: "modular",
    title: "Modular Flow (Connes-Takesaki)",
    formalism: "M = A ⋊_σ ℝ",
    prose: "The modular automorphism group implements the crossed product, supplying a continuous asymmetric parameter space with probabilistic and entropic interpretation.",
    verb: "implements",
    mechanism: "Crossed product construction: unique semifinite extension of A by modular flow σ. Parameter t is structural — derived from Tomita-Takesaki theorem, not narrated.",
    discharged: true,
    rewriting: "M is the unique semifinite von Neumann algebra carrying canonical trace τ. The parameter t indexes the modular automorphism group σ_t by construction.",
    layer: 2,
  },
  {
    id: "emergent_time",
    title: "Generic Emergent-Time Claim",
    formalism: "∂ρ/∂t = -i[H, ρ]",
    prose: "The universe cools into time as the density matrix flows along the Hamiltonian.",
    verb: "cools into",
    mechanism: null,
    discharged: false,
    rewriting: null,
    layer: 3,
  },
  {
    id: "arm_aural",
    title: "ARM → AURAL-M EL Mapping",
    formalism: "EL0 ⊂ EL1 ⊂ EL2 ⊂ EL3",
    prose: "The constitutional layer stack enforces privilege separation by mapping exception levels to governance tiers. Escalation is blocked at the NS-bit boundary unless the constitutional gate authorizes passage.",
    verb: "enforces",
    mechanism: "NS-bit: TrustZone hardware boundary. EL3 monitor controls SCR_EL3.NS. Pipeline flush on boundary crossing. Passage requires AURAL-M Pi_K token in EL2 before NS-bit transition.",
    discharged: true,
    rewriting: "NS-bit ∈ {0,1} is set by EL3 monitor. Passage is the state NS=0→1 gated by Pi_K token verification at EL2. No traversal absent token.",
    layer: 3,
  },
];

function GatePulse({ active, discharged }) {
  return (
    <div style={{
      position: "relative",
      height: "2px",
      background: discharged ? "#2ECC71" : active ? "#E74C3C" : "#1E1E30",
      margin: "0",
      transition: "background 0.4s",
      boxShadow: active
        ? discharged
          ? "0 0 12px 2px #2ECC7188"
          : "0 0 16px 4px #E74C3C88"
        : "none",
    }}>
      {active && !discharged && (
        <div style={{
          position: "absolute",
          top: "-10px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "10px",
          color: "#E74C3C",
          fontFamily: "JetBrains Mono, monospace",
          whiteSpace: "nowrap",
          letterSpacing: "0.1em",
        }}>
          ⚠ LEAK DETECTED — VERB UNDISCHARGED
        </div>
      )}
      {active && discharged && (
        <div style={{
          position: "absolute",
          top: "-10px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "10px",
          color: "#2ECC71",
          fontFamily: "JetBrains Mono, monospace",
          whiteSpace: "nowrap",
          letterSpacing: "0.1em",
        }}>
          ✓ GATE DISCHARGED — TRAVERSAL AUTHORIZED
        </div>
      )}
    </div>
  );
}

function LayerStack({ activeLayer, discharged, active }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0", width: "100%" }}>
      {[3, 2, 1].map((l) => {
        const layer = LAYER_TAXONOMY[l];
        const isActive = activeLayer === l && active;
        const atBoundary = l === 3 && active;
        return (
          <div key={l}>
            {l === 3 && active && (
              <GatePulse active={active} discharged={discharged} />
            )}
            <div style={{
              padding: "10px 14px",
              background: isActive ? `${layer.color}18` : "#10101A",
              borderLeft: `3px solid ${isActive ? layer.color : "#1E1E30"}`,
              transition: "all 0.3s",
              marginTop: l === 3 ? "14px" : "2px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "11px",
                  color: isActive ? layer.color : "#555",
                  letterSpacing: "0.08em",
                }}>
                  {layer.label}
                </span>
                <span style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12px",
                  color: isActive ? layer.color : "#333",
                }}>
                  {layer.desc}
                </span>
              </div>
              {isActive && (
                <div style={{
                  fontSize: "10px",
                  color: "#666",
                  marginTop: "4px",
                  fontFamily: "Inter, sans-serif",
                }}>
                  {layer.note}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AccountCard({ account, onSelect, selected }) {
  return (
    <div
      onClick={() => onSelect(account)}
      style={{
        padding: "12px 14px",
        background: selected ? "#16161F" : "#10101A",
        border: `1px solid ${selected ? "#C8A84B44" : "#1E1E30"}`,
        cursor: "pointer",
        transition: "all 0.2s",
        borderRadius: "2px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "12px",
            color: selected ? "#C8A84B" : "#888",
            marginBottom: "4px",
          }}>
            {account.title}
          </div>
          <div style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "13px",
            color: selected ? "#fff" : "#666",
          }}>
            {account.formalism}
          </div>
        </div>
        <div style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: account.discharged ? "#2ECC71" : "#E74C3C",
          marginTop: "4px",
          flexShrink: 0,
          boxShadow: account.discharged ? "0 0 6px #2ECC7188" : "0 0 6px #E74C3C88",
        }} />
      </div>
    </div>
  );
}

function AuditPanel({ account }) {
  const [phase, setPhase] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setPhase(0);
    const steps = [1, 2, 3];
    let i = 0;
    const next = () => {
      if (i < steps.length) {
        setPhase(steps[i]);
        i++;
        timerRef.current = setTimeout(next, 600);
      }
    };
    timerRef.current = setTimeout(next, 300);
    return () => clearTimeout(timerRef.current);
  }, [account.id]);

  const rows = [
    { label: "VERB UNDER AUDIT", value: `"${account.verb}"`, color: "#C8A84B" },
    { label: "FORMAL LAYER", value: `Layer ${account.layer}`, color: LAYER_TAXONOMY[account.layer].color },
    {
      label: "MECHANISM SPECIFIED",
      value: account.mechanism ? "YES" : "NO",
      color: account.mechanism ? "#2ECC71" : "#E74C3C",
    },
    {
      label: "DISCHARGE STATUS",
      value: account.discharged ? "DISCHARGED" : "LEAK",
      color: account.discharged ? "#2ECC71" : "#E74C3C",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {rows.map((row, i) => (
        <div key={row.label} style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: "#0D0D16",
          border: "1px solid #1E1E30",
          opacity: phase > i ? 1 : 0,
          transform: phase > i ? "translateX(0)" : "translateX(-8px)",
          transition: "all 0.3s",
        }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#555", letterSpacing: "0.1em" }}>
            {row.label}
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: row.color }}>
            {row.value}
          </span>
        </div>
      ))}

      {phase >= 3 && account.mechanism && (
        <div style={{
          padding: "10px 12px",
          background: "#0A130F",
          border: "1px solid #2ECC7133",
          marginTop: "4px",
        }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#2ECC71", marginBottom: "6px", letterSpacing: "0.1em" }}>
            CONSTITUTIONAL REWRITING
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#aaa", lineHeight: "1.6" }}>
            {account.rewriting}
          </div>
        </div>
      )}

      {phase >= 3 && !account.discharged && (
        <div style={{
          padding: "10px 12px",
          background: "#130A0A",
          border: "1px solid #E74C3C33",
          marginTop: "4px",
        }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#E74C3C", marginBottom: "6px", letterSpacing: "0.1em" }}>
            GATE BLOCKED — NO REWRITING AVAILABLE
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#888", lineHeight: "1.6" }}>
            The verb "{account.verb}" transfers explanatory burden to prose. No finite static rewriting preserves the claim. Traversal unauthorized.
          </div>
        </div>
      )}
    </div>
  );
}

export default function AURALMRuntime() {
  const [selected, setSelected] = useState(TEST_ACCOUNTS[0]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0F",
      color: "#fff",
      fontFamily: "Inter, sans-serif",
      padding: "24px 20px",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ marginBottom: "28px", borderBottom: "1px solid #1E1E30", paddingBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "#C8A84B",
            boxShadow: "0 0 8px #C8A84B",
          }} />
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#C8A84B", letterSpacing: "0.15em" }}>
            AURAL-M CONSTITUTIONAL RUNTIME
          </span>
        </div>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Layer 2/3 Boundary Enforcement
        </h1>
        <p style={{ margin: 0, fontSize: "12px", color: "#555", lineHeight: "1.5" }}>
          Where the audit standard detects undischarged verbs, the constitutional gate enforces the boundary.
          Every traversal claim is evaluated against a finite static rewriting. No mechanism — no passage.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Layer Stack */}
        <div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#444", letterSpacing: "0.1em", marginBottom: "10px" }}>
            STRUCTURAL TAXONOMY
          </div>
          <LayerStack
            activeLayer={selected.layer}
            discharged={selected.discharged}
            active={true}
          />
        </div>

        {/* Account selector */}
        <div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#444", letterSpacing: "0.1em", marginBottom: "10px" }}>
            SELECT ACCOUNT FOR AUDIT
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {TEST_ACCOUNTS.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                onSelect={setSelected}
                selected={selected.id === acc.id}
              />
            ))}
          </div>
        </div>

        {/* Prose under audit */}
        <div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#444", letterSpacing: "0.1em", marginBottom: "10px" }}>
            PROSE UNDER AUDIT
          </div>
          <div style={{
            padding: "12px 14px",
            background: "#10101A",
            border: "1px solid #1E1E30",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
            color: "#aaa",
            lineHeight: "1.7",
          }}>
            {selected.prose.split(selected.verb).map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span style={{
                    color: selected.discharged ? "#2ECC71" : "#E74C3C",
                    background: selected.discharged ? "#2ECC7115" : "#E74C3C15",
                    padding: "1px 4px",
                    borderRadius: "2px",
                    fontWeight: 700,
                  }}>
                    {selected.verb}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Audit panel */}
        <div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#444", letterSpacing: "0.1em", marginBottom: "10px" }}>
            CONSTITUTIONAL GATE EVALUATION
          </div>
          <AuditPanel key={selected.id} account={selected} />
        </div>

        {/* Footer theorem */}
        <div style={{
          padding: "12px 14px",
          background: "#0D0D16",
          border: "1px solid #C8A84B22",
          marginTop: "8px",
        }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#C8A84B44", marginBottom: "6px", letterSpacing: "0.1em" }}>
            CO-CONSTITUTION THEOREM
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: "#C8A84B99" }}>
            B := S ∩ I(S)
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#444", marginTop: "4px" }}>
            The boundary is not assumed. It is the intersection of the state manifold and the image of the inspection operator.
            Every traversal claim must present a token in B or the gate does not open.
          </div>
        </div>

      </div>
    </div>
  );
}
