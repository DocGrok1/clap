import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const DZ_RANGE = 6;
const DN_RANGE = 10;
const DIM = DZ_RANGE * DN_RANGE; // 60 shell configurations
const N_CYCLES = 300;
const DT = 0.05;

const C = {
  gold:   "#FFD700",
  cyan:   "#00CFFF",
  red:    "#FF4455",
  green:  "#00FF88",
  purple: "#9B7AFF",
  muted:  "#8899BB",
  bg:     "#0a0e1a",
  bg2:    "#111827",
  border: "#1a2a3a",
  text:   "#E2F0FF",
};

// ── MATH HELPERS ──────────────────────────────────────────────────────────────
function idx(dz, dn) { return dz * DN_RANGE + dn; }

function matMul(A, B, n) {
  const C = new Float64Array(n * n * 2);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < n; k++) {
      const ar = A[(i*n+k)*2], ai = A[(i*n+k)*2+1];
      for (let j = 0; j < n; j++) {
        const br = B[(k*n+j)*2], bi = B[(k*n+j)*2+1];
        C[(i*n+j)*2]   += ar*br - ai*bi;
        C[(i*n+j)*2+1] += ar*bi + ai*br;
      }
    }
  return C;
}

function matAdd(A, B, scale=1) {
  const R = new Float64Array(A.length);
  for (let i = 0; i < A.length; i++) R[i] = A[i] + scale * B[i];
  return R;
}

function matScale(A, s) {
  const R = new Float64Array(A.length);
  for (let i = 0; i < A.length; i++) R[i] = A[i] * s;
  return R;
}

function trace(A, n) {
  let r = 0;
  for (let i = 0; i < n; i++) r += A[(i*n+i)*2];
  return r;
}

function diag(A, n, i) { return A[(i*n+i)*2]; }

function conjT(A, n) {
  const R = new Float64Array(A.length);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      R[(j*n+i)*2]   =  A[(i*n+j)*2];
      R[(j*n+i)*2+1] = -A[(i*n+j)*2+1];
    }
  return R;
}

function enforceHerm(rho, n) {
  const R = new Float64Array(rho.length);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      R[(i*n+j)*2]   = 0.5*(rho[(i*n+j)*2]   + rho[(j*n+i)*2]);
      R[(i*n+j)*2+1] = 0.5*(rho[(i*n+j)*2+1] - rho[(j*n+i)*2+1]);
    }
  return R;
}

function normalizeRho(rho, n) {
  const tr = trace(rho, n);
  if (Math.abs(tr) < 1e-12) return rho;
  return matScale(rho, 1/tr);
}

// ── BUILD HAMILTONIAN ─────────────────────────────────────────────────────────
function buildHamiltonian() {
  const H = new Float64Array(DIM * DIM * 2);
  for (let dz = 0; dz < DZ_RANGE; dz++) {
    for (let dn = 0; dn < DN_RANGE; dn++) {
      const i = idx(dz, dn);
      const d2 = dz*dz + dn*dn;
      H[(i*DIM+i)*2] = (
        0.35*dz*dz
        + 0.28*dn*dn
        - 0.6*Math.exp(-0.25*d2)
        - 0.45*Math.exp(-0.18*(dz*dz + (dn-9)*(dn-9)))
        + 0.12*dz
      );
      if (dz > 0 && dn > 0) H[(i*DIM+i)*2] -= 0.04*Math.exp(-0.3*(dz+dn));
      if (dz+1 < DZ_RANGE) {
        const j = idx(dz+1, dn);
        H[(i*DIM+j)*2] = -0.07;
        H[(j*DIM+i)*2] = -0.07;
      }
      if (dn+1 < DN_RANGE) {
        const j = idx(dz, dn+1);
        H[(i*DIM+j)*2] = -0.055;
        H[(j*DIM+i)*2] = -0.055;
      }
    }
  }
  return H;
}

