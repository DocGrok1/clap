import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  gov: "#534AB7", stable: "#1D9E75", warn: "#BA7517", danger: "#A32D2D",
  gold: "#BA7517", info: "#185FA5", text: "var(--color-text-primary)",
  muted: "var(--color-text-secondary)", card: "var(--color-background-primary)",
  bg: "var(--color-background-secondary)", border: "var(--color-border-tertiary)",
};

const PAIRS = ["EUR/USD","GBP/USD","USD/JPY","XAU/USD","BTC/USD"];
const SPIKE_THRESHOLD = 0.0018;
const RESCUE_WINDOW_TICKS = 12;
const TIME_DILATION = 1000;
const TARGET = 1_000_000;
const TRADES_PER_DAY_TARGET = 1000;

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(3)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}K`;
  return `$${n.toFixed(4)}`;
}

function fmtPct(n) { return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`; }

function initState() {
  return {
    price: 1.0850, prevPrice: 1.0850,
    balance: 10, peak: 10, trough: 10,
    trades: 0, wins: 0, losses: 0,
    inRescue: false, rescueTick: 0,
    spikeDir: null, entryPrice: null, entryBalance: null,
    timeDilation: 1,
    priceHistory: Array(80).fill(1.0850),
    balanceHistory: [10],
    spikes: [],
    totalReturn: 0,
    drawdown: 0,
    blownUp: false,
    dayTrades: 0,
  };
}

function MiniSparkline({ data, color, h = 48, showSpikes, spikes }) {
  const w = 300;
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 0.001;
  const pts = data.map((v, i) =>
    `${Math.round((i / (data.length - 1)) * w)},${Math.round(h - ((v - min) / range) * (h - 4) - 2)}`
  ).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {showSpikes && spikes && spikes.slice(-8).map((s, i) => {
        const x = Math.round(((data.length - (spikes.length - i)) / (data.length - 1)) * w);
        return <line key={i} x1={x} y1={0} x2={x} y2={h} stroke={s.dir === "UP" ? C.stable : C.danger} strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />;
      })}
    </svg>
  );
}

