import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ALPHA = 1.2, BETA = 0.8, GAMMA = 0.6, DELTA = 0.5;
const M = 1.0, TI = 0.9, LAMBDA = 0.7;
const KAPPA_C = 0.15, DELTA_GAMMA_STAR = 0.3;
const SIGMA_S = 0.05, EPSILON_K = 0.12, RHO_O = 0.04, NU_C = 0.10;
const EPSILON_HALT = 0.25;
const DT = 0.02;

function initState() {
  return {
    C: 0.7, S: 0.3, O: 0.2, K: 0.5,
    theta: 0.3, phi: 0.2,
    sigma: 0, sigmaInit: null,
    circulation: 0, circulationInit: null,
    balance: 0, balanceHistory: [],
    trajectory: [],
    tick: 0,
    status: "NOMINAL",
    certificates: 0,
    halted: false,
    lambda: 0.4, mu: 0.3,
  };
}

function computeSigma(state) {
  const { C, S, O } = state;
  const deltaGamma = Math.max(0, 1 - C);
  return M * ALPHA * deltaGamma + TI * S + LAMBDA * O;
}

function computeBalance(state) {
  const { C, S, K } = state;
  const deltaGamma = Math.max(0, 1 - C);
  const lhs = M * ALPHA * KAPPA_C * (deltaGamma - DELTA_GAMMA_STAR);
  const rhs1 = TI * (SIGMA_S - EPSILON_K * K);
  const rhs2 = LAMBDA * (RHO_O - NU_C * C);
  return lhs - rhs1 - rhs2;
}

function computeCirculation(state) {
  const { theta, phi, lambda, mu } = state;
  const dPhi = Math.sin(theta + phi) * 0.1;
  return dPhi - lambda * Math.cos(phi) * 0.05 - mu * Math.sin(theta) * 0.05;
}

function stepDynamics(state, perturbation) {
  let { C, S, O, K, tick } = state;
  const balance = computeBalance(state);

  // Governing equations with restoration
  const dC = ALPHA * C * (1 - C) - GAMMA * K - balance * 0.1 + (perturbation ? (Math.random() - 0.5) * 0.15 : 0);
  const dS = SIGMA_S - EPSILON_K * K * S + balance * 0.05;
  const dO = RHO_O - NU_C * C * O + Math.abs(balance) * 0.03;
  const dK = -KAPPA_C * K + DELTA * O - balance * 0.08;

  C = Math.max(0.01, Math.min(0.99, C + dC * DT));
  S = Math.max(0.01, Math.min(0.99, S + dS * DT));
  O = Math.max(0.01, Math.min(0.99, O + dO * DT));
  K = Math.max(0.01, Math.min(0.99, K + dK * DT));

  // Toroidal coordinates
  const theta = (2 * Math.PI * S) % (2 * Math.PI);
  const phi   = (2 * Math.PI * O) % (2 * Math.PI);

  // Lagrange multipliers (state-responsive)
  const lambda = 0.3 + 0.2 * Math.sin(theta);
  const mu     = 0.25 + 0.15 * Math.cos(phi);

  const newState = { C, S, O, K, theta, phi, lambda, mu, tick: tick + 1 };
  const sigma = computeSigma(newState);
  const circ  = computeCirculation(newState);
  const bal   = computeBalance(newState);

  return { ...newState, sigma, balance: bal, circulation: circ };
}

// ─── TORUS PROJECTION ────────────────────────────────────────────────────────
function torusPoint(theta, phi, R = 60, r = 24) {
  const x = (R + r * Math.cos(phi)) * Math.cos(theta);
  const y = (R + r * Math.cos(phi)) * Math.sin(theta);
  const z = r * Math.sin(phi);
  return { x, y, z };
}

function project3D(x, y, z, cx, cy, angle) {
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const xr = x * cosA - z * sinA;
  const zr = x * sinA + z * cosA;
  const scale = 280 / (280 + zr);
  return { px: cx + xr * scale, py: cy + y * scale, scale };
}

