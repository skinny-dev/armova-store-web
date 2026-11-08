// Digipay (mydigipay.com) installment / BNPL payment: UPG API with OAuth. Flow: ticket -> customer pays or gets credit at Digipay ->
// POST callback -> verify -> order marked paid -> after shipping, "deliver" must be reported (required by Digipay for credit/BNPL purchases).
// Sandbox: https://uat.mydigipay.info/digipay/api  Live: https://api.mydigipay.com/digipay/api   Type codes: IPG 0, WALLET 11, CREDIT 5, BNPL 13, CREDIT-CARD 24.
// Credentials (client id/secret, username, password) come from Digipay after the merchant contract: Settings -> Installment payment, or env
// DIGIPAY_CLIENT_ID / DIGIPAY_CLIENT_SECRET / DIGIPAY_USERNAME / DIGIPAY_PASSWORD / DIGIPAY_SANDBOX=0.
const crypto = require('crypto');
const db = require('./db');
const A = require('./auth');
const sms = require('./sms');

const BASES = { sandbox: 'https://uat.mydigipay.info/digipay/api', live: 'https://api.mydigipay.com/digipay/api' };
const settings = () => ((db.get().settings || {}).payment || {}).digipay || {};
function cfg() {
  const s = settings(), e = process.env;
  const c = {
    clientId: String(e.DIGIPAY_CLIENT_ID || s.clientId || '').trim(), clientSecret: String(e.DIGIPAY_CLIENT_SECRET || s.clientSecret || '').trim(),
    username: String(e.DIGIPAY_USERNAME || s.username || '').trim(), password: String(e.DIGIPAY_PASSWORD || s.password || '').trim(),
    sandbox: e.DIGIPAY_SANDBOX ? e.DIGIPAY_SANDBOX !== '0' : s.sandbox !== false, // test environment unless switched off on purpose
    mult: s.unit === 'toman' ? 1 : 10, // amounts: Digipay's docs do not state the unit; rials (x10) is the Iranian PSP norm — confirm in the sandbox
    type: Number(s.type) || 13, sellerId: String(s.sellerId || '1'), categoryId: String(s.categoryId || 'fashion'), minTotal: Math.max(0, Number(s.minTotal) || 0),
  };
  c.ready = !!(c.clientId && c.clientSecret && c.username && c.password);
  c.enabled = c.ready && (e.DIGIPAY_CLIENT_ID ? s.enabled !== false : !!s.enabled);
  c.base = c.sandbox ? BASES.sandbox : BASES.live;
  return c;
}
const enabled = () => cfg().enabled;
// How the installment promotion is shown (managed in Settings): where it appears, the number of installments quoted, and optional texts per language
const PROMO_TEXTS = ['headline', 'sub', 'cta', 'fine'];
function promo() {
  const p = settings().promo || {}, text = {};
  for (const k of PROMO_TEXTS) { const v = (p.text || {})[k] || {}; text[k] = { fa: String(v.fa || '').slice(0, 160), en: String(v.en || '').slice(0, 160) }; }
  return { banner: p.banner !== false, product: p.product !== false, strip: p.strip !== false, estimate: p.estimate !== false, count: Math.min(12, Math.max(2, Math.round(Number(p.count)) || 4)), text };
}

