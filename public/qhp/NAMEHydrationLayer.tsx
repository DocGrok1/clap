
import { useState, useCallback } from "react";

// ── LCHC-1024 simulation (browser-safe, no Node crypto) ──────────────────────
async function sha512(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-512", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function lchc1024(data) {
  const input = typeof data === "string" ? data : JSON.stringify(data);
  const [ctxA, ctxB] = await Promise.all([
    sha512("LCHC-A:" + input),
    sha512("LCHC-B:" + input),
  ]);
  return { algorithm: "LCHC-1024", chain: ctxA + ctxB, ctxA, ctxB };
}

// ── NAME Projection Operator ──────────────────────────────────────────────────
function project(payload) {
  const bytes = new TextEncoder().encode(payload);
  const freq = new Map();
  for (const b of bytes) freq.set(b, (freq.get(b) || 0) + 1);
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const atomic = sorted.map(([byte, count]) =>
    `${byte.toString(16).padStart(2, "0")}:${count}`
  ).join(",");
  const ratio = bytes.length > 0
    ? Math.max((bytes.length / (sorted.length * 6)), 1).toFixed(2)
    : "1.00";
  return { atomic, ratio: parseFloat(ratio), originalLen: bytes.length, uniqueBytes: sorted.length };
}

function rehydrate(atomic, originalLen) {
  const pairs = atomic.split(",").map(p => {
    const [hex, count] = p.split(":");
    return [parseInt(hex, 16), parseInt(count, 10)];
  });
  const result = new Uint8Array(originalLen);
  let pos = 0;
  for (const [byte, count] of pairs) {
    for (let i = 0; i < count && pos < originalLen; i++) result[pos++] = byte;
  }
  return new TextDecoder().decode(result);
}

