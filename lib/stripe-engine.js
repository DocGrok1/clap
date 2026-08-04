// lib/stripe-engine.js — AURA115 Stripe Connect Engine
// ComCard™ payment processing — Constitutional Contact Card purchasing
// The card IS the license. $5 buys governed inference. Universal. No extraction.
// Authority: Joshua Lopez — DCGP.AI — USPTO 19/555,951
'use strict';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const DOMAIN = process.env.STRIPE_DOMAIN || process.env.DOMAIN || 'https://cloud.aura115.ai';

let stripe = null;

function getStripe() {
  if (!stripe && STRIPE_SECRET_KEY) {
    try {
      stripe = require('stripe')(STRIPE_SECRET_KEY);
    } catch (e) {
      console.warn('[StripeEngine] stripe SDK not installed:', e.message);
    }
  }
  return stripe;
}

// ── PRODUCT LINE — four card types, three token scales ────────────────────────
// ComCard™:   physical + digital clear substrate. The card IS the license.
// QuamCard™:  quantum-minted card. 5-qubit entangled token chain (pi/7 gov phase).
//             Minted on real QPU hardware (Rigetti Cepheus 107Q, IQM Emerald 54Q).
//             Each QuamCard carries a Braket task ID as proof of quantum origin.
// ChatBits™:  atomic governed message unit (CB-1.0)
// ChatBlocks™: accumulated session container (CBLK-1.0)
// GitBlocks™: versioned hash chain on git (GBLK-1.0)
//
// Three scales: bit → block → chain. Same governance. Same gate. Same Contact Hamiltonian.

const COMCARD_TIERS = {
  // ── ComCards — governed inference tokens ──
  'CC-5':   { price: 5000,   tokens: 500000,    label: 'ComCard CC-50 Standard',    note: '500K governed tokens',                    recurring: false, type: 'comcard' },
  'CC-5L':  { price: 5000,   tokens: 5000000,   label: 'ComCard CC-50 Limited',     note: '5M governed tokens (limited time)',        recurring: false, type: 'comcard' },
  'CC-10':  { price: 10000,  tokens: 20000000,  label: 'ComCard CC-100 Enterprise', note: '20M governed tokens',                     recurring: false, type: 'comcard' },

  // ── QuamCards — quantum-minted governed tokens ──
  'QC-5':   { price: 5000,   tokens: 500000,    label: 'QuamCard QC-50',            note: '500K quantum-minted tokens — 5-qubit entangled chain',   recurring: false, type: 'quamcard' },
  'QC-10':  { price: 10000,  tokens: 5000000,   label: 'QuamCard QC-100',           note: '5M quantum-minted tokens — QPU origin proof',            recurring: false, type: 'quamcard' },
  'QC-25':  { price: 25000,  tokens: 25000000,  label: 'QuamCard QC-250',           note: '25M quantum-minted tokens — full Cepheus 107Q circuit',  recurring: false, type: 'quamcard' },

  // ── ChatBits / ChatBlocks / GitBlocks — three-scale governed chain ──
  'CB-1':   { price: 1000,   tokens: 50000,     label: 'ChatBits CB-10',            note: '50K ChatBit tokens — atomic governed messages',          recurring: false, type: 'chatbits' },
  'CBLK-1': { price: 5000,   tokens: 500000,    label: 'ChatBlocks CBLK-50',        note: '500K ChatBlock tokens — session container + QHP',         recurring: false, type: 'chatblocks' },
  'GBLK-1': { price: 10000,  tokens: 2000000,   label: 'GitBlocks GBLK-100',         note: '2M GitBlock tokens — versioned hash chain',              recurring: false, type: 'gitblocks' },
};