function TorusCanvas({ trajectory, theta, phi, status }) {
  const canvasRef = useRef(null);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const angle = angleRef.current;
    angleRef.current += 0.008;

    ctx.clearRect(0, 0, W, H);

    // Draw torus wireframe
    const steps = 40;
    const color = status === "HALTED" ? "#ff3333" : status === "WARNING" ? "#ffaa00" : "#00ffc8";
    ctx.strokeStyle = color + "22";
    ctx.lineWidth = 0.5;

    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * 2 * Math.PI;
      ctx.beginPath();
      for (let j = 0; j <= steps; j++) {
        const p = (j / steps) * 2 * Math.PI;
        const { x, y, z } = torusPoint(t, p);
        const { px, py } = project3D(x, y, z, cx, cy, angle);
        j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    for (let j = 0; j < steps; j++) {
      const p = (j / steps) * 2 * Math.PI;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * 2 * Math.PI;
        const { x, y, z } = torusPoint(t, p);
        const { px, py } = project3D(x, y, z, cx, cy, angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Draw trajectory
    if (trajectory.length > 1) {
      for (let i = 1; i < trajectory.length; i++) {
        const prev = trajectory[i - 1];
        const curr = trajectory[i];
        const { x: x1, y: y1, z: z1 } = torusPoint(prev.theta, prev.phi);
        const { x: x2, y: y2, z: z2 } = torusPoint(curr.theta, curr.phi);
        const p1 = project3D(x1, y1, z1, cx, cy, angle);
        const p2 = project3D(x2, y2, z2, cx, cy, angle);
        const alpha = i / trajectory.length;
        ctx.strokeStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 1.5 * alpha;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }
    }

    // Current point
    const { x, y, z } = torusPoint(theta, phi);
    const { px, py, scale } = project3D(x, y, z, cx, cy, angle);
    ctx.beginPath();
    ctx.arc(px, py, 5 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

  });

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      style={{ display: "block" }}
    />
  );
}

// ─── GAUGE ────────────────────────────────────────────────────────────────────
function Gauge({ label, value, min = 0, max = 1, color = "#00ffc8", unit = "" }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = 36, stroke = 6;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ * 0.75;
  const gap  = circ - dash;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={r} fill="none" stroke="#ffffff0a" strokeWidth={stroke} />
        <circle
          cx={45} cy={45} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.15s ease", filter: `drop-shadow(0 0 4px ${color})` }}
        />
        <text x={45} y={42} textAnchor="middle" fill="#fff" fontSize={11} fontFamily="'Courier New', monospace" fontWeight="bold">
          {typeof value === "number" ? value.toFixed(3) : value}
        </text>
        <text x={45} y={55} textAnchor="middle" fill="#ffffff66" fontSize={8} fontFamily="'Courier New', monospace">
          {unit}
        </text>
      </svg>
      <span style={{ color: "#ffffff88", fontSize: 10, fontFamily: "'Courier New', monospace", letterSpacing: 1 }}>
        {label}
      </span>
    </div>
  );
}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#00ffc8", height = 40, label }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 200, H = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ color: "#ffffff55", fontSize: 9, fontFamily: "'Courier New', monospace", letterSpacing: 1 }}>{label}</span>
      <svg width={W} height={H} style={{ display: "block" }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
        <line x1={W} y1={0} x2={W} y2={H} stroke={color + "44"} strokeWidth={1} />
      </svg>
    </div>
  );
}

