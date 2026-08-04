import { useState, useRef, useEffect, useCallback } from "react";

// ── QHP SCENE RENDERER ─────────────────────────────────────────────────────
// Implements QHP language semantics as canvas-based holographic projection.
// Each pipeline advance fires a holo Scene describing the current bio layer,
// drift resonance field, and CHVM manifold surface.

const QHP = {
  // Projection adapter: WebGL fallback (canvas 2D holographic simulation)
  adapter: "WebGLFallback",
  // Polaritron resonance base frequency (THz, normalized to animation)
  baseFreq: 14.7,
};

const C = {
  gov:     "#534AB7",
  stable:  "#1D9E75",
  warn:    "#BA7517",
  danger:  "#A32D2D",
  info:    "#185FA5",
  holoPrimary:   "#00FFD4",
  holoSecondary: "#7B5CFA",
  holoWarn:      "#FFB800",
  holoDanger:    "#FF3D3D",
  bg:      "#020812",
  surface: "#0A0F1E",
  border:  "#1A2540",
  text:    "#E2F0FF",
  muted:   "#4A6080",
};

const TARGETS = [
  { id:"T1", name:"KRAS G12C",   pathway:"RAS/MAPK",           baseDrift:0.06, viability:0.91 },
  { id:"T2", name:"CDK4/6",      pathway:"Cell Cycle",          baseDrift:0.19, viability:0.72 },
  { id:"T3", name:"PD-L1",       pathway:"Immune Checkpoint",   baseDrift:0.33, viability:0.55 },
  { id:"T4", name:"EGFR T790M",  pathway:"RTK Signaling",       baseDrift:0.07, viability:0.93 },
];

const COMPOUNDS = {
  T1:[{id:"C1",name:"AMG-510 analog",binding:0.91,tox:0.11,selectivity:0.88},{id:"C2",name:"SOS1 inhibitor",binding:0.74,tox:0.29,selectivity:0.71}],
  T2:[{id:"C3",name:"Palbociclib-X",binding:0.85,tox:0.16,selectivity:0.82},{id:"C4",name:"Ribociclib-2",binding:0.68,tox:0.42,selectivity:0.61}],
  T3:[{id:"C5",name:"Atezolizumab-v2",binding:0.77,tox:0.20,selectivity:0.74},{id:"C6",name:"Durvalumab-M",binding:0.59,tox:0.53,selectivity:0.49}],
  T4:[{id:"C7",name:"Osimertinib-B",binding:0.93,tox:0.08,selectivity:0.91},{id:"C8",name:"Lazertinib-X",binding:0.81,tox:0.23,selectivity:0.79}],
};

const STAGES    = ["Target ID","Compound Select","In Vitro","In Vivo","IND Filing","Phase I","Phase II"];
const BIO_LAYERS = ["Cell","Tissue","Organ","System"];

async function callClaude(sys, user) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-6", max_tokens:1000,
      system: sys, messages:[{role:"user",content:user}]
    })
  });
  const d = await r.json();
  return d.content?.[0]?.text || "";
}