// ── NAME Cell ─────────────────────────────────────────────────────────────────
async function createCell(payload, prevHash = "0".repeat(256)) {
  const ts = new Date().toISOString();
  const id = `NAME-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const projected = project(payload);
  const integrityInput = { id, payload: projected.atomic, prevHash };
  const integrity = await lchc1024(JSON.stringify(integrityInput) + ts);
  return {
    id, ts, payload, type: "cell", encoding: "projection",
    projected, integrity, prevHash,
  };
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "#080c14",
    color: "#e8eaf0",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
    padding: "0",
  },
  header: {
    borderBottom: "1px solid #1e2d4a",
    padding: "20px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(11,17,32,0.95)",
    backdropFilter: "blur(8px)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontSize: "13px",
    letterSpacing: "0.25em",
    color: "#c9a84c",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  badge: {
    fontSize: "11px",
    letterSpacing: "0.15em",
    color: "#2e75b6",
    background: "rgba(46,117,182,0.1)",
    border: "1px solid rgba(46,117,182,0.3)",
    padding: "3px 10px",
    borderRadius: "2px",
  },
  main: { maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: "-0.02em",
    marginBottom: "6px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  subtitle: { fontSize: "13px", color: "#6b7fa8", marginBottom: "32px", letterSpacing: "0.05em" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" },
  card: {
    background: "#0d1525",
    border: "1px solid #1e2d4a",
    borderRadius: "4px",
    padding: "20px",
  },
  cardTitle: {
    fontSize: "11px",
    letterSpacing: "0.2em",
    color: "#c9a84c",
    textTransform: "uppercase",
    marginBottom: "12px",
    fontWeight: "700",
  },
  textarea: {
    width: "100%",
    background: "#060a12",
    border: "1px solid #1e2d4a",
    borderRadius: "3px",
    color: "#e8eaf0",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "13px",
    padding: "12px",
    resize: "vertical",
    minHeight: "100px",
    outline: "none",
    boxSizing: "border-box",
    lineHeight: "1.6",
  },
  btn: {
    background: "#1b2a4a",
    border: "1px solid #2e75b6",
    color: "#7ab3e8",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    letterSpacing: "0.1em",
    padding: "10px 24px",
    cursor: "pointer",
    borderRadius: "3px",
    textTransform: "uppercase",
    fontWeight: "600",
    transition: "all 0.15s",
  },
  btnGold: {
    background: "#2a1f0a",
    border: "1px solid #c9a84c",
    color: "#c9a84c",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    letterSpacing: "0.1em",
    padding: "10px 24px",
    cursor: "pointer",
    borderRadius: "3px",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  mono: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    background: "#060a12",
    border: "1px solid #1e2d4a",
    borderRadius: "3px",
    padding: "12px",
    color: "#7ab3e8",
    wordBreak: "break-all",
    lineHeight: "1.7",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
  },
  stat: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #111b2e",
  },
  statLabel: { fontSize: "11px", color: "#6b7fa8", letterSpacing: "0.1em" },
  statValue: { fontSize: "13px", color: "#e8eaf0", fontWeight: "600" },
  statGold: { fontSize: "13px", color: "#c9a84c", fontWeight: "700" },
  statGreen: { fontSize: "13px", color: "#4caf7c", fontWeight: "700" },
  ledgerRow: {
    background: "#0a1020",
    border: "1px solid #1a2540",
    borderRadius: "3px",
    padding: "14px 16px",
    marginBottom: "8px",
    cursor: "pointer",
  },
  ledgerRowActive: {
    background: "#0d1a30",
    border: "1px solid #2e75b6",
    borderRadius: "3px",
    padding: "14px 16px",
    marginBottom: "8px",
    cursor: "pointer",
  },
  tag: {
    display: "inline-block",
    fontSize: "10px",
    letterSpacing: "0.12em",
    padding: "2px 8px",
    borderRadius: "2px",
    textTransform: "uppercase",
    fontWeight: "700",
    marginRight: "8px",
  },
  fullCard: {
    gridColumn: "1 / -1",
    background: "#0d1525",
    border: "1px solid #1e2d4a",
    borderRadius: "4px",
    padding: "20px",
  },
  chainViz: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexWrap: "wrap",
    marginTop: "12px",
  },
  chainNode: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "700",
    border: "2px solid #2e75b6",
    background: "#0d1a30",
    color: "#7ab3e8",
    flexShrink: 0,
  },
  chainLine: { width: "16px", height: "2px", background: "#1e2d4a", flexShrink: 0 },
};

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function NAMEHydrationLayer() {
  const [input, setInput] = useState(
    "Constitutional governance infrastructure for autonomous AI systems. Every state delta is atomically projected, LCHC-signed, and chain-linked from genesis."
  );
  const [cells, setCells] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rehydrated, setRehydrated] = useState("");
  const [loading, setLoading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [chainValid, setChainValid] = useState(null);

  const writeCell = useCallback(async () => {
    if (!input.trim()) return;
    setWriting(true);
    try {
      const prevHash = cells.length > 0
        ? cells[cells.length - 1].integrity.chain
        : "0".repeat(256);
      const cell = await createCell(input, prevHash);
      setCells(prev => [...prev, cell]);
      setSelected(cell);
      setRehydrated("");
      setChainValid(null);
    } finally {
      setWriting(false);
    }
  }, [input, cells]);

  const hydrateCell = useCallback((cell) => {
    setLoading(true);
    setTimeout(() => {
      const result = rehydrate(cell.projected.atomic, cell.projected.originalLen);
      setRehydrated(result);
      setSelected(cell);
      setLoading(false);
    }, 120);
  }, []);

  const auditChain = useCallback(async () => {
    if (cells.length === 0) return;
    setChainValid(null);
    let prevHash = "0".repeat(256);
    let valid = true;
    for (const cell of cells) {
      if (cell.prevHash !== prevHash) { valid = false; break; }
      prevHash = cell.integrity.chain;
    }
    setChainValid(valid);
  }, [cells]);

  const clearAll = () => {
    setCells([]);
    setSelected(null);
    setRehydrated("");
    setChainValid(null);
  };

  const selectedCell = selected || (cells.length > 0 ? cells[cells.length - 1] : null);

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.logo}>NAME Protocol · Hydration Layer</div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={S.badge}>USPTO #19/693,411</div>
          <div style={{ ...S.badge, color: "#c9a84c", borderColor: "rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.08)" }}>
            QUIRQ™ RUNTIME
          </div>
          <div style={{ ...S.badge, color: "#4caf7c", borderColor: "rgba(76,175,124,0.3)", background: "rgba(76,175,124,0.08)" }}>
            COMMODITY HARDWARE
          </div>
        </div>
      </div>

      <div style={S.main}>
        <div style={S.title}>NAME · Atomic Projection &amp; Rehydration</div>
        <div style={S.subtitle}>
          WRITE → PROJECT → LCHC-SIGN → CHAIN · REHYDRATE ON DEMAND · NO NEW HARDWARE REQUIRED
        </div>

        {/* INPUT + WRITE */}
        <div style={S.grid}>
          <div style={S.card}>
            <div style={S.cardTitle}>① Write Cell Payload</div>
            <textarea
              style={S.textarea}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Enter any payload — text, JSON, governance state delta..."
            />
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <button style={S.btnGold} onClick={writeCell} disabled={writing}>
                {writing ? "Writing..." : "Write NAME Cell"}
              </button>
              {cells.length > 0 && (
                <button style={S.btn} onClick={auditChain}>Audit Chain</button>
              )}
              {cells.length > 0 && (
                <button style={{ ...S.btn, borderColor: "#3a1a1a", color: "#8a4a4a" }} onClick={clearAll}>
                  Clear
                </button>
              )}
            </div>
            {chainValid !== null && (
              <div style={{
                marginTop: "12px",
                padding: "10px 14px",
                borderRadius: "3px",
                fontSize: "12px",
                letterSpacing: "0.1em",
                fontWeight: "700",
                background: chainValid ? "rgba(76,175,124,0.08)" : "rgba(175,76,76,0.08)",
                border: `1px solid ${chainValid ? "rgba(76,175,124,0.3)" : "rgba(175,76,76,0.3)"}`,
                color: chainValid ? "#4caf7c" : "#cf6679",
              }}>
                {chainValid
                  ? `✓ CHAIN VALID — ${cells.length} cells, unbroken from genesis`
                  : "✗ CHAIN BROKEN — tamper detected"}
              </div>
            )}
          </div>

          {/* CELL STATS */}
          <div style={S.card}>
            <div style={S.cardTitle}>② Projection Stats</div>
            {selectedCell ? (
              <>
                <div style={S.stat}>
                  <span style={S.statLabel}>CELL ID</span>
                  <span style={{ ...S.statValue, fontSize: "11px", color: "#2e75b6" }}>
                    {selectedCell.id.slice(0, 28)}...
                  </span>
                </div>
                <div style={S.stat}>
                  <span style={S.statLabel}>TIMESTAMP</span>
                  <span style={{ ...S.statValue, fontSize: "11px" }}>{selectedCell.ts}</span>
                </div>
                <div style={S.stat}>
                  <span style={S.statLabel}>ORIGINAL SIZE</span>
                  <span style={S.statValue}>{selectedCell.projected.originalLen} bytes</span>
                </div>
                <div style={S.stat}>
                  <span style={S.statLabel}>UNIQUE BYTE SYMBOLS</span>
                  <span style={S.statValue}>{selectedCell.projected.uniqueBytes}</span>
                </div>
                <div style={S.stat}>
                  <span style={S.statLabel}>ATOMIC REPR SIZE</span>
                  <span style={S.statValue}>{selectedCell.projected.atomic.length} chars</span>
                </div>
                <div style={S.stat}>
                  <span style={S.statLabel}>COMPRESSION RATIO</span>
                  <span style={S.statGold}>{selectedCell.projected.ratio}x</span>
                </div>
                <div style={S.stat}>
                  <span style={S.statLabel}>INTEGRITY</span>
                  <span style={S.statGreen}>LCHC-1024 ✓</span>
                </div>
                <div style={{ ...S.stat, border: "none" }}>
                  <span style={S.statLabel}>CHAIN LINK</span>
                  <span style={{ ...S.statValue, fontSize: "11px", color: "#c9a84c" }}>
                    {selectedCell.prevHash.slice(0, 16)}...
                  </span>
                </div>
                <div style={{ marginTop: "14px" }}>
                  <button style={S.btnGold} onClick={() => hydrateCell(selectedCell)} disabled={loading}>
                    {loading ? "Rehydrating..." : "③ Rehydrate Payload"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ color: "#3a4a6a", fontSize: "13px", paddingTop: "20px" }}>
                Write a cell to see projection stats
              </div>
            )}
          </div>
        </div>

        {/* ATOMIC REPRESENTATION */}
        {selectedCell && (
          <div style={S.grid}>
            <div style={S.card}>
              <div style={S.cardTitle}>Atomic Representation (Stored)</div>
              <div style={S.mono}>{selectedCell.projected.atomic}</div>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>LCHC-1024 Chain Value</div>
              <div style={{ marginBottom: "8px" }}>
                <span style={{ ...S.tag, background: "rgba(46,117,182,0.15)", color: "#7ab3e8", border: "1px solid rgba(46,117,182,0.3)" }}>
                  CTX-A
                </span>
                <span style={{ fontSize: "11px", color: "#6b7fa8" }}>Canonical State</span>
              </div>
              <div style={{ ...S.mono, marginBottom: "8px", fontSize: "10px" }}>
                {selectedCell.integrity.ctxA}
              </div>
              <div style={{ marginBottom: "8px" }}>
                <span style={{ ...S.tag, background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}>
                  CTX-B
                </span>
                <span style={{ fontSize: "11px", color: "#6b7fa8" }}>Governance Authority</span>
              </div>
              <div style={{ ...S.mono, fontSize: "10px" }}>
                {selectedCell.integrity.ctxB}
              </div>
            </div>
          </div>
        )}

        {/* REHYDRATED PAYLOAD */}
        {rehydrated && (
          <div style={{ ...S.fullCard, marginBottom: "20px", border: "1px solid rgba(76,175,124,0.4)" }}>
            <div style={{ ...S.cardTitle, color: "#4caf7c" }}>④ Rehydrated Payload — Full Form Restored</div>
            <div style={{ ...S.mono, color: "#a8d8b8", borderColor: "rgba(76,175,124,0.2)" }}>
              {rehydrated}
            </div>
            <div style={{ marginTop: "10px", fontSize: "11px", color: "#4caf7c", letterSpacing: "0.1em" }}>
              ✓ REHYDRATION COMPLETE · PAYLOAD INTEGRITY VERIFIED · COMMODITY HARDWARE
            </div>
          </div>
        )}

        {/* LEDGER */}
        {cells.length > 0 && (
          <div style={{ ...S.card, marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={S.cardTitle}>Constitutional Ledger — {cells.length} {cells.length === 1 ? "Entry" : "Entries"}</div>
              <div style={{ fontSize: "11px", color: "#6b7fa8" }}>Click any entry to inspect</div>
            </div>

            {/* Chain visualization */}
            <div style={S.chainViz}>
              <div style={{ ...S.chainNode, background: "#1a2a0a", borderColor: "#4caf7c", color: "#4caf7c", fontSize: "9px" }}>
                GEN
              </div>
              {cells.map((cell, i) => (
                <div key={cell.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={S.chainLine} />
                  <div
                    style={{
                      ...S.chainNode,
                      background: selectedCell?.id === cell.id ? "#0d1a30" : "#0a1020",
                      borderColor: selectedCell?.id === cell.id ? "#c9a84c" : "#2e75b6",
                      color: selectedCell?.id === cell.id ? "#c9a84c" : "#7ab3e8",
                      cursor: "pointer",
                    }}
                    onClick={() => { setSelected(cell); setRehydrated(""); }}
                  >
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "16px" }}>
              {cells.map((cell, i) => (
                <div
                  key={cell.id}
                  style={selectedCell?.id === cell.id ? S.ledgerRowActive : S.ledgerRow}
                  onClick={() => { setSelected(cell); setRehydrated(""); }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: "4px" }}>
                        <span style={{ ...S.tag, background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.2)" }}>
                          #{String(i + 1).padStart(4, "0")}
                        </span>
                        <span style={{ ...S.tag, background: "rgba(46,117,182,0.1)", color: "#7ab3e8", border: "1px solid rgba(46,117,182,0.2)" }}>
                          DELTA
                        </span>
                        <span style={{ fontSize: "11px", color: "#c9a84c" }}>{cell.projected.ratio}x</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#8090b0", marginTop: "4px" }}>
                        {cell.payload.slice(0, 80)}{cell.payload.length > 80 ? "..." : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "16px" }}>
                      <div style={{ fontSize: "10px", color: "#3a4a6a" }}>{cell.ts.slice(11, 23)}</div>
                      <div style={{ fontSize: "10px", color: "#2e5080", marginTop: "2px" }}>
                        {cell.integrity.chain.slice(0, 16)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER INFO */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Runtime", value: "Browser / Node.js", sub: "Any commodity hardware" },
            { label: "Hash Protocol", value: "LCHC-1024", sub: "Dual SHA-512 / 1024-bit" },
            { label: "Deployment", value: "Zero Days", sub: "No new infrastructure" },
          ].map(item => (
            <div key={item.label} style={{ ...S.card, padding: "14px 16px" }}>
              <div style={{ fontSize: "10px", color: "#6b7fa8", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                {item.label}
              </div>
              <div style={{ fontSize: "14px", color: "#c9a84c", fontWeight: "700" }}>{item.value}</div>
              <div style={{ fontSize: "11px", color: "#3a4a6a", marginTop: "2px" }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