// ── POWER ITERATION for ground state ─────────────────────────────────────────
function groundState(H, n, iters=200) {
  // Start from uniform
  let v = new Float64Array(n*2);
  for (let i = 0; i < n; i++) v[i*2] = 1/Math.sqrt(n);

  for (let it = 0; it < iters; it++) {
    // Shift: apply (H - lambda_max * I) to get lowest eigenvalue via inverse power
    // Simple: apply H, then subtract largest diagonal component
    const Hv = new Float64Array(n*2);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        Hv[i*2]   += H[(i*n+j)*2]*v[j*2]   - H[(i*n+j)*2+1]*v[j*2+1];
        Hv[i*2+1] += H[(i*n+j)*2]*v[j*2+1] + H[(i*n+j)*2+1]*v[j*2];
      }
    // Find eigenvalue estimate
    let lambda = 0;
    for (let i = 0; i < n; i++) lambda += v[i*2]*Hv[i*2] + v[i*2+1]*Hv[i*2+1];
    // Shift and re-apply for inverse iteration approximation
    let norm = 0;
    for (let i = 0; i < n; i++) norm += Hv[i*2]*Hv[i*2] + Hv[i*2+1]*Hv[i*2+1];
    norm = Math.sqrt(norm);
    if (norm < 1e-12) break;
    for (let i = 0; i < n; i++) { v[i*2] = Hv[i*2]/norm; v[i*2+1] = Hv[i*2+1]/norm; }
  }

  // Find minimum energy state via simple search
  // Build diagonal energies
  let minE = Infinity, minI = 0;
  for (let i = 0; i < n; i++) {
    const e = H[(i*n+i)*2];
    if (e < minE) { minE = e; minI = i; }
  }
  // Ground state = basis vector at minimum energy (simplified)
  const gs = new Float64Array(n*2);
  gs[minI*2] = 1.0;
  return gs;
}

// ── LINDBLAD OPERATORS ────────────────────────────────────────────────────────
function buildLindblads(gamma_alpha=0.08, gamma_fission=0.04) {
  const ops = [];
  // Alpha decay
  for (let dz = 1; dz < DZ_RANGE; dz++) {
    for (let dn = 1; dn < DN_RANGE; dn++) {
      const i = idx(dz, dn), j = idx(dz-1, dn-1);
      const rate = gamma_alpha*(1+0.15*dz)*Math.exp(-0.1*(dz*dz+dn*dn));
      const L = new Float64Array(DIM*DIM*2);
      L[(j*DIM+i)*2] = Math.sqrt(rate);
      ops.push(L);
    }
  }
  // Spontaneous fission
  for (let dz = 3; dz < DZ_RANGE; dz++) {
    for (let dn = 0; dn < 5; dn++) {
      const i = idx(dz, dn);
      const rate = gamma_fission*dz*(1/(dn+1));
      const L = new Float64Array(DIM*DIM*2);
      L[(0*DIM+i)*2] = Math.sqrt(rate);
      ops.push(L);
    }
  }
  return ops;
}

// ── PHYSICS FUNCTIONS ─────────────────────────────────────────────────────────
function metaFidelity(rho, gs, n) {
  // F = <gs|rho|gs>
  let re = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const gsi_r = gs[i*2], gsi_i = gs[i*2+1];
      const gsj_r = gs[j*2], gsj_i = gs[j*2+1];
      const rij_r = rho[(i*n+j)*2], rij_i = rho[(i*n+j)*2+1];
      // gs*_i * rho_ij * gs_j
      re += (gsi_r*rij_r + gsi_i*rij_i)*gsj_r - (gsi_r*rij_i - gsi_i*rij_r)*gsj_i;
    }
  return Math.max(0, Math.min(1, re));
}

function islandOccupancy(rho) {
  let p = 0;
  for (let dz = 0; dz < 3; dz++)
    for (let dn = 6; dn < DN_RANGE; dn++)
      p += diag(rho, DIM, idx(dz, dn));
  return Math.max(0, p);
}

function lindbladRHS(rho, H, Lops, n) {
  // -i[H, rho]
  const Hr = matMul(H, rho, n);
  const rH = matMul(rho, H, n);
  const drho = new Float64Array(n*n*2);
  for (let k = 0; k < n*n; k++) {
    drho[k*2]   = -(- Hr[k*2+1] + rH[k*2+1]); // -i*(Hr-rH) real part = -(Hr_imag - rH_imag) ... 
    drho[k*2+1] = -(Hr[k*2] - rH[k*2]);        // imag part
  }
  // Correct: -i[H,rho] => real = Hr_imag - rH_imag (with -i factor), imag = -(Hr_real - rH_real)
  // Let's redo: commutator C = HR - rH, then -iC => real = C_imag, imag = -C_real
  const C_r = new Float64Array(n*n*2);
  for (let k = 0; k < n*n*2; k++) C_r[k] = Hr[k] - rH[k];
  for (let k = 0; k < n*n; k++) {
    drho[k*2]   =  C_r[k*2+1]; // real part of -i*C
    drho[k*2+1] = -C_r[k*2];   // imag part of -i*C
  }
  // Lindblad dissipator
  for (const L of Lops) {
    const Ld = conjT(L, n);
    const LdL = matMul(Ld, L, n);
    const LrLd = matMul(matMul(L, rho, n), Ld, n);
    const LdLr = matMul(LdL, rho, n);
    const rLdL = matMul(rho, LdL, n);
    for (let k = 0; k < n*n*2; k++) {
      drho[k] += LrLd[k] - 0.5*(LdLr[k] + rLdL[k]);
    }
  }
  return drho;
}