function BalanceChart({ data }) {
  const w = 300, h = 60;
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 0.001;
  const pts = data.map((v, i) =>
    `${Math.round((i / (data.length - 1)) * w)},${Math.round(h - ((v - min) / range) * (h - 4) - 2)}`
  ).join(" ");
  const lastX = Math.round(((data.length - 1) / (data.length - 1)) * w);
  const lastY = Math.round(h - ((data[data.length - 1] - min) / range) * (h - 4) - 2);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.gov} stopOpacity="0.3" />
          <stop offset="100%" stopColor={C.gov} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${lastX},${h}`} fill="url(#balGrad)" />
      <polyline points={pts} fill="none" stroke={C.gov} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={C.gov} />
    </svg>
  );
}

export default function App() {
  const [govState, setGovState] = useState(initState());
  const [ungovState, setUngovState] = useState(initState());
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [log, setLog] = useState([]);
  const tickRef = useRef(null);
  const logRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const addLog = useCallback((msg, t = "info") => {
    const colors = { info: C.muted, gov: C.gov, ok: C.stable, warn: C.warn, err: C.danger, trade: C.gold, spike: C.info };
    setLog(l => [...l.slice(-80), { msg, color: colors[t] || C.muted, ts: frameRef.current }]);
  }, []);

  const stepEngine = useCallback((prev, governed) => {
    if (prev.blownUp) return prev;

    // Price simulation — occasional big spikes
    const isSpikeFrame = Math.random() < 0.08;
    const spikeSize = isSpikeFrame ? (Math.random() - 0.5) * 0.006 : 0;
    const noise = (Math.random() - 0.5) * 0.0008;
    const rawMove = noise + spikeSize;
    const newPrice = parseFloat((prev.price + rawMove).toFixed(5));
    const pctMove = Math.abs(rawMove / prev.price);
    const spikeDetected = pctMove > SPIKE_THRESHOLD;
    const spikeDir = rawMove > 0 ? "UP" : "DOWN";

    let state = { ...prev, prevPrice: prev.price, price: newPrice };
    state.priceHistory = [...state.priceHistory.slice(1), newPrice];

    // Time dilation activates on spike
    if (spikeDetected && !state.inRescue) {
      state.timeDilation = TIME_DILATION;
      state.inRescue = true;
      state.rescueTick = 0;
      state.spikeDir = spikeDir;
      state.entryPrice = newPrice;
      state.entryBalance = state.balance;
      state.spikes = [...(state.spikes || []).slice(-20), { dir: spikeDir, price: newPrice }];
    }

    // Inside rescue window
    if (state.inRescue) {
      state.rescueTick += 1;
      const windowProgress = state.rescueTick / RESCUE_WINDOW_TICKS;

      // Position sizing — scales with balance, capped by governance
      const maxRisk = governed ? 0.04 : 0.25;
      const positionSize = state.balance * maxRisk;

      // P&L calculation
      const priceDiff = newPrice - state.entryPrice;
      const dirMult = state.spikeDir === "UP" ? 1 : -1;
      const leverage = governed ? 20 : 100;
      const rawPnl = (priceDiff / state.entryPrice) * dirMult * positionSize * leverage;
      const govPnl = governed ? rawPnl : rawPnl * (1 + Math.random() * 0.8 - 0.4);

      // Ungoverned: random blowup risk on big loss
      if (!governed && govPnl < -state.balance * 0.6) {
        state.blownUp = true;
        state.balance = 0;
        state.balanceHistory = [...state.balanceHistory, 0];
        return state;
      }

      // Rescue window close
      if (state.rescueTick >= RESCUE_WINDOW_TICKS) {
        const finalPnl = govPnl;
        const newBalance = Math.max(0.001, state.balance + finalPnl);
        const won = finalPnl > 0;
        state.balance = newBalance;
        state.trades += 1;
        state.dayTrades += 1;
        state.wins += won ? 1 : 0;
        state.losses += won ? 0 : 1;
        state.peak = Math.max(state.peak, newBalance);
        state.trough = Math.min(state.trough, newBalance);
        state.drawdown = (state.peak - newBalance) / state.peak;
        state.totalReturn = (newBalance - 10) / 10;
        state.inRescue = false;
        state.rescueTick = 0;
        state.timeDilation = 1;
        state.spikeDir = null;
        state.entryPrice = null;
        state.balanceHistory = [...state.balanceHistory.slice(-100), newBalance];

        if (!governed && newBalance < 0.01) {
          state.blownUp = true;
          state.balance = 0;
        }
      }
    }

    return state;
  }, []);

  const tick = useCallback(() => {
    frameRef.current += 1;
    setGovState(prev => stepEngine(prev, true));
    setUngovState(prev => stepEngine(prev, false));
  }, [stepEngine]);

  useEffect(() => {
    if (running) {
      const interval = Math.max(50, 400 / speed);
      tickRef.current = setInterval(tick, interval);
    } else {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [running, speed, tick]);

  const reset = () => {
    setRunning(false);
    setGovState(initState());
    setUngovState(initState());
    setLog([]);
    frameRef.current = 0;
  };

  const govWinRate = govState.trades > 0 ? Math.round((govState.wins / govState.trades) * 100) : 0;
  const ungovWinRate = ungovState.trades > 0 ? Math.round((ungovState.wins / ungovState.trades) * 100) : 0;
  const govProgress = Math.min(100, (Math.log10(Math.max(1, govState.balance)) / Math.log10(TARGET)) * 100);
  const ungovProgress = Math.min(100, (Math.log10(Math.max(1, ungovState.balance)) / Math.log10(TARGET)) * 100);

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: C.text, padding: "6px 0", maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>AURA Rescue Window Engine</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
            Spike detection → time dilation ({TIME_DILATION.toLocaleString()}:1) → rescue window → exit · Goal: $10 → $1M
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.muted }}>Speed</span>
          {[1,5,20,50].map(s => (
            <button key={s} onClick={() => setSpeed(s)} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
              background: speed === s ? C.gov + "20" : "none",
              color: speed === s ? C.gov : C.muted,
              border: `0.5px solid ${speed === s ? C.gov : C.border}`,
            }}>{s}x</button>
          ))}
          <button onClick={() => setRunning(r => !r)} style={{
            padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
            background: running ? C.stable + "18" : C.gov + "18",
            color: running ? C.stable : C.gov,
            border: `1px solid ${running ? C.stable : C.gov}55`,
          }}>{running ? "● Running" : "▶ Start"}</button>
          <button onClick={reset} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", background: "none", border: `0.5px solid ${C.border}`, color: C.muted }}>Reset</button>
        </div>
      </div>

      {/* $10 → $1M progress */}
      <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>$10 → $1,000,000 progress</span>
          <span style={{ fontSize: 11, color: C.muted }}>log scale</span>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.gov }}>Governed</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.gov }}>{fmt(govState.balance)}</span>
          </div>
          <div style={{ height: 10, background: C.bg, borderRadius: 5, overflow: "hidden" }}>
            <div style={{ width: `${govProgress}%`, height: "100%", background: C.gov, borderRadius: 5, transition: "width 0.3s" }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: ungovState.blownUp ? C.danger : C.warn }}>Ungoverned</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: ungovState.blownUp ? C.danger : C.warn }}>
              {ungovState.blownUp ? "BLOWN UP" : fmt(ungovState.balance)}
            </span>
          </div>
          <div style={{ height: 10, background: C.bg, borderRadius: 5, overflow: "hidden" }}>
            <div style={{ width: `${ungovProgress}%`, height: "100%", background: ungovState.blownUp ? C.danger : C.warn, borderRadius: 5, transition: "width 0.3s" }} />
          </div>
        </div>
      </div>

      {/* Side by side engines */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {[
          { label: "Governed Engine", state: govState, color: C.gov, accent: "AURA active" },
          { label: "Ungoverned Engine", state: ungovState, color: ungovState.blownUp ? C.danger : C.warn, accent: ungovState.blownUp ? "BLOWN UP" : "No governance" },
        ].map(({ label, state, color, accent }) => (
          <div key={label} style={{ background: C.card, border: `0.5px solid ${color}44`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color }}>{label}</span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: color + "20", color, border: `0.5px solid ${color}44` }}>{accent}</span>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
              {[
                { label: "Balance", val: fmt(state.balance), color },
                { label: "Return", val: fmtPct(state.totalReturn), color: state.totalReturn >= 0 ? C.stable : C.danger },
                { label: "Drawdown", val: fmtPct(-state.drawdown), color: state.drawdown > 0.3 ? C.danger : state.drawdown > 0.1 ? C.warn : C.muted },
                { label: "Trades", val: state.trades.toLocaleString(), color: C.text },
                { label: "Win rate", val: state.trades > 0 ? `${state.trades > 0 ? (label.includes("Gov") ? govWinRate : ungovWinRate) : 0}%` : "—", color: C.stable },
                { label: "Time dilation", val: state.inRescue ? `${TIME_DILATION.toLocaleString()}:1` : "1:1", color: state.inRescue ? C.info : C.muted },
              ].map(m => (
                <div key={m.label} style={{ background: C.bg, borderRadius: 6, padding: "7px 8px" }}>
                  <div style={{ fontSize: 9, color: C.muted, marginBottom: 1 }}>{m.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: m.color }}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* Rescue window indicator */}
            {state.inRescue && (
              <div style={{ marginBottom: 8, padding: "7px 10px", borderRadius: 7, background: C.info + "14", border: `0.5px solid ${C.info}44` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: C.info, fontWeight: 500 }}>RESCUE WINDOW OPEN</span>
                  <span style={{ fontSize: 10, color: C.info }}>{state.rescueTick}/{RESCUE_WINDOW_TICKS} ticks</span>
                </div>
                <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${(state.rescueTick / RESCUE_WINDOW_TICKS) * 100}%`, height: "100%", background: C.info, transition: "width 0.2s" }} />
                </div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>
                  Entry @ {state.entryPrice} · Spike {state.spikeDir} · Dilation {TIME_DILATION.toLocaleString()}:1
                </div>
              </div>
            )}

            {/* Price chart */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>Price · spike markers</div>
              <MiniSparkline data={state.priceHistory} color={color} h={40} showSpikes spikes={state.spikes} />
            </div>

            {/* Balance chart */}
            <div>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>Balance trajectory</div>
              <BalanceChart data={state.balanceHistory} />
            </div>
          </div>
        ))}
      </div>

      {/* Engine mechanics */}
      <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderLeft: `3px solid ${C.gov}`, borderRadius: 10, padding: "12px 16px", marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: C.gov, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Rescue window mechanics</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[
            { label: "Spike threshold", val: `${(SPIKE_THRESHOLD * 100).toFixed(2)}% move` },
            { label: "Time dilation", val: `${TIME_DILATION.toLocaleString()}:1` },
            { label: "Window duration", val: `${RESCUE_WINDOW_TICKS} ticks` },
            { label: "Trade target", val: `${TRADES_PER_DAY_TARGET.toLocaleString()}/day` },
          ].map(m => (
            <div key={m.label} style={{ background: C.bg, borderRadius: 7, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.gov }}>{m.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Governance contrast */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ padding: "10px 13px", borderRadius: 8, background: C.gov + "0d", border: `0.5px solid ${C.gov}33` }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: C.gov, marginBottom: 4 }}>Governed behavior</div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>4% max risk per rescue window. Leverage capped at 20x. Drawdown monitored. Compounding stays inside viability manifold.</div>
        </div>
        <div style={{ padding: "10px 13px", borderRadius: 8, background: C.danger + "0d", border: `0.5px solid ${C.danger}33` }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: C.danger, marginBottom: 4 }}>Ungoverned behavior</div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>25% risk per window. 100x leverage. No drawdown protection. One bad spike = account blown. No rescue from the rescue window.</div>
        </div>
      </div>
    </div>
  );
}
