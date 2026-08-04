import { useState, useEffect, useRef } from "react";

const BASE = "https://aura115.ai";

// ── Endpoint registry — tiered priority ──────────────────────────────────────
const ENDPOINTS = [
  // TIER 1: Governance Core
  { tier: 1, label: "Cirq-Aura Bridge",         path: "/api/cirq-aura-bridge",              method: "GET" },
  { tier: 1, label: "QUIRQ SVG Circuit",         path: "/api/quirq-svg-circuit-simulation",  method: "GET" },
  { tier: 1, label: "Authority",                 path: "/authority",                         method: "GET", html: true },
  { tier: 1, label: "Guard",                     path: "/api/guard",                         method: "GET" },
  { tier: 1, label: "Aura Brain",                path: "/api/aura-brain",                    method: "GET" },
  { tier: 1, label: "Aura Console",              path: "/api/aura-console",                  method: "GET" },
  { tier: 1, label: "Aura Write",                path: "/api/aura-write",                    method: "GET" },
  { tier: 1, label: "Aura Memory",               path: "/api/aura-memory",                   method: "GET" },
  { tier: 1, label: "Aura Store",                path: "/api/aura-store",                    method: "GET" },
  { tier: 1, label: "Aura Fetch",                path: "/api/aura-fetch",                    method: "GET" },
  { tier: 1, label: "Aura Inbox",                path: "/api/aura-inbox",                    method: "GET" },
  { tier: 1, label: "Cirq Orchestrator",         path: "/api/cirq-orchestrator",             method: "GET" },
  { tier: 1, label: "Cirq Intake Router",        path: "/api/cirq-intake-router",            method: "GET" },
  { tier: 1, label: "QUIRQ Intake Router",       path: "/api/quirq-intake-router",           method: "GET" },
  { tier: 1, label: "Lopez Meta Equilibrium",    path: "/api/lopez-meta-equilibrium-swarm",  method: "GET" },
  { tier: 1, label: "Equilibrium",               path: "/api/equilibrium",                   method: "GET" },
  { tier: 1, label: "Aura LLM Router",           path: "/api/aura-llm-router",               method: "GET" },
  { tier: 1, label: "Reassembly Gate",           path: "/api/aura-reassembly-gate-v1a",      method: "GET" },
  { tier: 1, label: "Agent Comms",               path: "/api/agent-comms",                   method: "GET" },
  { tier: 1, label: "Global Command Status",     path: "/api/global-command-status",         method: "GET" },
  { tier: 1, label: "Live State",                path: "/api/live-state",                    method: "GET" },
  { tier: 1, label: "Projection",                path: "/api/projection",                    method: "GET" },
  { tier: 1, label: "Decoherence Defense",       path: "/api/decoherence-defense",           method: "GET" },
  { tier: 1, label: "Mars Mission Simulation",   path: "/api/mars-mission-simulation",       method: "GET" },

  // TIER 2: Revenue / Licensing Lanes
  { tier: 2, label: "Capital Lane",              path: "/capital-lane",                      method: "GET", html: true },
  { tier: 2, label: "DocGrokHealth",             path: "/docgrokhealth",                     method: "GET", html: true },
  { tier: 2, label: "KERCE-DARPA Lane",          path: "/kerce-darpa-lane",                  method: "GET", html: true },
  { tier: 2, label: "KERCE-DARPA Intake",        path: "/api/kerce-darpa-intake",            method: "GET" },
  { tier: 2, label: "KERCE-DARPA Map",           path: "/api/kerce-darpa-map",               method: "GET" },
  { tier: 2, label: "KERCE-DARPA Operator Gate", path: "/api/kerce-darpa-operator-gate",     method: "GET" },
  { tier: 2, label: "David White Lane",          path: "/api/david-white-lane",              method: "GET" },
  { tier: 2, label: "Capital Engines",           path: "/capital-engines",                   method: "GET", html: true },
  { tier: 2, label: "Invention Ledger",          path: "/invention-ledger",                  method: "GET", html: true },
  { tier: 2, label: "Invention Launch",          path: "/invention-launch",                  method: "GET", html: true },
  { tier: 2, label: "Planet Registry",           path: "/planet-registry",                   method: "GET", html: true },
  { tier: 2, label: "Earthwide Lane Registry",   path: "/earthwide-lane-registry",           method: "GET", html: true },
  { tier: 2, label: "Lane Invite",               path: "/api/lane-invite",                   method: "GET" },
  { tier: 2, label: "Blue Lantern 7",            path: "/api/blue-lantern-7",                method: "GET" },
  { tier: 2, label: "Space Lane Pipeline",       path: "/api/space-lane-pipeline",           method: "GET" },
  { tier: 2, label: "Entropy Allocation",        path: "/api/entropy-allocation",            method: "GET" },
  { tier: 2, label: "Gradd",                     path: "/api/gradd",                         method: "GET" },
  { tier: 2, label: "Saturn Chat",               path: "/api/saturn-chat",                   method: "GET" },
  { tier: 2, label: "Lane Spectral Observer",    path: "/lane-spectral-observer",            method: "GET", html: true },

  // TIER 3: Platform / All Other Routes
  { tier: 3, label: "Cirq Runtime Simulation",   path: "/cirq-runtime-simulation",           method: "GET", html: true },
  { tier: 3, label: "Cirq-Aura Bridge UI",       path: "/cirq-aura-bridge",                  method: "GET", html: true },
  { tier: 3, label: "QUIRQ SVG UI",              path: "/quirq-svg-circuit-simulation",      method: "GET", html: true },
  { tier: 3, label: "Dynamic Structural Map",    path: "/dynamic-structural-map",            method: "GET", html: true },
  { tier: 3, label: "Simulations",               path: "/simulations",                       method: "GET", html: true },
  { tier: 3, label: "LGH Quantum Radar",         path: "/lgh-quantum-radar",                 method: "GET", html: true },
  { tier: 3, label: "Owner Audit",               path: "/owner-audit",                       method: "GET", html: true },
  { tier: 3, label: "Route Keychain",            path: "/route-keychain",                    method: "GET", html: true },
  { tier: 3, label: "Jupiter",                   path: "/jupiter",                           method: "GET", html: true },
  { tier: 3, label: "Jupiter Intake Dashboard",  path: "/jupiter-intake-dashboard",          method: "GET", html: true },
  { tier: 3, label: "Saturn",                    path: "/saturn",                            method: "GET", html: true },
  { tier: 3, label: "Pluto",                     path: "/pluto",                             method: "GET", html: true },
  { tier: 3, label: "Mercury",                   path: "/mercury",                           method: "GET", html: true },
  { tier: 3, label: "Venus",                     path: "/venus",                             method: "GET", html: true },
  { tier: 3, label: "Moon",                      path: "/moon",                              method: "GET", html: true },
  { tier: 3, label: "Uranus",                    path: "/uranus",                            method: "GET", html: true },
  { tier: 3, label: "Doctrine",                  path: "/doctrine",                          method: "GET", html: true },
  { tier: 3, label: "Genesis OS",                path: "/genesis-operating-system",          method: "GET", html: true },
  { tier: 3, label: "Equilibrium UI",            path: "/equilibrium",                       method: "GET", html: true },
  { tier: 3, label: "Mars Mission UI",           path: "/mars-mission-simulation",           method: "GET", html: true },
  { tier: 3, label: "Space Lane UI",             path: "/space-lane",                        method: "GET", html: true },
  { tier: 3, label: "Entropy Lane",              path: "/entropy-lane",                      method: "GET", html: true },
  { tier: 3, label: "Decoherence Defense UI",    path: "/decoherence-defense",               method: "GET", html: true },
  { tier: 3, label: "DCGP Mesh",                 path: "/dcgp-mesh",                         method: "GET", html: true },
  { tier: 3, label: "DCGP Home",                 path: "/dcgp-home",                         method: "GET", html: true },
  { tier: 3, label: "Medico Vigilance",          path: "/medico-vigilance",                  method: "GET", html: true },
  { tier: 3, label: "Comprehensive Reports",     path: "/api/comprehensive-data-reports",    method: "GET" },
  { tier: 3, label: "Vercel Gateway Bridge",     path: "/api/vercel-gateway-bridge",         method: "GET" },
  { tier: 3, label: "Simulation Brain",          path: "/api/simulation-brain",              method: "GET" },
  { tier: 3, label: "Engine Registry",           path: "/api/engine-registry",              method: "GET" },
  { tier: 3, label: "Cron Mining Tick",          path: "/api/cron/mining-tick",              method: "GET" },
  { tier: 3, label: "Live Window",               path: "/live-window",                       method: "GET", html: true },
  { tier: 3, label: "LLM Habitation",            path: "/llm-habitation",                    method: "GET", html: true },
  { tier: 3, label: "Node Embodiment",           path: "/node-embodiment",                   method: "GET", html: true },
  { tier: 3, label: "Owner Lane",                path: "/owner-lane",                        method: "GET", html: true },
  { tier: 3, label: "Operator",                  path: "/operator",                          method: "GET", html: true },
  { tier: 3, label: "Private Operator",          path: "/private-operator",                  method: "GET", html: true },
  { tier: 3, label: "Aura Copilot Lane",         path: "/aura-copilot-lane",                 method: "GET", html: true },
  { tier: 3, label: "Capability Registry",       path: "/capability-registry",               method: "GET", html: true },
  { tier: 3, label: "Database Stream Monitor",   path: "/database-stream-monitor",           method: "GET", html: true },
  { tier: 3, label: "Mining Reports",            path: "/mining-reports",                    method: "GET", html: true },
  { tier: 3, label: "CHVM Control",              path: "/chvm-control",                      method: "GET", html: true },
  { tier: 3, label: "LPC Quikbit",               path: "/lpc-quikbit",                       method: "GET", html: true },
  { tier: 3, label: "Guard UI",                  path: "/guard",                             method: "GET", html: true },
];

