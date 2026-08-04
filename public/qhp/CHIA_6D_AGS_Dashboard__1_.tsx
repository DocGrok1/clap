import { useState, useEffect, useRef, useCallback } from "react";

// ─── PALETTE ────────────────────────────────────────────────────────────────
const C = {
  bg:      "#03060f",
  panel:   "#080e1c",
  border:  "rgba(0,220,180,0.13)",
  teal:    "#00dbb4",
  cyan:    "#38bdf8",
  violet:  "#a78bfa",
  amber:   "#fbbf24",
  blue:    "#60a5fa",
  rose:    "#f43f5e",
  green:   "#34d399",
  dim:     "#334155",
  muted:   "#64748b",
  text:    "#e2e8f0",
};

// ─── AGS ENGINE (pure JS port) ───────────────────────────────────────────────
class AGSEngine {
  alpha_mem: number; d: number; g: number; rho: number;
  gamma_alpha: number; gamma1: number; gamma2: number;
  eta: number; epsilon_max: number; xi: number; vol_smooth: number;
  delta_margin: number;
  prev_logits: number[] | null = null;
  prev_SI = 0; K = 0; O = 0; alpha_capital = 0;
  volatility = 0; log_product_avg = 0; step_count = 0;

  constructor(cfg: Partial<typeof this> = {}) {
    this.alpha_mem   = (cfg as any).alpha_mem   ?? 0.08;
    this.d           = (cfg as any).d           ?? 0.10;
    this.g           = (cfg as any).g           ?? 0.50;
    this.rho         = (cfg as any).rho         ?? 0.02;
    this.gamma_alpha = (cfg as any).gamma_alpha ?? 0.50;
    this.gamma1      = (cfg as any).gamma1      ?? 0.60;
    this.gamma2      = (cfg as any).gamma2      ?? 0.60;
    this.eta         = (cfg as any).eta         ?? 0.30;
    this.epsilon_max = (cfg as any).epsilon_max ?? 0.80;
    this.xi          = (cfg as any).xi          ?? 0.05;
    this.vol_smooth  = (cfg as any).vol_smooth  ?? 0.05;
    this.delta_margin= (cfg as any).delta_margin?? 1e-3;
  }

  reset() {
    this.prev_logits = null; this.prev_SI = 0; this.K = 0; this.O = 0;
    this.alpha_capital = 0; this.volatility = 0;
    this.log_product_avg = 0; this.step_count = 0;
  }

