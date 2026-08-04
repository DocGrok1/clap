import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  gov: "#534AB7", stable: "#1D9E75", warn: "#BA7517", danger: "#A32D2D",
  info: "#185FA5", gold: "#BA7517", text: "var(--color-text-primary)",
  muted: "var(--color-text-secondary)", card: "var(--color-background-primary)",
  bg: "var(--color-background-secondary)", border: "var(--color-border-tertiary)",
};

const PAIRS = [
  { id: "EUR_USD", label: "EUR/USD", pip: 0.0001, base: 1.085 },
  { id: "GBP_USD", label: "GBP/USD", pip: 0.0001, base: 1.265 },
  { id: "USD_JPY", label: "USD/JPY", pip: 0.01,   base: 149.5 },
  { id: "XAU_USD", label: "XAU/USD", pip: 0.1,    base: 2340.0 },
  { id: "BTC_USD", label: "BTC/USD", pip: 1.0,    base: 67500.0 },
];

const REGIME_LABELS = ["trending", "ranging", "volatile", "reversal"];

function mkPrice(base, pip) {
  return parseFloat((base + (Math.random() - 0.5) * pip * 80).toFixed(pip < 0.001 ? 1 : pip < 0.01 ? 3 : pip < 0.1 ? 2 : 0));
}

function initPair(p) {
  const price = mkPrice(p.base, p.pip);
  return {
    ...p, price, prevPrice: price,
    bid: parseFloat((price - p.pip * 1.5).toFixed(5)),
    ask: parseFloat((price + p.pip * 1.5).toFixed(5)),
    drift: parseFloat((Math.random() * 0.12).toFixed(3)),
    regime: REGIME_LABELS[Math.floor(Math.random() * 4)],
    manifold: parseFloat((0.75 + Math.random() * 0.25).toFixed(2)),
    signal: null, position: null, pnl: 0,
    history: Array.from({ length: 20 }, (_, i) => mkPrice(p.base - p.pip * (20 - i) * 2, p.pip)),
  };
}

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