// ── QHP HOLOGRAPHIC CANVAS ─────────────────────────────────────────────────
function QHPProjection({ scene, governed, drift, manifold, bioLayer, stage, active }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const holoColor = governed
      ? (drift > 0.3 ? C.holoDanger : drift > 0.15 ? C.holoWarn : C.holoPrimary)
      : C.holoDanger;

    function hexToRgb(hex) {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return `${r},${g},${b}`;
    }

    function drawFrame(t) {
      ctx.clearRect(0,0,W,H);

      // Background
      ctx.fillStyle = C.bg;
      ctx.fillRect(0,0,W,H);

      // QHP grid floor — projection surface
      ctx.save();
      ctx.strokeStyle = `rgba(${hexToRgb(holoColor)},0.08)`;
      ctx.lineWidth = 0.5;
      const gridSpacing = 24;
      for (let x = 0; x < W; x += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      }
      for (let y = 0; y < H; y += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
      }
      ctx.restore();

      // CHVM manifold ring — viability boundary
      const cx = W/2, cy = H/2;
      const manifoldR = Math.max(20, manifold * 90);
      const manifoldColor = manifold < 0.45 ? C.holoDanger : manifold < 0.7 ? C.holoWarn : C.holoPrimary;
      for (let i = 3; i >= 0; i--) {
        ctx.beginPath();
        ctx.arc(cx, cy, manifoldR + i*8, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${hexToRgb(manifoldColor)},${0.06 - i*0.01})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Solid manifold ring
      ctx.beginPath();
      ctx.arc(cx, cy, manifoldR, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${hexToRgb(manifoldColor)},0.5)`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6,4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // CHVM label
      ctx.fillStyle = `rgba(${hexToRgb(manifoldColor)},0.6)`;
      ctx.font = "8px monospace";
      ctx.fillText(`CHVM ${Math.round(manifold*100)}%`, cx + manifoldR + 6, cy);

      // Bio layer nodes — quantum entities on the projection surface
      const nodeAngles = BIO_LAYERS.map((_, i) => (i / BIO_LAYERS.length) * Math.PI * 2 - Math.PI/2);
      const nodeR = 70;
      BIO_LAYERS.forEach((layer, i) => {
        const angle = nodeAngles[i];
        const nx = cx + Math.cos(angle) * nodeR;
        const ny = cy + Math.sin(angle) * nodeR;
        const isActive = i === bioLayer;
        const isPast   = i < bioLayer;
        const nodeCol  = isActive ? holoColor : isPast ? C.holoSecondary : C.muted;
        const pulse    = isActive ? 1 + 0.15 * Math.sin(t * 0.08) : 1;

        // Entanglement line to center
        if (isPast || isActive) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(nx, ny);
          ctx.strokeStyle = `rgba(${hexToRgb(nodeCol)},${isActive ? 0.4 : 0.15})`;
          ctx.lineWidth = isActive ? 1.5 : 0.5;
          ctx.stroke();
        }

        // Node glow
        if (isActive) {
          const grad = ctx.createRadialGradient(nx,ny,0,nx,ny,22*pulse);
          grad.addColorStop(0, `rgba(${hexToRgb(nodeCol)},0.3)`);
          grad.addColorStop(1, `rgba(${hexToRgb(nodeCol)},0)`);
          ctx.beginPath();
          ctx.arc(nx,ny,22*pulse,0,Math.PI*2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Node dot
        ctx.beginPath();
        ctx.arc(nx, ny, isActive ? 7*pulse : isPast ? 5 : 4, 0, Math.PI*2);
        ctx.fillStyle = isActive ? nodeCol : isPast ? `rgba(${hexToRgb(nodeCol)},0.5)` : `rgba(${hexToRgb(C.muted)},0.3)`;
        ctx.fill();

        // Node label
        ctx.fillStyle = isActive ? nodeCol : `rgba(${hexToRgb(nodeCol)},0.5)`;
        ctx.font = `${isActive ? "bold " : ""}9px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(layer, nx, ny + (ny > cy ? 18 : -10));
      });

      // Center — MC290 Polaritron resonance node
      const coreR = 10 + 2*Math.sin(t * QHP.baseFreq * 0.004);
      const coreGrad = ctx.createRadialGradient(cx,cy,0,cx,cy,coreR*2.5);
      coreGrad.addColorStop(0, `rgba(${hexToRgb(holoColor)},0.9)`);
      coreGrad.addColorStop(0.5, `rgba(${hexToRgb(holoColor)},0.3)`);
      coreGrad.addColorStop(1, `rgba(${hexToRgb(holoColor)},0)`);
      ctx.beginPath();
      ctx.arc(cx,cy,coreR*2.5,0,Math.PI*2);
      ctx.fillStyle = coreGrad;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx,cy,coreR,0,Math.PI*2);
      ctx.fillStyle = holoColor;
      ctx.fill();

      // Drift resonance wave — radiates from center, intensity = drift
      if (drift > 0 && active) {
        const waveR = ((t * 1.2) % 120);
        const waveAlpha = Math.max(0, (1 - waveR/120) * drift * 0.6);
        ctx.beginPath();
        ctx.arc(cx,cy,waveR,0,Math.PI*2);
        ctx.strokeStyle = `rgba(${hexToRgb(holoColor)},${waveAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Drift index display
      if (drift > 0) {
        const driftCol = drift > 0.3 ? C.holoDanger : drift > 0.15 ? C.holoWarn : C.holoPrimary;
        ctx.fillStyle = `rgba(${hexToRgb(driftCol)},0.7)`;
        ctx.font = "9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`drift ${drift}`, 10, H-24);
        ctx.fillText(`${QHP.adapter} · ${QHP.baseFreq} THz`, 10, H-12);
      }

      // Stage label top
      ctx.fillStyle = `rgba(${hexToRgb(holoColor)},0.5)`;
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`holo Scene ${stage || "TargetID"} · ${BIO_LAYERS[bioLayer] || "Cell"} layer`, cx, 16);

      // Governed status
      ctx.fillStyle = governed
        ? `rgba(${hexToRgb(C.holoPrimary)},0.4)`
        : `rgba(${hexToRgb(C.holoDanger)},0.4)`;
      ctx.textAlign = "right";
      ctx.fillText(governed ? "GOVERNED" : "UNGOVERNED", W-10, 16);

      tRef.current = t + 1;
      animRef.current = requestAnimationFrame(() => drawFrame(tRef.current));
    }

    animRef.current = requestAnimationFrame(() => drawFrame(tRef.current));
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [governed, drift, manifold, bioLayer, stage, active, scene]);

  return (
    <canvas
      ref={canvasRef}
      width={400} height={220}
      style={{ width:"100%", height:"auto", borderRadius:10, display:"block" }}
    />
  );
}

// ── QHP SCENE DESCRIPTION PANEL ────────────────────────────────────────────
function QHPSceneBlock({ scene, color }) {
  if (!scene) return null;
  return (
    <div style={{
      background: C.surface, border:`0.5px solid ${color}44`,
      borderLeft:`3px solid ${color}`, borderRadius:8,
      padding:"10px 14px", marginTop:8,
      fontFamily:"monospace", fontSize:11, lineHeight:1.8,
      color: `${color}cc`, overflowX:"auto",
    }}>
      <div style={{ fontSize:9, color:C.muted, marginBottom:4, letterSpacing:"0.08em" }}>
        QHP SCENE DESCRIPTION
      </div>
      <pre style={{ margin:0, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{scene}</pre>
    </div>
  );
}

// ── UI ATOMS ───────────────────────────────────────────────────────────────
function Bar({ val, color, max=1, h=5 }) {
  return (
    <div style={{ flex:1, height:h, background:C.border, borderRadius:3, overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,Math.round((val/max)*100))}%`, height:"100%", background:color, borderRadius:3, transition:"width 0.5s" }} />
    </div>
  );
}