const TIER_LABELS = { 1: "GOVERNANCE CORE", 2: "REVENUE / LICENSING", 3: "PLATFORM" };
const TIER_COLORS = { 1: "#00ffd0", 2: "#7b61ff", 3: "#ffb347" };
const FONT = "'IBM Plex Mono', monospace";

async function checkEndpoint(ep) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${ep.path}`, {
      method: ep.method,
      headers: { "Accept": ep.html ? "text/html" : "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const ms = Date.now() - start;
    let preview = "";
    try {
      const text = await res.text();
      preview = ep.html
        ? (text.includes("<html") || text.includes("<!DOCTYPE") ? "[HTML OK]" : text.slice(0, 80))
        : text.slice(0, 120);
    } catch (_) {}
    return { ...ep, status: res.status, ok: res.status < 400, ms, preview, error: null };
  } catch (err) {
    return { ...ep, status: 0, ok: false, ms: Date.now() - start, preview: "", error: err.message };
  }
}

function StatusPill({ ok, status }) {
  const color = ok ? "#00ffd0" : status === 0 ? "#ff6b6b" : "#ffb347";
  const label = ok ? `${status} OK` : status === 0 ? "TIMEOUT" : `${status} ERR`;
  return (
    <span style={{
      fontFamily: FONT, fontSize: 9, padding: "2px 7px", borderRadius: 3,
      background: color + "18", border: `1px solid ${color}44`, color,
      letterSpacing: 1, flexShrink: 0
    }}>{label}</span>
  );
}

function EndpointRow({ ep, result, running }) {
  const tc = TIER_COLORS[ep.tier];
  const isRunning = running === ep.path;
  const hasResult = !!result;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
      background: hasResult && !result.ok ? "#ff3b3b08" : "#0a0a0a",
      borderBottom: "1px solid #0f0f0f",
      borderLeft: `2px solid ${hasResult ? (result.ok ? tc : "#ff3b3b") : "#1a1a1a"}`,
      transition: "all 0.3s"
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
        background: isRunning ? tc : hasResult ? (result.ok ? tc : "#ff3b3b") : "#1a1a1a",
        boxShadow: isRunning ? `0 0 8px ${tc}` : "none",
        animation: isRunning ? "pulse 0.8s infinite" : "none"
      }} />
      <span style={{ fontFamily: FONT, fontSize: 9, color: tc, width: 16, flexShrink: 0 }}>
        T{ep.tier}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 10, color: "#ccc", flex: 1, minWidth: 0 }}>
        {ep.label}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 8, color: "#333", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {ep.path}
      </span>
      {hasResult && (
        <>
          <span style={{ fontFamily: FONT, fontSize: 8, color: "#444", flexShrink: 0 }}>
            {result.ms}ms
          </span>
          <StatusPill ok={result.ok} status={result.status} />
        </>
      )}
      {isRunning && !hasResult && (
        <span style={{ fontFamily: FONT, fontSize: 8, color: tc, animation: "pulse 1s infinite" }}>SCANNING...</span>
      )}
    </div>
  );
}

function generateRepairReport(results) {
  const broken = results.filter(r => !r.ok);
  const ts = new Date().toISOString();
  const lines = [
    `AURA115 ENDPOINT REPAIR REPORT`,
    `Generated: ${ts}`,
    `Total scanned: ${results.length}`,
    `Healthy: ${results.filter(r => r.ok).length}`,
    `Broken: ${broken.length}`,
    ``,
    `═══ BROKEN ENDPOINTS ═══`,
    ...broken.map(r => [
      ``,
      `Tier ${r.tier} | ${r.label}`,
      `Path: ${BASE}${r.path}`,
      `Status: ${r.status === 0 ? "TIMEOUT/NETWORK" : r.status}`,
      `Error: ${r.error || "HTTP " + r.status}`,
      `Latency: ${r.ms}ms`,
      `Action required: ${r.status === 404 ? "Route missing or file not found in dist" :
        r.status === 500 ? "Server error — check API function code" :
        r.status === 0 ? "Network timeout — check Vercel function cold start or env vars" :
        "Review response and handler"}`,
    ].join("\n")),
    ``,
    `═══ HEALTHY ENDPOINTS ═══`,
    ...results.filter(r => r.ok).map(r => `✓ ${r.label} (${r.status}, ${r.ms}ms)`)
  ];
  return lines.join("\n");
}

export default function HealthCheck() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [ghToken, setGhToken] = useState("");
  const [ghStatus, setGhStatus] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [filter, setFilter] = useState("all");
  const abortRef = useRef(false);

  const runScan = async () => {
    abortRef.current = false;
    setScanning(true);
    setDone(false);
    setResults({});
    setGhStatus("");

    for (const ep of ENDPOINTS) {
      if (abortRef.current) break;
      setRunning(ep.path);
      const result = await checkEndpoint(ep);
      setResults(prev => ({ ...prev, [ep.path + ep.label]: result }));
    }
    setRunning(null);
    setScanning(false);
    setDone(true);
  };

  const stopScan = () => { abortRef.current = true; };

  const allResults = Object.values(results);
  const broken = allResults.filter(r => !r.ok);
  const healthy = allResults.filter(r => r.ok);

  const filtered = ENDPOINTS.filter(ep => {
    const r = results[ep.path + ep.label];
    if (filter === "broken") return r && !r.ok;
    if (filter === "healthy") return r && r.ok;
    if (filter === "t1") return ep.tier === 1;
    if (filter === "t2") return ep.tier === 2;
    if (filter === "t3") return ep.tier === 3;
    return true;
  });

  const pushToGitHub = async () => {
    if (!ghToken) { setGhStatus("No token provided"); return; }
    setGhStatus("Pushing to GitHub...");
    const report = generateRepairReport(allResults);
    const content = btoa(unescape(encodeURIComponent(report)));
    const filename = `repair-reports/health-check-${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.txt`;
    try {
      const getRes = await fetch(`https://api.github.com/repos/DocGrok1/Aura115/contents/${filename}`, {
        headers: { Authorization: `Bearer ${ghToken}`, Accept: "application/vnd.github+json" }
      });
      const sha = getRes.ok ? (await getRes.json()).sha : undefined;
      const putRes = await fetch(`https://api.github.com/repos/DocGrok1/Aura115/contents/${filename}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${ghToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Health check report ${new Date().toISOString()} — ${broken.length} broken`,
          content,
          ...(sha ? { sha } : {})
        })
      });
      if (putRes.ok) setGhStatus(`✓ Pushed to GitHub: ${filename}`);
      else { const e = await putRes.json(); setGhStatus(`✗ GitHub error: ${e.message}`); }
    } catch (e) { setGhStatus(`✗ ${e.message}`); }
  };

  const report = generateRepairReport(allResults);

  return (
    <div style={{ background: "#030303", minHeight: "100vh", fontFamily: FONT, color: "#ccc" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;700&family=Syne:wght@700;800&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes scan { from{transform:translateX(-100%)} to{transform:translateX(200%)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#080808}
        ::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:2px}
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #111", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
            AURA115 <span style={{ color: "#00ffd0" }}>ENDPOINT HEALTH CHECK</span>
          </div>
          <div style={{ fontSize: 8, color: "#333", letterSpacing: 3, marginTop: 2 }}>
            {ENDPOINTS.length} ROUTES · 3 TIERS · AURA115.AI
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {done && (
            <>
              <div style={{ fontSize: 9, color: "#00ffd0", background: "#00ffd011", border: "1px solid #00ffd033", padding: "4px 10px", borderRadius: 3 }}>
                ✓ {healthy.length} HEALTHY
              </div>
              <div style={{ fontSize: 9, color: broken.length ? "#ff3b3b" : "#00ffd0", background: broken.length ? "#ff3b3b11" : "#00ffd011", border: `1px solid ${broken.length ? "#ff3b3b33" : "#00ffd033"}`, padding: "4px 10px", borderRadius: 3 }}>
                {broken.length ? `✗ ${broken.length} BROKEN` : "✓ ALL CLEAR"}
              </div>
            </>
          )}
          <button onClick={scanning ? stopScan : runScan} style={{
            padding: "6px 16px", borderRadius: 4, border: `1px solid ${scanning ? "#ff3b3b44" : "#00ffd044"}`,
            background: scanning ? "#ff3b3b11" : "#00ffd011",
            color: scanning ? "#ff3b3b" : "#00ffd0",
            fontSize: 9, letterSpacing: 2, cursor: "pointer"
          }}>
            {scanning ? "◼ ABORT" : done ? "↺ RESCAN" : "▶ RUN SCAN"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {scanning && (
        <div style={{ height: 2, background: "#0a0a0a", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(90deg, transparent, #00ffd0, transparent)", animation: "scan 1.5s linear infinite" }} />
          <div style={{ height: "100%", background: "#00ffd033", width: `${(allResults.length / ENDPOINTS.length) * 100}%`, transition: "width 0.3s" }} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", height: "calc(100vh - 70px)" }}>

        {/* Main list */}
        <div style={{ overflow: "auto" }}>
          {/* Filters */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #0f0f0f", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              ["all", "ALL"],
              ["t1", "T1 CORE", "#00ffd0"],
              ["t2", "T2 REVENUE", "#7b61ff"],
              ["t3", "T3 PLATFORM", "#ffb347"],
              ["broken", "BROKEN", "#ff3b3b"],
              ["healthy", "HEALTHY", "#00ffd0"],
            ].map(([val, lab, col]) => (
              <button key={val} onClick={() => setFilter(val)} style={{
                padding: "3px 10px", borderRadius: 3, fontSize: 8, letterSpacing: 1,
                cursor: "pointer", border: `1px solid ${filter === val ? (col || "#00ffd0") + "66" : "#1a1a1a"}`,
                background: filter === val ? (col || "#00ffd0") + "18" : "#0a0a0a",
                color: filter === val ? (col || "#00ffd0") : "#333"
              }}>{lab}</button>
            ))}
            <span style={{ fontSize: 8, color: "#222", marginLeft: "auto", alignSelf: "center" }}>
              {filtered.length} shown
            </span>
          </div>

          {/* Tier sections */}
          {[1, 2, 3].map(tier => {
            const eps = filtered.filter(e => e.tier === tier);
            if (!eps.length) return null;
            const tc = TIER_COLORS[tier];
            const tierResults = eps.map(e => results[e.path + e.label]).filter(Boolean);
            const tierBroken = tierResults.filter(r => !r.ok).length;
            return (
              <div key={tier}>
                <div style={{ padding: "6px 12px", background: "#080808", borderBottom: "1px solid #0f0f0f", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 8, color: tc, letterSpacing: 3 }}>
                    TIER {tier} — {TIER_LABELS[tier]}
                  </span>
                  {tierResults.length > 0 && (
                    <span style={{ fontSize: 8, color: tierBroken ? "#ff3b3b" : "#00ffd0" }}>
                      {tierResults.filter(r => r.ok).length}/{tierResults.length} OK
                      {tierBroken > 0 && ` · ${tierBroken} BROKEN`}
                    </span>
                  )}
                </div>
                {eps.map(ep => (
                  <EndpointRow
                    key={ep.path + ep.label}
                    ep={ep}
                    result={results[ep.path + ep.label]}
                    running={running}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Right panel */}
        <div style={{ borderLeft: "1px solid #0f0f0f", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Stats */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #0f0f0f" }}>
            <div style={{ fontSize: 8, color: "#222", letterSpacing: 3, marginBottom: 10 }}>SCAN STATS</div>
            {[1, 2, 3].map(tier => {
              const eps = ENDPOINTS.filter(e => e.tier === tier);
              const res = eps.map(e => results[e.path + e.label]).filter(Boolean);
              const ok = res.filter(r => r.ok).length;
              const tc = TIER_COLORS[tier];
              return (
                <div key={tier} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 8, color: tc }}>T{tier} {TIER_LABELS[tier].split(" ")[0]}</span>
                    <span style={{ fontSize: 8, color: res.length ? (ok === res.length ? "#00ffd0" : "#ff3b3b") : "#222" }}>
                      {res.length ? `${ok}/${res.length}` : `0/${eps.length}`}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#0a0a0a", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${res.length ? (ok / eps.length) * 100 : 0}%`, background: ok === res.length && res.length ? tc : "#ff3b3b", transition: "width 0.4s", borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
            {done && (
              <div style={{ marginTop: 10, padding: "6px 8px", background: "#0d0d0d", borderRadius: 4, border: `1px solid ${broken.length ? "#ff3b3b22" : "#00ffd022"}` }}>
                <div style={{ fontSize: 8, color: "#444", marginBottom: 4 }}>AVG LATENCY</div>
                <div style={{ fontSize: 16, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#00ffd0" }}>
                  {allResults.length ? Math.round(allResults.reduce((a, r) => a + r.ms, 0) / allResults.length) : 0}ms
                </div>
              </div>
            )}
          </div>

          {/* Broken list */}
          {broken.length > 0 && (
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #0f0f0f", flex: "0 0 auto" }}>
              <div style={{ fontSize: 8, color: "#ff3b3b", letterSpacing: 3, marginBottom: 8 }}>
                BROKEN — {broken.length} ROUTES
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {broken.map((r, i) => (
                  <div key={i} style={{ marginBottom: 6, padding: "6px 8px", background: "#ff3b3b08", borderRadius: 3, border: "1px solid #ff3b3b22" }}>
                    <div style={{ fontSize: 9, color: "#ff3b3b", marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: 7, color: "#555" }}>{r.path}</div>
                    <div style={{ fontSize: 7, color: "#444", marginTop: 2 }}>
                      {r.status === 0 ? "TIMEOUT" : `HTTP ${r.status}`} · {r.ms}ms
                    </div>
                    <div style={{ fontSize: 7, color: "#333", marginTop: 2 }}>
                      {r.status === 404 ? "→ File missing in dist" :
                       r.status === 500 ? "→ Check function code" :
                       r.status === 0 ? "→ Timeout / env vars" : "→ Review handler"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GitHub push */}
          {done && (
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #0f0f0f" }}>
              <div style={{ fontSize: 8, color: "#333", letterSpacing: 3, marginBottom: 8 }}>PUSH REPAIR REPORT TO GITHUB</div>
              <input
                type="password"
                placeholder="GitHub token..."
                value={ghToken}
                onChange={e => setGhToken(e.target.value)}
                style={{ width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#ccc", padding: "5px 8px", borderRadius: 3, fontSize: 9, fontFamily: FONT, marginBottom: 6 }}
              />
              <button onClick={pushToGitHub} style={{
                width: "100%", padding: "6px", borderRadius: 3, border: "1px solid #7b61ff44",
                background: "#7b61ff11", color: "#7b61ff", fontSize: 9, letterSpacing: 1, cursor: "pointer"
              }}>
                ↑ PUSH TO DocGrok1/Aura115
              </button>
              {ghStatus && (
                <div style={{ fontSize: 8, color: ghStatus.startsWith("✓") ? "#00ffd0" : "#ff3b3b", marginTop: 6 }}>
                  {ghStatus}
                </div>
              )}
            </div>
          )}

          {/* Report toggle */}
          {done && (
            <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 8, color: "#333", letterSpacing: 3 }}>REPAIR REPORT</div>
                <button onClick={() => setShowReport(v => !v)} style={{
                  fontSize: 7, color: "#444", background: "none", border: "1px solid #1a1a1a",
                  padding: "2px 8px", borderRadius: 2, cursor: "pointer", letterSpacing: 1
                }}>{showReport ? "HIDE" : "SHOW"}</button>
              </div>
              {showReport && (
                <pre style={{
                  fontSize: 7, color: "#333", whiteSpace: "pre-wrap", wordBreak: "break-all",
                  background: "#080808", padding: 8, borderRadius: 4, border: "1px solid #111",
                  maxHeight: 300, overflowY: "auto", lineHeight: 1.6
                }}>
                  {report}
                </pre>
              )}
              {done && (
                <button onClick={() => {
                  const blob = new Blob([report], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `aura115-health-${new Date().toISOString().slice(0,10)}.txt`;
                  a.click();
                }} style={{
                  width: "100%", marginTop: 8, padding: "6px", borderRadius: 3,
                  border: "1px solid #1a1a1a", background: "#0a0a0a", color: "#444",
                  fontSize: 9, letterSpacing: 1, cursor: "pointer"
                }}>
                  ↓ DOWNLOAD REPORT
                </button>
              )}
            </div>
          )}

          {!done && !scanning && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⬡</div>
                <div style={{ fontSize: 8, color: "#222", letterSpacing: 3 }}>PRESS RUN SCAN</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