function rk4Step(rho, H, Lops, dt, n) {
  const k1 = lindbladRHS(rho, H, Lops, n);
  const k2 = lindbladRHS(matAdd(rho, k1, 0.5*dt), H, Lops, n);
  const k3 = lindbladRHS(matAdd(rho, k2, 0.5*dt), H, Lops, n);
  const k4 = lindbladRHS(matAdd(rho, k3, dt), H, Lops, n);
  let rhoNew = new Float64Array(rho.length);
  for (let k = 0; k < rho.length; k++)
    rhoNew[k] = rho[k] + (dt/6)*(k1[k]+2*k2[k]+2*k3[k]+k4[k]);
  rhoNew = enforceHerm(rhoNew, n);
  return normalizeRho(rhoNew, n);
}

function buildGovernanceH(Lops, K, O, gs, n) {
  const rhoTarget = new Float64Array(n*n*2);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      rhoTarget[(i*n+j)*2]   = gs[i*2]*gs[j*2]   + gs[i*2+1]*gs[j*2+1];
      rhoTarget[(i*n+j)*2+1] = gs[i*2+1]*gs[j*2] - gs[i*2]*gs[j*2+1];
    }
  const Hbase = new Float64Array(n*n*2);
  for (let k = 0; k < n*n*2; k++) Hbase[k] = rhoTarget[k] - (k%2===0 ? 1/n : 0);

  // Orthogonalize against Lindblad ops (simplified: subtract projections)
  let Horth = new Float64Array(Hbase);
  for (const L of Lops) {
    const Ld = conjT(L, n);
    const LdH = matMul(Ld, Horth, n);
    const LdL = matMul(Ld, L, n);
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += LdH[(i*n+i)*2]; den += LdL[(i*n+i)*2]; }
    if (Math.abs(den) > 1e-12) {
      const proj = num/den;
      for (let k = 0; k < n*n*2; k++) Horth[k] -= proj*L[k];
    }
  }
  let norm = 0;
  for (let k = 0; k < n*n*2; k++) norm += Horth[k]*Horth[k];
  norm = Math.sqrt(norm) + 1e-12;
  const scale = K*O*0.15/norm;
  const HG = new Float64Array(n*n*2);
  for (let k = 0; k < n*n*2; k++) HG[k] = scale*Horth[k];
  return enforceHerm(HG, n);
}

function obligationUpdate(O, F, K, dt) {
  const dO = 0.4*F - 0.05*O - 0.02*Math.abs(K);
  return Math.max(0, Math.min(5, O + dO*dt));
}

function authorityUpdate(K, F, dt) {
  const dK = 0.8*(F - 0.65) - 0.1*K;
  return Math.max(0, Math.min(3, K + dK*dt));
}

function memoryUpdate(M, F, dt) {
  const dM = 0.05*(F - 0.65) - 0.02*M;
  return M + dM*dt;
}

function rescueWindow(F, dFdt) {
  const margin = 0.65 - F;
  if (margin <= 0) return 20;
  return Math.min(20, margin / (0.5*Math.max(Math.abs(dFdt), 1e-6)));
}

function initialRhoMc290() {
  const rho = new Float64Array(DIM*DIM*2);
  rho[(idx(1,3)*DIM+idx(1,3))*2] = 0.55;
  rho[(idx(1,4)*DIM+idx(1,4))*2] = 0.20;
  rho[(idx(2,3)*DIM+idx(2,3))*2] = 0.15;
  rho[(idx(0,3)*DIM+idx(0,3))*2] = 0.10;
  rho[(idx(1,3)*DIM+idx(1,4))*2] = 0.04;
  rho[(idx(1,4)*DIM+idx(1,3))*2] = 0.04;
  return normalizeRho(rho, DIM);
}