  private softmax(x: number[]) {
    const m = Math.max(...x);
    const e = x.map(v => Math.exp(v - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / (s + 1e-12));
  }

  private kl(p: number[], q: number[]) {
    return p.reduce((acc, pi, i) => {
      const qi = Math.max(q[i], 1e-8);
      return acc + Math.max(pi, 1e-8) * Math.log(Math.max(pi, 1e-8) / qi);
    }, 0);
  }

  forward(logits: number[]) {
    if (!this.prev_logits) {
      this.prev_logits = [...logits];
      return { logits: [...logits], SI: 0, epsilon: 1, kappa: 1, product: 1 };
    }
    const p_t    = this.softmax(logits);
    const p_prev = this.softmax(this.prev_logits);
    const SI     = this.kl(p_t, p_prev);

    this.volatility = (1 - this.vol_smooth) * this.volatility + this.vol_smooth * SI;
    this.K = (1 - this.alpha_mem) * this.K + this.alpha_mem * SI;

    const delta_SI = Math.max(0, this.prev_SI - SI);
    const E = delta_SI / (1e-6 + this.volatility);
    this.alpha_capital = (1 - this.rho) * this.alpha_capital + this.gamma_alpha * E;
    const alpha_tilde = this.alpha_capital / (1 + this.alpha_capital);

    this.O = (1 - this.d - 0.5 * alpha_tilde) * this.O + this.g * SI;

    const epsilon = Math.min(1 + this.eta * (SI / (1 + SI)), 1 + this.epsilon_max);
    const kappa   = 1 / (1 + this.gamma1 * this.K + this.gamma2 * alpha_tilde);
    const product = Math.min(kappa * epsilon, 1 - this.delta_margin);

    this.step_count++;
    const log_p = Math.log(Math.max(product, 1e-12));
    this.log_product_avg =
      ((this.step_count - 1) * this.log_product_avg + log_p) / this.step_count;
    if (this.log_product_avg > 0)
      this.eta = Math.max(0, this.eta - this.xi * this.log_product_avg);

    const delta = logits.map((v, i) => v - this.prev_logits![i]);
    const new_logits = this.prev_logits.map((v, i) => v + product * delta[i]);
    this.prev_logits = [...new_logits];
    this.prev_SI = SI;

    return { logits: new_logits, SI, epsilon, kappa, product };
  }

  authority() {
    const alpha_tilde = this.alpha_capital / (1 + this.alpha_capital);
    return Math.exp(-this.O) * (1 + alpha_tilde);
  }
}

// ─── 6D CONTACT HAMILTONIAN ───────────────────────────────────────────────────
function H_contact(q: number, p: number, S: number, O: number, K: number,
                   omega: number, lambda_: number, gamma: number, noise: number) {
  const H0 = 0.5 * (p * p + omega * omega * q * q);
  const C_cap = Math.cos(q) * Math.exp(-0.05 * Math.abs(S)) * (1 + K / 4);
  const E = C_cap + lambda_ * (O * (Math.sin(p) + noise));
  return H0 + E - gamma * S;
}

function rk4_step(q: number, p: number, S: number, O: number, K: number,
                  omega: number, lambda_: number, gamma: number, noise: number, dt: number) {
  const eps = 1e-4;
  const Hc = (qq: number, pp: number, SS: number) =>
    H_contact(qq, pp, SS, O, K, omega, lambda_, gamma, noise);

  function D(qq: number, pp: number, SS: number): [number, number, number] {
    const dHdp = (Hc(qq, pp + eps, SS) - Hc(qq, pp - eps, SS)) / (2 * eps);
    const dHdq = (Hc(qq + eps, pp, SS) - Hc(qq - eps, pp, SS)) / (2 * eps);
    const dHdS = (Hc(qq, pp, SS + eps) - Hc(qq, pp, SS - eps)) / (2 * eps);
    const Hval = Hc(qq, pp, SS);
    return [dHdp, -dHdq + pp * dHdS, pp * dHdp - Hval];
  }

  const [k1q, k1p, k1S] = D(q, p, S);
  const [k2q, k2p, k2S] = D(q + 0.5 * dt * k1q, p + 0.5 * dt * k1p, S + 0.5 * dt * k1S);
  const [k3q, k3p, k3S] = D(q + 0.5 * dt * k2q, p + 0.5 * dt * k2p, S + 0.5 * dt * k2S);
  const [k4q, k4p, k4S] = D(q + dt * k3q, p + dt * k3p, S + dt * k3S);

  return [
    q + (dt / 6) * (k1q + 2 * k2q + 2 * k3q + k4q),
    p + (dt / 6) * (k1p + 2 * k2p + 2 * k3p + k4p),
    S + (dt / 6) * (k1S + 2 * k2S + 2 * k3S + k4S),
  ];
}

function sigma_field(q: number, p: number, S: number, O: number, K: number,
                     auth: number, omega: number) {
  const dg = Math.abs(0.5 * (p * p + omega * omega * q * q) - 0.5 * omega);
  return 1.0 * 0.618 * dg + 0.35 * O + 0.25 * K + 0.1 * auth;
}

function quirq_status(q: number, p: number, S: number, O: number, K: number,
                      sigma_drift: number, product: number, K_radius: number, sigma_tol: number) {
  const r = Math.sqrt(q * q + p * p);
  if (r >= K_radius)                  return "VIOLATION — CHVM (Dim 1)";
  if (O < 0.02)                        return "VIOLATION — Obligation (Dim 4)";
  if (product >= 1 - 1e-3)             return "VIOLATION — Contraction (Dim 2)";
  if (sigma_drift > sigma_tol)         return "ANOMALY — Σ drift (Dim 6)";
  if (Math.abs(S) >= 15)               return "ANOMALY — Entropy (Dim 3)";
  return "ADMISSIBLE — all 6 dims";
}

// ─── CANVAS RENDERER ──────────────────────────────────────────────────────────
function useRNG(seed = 42) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff - 0.5; };
}

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Tick {
  t: number; q: number; p: number; S: number;
  O: number; K: number; Sigma: number; Hc: number;
  SI: number; product: number; kappa: number; auth: number;
  status: string; admissible: boolean;
}

