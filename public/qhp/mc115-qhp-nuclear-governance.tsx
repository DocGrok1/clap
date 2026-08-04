import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

// ═══════════════════════════════════════════════════════════════════════════════
// QHP RUNTIME — Quantum HoloProjection Protocol
// Device adapter: WebGLFallback (canvas 2D holographic simulation)
// Polaritron resonance: 14.7 THz | MC290 phase lock
// Patent: USPTO 19/555,951 CIP | © 2026 Joshua L. Lopez · DCGP.AI
// ═══════════════════════════════════════════════════════════════════════════════

const QHP_ADAPTER   = "WebGLFallback";
const QHP_FREQ_THZ  = 14.7;
const QHP_SCENE     = "NuclearShellGovernance_Mc115";

// ── PALETTE ───────────────────────────────────────────────────────────────────
const P = {
  gold:    "#FFD700",
  cyan:    "#00CFFF",
  teal:    "#00FFD4",
  red:     "#FF4455",
  green:   "#00FF88",
  purple:  "#9B7AFF",
  amber:   "#FFB800",
  muted:   "#8899BB",
  bg:      "#020812",
  surface: "#0A0F1E",
  card:    "#0D1425",
  border:  "#1A2540",
  text:    "#E2F0FF",
};

function hex2rgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// ── NUCLEAR PHYSICS CONSTANTS ─────────────────────────────────────────────────
const DZ_RANGE = 6;
const DN_RANGE = 10;
const DIM      = DZ_RANGE * DN_RANGE; // 60 shell configurations
const N_CYCLES = 300;
const DT       = 0.05;

// ═══════════════════════════════════════════════════════════════════════════════
// MATRIX MATH — Complex density matrix operations
// ═══════════════════════════════════════════════════════════════════════════════

function idx(dz, dn) { return dz * DN_RANGE + dn; }

function matMul(A, B, n) {
  const C = new Float64Array(n * n * 2);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < n; k++) {
      const ar = A[(i*n+k)*2], ai = A[(i*n+k)*2+1];
      if (Math.abs(ar) < 1e-15 && Math.abs(ai) < 1e-15) continue;
      for (let j = 0; j < n; j++) {
        const br = B[(k*n+j)*2], bi = B[(k*n+j)*2+1];
        C[(i*n+j)*2]   += ar*br - ai*bi;
        C[(i*n+j)*2+1] += ar*bi + ai*br;
      }
    }
  return C;
}

function matAdd(A, B, scale = 1) {
  const R = new Float64Array(A.length);
  for (let i = 0; i < A.length; i++) R[i] = A[i] + scale * B[i];
  return R;
}

function matScale(A, s) {
  const R = new Float64Array(A.length);
  for (let i = 0; i < A.length; i++) R[i] = A[i] * s;
  return R;
}

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

function traceRho(rho, n) {
  let r = 0;
  for (let i = 0; i < n; i++) r += rho[(i*n+i)*2];
  return r;
}

function normalizeRho(rho, n) {
  const tr = traceRho(rho, n);
  return Math.abs(tr) < 1e-12 ? rho : matScale(rho, 1/tr);
}

function diagElem(rho, n, i) { return rho[(i*n+i)*2]; }

// ═══════════════════════════════════════════════════════════════════════════════
// NUCLEAR PHYSICS
// ═══════════════════════════════════════════════════════════════════════════════

function buildHamiltonian() {
  const H = new Float64Array(DIM * DIM * 2);
  for (let dz = 0; dz < DZ_RANGE; dz++) {
    for (let dn = 0; dn < DN_RANGE; dn++) {
      const i = idx(dz, dn);
      const d2 = dz*dz + dn*dn;
      H[(i*DIM+i)*2] = (
        0.35*dz*dz
        + 0.28*dn*dn
        - 0.6 *Math.exp(-0.25*d2)
        - 0.45*Math.exp(-0.18*(dz*dz + (dn-9)*(dn-9)))
        + 0.12*dz
        - (dz > 0 && dn > 0 ? 0.04*Math.exp(-0.3*(dz+dn)) : 0)
      );
      if (dz+1 < DZ_RANGE) {
        H[(i*DIM+idx(dz+1,dn))*2] = -0.07;
        H[(idx(dz+1,dn)*DIM+i)*2] = -0.07;
      }
      if (dn+1 < DN_RANGE) {
        H[(i*DIM+idx(dz,dn+1))*2] = -0.055;
        H[(idx(dz,dn+1)*DIM+i)*2] = -0.055;
      }
    }
  }
  return H;
}

function buildGroundState(H, n) {
  // Find minimum diagonal energy — island of stability ground state
  let minE = Infinity, minI = 0;
  for (let i = 0; i < n; i++) {
    const e = H[(i*n+i)*2];
    if (e < minE) { minE = e; minI = i; }
  }
  const gs = new Float64Array(n*2);
  gs[minI*2] = 1.0;
  return gs;
}

function buildLindblads(ga = 0.08, gf = 0.04) {
  const ops = [];
  for (let dz = 1; dz < DZ_RANGE; dz++)
    for (let dn = 1; dn < DN_RANGE; dn++) {
      const rate = ga*(1+0.15*dz)*Math.exp(-0.1*(dz*dz+dn*dn));
      const L = new Float64Array(DIM*DIM*2);
      L[(idx(dz-1,dn-1)*DIM+idx(dz,dn))*2] = Math.sqrt(rate);
      ops.push(L);
    }
  for (let dz = 3; dz < DZ_RANGE; dz++)
    for (let dn = 0; dn < 5; dn++) {
      const rate = gf*dz*(1/(dn+1));
      const L = new Float64Array(DIM*DIM*2);
      L[(0*DIM+idx(dz,dn))*2] = Math.sqrt(rate);
      ops.push(L);
    }
  return ops;
}