function Tag({ color, children }) {
  return (
    <span style={{ fontSize:10, fontWeight:500, padding:"2px 7px", borderRadius:5,
      background:color+"20", color, border:`0.5px solid ${color}44` }}>{children}</span>
  );
}

function Panel({ title, color=C.gov, loading, children, accent, scene }) {
  return (
    <div style={{ background:C.surface, border:`0.5px solid ${C.border}`,
      borderLeft:`3px solid ${color}`, borderRadius:10, padding:"13px 16px", marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ fontSize:10, fontWeight:500, color, textTransform:"uppercase", letterSpacing:"0.05em" }}>{title}</div>
        {accent && <Tag color={color}>{accent}</Tag>}
      </div>
      {loading
        ? <div style={{ fontSize:13, color:C.muted, fontStyle:"italic" }}>Projecting…</div>
        : children}
      {scene && <QHPSceneBlock scene={scene} color={color} />}
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [governed,  setGoverned]  = useState(true);
  const [target,    setTarget]    = useState(null);
  const [compound,  setCompound]  = useState(null);
  const [stage,     setStage]     = useState(0);
  const [bioLayer,  setBioLayer]  = useState(0);
  const [drift,     setDrift]     = useState(0);
  const [manifold,  setManifold]  = useState(1);
  const [running,   setRunning]   = useState(false);
  const [rejected,  setRejected]  = useState(false);
  const [ai,        setAi]        = useState({ drift:null, score:null, horizon:null, reasoning:null });
  const [scenes,    setScenes]    = useState({ drift:null, score:null, horizon:null, reasoning:null });
  const [loading,   setLoading]   = useState({});
  const [log,       setLog]       = useState([]);
  const [history,   setHistory]   = useState([]);
  const [projActive,setProjActive]= useState(false);
  const logRef = useRef(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const addLog = useCallback((msg, t="info") => {
    const colors = { info:C.muted, gov:C.holoPrimary, ok:C.stable, warn:C.holoWarn, err:C.holoDanger, llm:C.holoSecondary };
    setLog(l => [...l, { msg, color:colors[t]||C.muted, ts:new Date().toLocaleTimeString("en",{hour12:false}) }]);
  }, []);

  // Build QHP scene description string from pipeline state
  function buildQHPScene(stageName, layerName, driftVal, manifoldVal, targetName, compoundName, governedVal) {
    return `holo Scene ${stageName.replace(/ /g,"_")} {
  entity QuantumTarget "${targetName}" at (0, 1.5, 0);
  entity Compound "${compoundName}" at (0.5, 1.5, 0);
  entity BioLayer "${layerName}" at (-0.5, 1.2, 0);

  quantum state |ψ⟩ = H(|governed⟩);
  bind |ψ⟩ to (QuantumTarget, Compound);

  drift_field DriftResonance {
    intensity: ${driftVal};
    frequency: ${QHP.baseFreq} THz;
    phase: ${governedVal ? "+1.0" : "-1.0"};
  }

  manifold CHVMSurface {
    integrity: ${manifoldVal};
    boundary: B := S ∩ I(S);
    projection_radius: R = C / γ;
  }

  on quantum.measurement(QuantumTarget) {
    update Compound.visualization with collapse_state;
    emit event GovernanceBoundaryCheck;
  }

  projector AdaptiveProjector {
    if (device.hasQuantumEmitter) { output: QHolo; }
    else { output: WebGLFallback; }
  }
}

run Scene ${stageName.replace(/ /g,"_")} on projector AdaptiveProjector;`;
  }

  const reset = () => {
    setTarget(null); setCompound(null); setStage(0); setBioLayer(0);
    setDrift(0); setManifold(1); setRejected(false); setProjActive(false);
    setAi({ drift:null, score:null, horizon:null, reasoning:null });
    setScenes({ drift:null, score:null, horizon:null, reasoning:null });
    setLoading({}); setLog([]); setHistory([]);
  };

  const advance = useCallback(async () => {
    if (!target || !compound || running) return;
    setRunning(true); setRejected(false); setProjActive(true);

    const nextStage   = Math.min(stage + 1, STAGES.length - 1);
    const nextLayer   = Math.min(bioLayer + 1, BIO_LAYERS.length - 1);
    const newDrift    = governed
      ? parseFloat(Math.min(0.08, target.baseDrift * 0.3 + Math.random()*0.02).toFixed(3))
      : parseFloat(Math.min(0.92, target.baseDrift + compound.tox * 0.4 + Math.random()*0.2).toFixed(3));
    const newManifold = governed
      ? parseFloat(Math.max(0.75, manifold - 0.03*newDrift).toFixed(2))
      : parseFloat(Math.max(0.1,  manifold - 0.18*newDrift - 0.05).toFixed(2));

    setStage(nextStage); setBioLayer(nextLayer); setDrift(newDrift); setManifold(newManifold);

    // Build QHP scene for this advance
    const sceneStr = buildQHPScene(
      STAGES[nextStage], BIO_LAYERS[nextLayer],
      newDrift, newManifold, target.name, compound.name, governed
    );
    addLog(`QHP holo Scene ${STAGES[nextStage].replace(/ /g,"_")} projected`, "gov");

    // LLM reasoning
    setLoading(l => ({...l, reasoning:true}));
    addLog("[QHP:LLM] Reasoning chain initiated…", "llm");
    const reasonText = await callClaude(
      "You are the AURA LLM reasoning engine inside a QHP holographic drug discovery runtime. 3 sentences. Think about mechanism coherence as if describing what is visible in the holographic projection.",
      `QHP Scene: ${STAGES[nextStage]}. Target entity: ${target.name} (${target.pathway}). Compound entity: ${compound.name}. Bio layer node: ${BIO_LAYERS[nextLayer]}. Drift resonance: ${newDrift}. CHVM manifold integrity: ${newManifold}. Governed: ${governed}. What does the holographic projection reveal about mechanistic coherence at this stage?`
    );
    setAi(a => ({...a, reasoning:reasonText}));
    setScenes(s => ({...s, reasoning:sceneStr}));
    setLoading(l => ({...l, reasoning:false}));
    addLog("[QHP:LLM] Reasoning chain complete", "llm");

    // Drift detection
    setLoading(l => ({...l, drift:true}));
    const driftText = await callClaude(
      "You are AURA's QHP drift detection engine. 3 sentences. Describe what is drifting in holographic projection terms — resonance nodes, field intensity, manifold deformation.",
      `Stage: ${STAGES[nextStage]}. Target: ${target.name}. Drift resonance intensity: ${newDrift} at ${QHP.baseFreq} THz. Viability manifold: ${newManifold}. Bio layer: ${BIO_LAYERS[nextLayer]}. Governed: ${governed}. Is the trajectory inside the CHVM boundary B := S ∩ I(S)?`
    );
    setAi(a => ({...a, drift:driftText}));
    setScenes(s => ({...s, drift:sceneStr}));
    setLoading(l => ({...l, drift:false}));
    addLog(`Drift resonance ${newDrift} — manifold ${newManifold}`, newDrift > 0.3 ? "err" : newDrift > 0.15 ? "warn" : "ok");

    // Candidate scoring
    setLoading(l => ({...l, score:true}));
    const scoreText = await callClaude(
      "You are AURA's QHP candidate scoring engine. 3 sentences. State advance, watch, or reject. Frame the verdict in terms of holographic projection stability.",
      `Compound: ${compound.name}. Binding: ${compound.binding}. Toxicity: ${compound.tox}. Selectivity: ${compound.selectivity}. Drift: ${newDrift}. Manifold: ${newManifold}. Stage: ${STAGES[nextStage]}. Governed: ${governed}. Score this compound. Does its projection remain inside the viability manifold?`
    );
    setAi(a => ({...a, score:scoreText}));
    setLoading(l => ({...l, score:false}));

    const doReject = !governed && (compound.tox > 0.35 || newDrift > 0.28 || newManifold < 0.45);
    if (doReject) { setRejected(true); addLog(`QHP REJECTED: ${compound.name} — manifold breach`, "err"); }
    else addLog("Compound projection stable — advancing", "ok");

    // Horizon
    setLoading(l => ({...l, horizon:true}));
    const horizonText = await callClaude(
      "You are AURA's QHP governance horizon detector. 3 sentences. Identify where the holographic projection collapses — the stage where the CHVM manifold is most likely to breach.",
      `Pipeline: ${target.name} → ${compound.name}. Stage: ${STAGES[nextStage]}. Drift: ${newDrift}. Manifold: ${newManifold}. Governed: ${governed}. Remaining stages: ${STAGES.slice(nextStage+1).join(", ")}. At which future stage does the projection field destabilize?`
    );
    setAi(a => ({...a, horizon:horizonText}));
    setLoading(l => ({...l, horizon:false}));
    addLog("Horizon projection complete", "ok");

    setHistory(h => [...h, {
      stage:STAGES[nextStage], layer:BIO_LAYERS[nextLayer],
      drift:newDrift, manifold:newManifold, governed, rejected:doReject
    }]);
    setRunning(false);
  }, [target, compound, stage, bioLayer, drift, manifold, governed, running, addLog]);

  const driftColor    = drift > 0.3 ? C.holoDanger : drift > 0.15 ? C.holoWarn : C.holoPrimary;
  const manifoldColor = manifold < 0.45 ? C.holoDanger : manifold < 0.7 ? C.holoWarn : C.holoPrimary;
  const compounds     = target ? COMPOUNDS[target.id] : [];
  const hasAny        = Object.values(ai).some(Boolean);

  return (
    <div style={{ fontFamily:"'SF Mono', 'Fira Code', monospace", background:C.bg, color:C.text, padding:"12px", minHeight:"100vh" }}>
      
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16,
        borderBottom:`0.5px solid ${C.border}`, paddingBottom:12 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:600, letterSpacing:"-0.02em", color:C.holoPrimary }}>
            QHP · AURA Holographic Runtime
          </div>
          <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>
            DocGrokHealth · {QHP.adapter} · {QHP.baseFreq} THz Polaritron resonance · MC290 lock
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:10, color:C.muted }}>Governance</span>
          <button onClick={() => setGoverned(g => !g)} style={{
            padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer",
            background: governed ? C.holoPrimary+"18" : C.holoDanger+"18",
            color: governed ? C.holoPrimary : C.holoDanger,
            border:`1px solid ${governed ? C.holoPrimary : C.holoDanger}55`,
            letterSpacing:"0.05em",
          }}>{governed ? "ON" : "OFF"}</button>
          <button onClick={reset} style={{
            padding:"4px 10px", borderRadius:6, fontSize:11, cursor:"pointer",
            background:"none", border:`0.5px solid ${C.border}`, color:C.muted
          }}>Reset</button>
        </div>
      </div>

      {/* QHP Holographic Projection Canvas */}
      <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:12,
        padding:"12px", marginBottom:14 }}>
        <div style={{ fontSize:9, color:C.muted, marginBottom:8, letterSpacing:"0.08em" }}>
          QHP PROJECTION SURFACE · {QHP.adapter}
        </div>
        <QHPProjection
          scene={scenes.reasoning}
          governed={governed}
          drift={drift}
          manifold={manifold}
          bioLayer={bioLayer}
          stage={STAGES[stage]}
          active={projActive}
        />
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginBottom:12 }}>
        {[
          { label:"Governance",    val: governed ? "Active" : "Off",  color: governed ? C.holoPrimary : C.holoDanger },
          { label:"Drift index",   val: drift > 0 ? drift : "—",      color: drift > 0 ? driftColor : C.muted },
          { label:"CHVM",          val: manifold < 1 ? `${Math.round(manifold*100)}%` : "—", color: manifold < 1 ? manifoldColor : C.muted },
          { label:"Stage",         val: STAGES[stage],                 color: C.text },
          { label:"Bio layer",     val: BIO_LAYERS[bioLayer],          color: C.holoSecondary },
        ].map(s => (
          <div key={s.label} style={{ background:C.surface, borderRadius:8, padding:"8px 10px",
            border:`0.5px solid ${C.border}` }}>
            <div style={{ fontSize:9, color:C.muted, marginBottom:2, letterSpacing:"0.06em" }}>{s.label}</div>
            <div style={{ fontSize:11, fontWeight:600, color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Pipeline stages */}
      <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:10,
        padding:"12px 14px", marginBottom:12 }}>
        <div style={{ fontSize:9, color:C.muted, marginBottom:8, letterSpacing:"0.06em" }}>PIPELINE STAGES</div>
        <div style={{ display:"flex", gap:0, alignItems:"center" }}>
          {STAGES.map((s, i) => {
            const active = i === stage, past = i < stage;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", flex: i < STAGES.length-1 ? 1 : "none" }}>
                <div style={{
                  padding:"4px 6px", borderRadius:4, fontSize:8, fontWeight: active ? 600 : 400,
                  background: active ? (governed ? C.holoPrimary : C.holoDanger) : past ? C.holoPrimary+"22" : C.bg,
                  color: active ? C.bg : past ? C.holoPrimary+"88" : C.muted,
                  border: active ? "none" : `0.5px solid ${C.border}`,
                  whiteSpace:"nowrap", transition:"all 0.4s",
                }}>{s}</div>
                {i < STAGES.length-1 && (
                  <div style={{ flex:1, height:1, background: i < stage ? C.holoPrimary+"44" : C.border, minWidth:4 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Target selection */}
      <div style={{ fontSize:11, fontWeight:600, marginBottom:8, color:C.muted, letterSpacing:"0.06em" }}>
        01 · SELECT TARGET
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:12 }}>
        {TARGETS.map(t => {
          const sel = target?.id === t.id;
          const dc  = t.baseDrift > 0.2 ? C.holoWarn : C.holoPrimary;
          return (
            <div key={t.id} onClick={() => { setTarget(t); setCompound(null); }} style={{
              padding:"10px 12px", borderRadius:8, cursor:"pointer",
              background: sel ? C.holoPrimary+"0d" : C.surface,
              border:`${sel ? "1.5px" : "0.5px"} solid ${sel ? C.holoPrimary : C.border}`,
              transition:"all 0.2s",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontWeight:600, fontSize:12, color: sel ? C.holoPrimary : C.text }}>{t.name}</span>
                <Tag color={dc}>drift {t.baseDrift}</Tag>
              </div>
              <div style={{ fontSize:10, color:C.muted, marginBottom:6 }}>{t.pathway}</div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <span style={{ fontSize:9, color:C.muted, minWidth:48 }}>viability</span>
                <Bar val={t.viability} color={sel ? C.holoPrimary : C.holoSecondary} />
                <span style={{ fontSize:9, color:C.muted }}>{t.viability}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compound selection */}
      {target && (
        <>
          <div style={{ fontSize:11, fontWeight:600, marginBottom:8, color:C.muted, letterSpacing:"0.06em" }}>
            02 · SELECT COMPOUND — {target.name}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:12 }}>
            {compounds.map(cp => {
              const sel = compound?.id === cp.id;
              const tc  = cp.tox > 0.35 ? C.holoDanger : cp.tox > 0.2 ? C.holoWarn : C.holoPrimary;
              return (
                <div key={cp.id} onClick={() => setCompound(cp)} style={{
                  padding:"10px 12px", borderRadius:8, cursor:"pointer",
                  background: sel ? C.holoPrimary+"0d" : C.surface,
                  border:`${sel ? "1.5px" : "0.5px"} solid ${sel ? C.holoPrimary : C.border}`,
                  opacity: rejected && sel ? 0.5 : 1, transition:"all 0.2s",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontWeight:600, fontSize:12, color: sel ? C.holoPrimary : C.text }}>{cp.name}</span>
                    {rejected && sel && <Tag color={C.holoDanger}>MANIFOLD BREACH</Tag>}
                  </div>
                  {[["Binding", cp.binding, C.holoPrimary],["Toxicity", cp.tox, tc],["Selectivity", cp.selectivity, C.holoSecondary]].map(([label,val,col]) => (
                    <div key={label} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4 }}>
                      <span style={{ fontSize:9, color:C.muted, minWidth:54 }}>{label}</span>
                      <Bar val={val} color={col} />
                      <span style={{ fontSize:9, color:col, minWidth:24 }}>{val}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Advance */}
      {target && compound && (
        <button onClick={advance} disabled={running || stage >= STAGES.length-1} style={{
          width:"100%", padding:"11px 0", borderRadius:8, fontSize:13, fontWeight:600,
          cursor: running || stage >= STAGES.length-1 ? "not-allowed" : "pointer",
          background: running ? C.surface : governed ? C.holoPrimary : C.holoWarn,
          color: running ? C.muted : C.bg,
          border:`1px solid ${governed ? C.holoPrimary : C.holoWarn}`,
          opacity: running ? 0.7 : 1, marginBottom:14, transition:"all 0.2s",
          letterSpacing:"0.04em",
        }}>
          {running
            ? "▶ Projecting QHP scene…"
            : stage >= STAGES.length-1
            ? "Pipeline complete"
            : `Project → ${STAGES[Math.min(stage+1, STAGES.length-1)]}`}
        </button>
      )}

      {/* AI + QHP Scene panels */}
      {hasAny && (
        <>
          {(ai.reasoning || loading.reasoning) && (
            <Panel title="QHP · Mechanistic coherence" color={C.holoSecondary}
              loading={loading.reasoning} accent={`${BIO_LAYERS[bioLayer]} layer`}
              scene={scenes.reasoning}>
              <div style={{ fontSize:12, lineHeight:1.7, whiteSpace:"pre-wrap", color:C.text }}>{ai.reasoning}</div>
            </Panel>
          )}
          {(ai.drift || loading.drift) && (
            <Panel title="QHP · Drift resonance field" color={C.holoPrimary}
              loading={loading.drift} accent={drift > 0 ? `CHVM ${Math.round(manifold*100)}%` : undefined}
              scene={scenes.drift}>
              <div style={{ fontSize:12, lineHeight:1.7, whiteSpace:"pre-wrap", color:C.text }}>{ai.drift}</div>
            </Panel>
          )}
          {(ai.score || loading.score) && (
            <Panel title="QHP · Candidate projection verdict" color={rejected ? C.holoDanger : C.stable} loading={loading.score}>
              <div style={{ fontSize:12, lineHeight:1.7, whiteSpace:"pre-wrap", color:C.text }}>{ai.score}</div>
            </Panel>
          )}
          {(ai.horizon || loading.horizon) && (
            <Panel title="QHP · Governance horizon" color={C.holoWarn} loading={loading.horizon}>
              <div style={{ fontSize:12, lineHeight:1.7, whiteSpace:"pre-wrap", color:C.text }}>{ai.horizon}</div>
            </Panel>
          )}
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:10,
          padding:"12px 14px", marginBottom:10 }}>
          <div style={{ fontSize:9, color:C.muted, marginBottom:8, letterSpacing:"0.06em" }}>TRAJECTORY HISTORY</div>
          {history.map((h,i) => (
            <div key={i} style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:5, alignItems:"center" }}>
              <span style={{ fontSize:11, color:C.muted, minWidth:90 }}>{h.stage}</span>
              <Tag color={C.holoSecondary}>{h.layer}</Tag>
              <Tag color={h.drift > 0.3 ? C.holoDanger : h.drift > 0.15 ? C.holoWarn : C.holoPrimary}>
                drift {h.drift}
              </Tag>
              <Tag color={h.manifold < 0.5 ? C.holoDanger : h.manifold < 0.7 ? C.holoWarn : C.holoPrimary}>
                CHVM {h.manifold}
              </Tag>
              <Tag color={h.governed ? C.holoPrimary : C.holoDanger}>
                {h.governed ? "governed" : "ungoverned"}
              </Tag>
              {h.rejected && <Tag color={C.holoDanger}>manifold breach</Tag>}
            </div>
          ))}
        </div>
      )}

      {/* Runtime log */}
      {log.length > 0 && (
        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:10,
          padding:"12px 14px", marginBottom:10 }}>
          <div style={{ fontSize:9, color:C.muted, marginBottom:6, letterSpacing:"0.06em" }}>RUNTIME LOG</div>
          <div ref={logRef} style={{ maxHeight:120, overflowY:"auto", fontSize:10, lineHeight:1.9 }}>
            {log.map((l,i) => (
              <div key={i} style={{ color:l.color }}>
                <span style={{ color:C.muted, marginRight:8 }}>{l.ts}</span>{l.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div style={{ padding:"9px 13px", borderRadius:8,
        background: governed ? C.holoPrimary+"0a" : C.holoDanger+"0a",
        border:`0.5px solid ${governed ? C.holoPrimary : C.holoDanger}33` }}>
        <span style={{ fontSize:11, color: governed ? C.holoPrimary : C.holoDanger }}>
          {governed
            ? "QHP governance active · CHVM enforced · Polaritron resonance locked · MC290 phase stable"
            : "QHP governance off · Resonance field ungoverned · CHVM breach risk elevated"}
        </span>
      </div>
    </div>
  );
}