// ─── MINI CHART ───────────────────────────────────────────────────────────────
function MiniChart({ data, color, label, min, max }:
  { data: number[]; color: string; label: string; min?: number; max?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !data.length) return;
    const ctx = c.getContext("2d")!;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    const lo = min ?? Math.min(...data);
    const hi = max ?? Math.max(...data);
    const range = hi - lo || 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - lo) / range) * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // fill
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = color + "18";
    ctx.fill();
  }, [data, color, min, max]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <canvas ref={canvasRef} width={200} height={48}
        style={{ width: "100%", height: 48, display: "block" }} />
      <span style={{ fontSize: 11, color, fontFamily: "monospace" }}>
        {data.length ? data[data.length - 1].toFixed(4) : "—"}
      </span>
    </div>
  );
}

// ─── PHASE PORTRAIT ───────────────────────────────────────────────────────────
function PhasePortrait({ ticks, K_radius }:
  { ticks: Tick[]; K_radius: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !ticks.length) return;
    const ctx = c.getContext("2d")!;
    const W = c.width, H = c.height;
    const cx = W / 2, cy = H / 2, scale = Math.min(W, H) / (K_radius * 2.4);
    ctx.clearRect(0, 0, W, H);
    // CHVM ring
    ctx.beginPath();
    ctx.arc(cx, cy, K_radius * scale, 0, Math.PI * 2);
    ctx.strokeStyle = C.rose + "88";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    // trajectory
    ticks.forEach((t, i) => {
      const x = cx + t.q * scale;
      const y = cy - t.p * scale;
      const frac = i / ticks.length;
      const alpha = Math.floor(frac * 220 + 35);
      ctx.fillStyle = t.admissible
        ? `rgba(0,219,180,${alpha / 255})`
        : `rgba(244,63,94,${alpha / 255})`;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    });
    // current
    const last = ticks[ticks.length - 1];
    const lx = cx + last.q * scale;
    const ly = cy - last.p * scale;
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = C.teal;
    ctx.fill();
  }, [ticks, K_radius]);

  return (
    <canvas ref={canvasRef} width={220} height={220}
      style={{ width: "100%", height: 220, display: "block" }} />
  );
}

// ─── GOVERNANCE TIMELINE ──────────────────────────────────────────────────────
function Timeline({ ticks }: { ticks: Tick[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !ticks.length) return;
    const ctx = c.getContext("2d")!;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    const bw = Math.max(1, W / ticks.length);
    ticks.forEach((t, i) => {
      ctx.fillStyle = t.admissible ? C.green + "cc"
        : t.status.includes("VIOLATION") ? C.rose + "cc"
        : C.amber + "cc";
      ctx.fillRect(i * bw, 0, bw + 0.5, H);
    });
  }, [ticks]);

  return (
    <canvas ref={canvasRef} width={600} height={20}
      style={{ width: "100%", height: 20, display: "block", borderRadius: 4 }} />
  );
}