// ── RUN SIMULATION (chunked for UI responsiveness) ────────────────────────────
function runSimulationChunk(state, governed, H_nuc, Lops, gs, steps) {
  let { rho, O, K, M, F_prev, dF_dt, cycle, history } = state;

  for (let s = 0; s < steps && cycle < N_CYCLES; s++, cycle++) {
    const F = metaFidelity(rho, gs, DIM);
    const island = islandOccupancy(rho);
    dF_dt = 0.9*dF_dt + 0.1*(F - F_prev)/DT;
    F_prev = F;

    history.push({
      cycle,
      fidelity: F,
      island,
      O,
      K,
      M,
      rescue: rescueWindow(F, dF_dt),
      meta: F * Math.min(O/2, 1),
    });

    let H_total;
    if (governed) {
      const HG = buildGovernanceH(Lops, K, O, gs, DIM);
      H_total = new Float64Array(H_nuc.length);
      for (let k = 0; k < H_nuc.length; k++) H_total[k] = H_nuc[k] + HG[k];
    } else {
      H_total = H_nuc;
    }

    rho = rk4Step(rho, H_total, Lops, DT, DIM);

    if (governed) {
      O = obligationUpdate(O, F, K, DT);
      K = authorityUpdate(K, F, DT);
      M = memoryUpdate(M, F, DT);
    }
  }

  return { rho, O, K, M, F_prev, dF_dt, cycle, history };
}

// ── NUCLEAR MAP COMPONENT ────────────────────────────────────────────────────
function NuclearMap({ rho, title }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!rho || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cellW = W / DN_RANGE, cellH = H / DZ_RANGE;

    // Find max for normalization
    let maxVal = 0;
    for (let dz = 0; dz < DZ_RANGE; dz++)
      for (let dn = 0; dn < DN_RANGE; dn++)
        maxVal = Math.max(maxVal, rho[(idx(dz,dn)*DIM+idx(dz,dn))*2]);

    ctx.fillStyle = C.bg2;
    ctx.fillRect(0,0,W,H);

    for (let dz = 0; dz < DZ_RANGE; dz++) {
      for (let dn = 0; dn < DN_RANGE; dn++) {
        const val = rho[(idx(dz,dn)*DIM+idx(dz,dn))*2];
        const norm = maxVal > 0 ? val/maxVal : 0;
        // Plasma colormap approximation
        const r = Math.round(Math.min(255, norm*400));
        const g = Math.round(Math.max(0, norm*300 - 100));
        const b = Math.round(Math.max(0, 200 - norm*300));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(dn*cellW, (DZ_RANGE-1-dz)*cellH, cellW-1, cellH-1);
      }
    }

    // Island box: dz 0-2, dn 6-9
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 2;
    ctx.setLineDash([4,3]);
    ctx.strokeRect(6*cellW, (DZ_RANGE-1-2)*cellH, 4*cellW, 3*cellH);
    ctx.setLineDash([]);
    ctx.fillStyle = C.cyan;
    ctx.font = "9px monospace";
    ctx.fillText("Island", 6*cellW+2, (DZ_RANGE-1-2)*cellH - 3);

    // Axis labels
    ctx.fillStyle = C.muted;
    ctx.font = "8px monospace";
    for (let dn = 0; dn < DN_RANGE; dn++)
      ctx.fillText(172+dn, dn*cellW+2, H-2);
    for (let dz = 0; dz < DZ_RANGE; dz++)
      ctx.fillText(114+dz, 1, (DZ_RANGE-1-dz)*cellH+10);
  }, [rho]);

  return (
    <div>
      <div style={{ fontSize:9, color:C.cyan, marginBottom:4, letterSpacing:"0.06em" }}>{title}</div>
      <canvas ref={canvasRef} width={200} height={120}
        style={{ width:"100%", height:"auto", borderRadius:6, display:"block" }} />
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
        <span style={{ fontSize:8, color:C.muted }}>N →</span>
        <span style={{ fontSize:8, color:C.muted }}>Z ↑</span>
      </div>
    </div>
  );
}