// ── Product sync — ensure Stripe products + prices exist ─────────────────────
async function ensureProducts(accountId) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');

  const opts = accountId ? { stripeAccount: accountId } : {};
  const results = {};

  for (const [tier, def] of Object.entries(COMCARD_TIERS)) {
    const productType = def.type || 'comcard';
    const productNames = {
      comcard: 'Contact ComCard™',
      quamcard: 'QuamCard™',
      chatbits: 'ChatBits™',
      chatblocks: 'ChatBlocks™',
      gitblocks: 'GitBlocks™',
    };
    const productDescs = {
      comcard: 'Constitutional Contact Card — governed identity + governed inference tokens. The card IS the license.',
      quamcard: 'Quantum-minted governed token card. 5-qubit entangled chain (pi/7 governance phase). Minted on real QPU hardware. Each card carries Braket task ID as proof of quantum origin.',
      chatbits: 'Atomic governed message unit (CB-1.0). Each ChatBit carries obligation, fidelity, and CHVM snapshot at mint.',
      chatblocks: 'Accumulated session container (CBLK-1.0). Ordered sequence of ChatBits carrying QHP fingerprint + OpenX receptor + runtime DNA.',
      gitblocks: 'Versioned hash chain on git infrastructure (GBLK-1.0). Every commit is a block. Every SHA is a hash. Every push is a mint. LCHC-2048 constitutional hash chain.',
    };

    // Search for existing product by metadata
    const existing = await s.products.search({
      query: `metadata["tier"]:"${tier}"`,
    }, opts);

    let product;
    if (existing.data.length > 0) {
      product = existing.data[0];
    } else {
      product = await s.products.create({
        name: `${productNames[productType] || productType} ${def.label}`,
        description: `${def.note}. ${productDescs[productType] || ''}`,
        metadata: {
          tier,
          type: productType,
          tokens: String(def.tokens),
          authority: 'Joshua Lopez — DCGP.AI',
          patent: productType === 'quamcard' ? 'USPTO 19/555,951 + Braket QPU' : 'USPTO 19/693,411',
          protocol: productType === 'quamcard' ? 'CCTP-NAME-SVG-v1 + QHP + Braket' : 'CCTP-NAME-SVG-v1',
        },
      }, opts);
    }

    // Find or create price
    const prices = await s.prices.list({ product: product.id, active: true, limit: 10 }, opts);
    let price = prices.data.find(p => p.unit_amount === def.price && p.currency === 'usd');

    if (!price) {
      price = await s.prices.create({
        product: product.id,
        unit_amount: def.price,
        currency: 'usd',
      }, opts);
    }

    results[tier] = { productId: product.id, priceId: price.id, ...def };
  }

  return results;
}

// ── Connected Account — create DCGP.AI as Connect platform account ───────────
async function createConnectAccount(email, displayName) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');

  const account = await s.accounts.create({
    type: 'standard',
    email: email,
    business_type: 'company',
    company: { name: displayName || 'DCGP.AI LLC' },
    metadata: {
      platform: 'AURA115',
      authority: 'Joshua Lopez — DCGP.AI',
    },
  });

  return { accountId: account.id };
}

// ── Account onboarding link ──────────────────────────────────────────────────
async function createAccountLink(accountId, refreshUrl, returnUrl) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');

  const link = await s.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl || `${DOMAIN}/stripe/onboarding?refresh=true`,
    return_url: returnUrl || `${DOMAIN}/stripe/onboarding?accountId=${accountId}&done=true`,
    type: 'account_onboarding',
  });

  return { url: link.url };
}

// ── Account status ───────────────────────────────────────────────────────────
async function getAccountStatus(accountId) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');

  const account = await s.accounts.retrieve(accountId);

  return {
    id: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements,
  };
}

// ── Checkout session — the purchase gate ─────────────────────────────────────
async function createCheckoutSession(tier, accountId, customerEmail) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');

  const products = await ensureProducts(accountId);
  const product = products[tier];
  if (!product) throw new Error(`Invalid tier: ${tier}`);

  const sessionParams = {
    line_items: [{ price: product.priceId, quantity: 1 }],
    mode: 'payment',
    success_url: `${DOMAIN}/comcard/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
    cancel_url: `${DOMAIN}/comcard/cancel`,
    metadata: {
      tier,
      tokens: String(product.tokens),
      protocol: 'CCTP-NAME-SVG-v1',
      authority: 'Joshua Lopez — DCGP.AI',
    },
  };

  if (customerEmail) {
    sessionParams.customer_email = customerEmail;
  }

  const opts = accountId ? { stripeAccount: accountId } : {};
  const session = await s.checkout.sessions.create(sessionParams, opts);

  return {
    sessionId: session.id,
    url: session.url,
    tier,
    tokens: product.tokens,
    price: product.price,
  };
}

// ── Webhook verification ─────────────────────────────────────────────────────
function constructEvent(payload, signature) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');

  if (STRIPE_WEBHOOK_SECRET) {
    return s.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  }
  // No secret configured — parse raw (dev mode)
  return JSON.parse(payload);
}

// ── Fetch products for display ───────────────────────────────────────────────
async function listProducts(accountId) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');

  const opts = accountId ? { stripeAccount: accountId } : {};
  const prices = await s.prices.list({ expand: ['data.product'], active: true, limit: 100 }, opts);

  return prices.data.map(p => ({
    id: p.product.id,
    name: p.product.name,
    description: p.product.description,
    price: p.unit_amount,
    priceId: p.id,
    tier: p.product.metadata?.tier || null,
    tokens: parseInt(p.product.metadata?.tokens || '0', 10),
  }));
}

module.exports = {
  getStripe,
  COMCARD_TIERS,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET,
  DOMAIN,
  ensureProducts,
  createConnectAccount,
  createAccountLink,
  getAccountStatus,
  createCheckoutSession,
  constructEvent,
  listProducts,
};