function metaFidelity(rho, gs, n) {
  let re = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      re += (gs[i*2]*rho[(i*n+j)*2] + gs[i*2+1]*rho[(i*n+j)*2+1])*gs[j*2]
          - (gs[i*2]*rho[(i*n+j)*2+1] - gs[i*2+1]*rho[(i*n+j)*2])*gs[j*2+1];
    }
  return Math.max(0, Math.min(1, re));
}

function islandOccupancy(rho) {
  let p = 0;
  for (let dz = 0; dz < 3; dz++)
    for (let dn = 6; dn < DN_RANGE; dn++)
      p += diagElem(rho, DIM, idx(dz, dn));
  return Math.max(0, p);
}

function lindbladRHS(rho, H, Lops, n) {
  const Hr = matMul(H, rho, n);
  const rH = matMul(rho, H, n);
  const drho = new Float64Array(n*n*2);
  // -i[H,rho]: real = (Hr-rH)_imag, imag = -(Hr-rH)_real
  for (let k = 0; k < n*n; k++) {
    drho[k*2]   =  (Hr[k*2+1] - rH[k*2+1]);
    drho[k*2+1] = -(Hr[k*2]   - rH[k*2]);
  }
  for (const L of Lops) {
    const Ld   = conjT(L, n);
    const LdL  = matMul(Ld, L, n);
    const LrLd = matMul(matMul(L, rho, n), Ld, n);
    const LdLr = matMul(LdL, rho, n);
    const rLdL = matMul(rho, LdL, n);
    for (let k = 0; k < n*n*2; k++)
      drho[k] += LrLd[k] - 0.5*(LdLr[k] + rLdL[k]);
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
  return normalizeRho(enforceHerm(rhoNew, n), n);
}

function buildGovernanceH(Lops, K, O, gs, n) {
  const Hbase = new Float64Array(n*n*2);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      Hbase[(i*n+j)*2]   = gs[i*2]*gs[j*2]   + gs[i*2+1]*gs[j*2+1];
      Hbase[(i*n+j)*2+1] = gs[i*2+1]*gs[j*2] - gs[i*2]*gs[j*2+1];
    }
  for (let i = 0; i < n; i++) Hbase[(i*n+i)*2] -= 1/n;

  let Horth = new Float64Array(Hbase);
  for (const L of Lops) {
    const Ld  = conjT(L, n);
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
  const HG = matScale(Horth, K*O*0.15/norm);
  return enforceHerm(HG, n);
}

function obligationUpdate(O, F, K, dt) {
  return Math.max(0, Math.min(5, O + (0.4*F - 0.05*O - 0.02*Math.abs(K))*dt));
}
function authorityUpdate(K, F, dt) {
  return Math.max(0, Math.min(3, K + (0.8*(F-0.65) - 0.1*K)*dt));
}
function memoryUpdate(M, F, dt) {
  return M + (0.05*(F-0.65) - 0.02*M)*dt;
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

function runChunk(state, governed, H_nuc, Lops, gs, steps) {
  let { rho, O, K, M, F_prev, dF_dt, cycle, history } = state;
  for (let s = 0; s < steps && cycle < N_CYCLES; s++, cycle++) {
    const F      = metaFidelity(rho, gs, DIM);
    const island = islandOccupancy(rho);
    dF_dt = 0.9*dF_dt + 0.1*(F - F_prev)/DT;
    F_prev = F;
    history.push({
      cycle, fidelity: F, island, O, K, M,
      rescue: rescueWindow(F, dF_dt),
      meta: F * Math.min(O/2, 1),
    });
    const HG     = governed ? buildGovernanceH(Lops, K, O, gs, DIM) : null;
    const H_tot  = HG ? matAdd(H_nuc, HG) : H_nuc;
    rho = rk4Step(rho, H_tot, Lops, DT, DIM);
    if (governed) {
      O = obligationUpdate(O, F, K, DT);
      K = authorityUpdate(K, F, DT);
      M = memoryUpdate(M, F, DT);
    }
  }
  return { rho, O, K, M, F_prev, dF_dt, cycle, history };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QHP HOLOGRAPHIC PROJECTION CANVAS
// Renders nuclear shell geometry as holographic scene
// ═══════════════════════════════════════════════════════════════════════════════

function QHPNuclearProjection({ governed, fidelity, island, O, K, cycle, finalRho, phase }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2;

    // QHP scene color derived from governance state
    const holoCol  = governed
      ? (fidelity > 0.65 ? P.teal : fidelity > 0.4 ? P.amber : P.red)
      : P.red;
    const holoRGB  = hex2rgb(holoCol);
    const goldRGB  = hex2rgb(P.gold);
    const cyanRGB  = hex2rgb(P.cyan);

    function drawFrame(t) {
      ctx.clearRect(0, 0, W, H);

      // ── QHP projection background ──────────────────────────────────────────
      ctx.fillStyle = P.bg;
      ctx.fillRect(0, 0, W, H);

      // Perspective grid — projection surface
      ctx.save();
      ctx.strokeStyle = `rgba(${holoRGB},0.05)`;
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 20) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
      }
      ctx.restore();

      // ── CHVM viability manifold — outermost ring ───────────────────────────
      const manifoldR = 100 + 8*Math.sin(t*0.015);
      for (let ring = 4; ring >= 0; ring--) {
        ctx.beginPath();
        ctx.arc(cx, cy, manifoldR - ring*6, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${holoRGB},${0.04 + ring*0.015})`;
        ctx.lineWidth = ring === 0 ? 1.5 : 0.5;
        if (ring === 0) ctx.setLineDash([8, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // CHVM label
      ctx.fillStyle = `rgba(${holoRGB},0.5)`;
      ctx.font = "8px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`K_N viability kernel · F=${fidelity.toFixed(3)}`, cx + manifoldR + 6, cy);

      // ── Island of stability region — nuclear entity nodes ──────────────────
      // 12 island configs (dz 0-2, dn 6-9) as entangled quantum entities
      const islandNodes = [];
      for (let dz = 0; dz < 3; dz++)
        for (let dn = 6; dn < DN_RANGE; dn++)
          islandNodes.push({ dz, dn, label: `Z${114+dz}N${172+dn}` });

      const islandR = 58;
      islandNodes.forEach((node, i) => {
        const angle = (i / islandNodes.length) * Math.PI * 2 - Math.PI/2
          + t * 0.003 * (governed ? 1 : -0.5);
        const nx = cx + Math.cos(angle) * islandR;
        const ny = cy + Math.sin(angle) * islandR;

        // Entanglement line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = `rgba(${cyanRGB},0.12)`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Node glow
        const glow = ctx.createRadialGradient(nx,ny,0,nx,ny,10);
        glow.addColorStop(0, `rgba(${cyanRGB},0.35)`);
        glow.addColorStop(1, `rgba(${cyanRGB},0)`);
        ctx.beginPath();
        ctx.arc(nx, ny, 10, 0, Math.PI*2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Node dot
        ctx.beginPath();
        ctx.arc(nx, ny, 3, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${cyanRGB},0.8)`;
        ctx.fill();
      });

      // ── Lindblad decay channels — alpha decay spiral arms ─────────────────
      if (!governed || fidelity < 0.65) {
        for (let arm = 0; arm < 4; arm++) {
          const baseAngle = (arm/4)*Math.PI*2 + t*0.008;
          ctx.beginPath();
          for (let r = 0; r < manifoldR; r += 2) {
            const a = baseAngle + r*0.04;
            const x = cx + Math.cos(a)*r;
            const y = cy + Math.sin(a)*r;
            if (r === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
          ctx.strokeStyle = `rgba(${hex2rgb(P.red)},${governed ? 0.06 : 0.18})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // ── Governance Hamiltonian beam — orthogonal drive toward island ────────
      if (governed) {
        const beamAngle = -Math.PI/2 + t*0.005;
        const beamLen   = manifoldR * 0.85;
        const strength  = Math.min(1, K * O * 0.4);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(beamAngle);
        const beamGrad = ctx.createLinearGradient(0, 0, 0, -beamLen);
        beamGrad.addColorStop(0, `rgba(${goldRGB},0)`);
        beamGrad.addColorStop(0.5, `rgba(${goldRGB},${strength*0.5})`);
        beamGrad.addColorStop(1, `rgba(${goldRGB},0)`);
        ctx.beginPath();
        ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
        ctx.lineTo(2, -beamLen); ctx.lineTo(-2, -beamLen);
        ctx.closePath();
        ctx.fillStyle = beamGrad;
        ctx.fill();
        ctx.restore();
      }

      // ── MC290 Polaritron resonance core ────────────────────────────────────
      const coreR = 12 + 3*Math.sin(t * QHP_FREQ_THZ * 0.003);
      // Triple ring — MC290 phase channels
      for (let ring = 3; ring >= 0; ring--) {
        const rr = coreR * (1 + ring*0.5);
        const alpha = ring === 0 ? 0.9 : 0.15 - ring*0.03;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${goldRGB},${alpha})`;
        ctx.lineWidth = ring === 0 ? 1.5 : 0.5;
        ctx.stroke();
      }
      const coreGrad = ctx.createRadialGradient(cx,cy,0,cx,cy,coreR*3);
      coreGrad.addColorStop(0, `rgba(${goldRGB},0.95)`);
      coreGrad.addColorStop(0.3, `rgba(${goldRGB},0.4)`);
      coreGrad.addColorStop(1, `rgba(${goldRGB},0)`);
      ctx.beginPath(); ctx.arc(cx,cy,coreR*3,0,Math.PI*2);
      ctx.fillStyle = coreGrad; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,coreR,0,Math.PI*2);
      ctx.fillStyle = P.gold; ctx.fill();

      // MC290 label
      ctx.fillStyle = `rgba(${goldRGB},0.7)`;
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("MC290", cx, cy + coreR + 14);

      // ── Fidelity wave — radiates at governance frequency ───────────────────
      if (phase === "running" || phase === "done") {
        const waveR = (t * 1.5) % (manifoldR * 1.3);
        const wAlpha = Math.max(0, (1 - waveR/(manifoldR*1.3)) * fidelity * 0.5);
        ctx.beginPath();
        ctx.arc(cx, cy, waveR, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${holoRGB},${wAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Island occupancy indicator — outer arc ─────────────────────────────
      const arcR = manifoldR + 18;
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, -Math.PI/2, -Math.PI/2 + island * Math.PI * 2);
      ctx.strokeStyle = `rgba(${cyanRGB},0.6)`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = `rgba(${cyanRGB},0.5)`;
      ctx.font = "8px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`island ${(island*100).toFixed(1)}%`, W-8, 14);

      // ── Obligation O ring ─────────────────────────────────────────────────
      const oR = 28;
      ctx.beginPath();
      ctx.arc(cx, cy, oR, -Math.PI/2, -Math.PI/2 + Math.min(1, O/5)*Math.PI*2);
      ctx.strokeStyle = `rgba(${hex2rgb(P.green)},0.5)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // ── QHP scene header ──────────────────────────────────────────────────
      ctx.fillStyle = `rgba(${holoRGB},0.6)`;
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`holo Scene ${QHP_SCENE} · cycle ${cycle}/${N_CYCLES}`, cx, 14);

      // ── Governance status ─────────────────────────────────────────────────
      ctx.fillStyle = governed
        ? `rgba(${hex2rgb(P.teal)},0.6)`
        : `rgba(${hex2rgb(P.red)},0.6)`;
      ctx.textAlign = "left";
      ctx.fillText(governed ? "GOVERNED · AURAL-M ACTIVE" : "UNGOVERNED · DECAY MODE", 8, 14);

      // ── Projector status bar ──────────────────────────────────────────────
      ctx.fillStyle = `rgba(${holoRGB},0.35)`;
      ctx.font = "7px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${QHP_ADAPTER} · ${QHP_FREQ_THZ} THz · K=${K.toFixed(3)} O=${O.toFixed(3)}`, 8, H-6);
      ctx.textAlign = "right";
      ctx.fillText(`B := S ∩ I(S) · R = C/γ`, W-8, H-6);

      tRef.current = t + 1;
      animRef.current = requestAnimationFrame(() => drawFrame(tRef.current));
    }

    animRef.current = requestAnimationFrame(() => drawFrame(tRef.current));
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [governed, fidelity, island, O, K, cycle, finalRho, phase]);

  return (
    <canvas ref={canvasRef} width={560} height={300}
      style={{ width:"100%", height:"auto", borderRadius:10, display:"block" }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QHP NUCLEAR CONFIG MAP CANVAS
// ═══════════════════════════════════════════════════════════════════════════════

function QHPNuclearMap({ rho, title, color }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!rho || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cellW = W/DN_RANGE, cellH = H/DZ_RANGE;

    let maxVal = 0;
    for (let dz = 0; dz < DZ_RANGE; dz++)
      for (let dn = 0; dn < DN_RANGE; dn++)
        maxVal = Math.max(maxVal, rho[(idx(dz,dn)*DIM+idx(dz,dn))*2]);

    ctx.fillStyle = P.card;
    ctx.fillRect(0,0,W,H);

    for (let dz = 0; dz < DZ_RANGE; dz++) {
      for (let dn = 0; dn < DN_RANGE; dn++) {
        const val  = rho[(idx(dz,dn)*DIM+idx(dz,dn))*2];
        const norm = maxVal > 0 ? val/maxVal : 0;
        const r    = Math.round(Math.min(255, norm*380 + 20));
        const g    = Math.round(Math.max(0,   norm*200 - 80));
        const b    = Math.round(Math.max(0,   220 - norm*280));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(dn*cellW+0.5, (DZ_RANGE-1-dz)*cellH+0.5, cellW-1, cellH-1);
      }
    }

    // Island box: dz 0-2, dn 6-9
    ctx.strokeStyle = color || P.cyan;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5,3]);
    ctx.strokeRect(6*cellW, (DZ_RANGE-1-2)*cellH, 4*cellW, 3*cellH);
    ctx.setLineDash([]);
    ctx.fillStyle = color || P.cyan;
    ctx.font = "8px monospace";
    ctx.fillText("Island K_N", 6*cellW+2, (DZ_RANGE-1-2)*cellH - 3);

    // Mc-290 initial position
    ctx.beginPath();
    ctx.arc(3*cellW+cellW/2, (DZ_RANGE-1-1)*cellH+cellH/2, 5, 0, Math.PI*2);
    ctx.strokeStyle = P.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = P.gold;
    ctx.font = "7px monospace";
    ctx.fillText("Mc-290", 3*cellW-8, (DZ_RANGE-1-1)*cellH+cellH/2+14);

    // Axis
    ctx.fillStyle = P.muted;
    ctx.font = "7px monospace";
    for (let dn = 0; dn < DN_RANGE; dn+=2)
      ctx.fillText(172+dn, dn*cellW+2, H-2);
    for (let dz = 0; dz < DZ_RANGE; dz+=2)
      ctx.fillText(114+dz, 1, (DZ_RANGE-1-dz)*cellH+10);
  }, [rho, color]);

  return (
    <div>
      <div style={{ fontSize:9, color: color||P.cyan, marginBottom:4, letterSpacing:"0.06em" }}>{title}</div>
      <canvas ref={canvasRef} width={220} height={130}
        style={{ width:"100%", height:"auto", borderRadius:6, display:"block" }} />
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
        <span style={{ fontSize:7, color:P.muted }}>N →</span>
        <span style={{ fontSize:7, color:P.muted }}>Z ↑</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QHP SCENE DSL DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

function QHPSceneBlock({ fidelity, island, O, K, M, cycle, governed }) {
  const scene = `holo Scene ${QHP_SCENE} {
  // QHP Language Specification — USPTO pending
  // Quantum entities: nuclear shell configurations as holographic nodes

  entity QuantumNucleus "Mc-290" at (0, 1.5, 0) {
    proton_number: 115;
    neutron_number: 175;
    shell_config: dz=1 dn=3;
  }

  entity IslandOfStability "K_N Viability Kernel" at (0, 1.5, 0) {
    Z_range: [114, 116];
    N_range: [178, 181];
    occupancy: ${(island*100).toFixed(2)}%;
    boundary: B := S ∩ I(S);
  }

  quantum state |ψ⟩ = Σ(shell_i × phase_i) / sqrt(N);
  bind |ψ⟩ to (QuantumNucleus, IslandOfStability);

  resonance_field PolaritronMC290 {
    frequency: ${QHP_FREQ_THZ} THz;
    fidelity: ${fidelity.toFixed(4)};
    phase: ${governed ? "+1.0" : "-1.0"};
    faces: 290;
    phase_channels: 100;
  }

  manifold CHVMSurface {
    integrity: ${fidelity.toFixed(4)};
    boundary: B := S ∩ I(S);
    projection_radius: R = C / γ;
    obligation: O = ${O.toFixed(4)};
    authority:  K = ${K.toFixed(4)};
    memory:     M = ${M.toFixed(4)};
  }

  governance_loop AURAL_M {
    fast_authority: K(t);
    slow_memory:    M(t);
    obligation:     O(t);
    lindblad_channels: alpha_decay + spontaneous_fission;
    orthogonal_defense: H_G ⊥ {L_i};
  }

  on quantum.measurement(QuantumNucleus) {
    update IslandOfStability.occupancy;
    emit event GovernanceBoundaryCheck;
  }

  on fidelity.breach(threshold=0.65) {
    activate RescueOperator;
    emit event ViabilityKernelAlert;
  }

  projector AdaptiveProjector {
    if (device.hasQuantumEmitter) { output: QHolo; use_quantum_substrate: true; }
    else { output: ${QHP_ADAPTER}; }
  }
}

run Scene ${QHP_SCENE} on projector AdaptiveProjector;
// cycle: ${cycle}/${N_CYCLES} · ${governed ? "GOVERNED" : "UNGOVERNED"}`;

  return (
    <div style={{
      background: P.card, border:`0.5px solid ${P.border}`,
      borderLeft:`3px solid ${P.gold}`, borderRadius:8,
      padding:"10px 14px", marginTop:0,
      fontFamily:"monospace", fontSize:10, lineHeight:1.75,
      color: `${P.gold}bb`, overflowX:"auto",
    }}>
      <div style={{ fontSize:9, color:P.muted, marginBottom:6, letterSpacing:"0.08em" }}>
        QHP SCENE DESCRIPTION · {QHP_ADAPTER}
      </div>
      <pre style={{ margin:0, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{scene}</pre>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHART COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const TT_STYLE = {
  contentStyle: { background:P.card, border:`0.5px solid ${P.border}`, fontSize:10, color:P.text },
  labelStyle:   { color:P.muted },
};

function QHPChart({ data, govKey, ungovKey, govColor, ungovColor, title, refLine, yDomain }) {
  const display = data.filter((_,i) => i % 3 === 0);
  return (
    <div style={{ background:P.card, border:`0.5px solid ${P.border}`,
      borderLeft:`2px solid ${govColor||P.gold}`, borderRadius:8, padding:"10px 10px 6px" }}>
      <div style={{ fontSize:9, color:govColor||P.gold, marginBottom:6, letterSpacing:"0.06em" }}>{title}</div>
      <ResponsiveContainer width="100%" height={85}>
        <LineChart data={display} margin={{ top:2, right:4, bottom:2, left:-22 }}>
          <CartesianGrid stroke={P.border} strokeDasharray="3 3" />
          <XAxis dataKey="cycle" tick={{ fontSize:7, fill:P.muted }} />
          <YAxis tick={{ fontSize:7, fill:P.muted }} domain={yDomain} />
          <Tooltip {...TT_STYLE} />
          {refLine !== undefined &&
            <ReferenceLine y={refLine} stroke={P.green} strokeDasharray="4 2" strokeWidth={0.8} />}
          {govKey &&
            <Line type="monotone" dataKey={govKey} stroke={govColor||P.gold}
              dot={false} strokeWidth={1.8} name="Governed" isAnimationActive={false} />}
          {ungovKey &&
            <Line type="monotone" dataKey={ungovKey} stroke={ungovColor||P.red}
              dot={false} strokeWidth={1.2} strokeDasharray="5 3" name="Ungoverned" isAnimationActive={false} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeltaChart({ data, title }) {
  const display = data.filter((_,i) => i%3===0).map(d => ({
    cycle: d.cycle,
    delta: ((d.fidelity||0) - (d.fidelityU||0)),
  }));
  return (
    <div style={{ background:P.card, border:`0.5px solid ${P.border}`,
      borderLeft:`2px solid ${P.green}`, borderRadius:8, padding:"10px 10px 6px" }}>
      <div style={{ fontSize:9, color:P.green, marginBottom:6, letterSpacing:"0.06em" }}>{title}</div>
      <ResponsiveContainer width="100%" height={85}>
        <LineChart data={display} margin={{ top:2, right:4, bottom:2, left:-22 }}>
          <CartesianGrid stroke={P.border} strokeDasharray="3 3" />
          <XAxis dataKey="cycle" tick={{ fontSize:7, fill:P.muted }} />
          <YAxis tick={{ fontSize:7, fill:P.muted }} />
          <Tooltip {...TT_STYLE} />
          <ReferenceLine y={0} stroke={P.muted} strokeWidth={0.5} />
          <Line type="monotone" dataKey="delta" stroke={P.gold}
            dot={false} strokeWidth={1.8} name="ΔF" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── STAT PILL ─────────────────────────────────────────────────────────────────
function Stat({ label, val, color, sub }) {
  return (
    <div style={{ background:P.card, border:`0.5px solid ${P.border}`, borderRadius:8, padding:"8px 10px" }}>
      <div style={{ fontSize:9, color:P.muted, letterSpacing:"0.06em" }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:700, color: color||P.text, marginTop:2 }}>{val}</div>
      {sub && <div style={{ fontSize:8, color:P.muted, marginTop:1 }}>{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [phase,     setPhase]     = useState("idle");
  const [progress,  setProgress]  = useState(0);
  const [combined,  setCombined]  = useState([]);
  const [liveState, setLiveState] = useState({ fidelity:0, island:0, O:1, K:0.5, M:0, cycle:0 });
  const [finalRhoG, setFinalRhoG] = useState(null);
  const [finalRhoU, setFinalRhoU] = useState(null);
  const [summary,   setSummary]   = useState(null);
  const [governed,  setGoverned]  = useState(true);
  const [showScene, setShowScene] = useState(true);

  const simRef  = useRef(null);
  const physRef = useRef(null);

  useEffect(() => {
    const H_nuc = buildHamiltonian();
    const Lops  = buildLindblads();
    const gs    = buildGroundState(H_nuc, DIM);
    physRef.current = { H_nuc, Lops, gs };
  }, []);

  const runSim = useCallback(() => {
    if (!physRef.current) return;
    if (simRef.current) clearTimeout(simRef.current);
    setPhase("running");
    setProgress(0);
    setCombined([]);
    setFinalRhoG(null);
    setFinalRhoU(null);
    setSummary(null);

    const { H_nuc, Lops, gs } = physRef.current;

    let govS = { rho:initialRhoMc290(), O:1, K:0.5, M:0, F_prev:0, dF_dt:0, cycle:0, history:[] };
    let ungS = { rho:initialRhoMc290(), O:1, K:0.5, M:0, F_prev:0, dF_dt:0, cycle:0, history:[] };

    const CHUNK = 8;

    function tick() {
      govS = runChunk(govS, true,  H_nuc, Lops, gs, CHUNK);
      ungS = runChunk(ungS, false, H_nuc, Lops, gs, CHUNK);

      const prog = Math.min(100, Math.round((govS.cycle/N_CYCLES)*100));
      setProgress(prog);

      const gH = govS.history;
      const uH = ungS.history;

      const merged = gH.map((g,i) => {
        const u = uH[i] || {};
        return {
          cycle: g.cycle,
          meta:     g.meta,    metaU:     u.meta,
          fidelity: g.fidelity,fidelityU: u.fidelity,
          island:   g.island,  islandU:   u.island,
          O: g.O, K: g.K, M: g.M,
          rescue: g.rescue,
        };
      });
      setCombined(merged);

      const last = gH[gH.length-1];
      if (last) setLiveState({ fidelity:last.fidelity, island:last.island, O:last.O, K:last.K, M:last.M, cycle:last.cycle });

      if (govS.cycle < N_CYCLES) {
        simRef.current = setTimeout(tick, 0);
      } else {
        setFinalRhoG(govS.rho);
        setFinalRhoU(ungS.rho);
        const ulast = uH[uH.length-1];
        setSummary({
          govMeta:    last.meta.toFixed(4),
          ungovMeta:  (ulast?.meta||0).toFixed(4),
          govFid:     last.fidelity.toFixed(4),
          ungovFid:   (ulast?.fidelity||0).toFixed(4),
          govIsland:  last.island.toFixed(4),
          ungovIsland:(ulast?.island||0).toFixed(4),
          govO: last.O.toFixed(4),
          govK: last.K.toFixed(4),
          govM: last.M.toFixed(4),
          maxDelta: Math.max(...gH.map((g,i) => g.fidelity - (uH[i]?.fidelity||0))).toFixed(4),
        });
        setPhase("done");
      }
    }

    simRef.current = setTimeout(tick, 0);
  }, []);

  useEffect(() => () => { if (simRef.current) clearTimeout(simRef.current); }, []);

  const ls = liveState;

  return (
    <div style={{ fontFamily:"'SF Mono','Fira Code',monospace", background:P.bg, color:P.text, padding:"12px", minHeight:"100vh" }}>

      {/* ── QHP HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ borderBottom:`0.5px solid ${P.border}`, paddingBottom:10, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:P.gold, letterSpacing:"-0.01em" }}>
              QHP · LOPEZ NUCLEAR SHELL GOVERNANCE
            </div>
            <div style={{ fontSize:10, color:P.cyan, marginTop:2 }}>
              Element 115 (Moscovium) · Island of Stability as Forward-Invariant Viability Kernel
            </div>
            <div style={{ fontSize:9, color:P.muted, marginTop:2 }}>
              DCGP.AI · Joshua L. Lopez · USPTO 19/555,951 CIP · {QHP_ADAPTER} · {QHP_FREQ_THZ} THz · © 2026
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0, marginLeft:12 }}>
            <button onClick={() => setShowScene(s=>!s)} style={{
              padding:"4px 10px", borderRadius:6, fontSize:10, cursor:"pointer",
              background:"none", border:`0.5px solid ${P.border}`, color:P.muted,
            }}>{showScene ? "Hide Scene" : "Show Scene"}</button>
            <button onClick={runSim} disabled={phase==="running"} style={{
              padding:"6px 16px", borderRadius:8, fontSize:11, fontWeight:700,
              cursor: phase==="running" ? "not-allowed" : "pointer",
              background: phase==="running" ? P.surface : P.gold,
              color: phase==="running" ? P.muted : P.bg,
              border:`1px solid ${P.gold}`, letterSpacing:"0.04em",
              opacity: phase==="running" ? 0.7 : 1,
            }}>
              {phase==="idle" ? "▶ Run Simulation" : phase==="running" ? `Simulating ${progress}%` : "▶ Re-run"}
            </button>
          </div>
        </div>
        {phase==="running" && (
          <div style={{ marginTop:8, height:3, background:P.border, borderRadius:2, overflow:"hidden" }}>
            <div style={{ width:`${progress}%`, height:"100%", background:P.gold, transition:"width 0.3s", borderRadius:2 }} />
          </div>
        )}
        {phase==="done" && (
          <div style={{ marginTop:6, fontSize:9, color:P.green }}>
            ✓ Simulation complete · {N_CYCLES} cycles · Δt={DT} · Lindblad RK4 · 60 nuclear shell configurations
          </div>
        )}
      </div>

      {/* ── QHP PROJECTION CANVAS ──────────────────────────────────────────── */}
      <div style={{ background:P.surface, border:`0.5px solid ${P.border}`, borderRadius:12, padding:"10px", marginBottom:10 }}>
        <div style={{ fontSize:9, color:P.muted, marginBottom:6, letterSpacing:"0.08em" }}>
          QHP PROJECTION SURFACE · {QHP_ADAPTER} · {QHP_FREQ_THZ} THz POLARITRON RESONANCE
        </div>
        <QHPNuclearProjection
          governed={governed}
          fidelity={ls.fidelity}
          island={ls.island}
          O={ls.O}
          K={ls.K}
          cycle={ls.cycle}
          finalRho={finalRhoG}
          phase={phase}
        />
      </div>

      {/* ── QHP SCENE DSL ──────────────────────────────────────────────────── */}
      {showScene && (
        <div style={{ marginBottom:10 }}>
          <QHPSceneBlock
            fidelity={ls.fidelity} island={ls.island}
            O={ls.O} K={ls.K} M={ls.M}
            cycle={ls.cycle} governed={governed}
          />
        </div>
      )}

      {/* ── IDLE DESCRIPTION ───────────────────────────────────────────────── */}
      {phase==="idle" && (
        <div style={{ background:P.surface, border:`0.5px solid ${P.border}`,
          borderLeft:`3px solid ${P.gold}`, borderRadius:8, padding:"12px 14px", marginBottom:12 }}>
          <div style={{ fontSize:10, color:P.gold, marginBottom:6, letterSpacing:"0.06em" }}>QHP SIMULATION DESCRIPTION</div>
          <div style={{ fontSize:11, color:P.muted, lineHeight:1.85 }}>
            Lindblad master equation evolution of the Mc-290 nuclear density matrix across 60 shell configurations (Z=114–119, N=172–181).
            Governed mode applies the Orthogonal Decoherence Defense — an AURAL-M governance Hamiltonian projected orthogonal to Lindblad
            alpha decay and spontaneous fission channels, driving the nuclear state toward the Island of Stability ground state.
            The Island of Stability (Z≈114–116, N≈178–181) is the forward-invariant viability kernel K_N under DCGP governance.
            Meta-fidelity F·O/O_max measures governed nuclear stability authority across 300 RK4 cycles.
            The QHP holographic projection renders the nuclear quantum field as a live scene description in QHP DSL.
          </div>
        </div>
      )}

      {/* ── LIVE STATS ─────────────────────────────────────────────────────── */}
      {phase !== "idle" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:6, marginBottom:10 }}>
          <Stat label="FIDELITY ⟨gs|ρ|gs⟩" val={ls.fidelity.toFixed(4)} color={ls.fidelity > 0.65 ? P.teal : ls.fidelity > 0.4 ? P.amber : P.red} />
          <Stat label="ISLAND OCCUPANCY"    val={`${(ls.island*100).toFixed(1)}%`} color={P.cyan} />
          <Stat label="OBLIGATION O"         val={ls.O.toFixed(4)} color={P.green} />
          <Stat label="AUTHORITY K"          val={ls.K.toFixed(4)} color={P.purple} />
          <Stat label="MEMORY M"             val={ls.M.toFixed(4)} color={P.cyan} />
          <Stat label="CYCLE"                val={`${ls.cycle}/${N_CYCLES}`} color={P.gold} sub={`${Math.round(ls.cycle/N_CYCLES*100)}%`} />
        </div>
      )}

      {/* ── ALL 9 CHARTS ───────────────────────────────────────────────────── */}
      {combined.length > 0 && (
        <>
          {/* Row 1 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
            <QHPChart data={combined} govKey="meta" ungovKey="metaU"
              govColor={P.gold} ungovColor={P.red}
              title="META-FIDELITY F·O/O_max" refLine={0.65} />
            <QHPChart data={combined} govKey="island" ungovKey="islandU"
              govColor={P.cyan} ungovColor={P.red}
              title="ISLAND OCCUPANCY P(Z=114–116, N=178–181)" />
            <QHPChart data={combined} govKey="fidelity" ungovKey="fidelityU"
              govColor={P.gold} ungovColor={P.red}
              title="GROUND STATE FIDELITY ⟨gs|ρ|gs⟩" refLine={0.65} />
          </div>

          {/* Row 2 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
            <QHPChart data={combined} govKey="O"
              govColor={P.green}
              title="OBLIGATION O(t) · GOVERNANCE RESOURCE" refLine={1.0} />
            <QHPChart data={combined} govKey="K"
              govColor={P.purple}
              title="FAST AUTHORITY K(t) · SPECTRAL SIGNAL" />
            <QHPChart data={combined} govKey="M"
              govColor={P.cyan}
              title="SLOW MEMORY M(t) · PERSISTENCE LAYER" />
          </div>

          {/* Row 3 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:10 }}>
            <QHPChart data={combined} govKey="rescue"
              govColor={P.red}
              title="RESCUE WINDOW W_N (cycles)" refLine={5} />
            <DeltaChart data={combined} title="GOVERNANCE ADVANTAGE ΔF (gov − ungov)" />
            <div style={{ background:P.card, border:`0.5px solid ${P.border}`, borderRadius:8, padding:"10px" }}>
              {finalRhoG
                ? <QHPNuclearMap rho={finalRhoG} title="FINAL CONFIG MAP · GOVERNED Mc-290" color={P.cyan} />
                : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", minHeight:80 }}>
                    <span style={{ fontSize:10, color:P.muted, fontStyle:"italic" }}>
                      {phase==="running" ? "Nuclear map renders on completion…" : "Run simulation to view map"}
                    </span>
                  </div>}
            </div>
          </div>

          {/* Ungoverned map side by side if done */}
          {finalRhoU && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 2fr", gap:8, marginBottom:10 }}>
              <div style={{ background:P.card, border:`0.5px solid ${P.border}`, borderRadius:8, padding:"10px" }}>
                <QHPNuclearMap rho={finalRhoU} title="FINAL CONFIG MAP · UNGOVERNED (decay)" color={P.red} />
              </div>
              <div style={{ background:P.card, border:`0.5px solid ${P.border}`, borderRadius:8, padding:"10px" }}>
                <QHPNuclearMap rho={finalRhoG} title="FINAL CONFIG MAP · GOVERNED (island)" color={P.teal} />
              </div>
              <div style={{ background:P.card, border:`0.5px solid ${P.border}`,
                borderLeft:`3px solid ${P.gold}`, borderRadius:8, padding:"12px 14px" }}>
                <div style={{ fontSize:10, color:P.gold, marginBottom:8, letterSpacing:"0.06em" }}>
                  QHP PROJECTION CLAIM
                </div>
                <div style={{ fontSize:10, color:P.muted, lineHeight:1.85 }}>
                  Island of stability = forward-invariant viability kernel K_N.<br/>
                  Governance prevents nuclear decay by maintaining density matrix within K_N under AURAL-M.<br/>
                  Meta-fidelity F·O/O_max measures governed nuclear stability authority.<br/>
                  The Orthogonal Decoherence Defense projects H_G ⊥ &#123;L_i&#125; — governance signal
                  is orthogonal to all Lindblad decay channels, preventing authority leakage into dissipation.<br/>
                  <span style={{ color:P.cyan }}>B := S ∩ I(S) · R = C/γ · K_obs = min_i d(Z(t), ∂K_i)</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── VALIDATION SUMMARY ─────────────────────────────────────────────── */}
      {summary && (
        <div style={{ background:P.surface, border:`0.5px solid ${P.border}`,
          borderLeft:`3px solid ${P.gold}`, borderRadius:8, padding:"12px 14px", marginBottom:10 }}>
          <div style={{ fontSize:10, color:P.gold, marginBottom:10, letterSpacing:"0.06em" }}>
            QHP VALIDATION SUMMARY — Element 115 Nuclear Shell Governance
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
            {[
              ["Meta-fidelity (final)",          summary.govMeta,    summary.ungovMeta,  P.gold],
              ["Ground state fidelity (final)",  summary.govFid,     summary.ungovFid,   P.gold],
              ["Island occupancy (final)",        summary.govIsland,  summary.ungovIsland,P.cyan],
              ["Peak governance advantage ΔF",    summary.maxDelta,   "—",                P.green],
              ["Final obligation O",              summary.govO,       "N/A",              P.green],
              ["Final authority K",               summary.govK,       "N/A",              P.purple],
              ["Final memory M",                  summary.govM,       "N/A",              P.cyan],
              ["Cycles completed",               `${N_CYCLES}`,       `${N_CYCLES}`,      P.muted],
            ].map(([label, gov, ungov, col]) => (
              <div key={label} style={{ background:P.card, borderRadius:7, padding:"8px 10px",
                border:`0.5px solid ${P.border}` }}>
                <div style={{ fontSize:8, color:P.muted, marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:12, fontWeight:700, color:col }}>{gov}</div>
                {ungov !== "N/A" && ungov !== "—" &&
                  <div style={{ fontSize:9, color:P.red, marginTop:2 }}>ungov: {ungov}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LEGEND ─────────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap", paddingTop:6,
        borderTop:`0.5px solid ${P.border}` }}>
        {[
          [P.gold,   "Governed"],
          [P.red,    "Ungoverned"],
          [P.green,  "Viability threshold (0.65)"],
          [P.cyan,   "Island of Stability K_N"],
          [P.purple, "Authority signal K(t)"],
          [P.teal,   "QHP projection surface"],
        ].map(([col,label]) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:P.muted }}>
            <div style={{ width:16, height:2, background:col, borderRadius:1 }} />
            {label}
          </div>
        ))}
      </div>

    </div>
  );
}