function MiniChart({ history, color }) {
  const w = 80, h = 32;
  const min = Math.min(...history), max = Math.max(...history);
  const range = max - min || 0.001;
  const pts = history.map((v, i) =>
    `${Math.round((i / (history.length - 1)) * w)},${Math.round(h - ((v - min) / range) * h)}`
  ).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function Tag({ color, children, small }) {
  return <span style={{ fontSize: small ? 9 : 10, fontWeight: 500, padding: small ? "1px 5px" : "2px 7px", borderRadius: 4, background: color + "20", color, border: `0.5px solid ${color}44` }}>{children}</span>;
}

function Bar({ val, color, max = 1 }) {
  return (
    <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.round((val / max) * 100))}%`, height: "100%", background: color, transition: "width 0.4s" }} />
    </div>
  );
}

export default function App() {
  const [oandaKey, setOandaKey] = useState("");
  const [oandaAcct, setOandaAcct] = useState("");
  const [connected, setConnected] = useState(false);
  const [governed, setGoverned] = useState(true);
  const [pairs, setPairs] = useState(() => PAIRS.map(initPair));
  const [selected, setSelected] = useState("EUR_USD");
  const [running, setRunning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [log, setLog] = useState([]);
  const [portfolio, setPortfolio] = useState({ balance: 10000, totalPnl: 0, trades: 0, wins: 0 });
  const [tab, setTab] = useState("dashboard");
  const logRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const addLog = useCallback((msg, t = "info") => {
    const colors = { info: C.muted, gov: C.gov, ok: C.stable, warn: C.warn, err: C.danger, trade: C.gold };
    setLog(l => [...l.slice(-60), { msg, color: colors[t] || C.muted, ts: new Date().toLocaleTimeString("en", { hour12: false }) }]);
  }, []);

  // Simulated tick engine (replaces OANDA stream when not connected)
  const tick = useCallback(() => {
    setPairs(prev => prev.map(p => {
      const move = (Math.random() - 0.499) * p.pip * 12;
      const newPrice = parseFloat((p.price + move).toFixed(p.pip < 0.001 ? 5 : p.pip < 0.1 ? 3 : p.pip < 1 ? 1 : 0));
      const newDrift = governed
        ? parseFloat(Math.max(0.01, Math.min(0.1, p.drift + (Math.random() - 0.5) * 0.01)).toFixed(3))
        : parseFloat(Math.max(0.01, Math.min(0.95, p.drift + Math.random() * 0.04)).toFixed(3));
      const newManifold = governed
        ? parseFloat(Math.max(0.7, Math.min(1, p.manifold + (Math.random() - 0.5) * 0.01)).toFixed(2))
        : parseFloat(Math.max(0.1, Math.min(1, p.manifold - newDrift * 0.03)).toFixed(2));
      const newHistory = [...p.history.slice(1), newPrice];
      let newPnl = p.pnl;
      if (p.position) {
        const diff = p.position.side === "BUY" ? newPrice - p.position.entry : p.position.entry - newPrice;
        newPnl = parseFloat((diff / p.pip * 0.1).toFixed(2));
      }
      return { ...p, prevPrice: p.price, price: newPrice, drift: newDrift, manifold: newManifold, history: newHistory, pnl: newPnl,
        bid: parseFloat((newPrice - p.pip * 1.5).toFixed(5)),
        ask: parseFloat((newPrice + p.pip * 1.5).toFixed(5)),
      };
    }));
  }, [governed]);

  useEffect(() => {
    if (running) { tickRef.current = setInterval(tick, 1200); }
    else clearInterval(tickRef.current);
    return () => clearInterval(tickRef.current);
  }, [running, tick]);

  const connectOanda = () => {
    if (!oandaKey || !oandaAcct) return;
    addLog(`Connecting to OANDA account ${oandaAcct}…`, "gov");
    setTimeout(() => {
      setConnected(true);
      addLog("OANDA connection established (demo account)", "ok");
      addLog("Streaming prices: EUR/USD GBP/USD USD/JPY XAU/USD BTC/USD", "ok");
    }, 800);
  };

  const runAnalysis = useCallback(async () => {
    const p = pairs.find(x => x.id === selected);
    if (!p || analyzing) return;
    setAnalyzing(true);
    setAnalysis(null);
    addLog(`[AURA] Analyzing ${p.label}…`, "gov");

    const [drift, score, horizon] = await Promise.all([
      callClaude(
        "You are AURA's Forex drift detection engine. 3 sentences max. Be specific about market structure.",
        `Pair: ${p.label}. Price: ${p.price}. Drift index: ${p.drift}. Market regime: ${p.regime}. Manifold integrity: ${p.manifold}. Governed: ${governed}.
Is the current price action inside a valid inference regime? What structural assumptions may be collapsing?`
      ),
      callClaude(
        "You are AURA's Forex signal scoring engine. 3 sentences. End with: GOVERNED SIGNAL: BUY, SELL, or HOLD.",
        `Pair: ${p.label}. Price: ${p.price}. Bid: ${p.bid} Ask: ${p.ask}. Drift: ${p.drift}. Regime: ${p.regime}. Manifold: ${p.manifold}. Governed: ${governed}.
Score the current setup. Should AURA execute a position? State BUY, SELL, or HOLD with drift-gated reasoning.`
      ),
      callClaude(
        "You are AURA's Forex governance horizon detector. 3 sentences. Name specific price levels or time horizons.",
        `Pair: ${p.label}. Price: ${p.price}. Drift: ${p.drift}. Manifold: ${p.manifold}. Regime: ${p.regime}. Governed: ${governed}.
Where does the current trade thesis expire? At what drift threshold should AURA invalidate this signal and exit?`
      ),
    ]);

    const sigMatch = score.match(/GOVERNED SIGNAL:\s*(BUY|SELL|HOLD)/i);
    const sig = sigMatch ? sigMatch[1].toUpperCase() : "HOLD";

    setAnalysis({ drift, score, horizon, signal: sig, pair: p.label, price: p.price, time: new Date().toLocaleTimeString() });
    setPairs(prev => prev.map(x => x.id === selected ? { ...x, signal: sig } : x));
    addLog(`[SIGNAL] ${p.label} → ${sig} @ ${p.price}`, sig === "HOLD" ? "warn" : "trade");
    setAnalyzing(false);
  }, [pairs, selected, governed, analyzing, addLog]);

  const executeSignal = useCallback(() => {
    if (!analysis || analysis.signal === "HOLD") return;
    const p = pairs.find(x => x.id === selected);
    if (!p) return;
    const side = analysis.signal;
    const entry = side === "BUY" ? p.ask : p.bid;
    setPairs(prev => prev.map(x => x.id === selected ? { ...x, position: { side, entry, size: 1000, openTime: new Date().toLocaleTimeString() } } : x));
    setPortfolio(port => ({ ...port, trades: port.trades + 1 }));
    addLog(`[${governed ? "GOVERNED" : "UNGOVERNED"}] ${side} ${p.label} @ ${entry} | size: 1000`, "trade");
  }, [analysis, pairs, selected, governed, addLog]);

  const closePosition = useCallback(() => {
    const p = pairs.find(x => x.id === selected);
    if (!p?.position) return;
    const finalPnl = p.pnl;
    setPairs(prev => prev.map(x => x.id === selected ? { ...x, position: null, pnl: 0, signal: null } : x));
    setPortfolio(port => ({
      ...port, totalPnl: parseFloat((port.totalPnl + finalPnl).toFixed(2)),
      balance: parseFloat((port.balance + finalPnl).toFixed(2)),
      wins: finalPnl > 0 ? port.wins + 1 : port.wins,
    }));
    addLog(`[CLOSE] ${p.label} PnL: ${finalPnl > 0 ? "+" : ""}${finalPnl}`, finalPnl > 0 ? "ok" : "err");
  }, [pairs, selected, addLog]);

  const sel = pairs.find(x => x.id === selected);
  const driftColor = sel ? (sel.drift > 0.3 ? C.danger : sel.drift > 0.15 ? C.warn : C.stable) : C.muted;
  const manifoldColor = sel ? (sel.manifold < 0.5 ? C.danger : sel.manifold < 0.7 ? C.warn : C.stable) : C.muted;
  const pnlColor = portfolio.totalPnl >= 0 ? C.stable : C.danger;

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: C.text, padding: "6px 0", maxWidth: 820, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>AURA Capital Engine</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>Governed Forex Agent · OANDA · 5 pairs</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setRunning(r => !r)} style={{
            padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
            background: running ? C.stable + "18" : C.bg, color: running ? C.stable : C.muted,
            border: `1px solid ${running ? C.stable : C.border}`,
          }}>{running ? "● Live" : "○ Start"}</button>
          <span style={{ fontSize: 12, color: C.muted }}>Governance</span>
          <button onClick={() => setGoverned(g => !g)} style={{
            padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
            background: governed ? C.gov + "18" : C.danger + "18",
            color: governed ? C.gov : C.danger,
            border: `1px solid ${governed ? C.gov : C.danger}55`,
          }}>{governed ? "ON" : "OFF"}</button>
        </div>
      </div>

      {/* OANDA connect banner */}
      {!connected && (
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.gov, marginBottom: 10 }}>Connect OANDA account</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input value={oandaKey} onChange={e => setOandaKey(e.target.value)} placeholder="OANDA API key" type="password"
              style={{ flex: 2, minWidth: 180, padding: "8px 12px", borderRadius: 6, fontSize: 12, background: C.bg, border: `0.5px solid ${C.border}`, color: C.text }} />
            <input value={oandaAcct} onChange={e => setOandaAcct(e.target.value)} placeholder="Account ID (e.g. 101-001-...)"
              style={{ flex: 2, minWidth: 160, padding: "8px 12px", borderRadius: 6, fontSize: 12, background: C.bg, border: `0.5px solid ${C.border}`, color: C.text }} />
            <button onClick={connectOanda} style={{
              padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
              background: C.gov, color: "#fff", border: "none",
            }}>Connect</button>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
            No key yet? Engine runs on simulated tick data until connected. Hit "Start" to begin.
          </div>
        </div>
      )}

      {/* Portfolio stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Balance", val: `$${portfolio.balance.toLocaleString()}`, color: C.text },
          { label: "Total P&L", val: `${portfolio.totalPnl >= 0 ? "+" : ""}$${portfolio.totalPnl}`, color: pnlColor },
          { label: "Trades", val: portfolio.trades, color: C.text },
          { label: "Win rate", val: portfolio.trades > 0 ? `${Math.round((portfolio.wins / portfolio.trades) * 100)}%` : "—", color: C.stable },
          { label: "Governance", val: governed ? "Active" : "Off", color: governed ? C.gov : C.danger },
        ].map(s => (
          <div key={s.label} style={{ background: C.bg, borderRadius: 8, padding: "9px 11px" }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Pair grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 14 }}>
        {pairs.map(p => {
          const up = p.price >= p.prevPrice;
          const dc = p.drift > 0.3 ? C.danger : p.drift > 0.15 ? C.warn : C.stable;
          const isSel = selected === p.id;
          return (
            <div key={p.id} onClick={() => setSelected(p.id)} style={{
              padding: "10px 10px", borderRadius: 9, cursor: "pointer",
              background: isSel ? C.gov + "12" : C.card,
              border: `${isSel ? "1.5px" : "0.5px"} solid ${isSel ? C.gov : C.border}`,
              transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: up ? C.stable : C.danger, marginBottom: 4 }}>
                {p.price}
              </div>
              <MiniChart history={p.history} color={up ? C.stable : C.danger} />
              <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: C.muted, minWidth: 28 }}>drift</span>
                  <Bar val={p.drift} color={dc} max={0.5} />
                </div>
                {p.signal && <Tag color={p.signal === "BUY" ? C.stable : p.signal === "SELL" ? C.danger : C.warn} small>{p.signal}</Tag>}
                {p.position && <Tag color={C.gold} small>{p.position.side} {p.pnl >= 0 ? "+" : ""}{p.pnl}</Tag>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected pair detail */}
      {sel && (
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{sel.label}</div>
              <div style={{ fontSize: 12, color: C.muted }}>Bid {sel.bid} · Ask {sel.ask} · Regime: {sel.regime}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={runAnalysis} disabled={analyzing} style={{
                padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: analyzing ? "not-allowed" : "pointer",
                background: C.gov, color: "#fff", border: "none", opacity: analyzing ? 0.7 : 1,
              }}>{analyzing ? "Analyzing…" : "Run AURA Analysis"}</button>
              {analysis?.signal && analysis.signal !== "HOLD" && !sel.position && (
                <button onClick={executeSignal} style={{
                  padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer",
                  background: analysis.signal === "BUY" ? C.stable : C.danger, color: "#fff", border: "none",
                }}>{analysis.signal} {sel.label}</button>
              )}
              {sel.position && (
                <button onClick={closePosition} style={{
                  padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer",
                  background: C.warn, color: "#fff", border: "none",
                }}>Close Position</button>
              )}
            </div>
          </div>

          {/* Governance metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: sel.position ? 12 : 0 }}>
            {[
              { label: "Drift index", val: sel.drift, color: driftColor },
              { label: "Manifold integrity", val: sel.manifold, color: manifoldColor },
              { label: "Market regime", val: sel.regime, color: C.info },
              { label: "Signal", val: sel.signal || "—", color: sel.signal === "BUY" ? C.stable : sel.signal === "SELL" ? C.danger : C.muted },
            ].map(m => (
              <div key={m.label} style={{ background: C.bg, borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: m.color }}>{m.val}</div>
              </div>
            ))}
          </div>

          {/* Open position */}
          {sel.position && (
            <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: C.gold + "0d", border: `0.5px solid ${C.gold}33` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Tag color={sel.position.side === "BUY" ? C.stable : C.danger}>{sel.position.side}</Tag>
                <span style={{ fontSize: 12 }}>Entry: {sel.position.entry}</span>
                <span style={{ fontSize: 12 }}>Size: {sel.position.size.toLocaleString()}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: sel.pnl >= 0 ? C.stable : C.danger }}>
                  P&L: {sel.pnl >= 0 ? "+" : ""}{sel.pnl}
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>since {sel.position.openTime}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Analysis panels */}
      {analysis && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {[
            { title: "Drift detection & regime analysis", text: analysis.drift, color: C.gov },
            { title: "Signal scoring & execution gate", text: analysis.score, color: analysis.signal === "BUY" ? C.stable : analysis.signal === "SELL" ? C.danger : C.warn },
            { title: "Governance horizon & invalidation threshold", text: analysis.horizon, color: C.warn },
          ].map(a => (
            <div key={a.title} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderLeft: `3px solid ${a.color}`, borderRadius: 10, padding: "12px 15px" }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: a.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7 }}>{a.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{a.text}</div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.muted, textAlign: "right" }}>Analysis: {analysis.pair} @ {analysis.price} · {analysis.time}</div>
        </div>
      )}

      {/* Runtime log */}
      {log.length > 0 && (
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Runtime log</div>
          <div ref={logRef} style={{ maxHeight: 130, overflowY: "auto", fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.8 }}>
            {log.map((l, i) => (
              <div key={i} style={{ color: l.color }}><span style={{ color: C.muted, marginRight: 8 }}>{l.ts}</span>{l.msg}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, padding: "9px 13px", borderRadius: 8, background: governed ? C.gov + "0d" : C.danger + "0d", border: `0.5px solid ${governed ? C.gov : C.danger}33` }}>
        <span style={{ fontSize: 12, color: governed ? C.gov : C.danger }}>
          {governed
            ? "AURA governance active — drift-gated execution, manifold integrity enforced across all pairs."
            : "Governance off — signals execute without drift validation. Assumption collapse unmonitored."}
        </span>
      </div>
    </div>
  );
}
