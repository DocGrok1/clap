// ═══════════════════════════════════════════════════════════════════
// COIN ROUTE FACTORY — Every COIN gets its own API route
// When a circuit fires and mints a COIN, this factory:
//   1. Creates /api/coin/{coin_id} — the COIN's own endpoint
//   2. Registers it in the coin ledger
//   3. Routes it to the console page
//   4. Makes it queryable from any planet
//
// Joshua L. Lopez / DCGP.AI LLC
// ═══════════════════════════════════════════════════════════════════

const crypto = require('crypto');

// In-memory coin registry (backed by collider-run ledger)
const COIN_REGISTRY = new Map();

/**
 * Mint a new COIN from circuit results
 * @param {Object} circuitResult - results from a quantum circuit fire
 * @returns {Object} - the minted COIN with its route
 */
function mintCoin(circuitResult) {
  const coinId = 'COIN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const ts = new Date().toISOString();
  
  const coin = {
    id: coinId,
    circuit: circuitResult.circuit || 'UNKNOWN',
    qubits: circuitResult.qubits || 0,
    shots: circuitResult.shots || 0,
    p_coin: circuitResult.p_coin || 0,
    unique_states: circuitResult.unique_states || 0,
    proof: circuitResult.proof || '',
    gov_angle: circuitResult.gov_angle || 1.941611,
    pipeline: circuitResult.pipeline || '',
    minted_at: ts,
    status: 'ACTIVE',
    route: `/api/coin/${coinId}`,
    console_route: `/console/coin/${coinId}`,
    authority: 'Joshua Lopez — DCGP.AI',
  };

  COIN_REGISTRY.set(coinId, coin);
  return coin;
}

/**
 * Express route handler factory
 * Mount with: app.use('/api/coin', coinRouteFactory.router())
 */
function router() {
  const express = require('express');
  const r = express.Router();

  // GET /api/coin — list all coins
  r.get('/', (req, res) => {
    const coins = Array.from(COIN_REGISTRY.values())
      .sort((a, b) => new Date(b.minted_at) - new Date(a.minted_at));
    res.json({
      ok: true,
      total: coins.length,
      coins: coins,
      ts: new Date().toISOString(),
    });
  });

  // GET /api/coin/:id — single coin detail
  r.get('/:id', (req, res) => {
    const coin = COIN_REGISTRY.get(req.params.id);
    if (!coin) {
      return res.status(404).json({ ok: false, error: 'COIN not found', id: req.params.id });
    }
    res.json({ ok: true, coin });
  });

  // POST /api/coin/mint — mint a new coin from circuit results
  r.post('/mint', (req, res) => {
    const result = req.body;
    if (!result || !result.circuit) {
      return res.status(400).json({ ok: false, error: 'Missing circuit result' });
    }
    const coin = mintCoin(result);
    console.log(`[COIN FACTORY] Minted ${coin.id} from ${coin.circuit} (${coin.qubits}Q)`);
    res.json({ ok: true, coin });
  });

  // GET /api/coin/:id/fire — re-fire a coin's circuit
  r.get('/:id/fire', (req, res) => {
    const coin = COIN_REGISTRY.get(req.params.id);
    if (!coin) {
      return res.status(404).json({ ok: false, error: 'COIN not found' });
    }
    // Return the fire spec so the console can dispatch it
    res.json({
      ok: true,
      fire_spec: {
        circuit: coin.circuit,
        qubits: coin.qubits,
        pipeline: coin.pipeline,
        gov_angle: coin.gov_angle,
      },
      message: `Fire ${coin.id} — ${coin.circuit} on next available QPU`,
    });
  });

  return r;
}

/**
 * Console page HTML generator for a single coin
 */
function coinConsolePage(coinId) {
  const coin = COIN_REGISTRY.get(coinId);
  if (!coin) return '<h1>COIN not found</h1>';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${coin.id} · DCGP.AI</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#030508;color:#d4d4d8;font-family:ui-monospace,monospace;padding:20px}
.card{border:1px solid rgba(45,212,191,0.15);border-radius:16px;padding:20px;margin:12px 0;background:rgba(8,12,20,0.9)}
.id{font-size:28px;font-weight:900;color:#2dd4bf;letter-spacing:0.08em}
.circuit{font-size:14px;color:#fbbf24;margin-top:6px}
.metric{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
.label{color:#71717a;font-size:12px}.value{color:#fafafa;font-size:14px;font-weight:500}
.proof{font-size:9px;color:#71717a;word-break:break-all;margin-top:12px}
.btn{display:block;width:100%;padding:16px;border-radius:12px;border:1px solid #fbbf24;background:linear-gradient(90deg,#0891b2,#1d4ed8);color:white;font-size:18px;font-weight:900;cursor:pointer;margin-top:16px;text-align:center}
</style>
</head>
<body>
<div class="card">
  <div class="id">${coin.id}</div>
  <div class="circuit">${coin.circuit} · ${coin.qubits}Q</div>
</div>
<div class="card">
  <div class="metric"><span class="label">P(COIN)</span><span class="value">${coin.p_coin}</span></div>
  <div class="metric"><span class="label">Unique States</span><span class="value">${coin.unique_states}</span></div>
  <div class="metric"><span class="label">Shots</span><span class="value">${coin.shots}</span></div>
  <div class="metric"><span class="label">GOV Angle</span><span class="value">π/φ = ${coin.gov_angle.toFixed(6)}</span></div>
  <div class="metric"><span class="label">Pipeline</span><span class="value">${coin.pipeline}</span></div>
  <div class="metric"><span class="label">Minted</span><span class="value">${coin.minted_at}</span></div>
  <div class="metric"><span class="label">Status</span><span class="value" style="color:#2dd4bf">${coin.status}</span></div>
  <div class="proof">SHA-256: ${coin.proof}</div>
</div>
<a class="btn" href="/api/coin/${coin.id}/fire">RE-FIRE ON QPU</a>
<a class="btn" href="/api/coin" style="background:#1e1e2e;border-color:rgba(45,212,191,0.3)">ALL COINS</a>
</body></html>`;
}

module.exports = { mintCoin, router, coinConsolePage, COIN_REGISTRY };
