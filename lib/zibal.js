// Zibal online payment (https://zibal.ir). Flow: request -> customer pays at gateway.zibal.ir -> callback -> verify -> order marked paid.
// Merchant "zibal" is Zibal's public sandbox (no real money). Settings -> Payment, or env ZIBAL_MERCHANT.
// Zibal amounts are in rials; the store prices are in toman (x10).
const crypto = require('crypto');
const db = require('./db');
const A = require('./auth');
const orders = require('./orders');

const API = 'https://gateway.zibal.ir/v1';
const DEMO = 'zibal';
const cfg = () => {
  const s = ((db.get().settings || {}).payment || {}).zibal || {};
  const merchant = String(process.env.ZIBAL_MERCHANT || s.merchant || '').trim();
  return { merchant, enabled: !!merchant && s.enabled !== false && (process.env.ZIBAL_MERCHANT ? true : !!s.enabled), sandbox: merchant === DEMO, fromEnv: !!process.env.ZIBAL_MERCHANT };
};
const enabled = () => cfg().enabled;

// result codes (https://help.zibal.ir/IPG/API/): 100 ok, 201 already verified, 202 unpaid/failed, 102 merchant not found, 103 inactive, 104 invalid, 105 amount < 1000 rial ...
const MSG = { 100: 'ok', 102: 'merchant_not_found', 103: 'merchant_inactive', 104: 'merchant_invalid', 105: 'amount_too_low', 106: 'bad_callback', 113: 'amount_too_high', 201: 'already_verified', 202: 'not_paid', 203: 'bad_track_id' };
const STATUS = { '-1': 'waiting', '-2': 'internal_error', 1: 'paid_verified', 2: 'paid_unverified', 3: 'cancelled', 4: 'bad_card', 5: 'insufficient', 6: 'bad_password', 7: 'too_many_requests', 8: 'daily_limit', 9: 'amount_limit', 10: 'bad_issuer', 11: 'switch_error', 12: 'unreachable', 15: 'refunded', 16: 'refund_pending', 18: 'refund_cancelled' };

async function call(path, body) {
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ merchant: cfg().merchant, ...body }), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && !j.result) throw new Error('zibal http ' + r.status);
  return j;
}

// a signed token so a guest can retry paying for their own order without an account
const payToken = (o) => crypto.createHmac('sha256', A.sign('pay')).update(String(o.id)).digest('hex').slice(0, 24);
const tokenOk = (o, k) => !!k && A.safeEq(String(k), payToken(o));

// start a payment: returns { payUrl } or { error }
async function start(o, callbackUrl) {
  const c = cfg(); if (!c.enabled) return { error: 'gateway_off' };
  try {
    const j = await call('/request', { amount: Math.round(o.total * 10), callbackUrl, orderId: String(o.id), mobile: o.customer && o.customer.phone, description: 'Order #' + o.id });
    if (j.result !== 100 || !j.trackId) {
      console.error('[zibal] payment request refused:', j.result, j.message, '| callback', callbackUrl); o.payment = { ...(o.payment || {}), gateway: 'zibal', state: 'error', error: MSG[j.result] || String(j.result), message: j.message || '', at: Date.now() }; return { error: 'gateway_error', code: j.result, message: j.message }; }
    o.payment = { gateway: 'zibal', trackId: String(j.trackId), amount: Math.round(o.total * 10), state: 'pending', sandbox: c.sandbox, at: Date.now(), tries: ((o.payment && o.payment.tries) || 0) + 1 };
    return { payUrl: `https://gateway.zibal.ir/start/${j.trackId}`, trackId: String(j.trackId) };
  } catch (e) { console.error('[zibal] payment request failed:', e.message); return { error: 'network', message: e.message }; }
}

// after the customer returns (or from the admin "check payment" button): ask Zibal and update the order
async function settle(o, cb) {
  const p = o.payment; if (!p || p.gateway !== 'zibal' || !p.trackId) return { error: 'no_payment' };
  if (o.paymentStatus === 'paid' && p.state === 'paid') return { state: 'paid' };
  if (cb) p.callback = { success: String(cb.success || ''), status: String(cb.status || ''), at: Date.now() }; // what the gateway sent the customer's browser back with
  try {
    const j = await call('/verify', { trackId: Number(p.trackId) });
    p.lastVerify = { result: j.result, message: String(j.message || '').slice(0, 120), at: Date.now() };
    if (j.result === 100 || j.result === 201) {
      Object.assign(p, { state: 'paid', refNumber: j.refNumber || p.refNumber || '', cardNumber: j.cardNumber || p.cardNumber || '', paidAt: j.paidAt || '', verifiedAt: Date.now() });
      if (o.paymentStatus !== 'paid') orders.setPayment(o, 'paid', 'zibal');
      return { state: 'paid' };
    }
    // not paid: look at the gateway status to tell "still waiting" from "failed"
    const q = await call('/inquiry', { trackId: Number(p.trackId) }).catch(() => ({}));
    const st = STATUS[q.status] || 'failed';
    p.lastInquiry = { status: q.status, result: q.result, at: Date.now() };
    if (q.status === -1) return { state: 'pending' };
    p.state = 'failed'; p.reason = st; p.at = Date.now();
    if (o.paymentStatus === 'unpaid') orders.setPayment(o, 'failed', 'zibal');
    return { state: 'failed', reason: st };
  } catch (e) { p.lastError = String(e.message).slice(0, 120); return { error: 'network', state: 'pending', message: e.message }; }
}

module.exports = { cfg, enabled, start, settle, payToken, tokenOk, DEMO };