// ---- OAuth token (cached until shortly before it expires) ----
let tok = { key: '', value: '', exp: 0 };
async function token() {
  const c = cfg(), key = c.base + c.clientId + c.username;
  if (tok.key === key && tok.exp > Date.now() + 30e3) return tok.value;
  const r = await fetch(c.base + '/oauth/token', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64') },
    body: new URLSearchParams({ username: c.username, password: c.password, grant_type: 'password' }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw Object.assign(new Error('digipay login ' + r.status), { code: 'login' });
  tok = { key, value: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3000) * 1000 };
  return tok.value;
}
async function call(path, body, type) {
  const c = cfg(), send = async () => {
    const r = await fetch(`${c.base}${path}?type=${type ?? c.type}`, {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json; charset=UTF-8', Accept: 'application/json', Authorization: 'Bearer ' + (await token()), Agent: 'WEB', 'Digipay-Version': '2022-02-02' }, body: JSON.stringify(body),
    });
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  let x = await send();
  if (x.status === 401) { tok.exp = 0; x = await send(); } // expired token: log in again once
  return x;
}
const ok = (j) => !!(j && j.result && Number(j.result.status) === 0);
const why = (x) => String((x.j && x.j.result && (x.j.result.message || x.j.result.title)) || (x.j && x.j.message) || 'http ' + x.status).slice(0, 160);

const payToken = (o) => crypto.createHmac('sha256', A.sign('pay')).update(String(o.id)).digest('hex').slice(0, 24); // same scheme as Zibal's retry key
const tokenOk = (o, k) => !!k && A.safeEq(String(k), payToken(o));

// ---- start: returns { payUrl } or { error } ----
async function start(o, callbackUrl) {
  const c = cfg(); if (!c.enabled) return { error: 'gateway_off' };
  if (c.minTotal && o.total < c.minTotal) return { error: 'installment_min', min: c.minTotal };
  const tries = ((o.payment && o.payment.gateway === 'digipay' && o.payment.tries) || 0) + 1, providerId = `A${o.id}-${tries}`; // a fresh purchase id for every attempt
  const body = { amount: Math.round(o.total * c.mult), cellNumber: sms.normPhone(o.customer && o.customer.phone) || String(o.customer && o.customer.phone || ''), providerId, callbackUrl,
    basketDetailsDto: { basketId: String(o.id), items: o.items.map((i) => ({ sellerId: c.sellerId, supplierId: c.sellerId, productCode: String(i.productId), brand: 'Armova', productType: 1, count: i.qty, categoryId: c.categoryId })) } };
  try {
    const x = await call('/tickets/business', body);
    const j = x.j || {}, url = j.redirectUrl || j.payUrl;
    if (x.status !== 200 || !ok(j) || !url) {
      console.error('[digipay] ticket refused:', x.status, JSON.stringify(j).slice(0, 300));
      o.payment = { ...(o.payment || {}), gateway: 'digipay', state: 'error', error: why(x), tries, at: Date.now() };
      return { error: 'gateway_error', message: why(x) };
    }
    o.payment = { gateway: 'digipay', providerId, ticket: j.ticket || '', type: c.type, amount: body.amount, state: 'pending', sandbox: c.sandbox, tries, at: Date.now() };
    return { payUrl: url };
  } catch (e) { console.error('[digipay] ticket failed:', e.message); return { error: e.code === 'login' ? 'gateway_login' : 'network', message: e.message }; }
}

// ---- callback + verify: cb = fields Digipay posted to the callback URL ----
async function settle(o, cb = {}) {
  const orders = require('./orders'), p = o.payment;
  if (!p || p.gateway !== 'digipay') return { error: 'no_payment' };
  if (o.paymentStatus === 'paid' && p.state === 'paid') return { state: 'paid' };
  p.callback = { result: String(cb.result || ''), trackingCode: String(cb.trackingCode || ''), amount: String(cb.amount || ''), isCredit: cb.isCredit === undefined ? '' : String(cb.isCredit), at: Date.now() };
  const fail = (reason) => { p.state = 'failed'; p.reason = reason; p.at = Date.now(); if (o.paymentStatus === 'unpaid') orders.setPayment(o, 'failed', 'digipay'); return { state: 'failed', reason }; };
  if (String(cb.providerId || '') !== p.providerId) return fail('provider_mismatch');
  if (String(cb.result || '').toUpperCase() === 'FAILURE') return fail('cancelled');
  if (cb.amount !== undefined && cb.amount !== '' && Number(cb.amount) !== Number(p.amount)) return fail('amount_mismatch'); // never verify a different amount
  const trackingCode = String(cb.trackingCode || p.trackingCode || ''); if (!trackingCode) return fail('no_tracking_code');
  p.trackingCode = trackingCode;
  try {
    const x = await call('/purchases/verify', { trackingCode, providerId: p.providerId }, p.type);
    p.lastVerify = { status: x.status, code: x.j && x.j.result && x.j.result.status, message: why(x), at: Date.now() };
    if (x.status === 200 && ok(x.j)) {
      Object.assign(p, { state: 'paid', verifiedAt: Date.now(), isCredit: cb.isCredit === true || cb.isCredit === 'true' || p.type === 13 || p.type === 5, gateway2: x.j.paymentGateway });
      if (o.paymentStatus !== 'paid') orders.setPayment(o, 'paid', 'digipay');
      return { state: 'paid' };
    }
    const code = Number(x.j && x.j.result && x.j.result.status);
    if ([9004, 9011].includes(code)) return { state: 'pending' }; // still in progress / result unknown: ask again later
    return fail('verify_' + (code || x.status));
  } catch (e) { p.lastError = String(e.message).slice(0, 120); return { error: 'network', state: 'pending', message: e.message }; }
}

// ---- deliver: required by Digipay for credit / BNPL purchases once the goods are on their way ----
async function deliver(o) {
  const p = o.payment; if (!p || p.gateway !== 'digipay' || p.state !== 'paid' || !p.isCredit || p.delivered) return { skipped: true };
  try {
    const x = await call('/purchases/deliver', { deliveryDate: Date.now(), invoiceNumber: String(o.id), trackingCode: p.trackingCode, products: o.items.map((i) => (i.name && (i.name.fa || i.name.en)) || String(i.productId)) }, p.type);
    if (x.status === 200 && ok(x.j)) { p.delivered = true; p.deliveredAt = Date.now(); delete p.deliverError; return { ok: true }; }
    p.deliverError = why(x); console.error('[digipay] deliver refused:', x.status, JSON.stringify(x.j).slice(0, 300)); return { error: p.deliverError };
  } catch (e) { p.deliverError = String(e.message).slice(0, 120); return { error: p.deliverError }; }
}

module.exports = { cfg, enabled, promo, PROMO_TEXTS, start, settle, deliver, payToken, tokenOk, BASES };