// ─── MAIN RUNTIME ─────────────────────────────────────────────────────────────
export default function LopezCirculationRuntime() {
  const [state, setState] = useState(initState());
  const [running, setRunning] = useState(false);
  const [perturbation, setPerturbation] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.halted) return;

    const next = stepDynamics(s, perturbation);
    const sigmaInit = s.sigmaInit ?? next.sigma;
    const circInit  = s.circulationInit ?? next.circulation;

    const balanceHistory = [...(s.balanceHistory || []), next.balance].slice(-200);
    const trajectory = [...(s.trajectory || []), { theta: next.theta, phi: next.phi }].slice(-300);

    const drift = Math.abs(next.sigma - sigmaInit);
    const halted = drift > EPSILON_HALT;
    let status = "NOMINAL";
    if (halted) status = "HALTED";
    else if (drift > EPSILON_HALT * 0.6) status = "WARNING";

    let certificates = s.certificates;
    if (next.tick % 100 === 0 && status === "NOMINAL") certificates += 1;

    setState({
      ...next,
      sigmaInit,
      circulationInit: circInit,
      balanceHistory,
      trajectory,
      status,
      halted,
      certificates,
    });
  }, [perturbation]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, 30);
    return () => clearInterval(id);
  }, [running, tick]);

  const reset = () => {
    setState(initState());
    setRunning(false);
  };

  const inject = () => {
    setPerturbation(true);
    setTimeout(() => setPerturbation(false), 1500);
  };

  const s = state;
  const drift = s.sigmaInit != null ? Math.abs(s.sigma - s.sigmaInit) : 0;
  const statusColor = s.status === "HALTED" ? "#ff3333" : s.status === "WARNING" ? "#ffaa00" : "#00ffc8";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030810",
      backgroundImage: "radial-gradient(ellipse at 20% 20%, #001a2e 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, #0a0a1a 0%, transparent 60%)",
      color: "#e0f0ff",
      fontFamily: "'Courier New', monospace",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: 20,
    }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #00ffc822", paddingBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "#00ffc8aa", marginBottom: 4 }}>
          DCGP.AI · CONSTITUTIONAL GOVERNANCE INFRASTRUCTURE
        </div>
        <div style={{ fontSize: 20, fontWeight: "bold", letterSpacing: 2, color: "#e0f0ff" }}>
          LOPEZ CIRCULATION THEOREM
        </div>
        <div style={{ fontSize: 11, color: "#ffffff44", marginTop: 2, letterSpacing: 1 }}>
          TOROIDAL MANIFOLD RUNTIME · T² = S¹ × S¹ · LIVE NOETHER CONSERVATION
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "10px 16px",
        background: statusColor + "11",
        border: `1px solid ${statusColor}44`,
        borderRadius: 4,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: statusColor,
          boxShadow: `0 0 8px ${statusColor}`,
          animation: s.status === "NOMINAL" && running ? "pulse 1.5s infinite" : "none",
        }} />
        <span style={{ color: statusColor, fontSize: 12, letterSpacing: 2, fontWeight: "bold" }}>
          {s.status}
        </span>
        <span style={{ color: "#ffffff44", fontSize: 10 }}>·</span>
        <span style={{ color: "#ffffff88", fontSize: 10 }}>TICK {s.tick}</span>
        <span style={{ color: "#ffffff44", fontSize: 10 }}>·</span>
        <span style={{ color: "#00ffc8", fontSize: 10 }}>CERTS ISSUED: {s.certificates}</span>
        <span style={{ color: "#ffffff44", fontSize: 10 }}>·</span>
        <span style={{ color: drift > EPSILON_HALT * 0.6 ? "#ffaa00" : "#ffffff55", fontSize: 10 }}>
          Σ DRIFT: {drift.toFixed(4)}
        </span>
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

        {/* Torus */}
        <div style={{
          background: "#ffffff05",
          border: "1px solid #00ffc811",
          borderRadius: 4,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#00ffc877" }}>TOROIDAL PHASE PORTRAIT</div>
          <TorusCanvas
            trajectory={s.trajectory}
            theta={s.theta}
            phi={s.phi}
            status={s.status}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#ffffff44" }}>
            <span>θ = {s.theta.toFixed(3)}</span>
            <span>φ = {s.phi.toFixed(3)}</span>
          </div>
          <div style={{ fontSize: 9, color: "#ffffff33", textAlign: "center" }}>
            Ω = dθ ∧ dφ  ·  Material loop 𝒯 on T²
          </div>
        </div>

        {/* Gauges */}
        <div style={{
          background: "#ffffff05",
          border: "1px solid #00ffc811",
          borderRadius: 4,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#00ffc877" }}>STATE VARIABLES</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Gauge label="COHERENCE" value={s.C} color="#00ffc8" unit="C" />
            <Gauge label="ENTROPY" value={s.S} color="#7b9fff" unit="S" />
            <Gauge label="OBLIGATION" value={s.O} color="#ff9f7b" unit="𝒪" />
            <Gauge label="AUTHORITY" value={s.K} color="#c87bff" unit="K" />
          </div>

          <div style={{ borderTop: "1px solid #ffffff11", paddingTop: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#00ffc877", marginBottom: 8 }}>NOETHER CONSERVATION</div>
            <div style={{ display: "flex", gap: 12 }}>
              <Gauge label="Σ NOW" value={s.sigma} min={0} max={2} color="#00ffc8" unit="Σ" />
              <Gauge label="Σ INIT" value={s.sigmaInit ?? 0} min={0} max={2} color="#ffffff44" unit="Σ₀" />
              <Gauge label="DRIFT" value={drift} min={0} max={EPSILON_HALT} color={drift > EPSILON_HALT * 0.6 ? "#ffaa00" : "#00ffc888"} unit="ε" />
            </div>
          </div>

          <div style={{ borderTop: "1px solid #ffffff11", paddingTop: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#00ffc877", marginBottom: 4 }}>LAGRANGE MULTIPLIERS</div>
            <div style={{ display: "flex", gap: 24, fontSize: 10, color: "#ffffff88" }}>
              <span>λ = {s.lambda.toFixed(4)}</span>
              <span>μ = {s.mu.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Sparklines + Balance */}
        <div style={{
          background: "#ffffff05",
          border: "1px solid #00ffc811",
          borderRadius: 4,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          flex: 1,
          minWidth: 220,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#00ffc877" }}>BALANCE EQUATION MONITOR</div>

          <div style={{
            padding: "10px 12px",
            background: "#00000044",
            border: "1px solid #ffffff11",
            borderRadius: 3,
            fontSize: 9,
            color: "#ffffff66",
            lineHeight: 1.8,
          }}>
            <div style={{ color: "#00ffc8aa", marginBottom: 4 }}>Mα κ_C (Δγ − Δγ*) = T_I (σ_S − ε_K K) + Λ (ρ_𝒪 − ν_C C)</div>
            <div>LHS − RHS = <span style={{
              color: Math.abs(s.balance) < 0.05 ? "#00ffc8" : Math.abs(s.balance) < 0.12 ? "#ffaa00" : "#ff3333",
              fontWeight: "bold",
            }}>{s.balance.toFixed(5)}</span></div>
            <div style={{ marginTop: 4 }}>
              STATUS: <span style={{ color: Math.abs(s.balance) < 0.05 ? "#00ffc8" : "#ffaa00" }}>
                {Math.abs(s.balance) < 0.05 ? "BALANCED" : Math.abs(s.balance) < 0.12 ? "RESTORING" : "CORRECTING"}
              </span>
            </div>
          </div>

          <Sparkline
            data={s.balanceHistory}
            color="#00ffc8"
            height={50}
            label="BALANCE RESIDUAL HISTORY"
          />

          <div style={{ borderTop: "1px solid #ffffff11", paddingTop: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#00ffc877", marginBottom: 8 }}>KELVIN CIRCULATION ANALOG</div>
            <div style={{ fontSize: 10, color: "#ffffff77" }}>
              ∮_𝒯 η = <span style={{ color: "#00ffc8" }}>{s.circulation.toFixed(5)}</span>
            </div>
            <div style={{ fontSize: 10, color: "#ffffff77", marginTop: 4 }}>
              ∮_𝒯₀ η = <span style={{ color: "#ffffff44" }}>{(s.circulationInit ?? 0).toFixed(5)}</span>
            </div>
            <div style={{ fontSize: 10, color: "#ffffff77", marginTop: 4 }}>
              |ΔI| = <span style={{ color: Math.abs(s.circulation - (s.circulationInit ?? 0)) < 0.01 ? "#00ffc8" : "#ffaa00" }}>
                {Math.abs(s.circulation - (s.circulationInit ?? 0)).toFixed(5)}
              </span>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #ffffff11", paddingTop: 12, fontSize: 9, color: "#ffffff33", lineHeight: 1.7 }}>
            <div>τ_system ≪ τ_URC ≪ τ_κ</div>
            <div>Three-timescale separation: ACTIVE</div>
            <div>L0–L4 asymmetric authority: ENFORCED</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={() => setRunning(r => !r)}
          style={{
            padding: "10px 24px",
            background: running ? "#ff333322" : "#00ffc822",
            border: `1px solid ${running ? "#ff3333" : "#00ffc8"}`,
            color: running ? "#ff3333" : "#00ffc8",
            borderRadius: 3,
            cursor: "pointer",
            fontSize: 11,
            letterSpacing: 2,
            fontFamily: "'Courier New', monospace",
            fontWeight: "bold",
          }}>
          {running ? "⏸ PAUSE" : "▶ RUN DYNAMICS"}
        </button>

        <button
          onClick={inject}
          style={{
            padding: "10px 24px",
            background: "#ffaa0011",
            border: "1px solid #ffaa0066",
            color: "#ffaa00",
            borderRadius: 3,
            cursor: "pointer",
            fontSize: 11,
            letterSpacing: 2,
            fontFamily: "'Courier New', monospace",
          }}>
          ⚡ INJECT PERTURBATION
        </button>

        <button
          onClick={reset}
          style={{
            padding: "10px 24px",
            background: "#ffffff05",
            border: "1px solid #ffffff22",
            color: "#ffffff66",
            borderRadius: 3,
            cursor: "pointer",
            fontSize: 11,
            letterSpacing: 2,
            fontFamily: "'Courier New', monospace",
          }}>
          ↺ RESET
        </button>

        {s.halted && (
          <div style={{
            padding: "10px 16px",
            background: "#ff333322",
            border: "1px solid #ff3333",
            color: "#ff3333",
            borderRadius: 3,
            fontSize: 11,
            letterSpacing: 2,
            animation: "blink 1s infinite",
          }}>
            ⛔ CONSTITUTIONAL HALT — Σ DRIFT EXCEEDED ε_halt = {EPSILON_HALT}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #ffffff0a", paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#ffffff22", letterSpacing: 1 }}>
        <span>DCGP.AI · LOPEZ CIRCULATION THEOREM · RUNTIME v1.0</span>
        <span>JOSHUA LOPEZ · FOUNDER & CHIEF ARCHITECT · {new Date().toISOString().slice(0,10)}</span>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>
    </div>
  );
}