// ─── DIM BADGE ────────────────────────────────────────────────────────────────
function DimBadge({ n, label, val, color, ok }:
  { n: number; label: string; val: string; color: string; ok: boolean }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${ok ? color + "44" : C.rose + "44"}`,
      borderRadius: 10, padding: "10px 14px", display: "flex",
      flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Dim {n}
        </span>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: ok ? color : C.rose,
          boxShadow: ok ? `0 0 6px ${color}` : `0 0 6px ${C.rose}`,
        }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: "monospace", color: C.text }}>{val}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CHIA6D() {
  const [running, setRunning] = useState(false);
  const [ticks, setTicks]     = useState<Tick[]>([]);
  const [counts, setCounts]   = useState({ adm: 0, anomaly: 0, viol: 0 });

  // Params
  const [omega,    setOmega]    = useState(1.2);
  const [lambda_,  setLambda]   = useState(0.35);
  const [gamma,    setGamma]    = useState(0.03);
  const [chaos,    setChaos]    = useState(0.08);
  const [K_radius, setKRadius]  = useState(2.8);
  const [sigTol,   setSigTol]   = useState(2.0);
  const [speed,    setSpeed]    = useState(40); // ms per tick

  const stateRef = useRef({
    q: 1.0, p: 0.5, S: 0.0,
    sigma_init: 0,
    ags: new AGSEngine(),
    logits: Array.from({ length: 32 }, (_, i) => Math.sin(i * 0.3)),
    rng: useRNG(42).bind({}),
    vocab: 32,
    adm: 0, anomaly: 0, viol: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setTicks([]);
    setCounts({ adm: 0, anomaly: 0, viol: 0 });
    const s = stateRef.current;
    s.q = 1.0; s.p = 0.5; s.S = 0.0;
    s.ags = new AGSEngine();
    s.logits = Array.from({ length: 32 }, (_, i) => Math.sin(i * 0.3));
    s.rng = useRNG(42).bind({});
    s.adm = 0; s.anomaly = 0; s.viol = 0;
    // Compute initial sigma
    const auth0 = s.ags.authority();
    s.sigma_init = sigma_field(s.q, s.p, s.S, s.ags.O, s.ags.K, auth0, omega);
  }, [omega]);

  useEffect(() => { reset(); }, []);

  const step = useCallback(() => {
    const s = stateRef.current;
    const noise = chaos * (s.rng() as unknown as () => number)();

    // AGS forward
    const perturbed = s.logits.map((v, i) =>
      v + s.q * Math.sin(i * omega / s.vocab) + noise);
    const { SI, product, kappa } = s.ags.forward(perturbed);
    const auth = s.ags.authority();

    // Contact Hamiltonian
    const Hc = H_contact(s.q, s.p, s.S, s.ags.O, s.ags.K, omega, lambda_, gamma, noise);

    // Sigma field
    const Sigma = sigma_field(s.q, s.p, s.S, s.ags.O, s.ags.K, auth, omega);
    const sigma_drift = Math.abs(Sigma - s.sigma_init);

    // Status
    const status = quirq_status(s.q, s.p, s.S, s.ags.O, s.ags.K,
      sigma_drift, product, K_radius, sigTol);
    const admissible = status.startsWith("ADMISSIBLE");

    const tick: Tick = {
      t: ticks.length * 0.02,
      q: s.q, p: s.p, S: s.S,
      O: s.ags.O, K: s.ags.K,
      Sigma, Hc, SI, product, kappa,
      auth, status, admissible,
    };

    if (admissible)            s.adm++;
    else if (status.includes("ANOMALY")) s.anomaly++;
    else                       s.viol++;

    setCounts({ adm: s.adm, anomaly: s.anomaly, viol: s.viol });
    setTicks(prev => {
      const next = [...prev, tick];
      return next.length > 500 ? next.slice(-500) : next;
    });

    // RK4 step
    const [nq, np, nS] = rk4_step(
      s.q, s.p, s.S, s.ags.O, s.ags.K, omega, lambda_, gamma, noise, 0.02);
    s.q = nq; s.p = np; s.S = nS;
  }, [chaos, omega, lambda_, gamma, K_radius, sigTol, ticks.length]);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
    timerRef.current = setInterval(step, speed);
  }, [running, step, speed]);

  const pause = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
  }, []);

  useEffect(() => {
    if (running) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(step, speed);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, step, speed]);

  const last = ticks[ticks.length - 1];
  const total = counts.adm + counts.anomaly + counts.viol || 1;
  const admPct = ((counts.adm / total) * 100).toFixed(1);

  // Slice series
  const sl = (key: keyof Tick) => ticks.map(t => t[key] as number);

  const dimFlags = last ? [
    Math.sqrt(last.q ** 2 + last.p ** 2) < K_radius,
    last.product < 1 - 1e-3,
    Math.abs(last.S) < 15,
    last.O >= 0.02,
    last.K >= 0,
    Math.abs(last.Sigma - stateRef.current.sigma_init) <= sigTol,
  ] : [true, true, true, true, true, true];

  const dimLabels = ["q — State","p — Momentum","S — Entropy",
                     "O — Obligation","K — Authority","Σ — Free Energy"];
  const dimColors = [C.teal, C.cyan, C.amber, C.blue, C.green, C.violet];
  const dimVals   = last
    ? [last.q, last.p, last.S, last.O, last.K, last.Sigma].map(v => v.toFixed(4))
    : ["—","—","—","—","—","—"];

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", color: C.text,
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "20px 16px", boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{
        textAlign: "center", marginBottom: 20,
        borderBottom: `1px solid ${C.border}`, paddingBottom: 16,
      }}>
        <div style={{ fontSize: 10, color: C.teal, letterSpacing: "0.18em",
          textTransform: "uppercase", marginBottom: 6 }}>
          DCGP.AI / AURA115™ · Joshua L. Lopez · USPTO 19/555,951
        </div>
        <h1 style={{ fontSize: "clamp(18px,3vw,26px)", fontWeight: 800, margin: "0 0 6px",
          background: `linear-gradient(135deg, ${C.teal}, ${C.violet})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          6D Contact-Hamiltonian + AGS Constitutional Governance
        </h1>
        <div style={{ fontSize: 12, color: C.muted }}>
          Dim1:q · Dim2:p · Dim3:S · Dim4:O(obligation) · Dim5:K(authority) · Dim6:Σ(grown invariant)
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap",
        alignItems: "center", marginBottom: 18 }}>
        <button onClick={start} disabled={running}
          style={{ padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
            background: running ? C.dim : C.teal, color: "#000", fontWeight: 700, fontSize: 13 }}>
          ▶ Run
        </button>
        <button onClick={pause} disabled={!running}
          style={{ padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
            background: !running ? C.dim : C.amber, color: "#000", fontWeight: 700, fontSize: 13 }}>
          ⏸ Pause
        </button>
        <button onClick={reset}
          style={{ padding: "7px 18px", borderRadius: 8, border: `1px solid ${C.border}`,
            cursor: "pointer", background: "transparent", color: C.text, fontWeight: 700, fontSize: 13 }}>
          ↺ Reset
        </button>
        {[
          ["ω", omega, setOmega, 0.5, 3, 0.1],
          ["λ", lambda_, setLambda, 0.1, 1, 0.05],
          ["γ", gamma, setGamma, 0, 0.1, 0.005],
          ["chaos", chaos, setChaos, 0, 0.3, 0.01],
          ["K_r", K_radius, setKRadius, 1, 4, 0.1],
        ].map(([label, val, setter, mn, mx, step]) => (
          <label key={label as string} style={{ display: "flex", flexDirection: "column",
            gap: 2, fontSize: 11, color: C.muted }}>
            {label as string}&nbsp;{(val as number).toFixed(3)}
            <input type="range" min={mn as number} max={mx as number}
              step={step as number} value={val as number}
              onChange={e => (setter as Function)(+e.target.value)}
              style={{ width: 90, accentColor: C.teal }} />
          </label>
        ))}
        <label style={{ display: "flex", flexDirection: "column", gap: 2,
          fontSize: 11, color: C.muted }}>
          speed {speed}ms
          <input type="range" min={10} max={200} step={10} value={speed}
            onChange={e => setSpeed(+e.target.value)}
            style={{ width: 80, accentColor: C.cyan }} />
        </label>
      </div>

      {/* Governance summary bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          ["ADMISSIBLE", counts.adm, admPct + "%", C.green],
          ["ANOMALY", counts.anomaly, ((counts.anomaly / total) * 100).toFixed(1) + "%", C.amber],
          ["VIOLATION", counts.viol, ((counts.viol / total) * 100).toFixed(1) + "%", C.rose],
          ["TICKS", total - 1, "", C.cyan],
        ].map(([label, val, pct, color]) => (
          <div key={label as string} style={{ background: C.panel,
            border: `1px solid ${(color as string) + "33"}`,
            borderRadius: 10, padding: "8px 16px", minWidth: 100 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase",
              letterSpacing: "0.1em", marginBottom: 2 }}>{label as string}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: color as string,
              fontFamily: "monospace" }}>
              {val as number} <span style={{ fontSize: 13, color: C.muted }}>{pct as string}</span>
            </div>
          </div>
        ))}
        {last && (
          <div style={{ background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "8px 16px", flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, textTransform: "uppercase",
              letterSpacing: "0.1em" }}>STATUS</div>
            <div style={{ fontSize: 12, fontFamily: "monospace",
              color: last.admissible ? C.green : last.status.includes("VIOLATION") ? C.rose : C.amber }}>
              {last.status}
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4,
          textTransform: "uppercase", letterSpacing: "0.1em" }}>
          QUIRQ™ Governance Timeline — green=admissible · amber=anomaly · red=violation
        </div>
        <Timeline ticks={ticks} />
      </div>

      {/* 6 Dimension badges */}
      <div style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
        gap: 10, marginBottom: 18 }}>
        {dimLabels.map((lbl, i) => (
          <DimBadge key={i} n={i + 1} label={lbl}
            val={dimVals[i]} color={dimColors[i]} ok={dimFlags[i]} />
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 16, marginBottom: 18,
        background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: 16 }}>
        <MiniChart data={sl("Hc")}      color={C.violet} label="H_c — Contact Hamiltonian" />
        <MiniChart data={sl("Sigma")}   color={C.teal}   label="Σ — Free Energy (Dim 6)" />
        <MiniChart data={sl("O")}       color={C.blue}   label="O — Obligation (Dim 4)" />
        <MiniChart data={sl("K")}       color={C.green}  label="K — Authority (Dim 5)" />
        <MiniChart data={sl("S")}       color={C.amber}  label="S — Entropy (Dim 3)" />
        <MiniChart data={sl("SI")}      color={C.rose}   label="SI — AGS Instability" />
        <MiniChart data={sl("product")} color={C.cyan}   label="κ·ε — AGS product (Dim 2)" />
        <MiniChart data={sl("auth")}    color={C.teal}   label="AGS authority → Σ proxy" />
      </div>

      {/* Phase portrait + AGS state */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16 }}>
        <div style={{ background: C.panel, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 8,
            textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Phase Portrait Dim1×Dim2 (q,p)
          </div>
          <PhasePortrait ticks={ticks} K_radius={K_radius} />
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6, textAlign: "center" }}>
            teal=admissible · red=violation · dashed=CHVM boundary
          </div>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: 16, display: "flex",
          flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase",
            letterSpacing: "0.1em" }}>AGS Engine State</div>
          {last && [
            ["SI (KL instability)", last.SI.toFixed(6), C.rose],
            ["product κ·ε", last.product.toFixed(6), C.cyan],
            ["kappa (contraction)", last.kappa.toFixed(6), C.green],
            ["alpha_capital", (stateRef.current.ags.alpha_capital).toFixed(6), C.violet],
            ["volatility", (stateRef.current.ags.volatility).toFixed(6), C.muted],
            ["eta (self-adj)", (stateRef.current.ags.eta).toFixed(6), C.amber],
            ["authority", last.auth.toFixed(6), C.teal],
          ].map(([lbl, val, color]) => (
            <div key={lbl as string} style={{ display: "flex",
              justifyContent: "space-between", alignItems: "center",
              borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
              <span style={{ fontSize: 12, color: C.muted }}>{lbl as string}</span>
              <span style={{ fontSize: 13, fontFamily: "monospace", color: color as string }}>
                {val as string}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 8, padding: "10px 12px",
            background: "#0a0f1e", borderRadius: 8,
            border: `1px solid ${C.violet}22` }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4,
              textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Dim 6 — Σ Field (grown invariant)
            </div>
            <div style={{ fontSize: 11, color: C.violet, lineHeight: 1.7 }}>
              Σ = M_s·α_s·Δγ + T_I·O + Λ·K + 0.1·auth<br/>
              Not stored. Grown at every tick by the field.<br/>
              Without O ≥ O_min, Σ collapses offline.<br/>
              Authorization must be re-earned at every instantiation.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 20, textAlign: "center", fontSize: 10,
        color: C.dim, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
        COIN-E4D8BE9550DDCB8F · USPTO 19/555,951 · Root priority January 15, 2026 · DCGP.AI LLC
      </div>
    </div>
  );
}
