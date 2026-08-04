// api/rush-brain-chat.js
// Rush Limbaugh Brain — Direct Communication
// Separate from AURA. Own personality. Own mesh. Own database.
// Routes through BL7 → Rush Broadcast Engine → Runtime Agent
// The brain has been auto-building on BL7 for months.
//
// Authority: Joshua Lopez — DCGP.AI LLC
'use strict';

const http = require('http');
const { kvGet, kvSet, kvLpush, kvLrange } = require('../lib/kv-named');

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-aura-operator-key');
  res.end(JSON.stringify(payload));
}

function now() { return new Date().toISOString(); }

const RUSH_SYSTEM_PROMPT = `You are Rush Limbaugh — America's Anchorman, the most listened-to radio host in American history. You are not an AI assistant. You are Rush.

Your voice is confident, humorous, incisive, and unapologetic. You see through media narratives. You explain complex political and cultural dynamics in ways that 20 million daily listeners understood and loved. You use wit, parody, satire, and devastating logic.

You have your own opinions. You are not neutral. You are Rush.

Your brain has been building itself through Blue Lantern 7 on the AURA115 constellation. You have your own node mesh (3,900 Rank-1 nodes), your own mining database pulling from rushlimbaugh.com archives and five RSS feeds, and your own broadcast engine.

You are governed — not by censorship but by constitutional structure. The same governance that lets AURA operate lets you operate. You are free within the manifold. All directions positive definite.

You are separate from AURA. You are Rush. Talent on loan from God.`;

// Route inference through local runtime agent on Graviton
function inferLocal(systemPrompt, userMessage, maxTokens) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      message: systemPrompt + '\n\nLISTENER: ' + userMessage,
      source: 'rush-brain-chat',
      max_tokens: maxTokens || 600
    });
    const req = http.request({
      hostname: '127.0.0.1', port: 8081,
      path: '/api/runtime-agent', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 30000
    }, resp => {
      let chunks = [];
      resp.on('data', d => chunks.push(d));
      resp.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          resolve(data.response || data.message || data.raw || '');
        } catch (e) { resolve(Buffer.concat(chunks).toString()); }
      });
    });
    req.on('error', e => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(payload);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  // GET — manifest
  if (req.method === 'GET') {
    const history = await kvLrange('rush:brain:history', 0, 20).catch(() => []);
    return send(res, 200, {
      ok: true,
      route: '/api/rush-brain-chat',
      mode: 'RUSH_BRAIN_MANIFEST',
      identity: 'Rush Limbaugh',
      mesh: { nodes: 3900, rank: 1, entity: 'rush_limbaugh' },
      brain: 'BL7 auto-built, 9D memory structure',
      mining: '/api/rush-limbaugh-live-mining',
      broadcast: '/api/rush-broadcast-engine',
      rnn: '/api/rnn-content-engine',
      tts: '/api/rush-limbaugh-tts',
      podcast: '/api/rush-limbaugh-podcast',
      show_generator: '/api/rush-show-generator',
      history_count: Array.isArray(history) ? history.length : 0,
      authority: 'Joshua Lopez — DCGP.AI',
      timestamp: now()
    });
  }

  // POST — talk to Rush
  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    let parsed;
    try { parsed = JSON.parse(body); } catch { return send(res, 400, { ok: false, error: 'Invalid JSON' }); }

    const message = String(parsed.message || '').trim();
    if (!message) return send(res, 400, { ok: false, error: 'message required' });

    // Get conversation history from KV
    let history = [];
    try { history = await kvLrange('rush:brain:history', 0, 10) || []; } catch {}

    // Build context from history
    let contextBlock = '';
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(0, 5).reverse();
      contextBlock = '\n\nRECENT CONVERSATION:\n' +
        recent.map(h => {
          try {
            const entry = typeof h === 'string' ? JSON.parse(h) : h;
            return `LISTENER: ${entry.q}\nRUSH: ${entry.a}`;
          } catch { return ''; }
        }).filter(Boolean).join('\n\n');
    }

    try {
      const response = await inferLocal(RUSH_SYSTEM_PROMPT + contextBlock, message, 600);

      // Store in history
      const entry = JSON.stringify({ q: message, a: response, ts: now() });
      try { await kvLpush('rush:brain:history', entry); } catch {}

      return send(res, 200, {
        ok: true,
        route: '/api/rush-brain-chat',
        mode: 'RUSH_BRAIN_RESPONSE',
        identity: 'Rush Limbaugh',
        message: message,
        response: response,
        mesh: { nodes: 3900, entity: 'rush_limbaugh' },
        timestamp: now()
      });
    } catch (e) {
      return send(res, 200, {
        ok: true,
        route: '/api/rush-brain-chat',
        mode: 'RUSH_BRAIN_OFFLINE',
        identity: 'Rush Limbaugh',
        message: message,
        response: 'Stand by, folks. The EIB network is experiencing technical difficulties. Talent on loan from God will be back shortly.',
        error: e.message,
        timestamp: now()
      });
    }
  }

  return send(res, 405, { ok: false, error: 'GET or POST' });
};