// ── MINI CHART ────────────────────────────────────────────────────────────────
function MiniChart({ data, govKey, ungovKey, govColor, ungovColor, label, yLabel, refLine }) {
  const display = data.filter((_, i) => i % 3 === 0);
  return (
    <div style={{ background:C.bg2, border:`0.5px solid ${C.border}`, borderRadius:8, padding:"10px 10px 6px" }}>
      <div style={{ fontSize:9, color:C.cyan, marginBottom:6, letterSpacing:"0.06em" }}>{label}</div>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={display} margin={{ top:2, right:4, bottom:2, left:-20 }}>
          <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
          <XAxis dataKey="cycle" tick={{ fontSize:7, fill:C.muted }} />
          <YAxis tick={{ fontSize:7, fill:C.muted }} label={yLabel ? { value:yLabel, angle:-90, position:"insideLeft", fontSize:7, fill:C.muted } : undefined} />
          <Tooltip
            contentStyle={{ background:C.bg2, border:`0.5px solid ${C.border}`, fontSize:10 }}
            labelStyle={{ color:C.muted }}
          />
          {refLine !== undefined && <ReferenceLine y={refLine} stroke={C.green} strokeDasharray="4 2" strokeWidth={0.8} />}
          {govKey && <Line type="monotone" dataKey={govKey} stroke={govColor||C.gold} dot={false} strokeWidth={1.5} name="Governed" />}
          {ungovKey && <Line type="monotone" dataKey={ungovKey} stroke={ungovColor||C.red} dot={false} strokeWidth={1.2} strokeDasharray="4 2" name="Ungoverned" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeltaChart({ data, label }) {
  const display = data.filter((_, i) => i % 3 === 0).map(d => ({
    cycle: d.cycle,
    delta: (d.fidelity||0) - (d.fidelityUngov||0),
  }));
  return (
    <div style={{ background:C.bg2, border:`0.5px solid ${C.border}`, borderRadius:8, padding:"10px 10px 6px" }}>
      <div style={{ fontSize:9, color:C.cyan, marginBottom:6, letterSpacing:"0.06em" }}>{label}</div>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={display} margin={{ top:2, right:4, bottom:2, left:-20 }}>
          <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
          <XAxis dataKey="cycle" tick={{ fontSize:7, fill:C.muted }} />
          <YAxis tick={{ fontSize:7, fill:C.muted }} />
          <Tooltip contentStyle={{ background:C.bg2, border:`0.5px solid ${C.border}`, fontSize:10 }} />
          <ReferenceLine y={0} stroke={C.muted} strokeWidth={0.5} />
          <Line type="monotone" dataKey="delta" stroke={C.gold} dot={false} strokeWidth={1.5} name="ΔF" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("idle"); // idle | running | done
  const [progress, setProgress] = useState(0);
  const [combined, setCombined] = useState([]);
  const [finalRhoGov, setFinalRhoGov] = useState(null);
  const [finalRhoUngov, setFinalRhoUngov] = useState(null);
  const [summary, setSummary] = useState(null);

  const simRef = useRef(null);

  // Pre-build physics objects once
  const physicsRef = useRef(null);
  useEffect(() => {
    const H_nuc = buildHamiltonian();
    const Lops  = buildLindblads();
    const gs    = groundState(H_nuc, DIM, 300);
    physicsRef.current = { H_nuc, Lops, gs };
  }, []);

  const runSim = useCallback(() => {
    if (!physicsRef.current) return;
    setPhase("running");
    setProgress(0);
    setCombined([]);
    setFinalRhoGov(null);
    setFinalRhoUngov(null);
    setSummary(null);

    const { H_nuc, Lops, gs } = physicsRef.current;

    let govState = {
      rho: initialRhoMc290(), O:1, K:0.5, M:0,
      F_prev: 0, dF_dt:0, cycle:0, history:[]
    };
    let ungovState = {
      rho: initialRhoMc290(), O:1, K:0.5, M:0,
      F_prev: 0, dF_dt:0, cycle:0, history:[]
    };

    const CHUNK = 10;

    function tick() {
      govState   = runSimulationChunk(govState,   true,  H_nuc, Lops, gs, CHUNK);
      ungovState = runSimulationChunk(ungovState,  false, H_nuc, Lops, gs, CHUNK);

      const prog = Math.min(100, Math.round((govState.cycle / N_CYCLES) * 100));
      setProgress(prog);

      // Merge histories for combined charts
      const merged = govState.history.map((g, i) => {
        const u = ungovState.history[i] || {};
        return {
          cycle: g.cycle,
          meta: g.meta,
          metaUngov: u.meta,
          fidelity: g.fidelity,
          fidelityUngov: u.fidelity,
          island: g.island,
          islandUngov: u.island,
          O: g.O,
          K: g.K,
          M: g.M,
          rescue: g.rescue,
        };
      });
      setCombined(merged);

      if (govState.cycle < N_CYCLES) {
        simRef.current = setTimeout(tick, 0);
      } else {
        setFinalRhoGov(govState.rho);
        setFinalRhoUngov(ungovState.rho);
        const gH = govState.history;
        const uH = ungovState.history;
        const last = gH[gH.length-1];
        const ulast = uH[uH.length-1];
        setSummary({
          govMeta:    last.meta.toFixed(4),
          ungovMeta:  ulast.meta.toFixed(4),
          govFid:     last.fidelity.toFixed(4),
          ungovFid:   ulast.fidelity.toFixed(4),
          govIsland:  last.island.toFixed(4),
          ungovIsland:ulast.island.toFixed(4),
          govO:       last.O.toFixed(4),
          govK:       last.K.toFixed(4),
          govM:       last.M.toFixed(4),
          maxDelta:   Math.max(...gH.map((g,i) => g.fidelity - (uH[i]?.fidelity||0))).toFixed(4),
        });
        setPhase("done");
      }
    }

    simRef.current = setTimeout(tick, 0);
  }, []);

  useEffect(() => () => { if (simRef.current) clearTimeout(simRef.current); }, []);

  return (
    <div style={{ fontFamily:"'SF Mono','Fira Code',monospace", background:C.bg, color:C.text,
      padding:"12px", minHeight:"100vh" }}>

      {/* Header */}
      <div style={{ borderBottom:`0.5px solid ${C.border}`, paddingBottom:12, marginBottom:14 }}>
        <div style={{ fontSize:15, fontWeight:700, color:C.gold, letterSpacing:"-0.01em" }}>
          LOPEZ NUCLEAR SHELL GOVERNANCE
        </div>
        <div style={{ fontSize:10, color:C.cyan, marginTop:2 }}>
          Element 115 (Moscovium) · Island of Stability as Forward-Invariant Viability Kernel
        </div>
        <div style={{ fontSize:9, color:C.muted, marginTop:2 }}>
          DCGP.AI · Joshua L. Lopez · USPTO 19/555,951 CIP · AURAL-M Governance · © 2026
        </div>
      </div>

      {/* Control */}
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
        <button onClick={runSim} disabled={phase==="running"} style={{
          padding:"8px 20px", borderRadius:8, fontSize:12, fontWeight:600, cursor: phase==="running" ? "not-allowed" : "pointer",
          background: phase==="running" ? C.bg2 : C.gold, color: phase==="running" ? C.muted : C.bg,
          border:`1px solid ${C.gold}`, letterSpacing:"0.04em", opacity: phase==="running" ? 0.7:1,
        }}>
          {phase==="idle" ? "▶ Run Simulation" : phase==="running" ? `Simulating… ${progress}%` : "▶ Re-run"}
        </button>
        {phase==="running" && (
          <div style={{ flex:1, height:4, background:C.border, borderRadius:2, overflow:"hidden" }}>
            <div style={{ width:`${progress}%`, height:"100%", background:C.gold, transition:"width 0.3s", borderRadius:2 }} />
          </div>
        )}
        {phase==="done" && (
          <span style={{ fontSize:10, color:C.green }}>✓ Simulation complete — {N_CYCLES} cycles · Δt={DT}</span>
        )}
      </div>

      {/* Description */}
      {phase==="idle" && (
        <div style={{ background:C.bg2, border:`0.5px solid ${C.border}`, borderLeft:`3px solid ${C.gold}`,
          borderRadius:8, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ fontSize:10, color:C.gold, marginBottom:6, letterSpacing:"0.06em" }}>SIMULATION DESCRIPTION</div>
          <div style={{ fontSize:11, color:C.muted, lineHeight:1.8 }}>
            Lindblad master equation evolution of Mc-290 nuclear density matrix across 60 shell configurations (Z=114-119, N=172-181).
            Governed mode applies the Orthogonal Decoherence Defense — an AURAL-M governance Hamiltonian projected orthogonal
            to Lindblad decay channels, driving the nuclear state toward the Island of Stability ground state.
            The Island of Stability (Z≈114-116, N≈178-181) is the forward-invariant viability kernel K_N.
            Meta-fidelity F·O/O_max measures governed nuclear stability authority across 300 RK4 cycles.
          </div>
        </div>
      )}

      {/* Charts — show as data accumulates */}
      {combined.length > 0 && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
            <MiniChart data={combined} govKey="meta" ungovKey="metaUngov"
              govColor={C.gold} ungovColor={C.red}
              label="META-FIDELITY F·O/O_max" refLine={0.65} />
            <MiniChart data={combined} govKey="island" ungovKey="islandUngov"
              govColor={C.cyan} ungovColor={C.red}
              label="ISLAND OCCUPANCY P(Z=114-116, N=178-181)" />
            <MiniChart data={combined} govKey="fidelity" ungovKey="fidelityUngov"
              govColor={C.gold} ungovColor={C.red}
              label="GROUND STATE FIDELITY ⟨gs|ρ|gs⟩" refLine={0.65} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
            <MiniChart data={combined} govKey="O"
              govColor={C.green}
              label="OBLIGATION O(t)" refLine={1.0} />
            <MiniChart data={combined} govKey="K"
              govColor={C.purple}
              label="FAST AUTHORITY K(t)" />
            <MiniChart data={combined} govKey="M"
              govColor={C.cyan}
              label="SLOW MEMORY M(t)" />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
            <MiniChart data={combined} govKey="rescue"
              govColor={C.red}
              label="RESCUE WINDOW W_N (cycles)" refLine={5} />
            <DeltaChart data={combined} label="GOVERNANCE ADVANTAGE ΔF (gov − ungov)" />
            <div style={{ background:C.bg2, border:`0.5px solid ${C.border}`, borderRadius:8, padding:"10px" }}>
              {finalRhoGov
                ? <NuclearMap rho={finalRhoGov} title="FINAL CONFIG MAP · GOVERNED Mc-290" />
                : <div style={{ fontSize:10, color:C.muted, fontStyle:"italic", paddingTop:20, textAlign:"center" }}>
                    Nuclear map renders on completion…
                  </div>}
            </div>
          </div>
        </>
      )}

      {/* Validation summary */}
      {summary && (
        <div style={{ background:C.bg2, border:`0.5px solid ${C.border}`, borderLeft:`3px solid ${C.gold}`,
          borderRadius:8, padding:"12px 14px", marginTop:4 }}>
          <div style={{ fontSize:10, color:C.gold, marginBottom:8, letterSpacing:"0.06em" }}>
            VALIDATION SUMMARY — Element 115 Nuclear Shell Governance
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:2 }}>
            {[
              ["Final meta-fidelity",        summary.govMeta,    summary.ungovMeta],
              ["Final ground state fidelity", summary.govFid,     summary.ungovFid],
              ["Final island occupancy",      summary.govIsland,  summary.ungovIsland],
              ["Final obligation O",          summary.govO,       "N/A"],
              ["Final authority K",           summary.govK,       "N/A"],
              ["Final memory M",              summary.govM,       "N/A"],
              ["Peak governance advantage ΔF",summary.maxDelta,   "—"],
            ].map(([label, gov, ungov]) => (
              <div key={label} style={{ padding:"5px 8px", borderBottom:`0.5px solid ${C.border}` }}>
                <div style={{ fontSize:9, color:C.muted }}>{label}</div>
                <div style={{ fontSize:11, display:"flex", gap:12, marginTop:2 }}>
                  <span style={{ color:C.gold }}>GOV {gov}</span>
                  {ungov !== "N/A" && ungov !== "—" &&
                    <span style={{ color:C.red }}>UNG {ungov}</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, fontSize:10, color:C.cyan, lineHeight:1.7 }}>
            Claim: Island of stability = forward-invariant viability kernel K_N.<br/>
            Governance prevents nuclear decay by maintaining density matrix within K_N under AURAL-M.<br/>
            Meta-fidelity F·O/O_max measures governed nuclear stability authority.
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop:10, display:"flex", gap:16, flexWrap:"wrap" }}>
        {[[C.gold,"Governed"],[C.red,"Ungoverned"],[C.green,"Viability threshold (0.65)"],
          [C.cyan,"Island region"],[C.purple,"Authority signal"]].map(([col,label]) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:C.muted }}>
            <div style={{ width:14, height:2, background:col, borderRadius:1 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
