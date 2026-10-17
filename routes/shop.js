// Public shop API: customer OTP login, account, quote, orders, stock watch.
const db = require('../lib/db');
const A = require('../lib/auth');
const sms = require('../lib/sms');
const pricing = require('../lib/pricing');
const orders = require('../lib/orders');

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const CUST_MS = 30 * 864e5;
const pubCustomer = (c) => c && ({ id: c.id, phone: c.phone, name: c.name || '', address: c.address || '', marketingOptIn: !!c.marketingOptIn });
const checkout = () => ({ requireLogin: false, ...((db.get().settings || {}).checkout || {}) });

function startCustomerSession(res, c) {
  c.lastLoginAt = Date.now(); db.save();
  res.cookie('armova_cust', A.makeToken('cust', c.id, CUST_MS, c.tokenVersion || 1), { httpOnly: true, sameSite: 'lax', maxAge: CUST_MS });
}
function loadCustomer(req, res, next) {
  const t = A.readToken(req.cookies && req.cookies.armova_cust, 'cust');
  const c = t && db.get().customers.find((x) => x.id === t.id);
  req.customer = c && (c.tokenVersion || 1) === t.tv && !c.blocked ? c : null; next();
}
const needCustomer = (req, res, next) => (req.customer ? next() : res.status(401).json({ error: 'login_required' }));
const ipHits = new Map();
const ipLimit = (req, n = 20) => { const k = req.ip, now = Date.now(), a = (ipHits.get(k) || []).filter((t) => now - t < 3600e3); a.push(now); ipHits.set(k, a); return a.length > n; };

module.exports = function (app) {
  app.use('/api', loadCustomer);

  // ----- OTP login (customers) -----
  app.post('/api/auth/otp/request', async (req, res) => {
    const phone = sms.normPhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: 'invalid_phone' });
    if (ipLimit(req)) return res.status(429).json({ error: 'too_many' });
    const r = await sms.requestOtp(phone, 'cust');
    res.status(r.error ? (r.error === 'sms_failed' ? 502 : 429) : 200).json(r);
  });
  app.post('/api/auth/otp/verify', (req, res) => {
    const phone = sms.normPhone(req.body.phone);
    if (!phone || !sms.verifyOtp(phone, 'cust', req.body.code)) return res.status(401).json({ error: 'bad_code' });
    const { customer, created } = sms.upsertCustomer(phone, { name: str(req.body.name, 100) }, { verified: true });
    if (customer.blocked) return res.status(403).json({ error: 'blocked' });
    startCustomerSession(res, customer);
    if (created) require('../lib/orders').notify({ customer, customerId: customer.id, id: 0, total: 0 }, 'welcome');
    res.json({ ok: true, customer: pubCustomer(customer), created });
  });
  app.get('/api/auth/me', (req, res) => res.json({ customer: pubCustomer(req.customer), checkout: checkout() }));
  app.post('/api/auth/logout', (req, res) => { res.clearCookie('armova_cust'); res.json({ ok: true }); });
  app.put('/api/auth/me', needCustomer, (req, res) => {
    const c = req.customer, b = req.body || {};
    if (b.name !== undefined) c.name = str(b.name, 100);
    if (b.address !== undefined) c.address = str(b.address, 500);
    if (b.marketingOptIn !== undefined) c.marketingOptIn = !!b.marketingOptIn;
    db.save(); res.json({ customer: pubCustomer(c) });
  });
  app.get('/api/auth/orders', needCustomer, (req, res) => {
    res.json(sms.ordersOf(req.customer).sort((a, b) => b.createdAt - a.createdAt).map((o) => ({ id: o.id, status: o.status, paymentStatus: o.paymentStatus || 'unpaid', trackingCode: o.trackingCode || '', total: o.total, discount: o.discount || 0, createdAt: o.createdAt, items: o.items })));
  });
  const ownOrder = (req) => sms.ordersOf(req.customer).find((o) => o.id === Number(req.params.id));
  app.post('/api/auth/orders/:id/cancel', needCustomer, (req, res) => {
    const o = ownOrder(req); if (!o) return res.status(404).end();
    if (!['new', 'confirmed'].includes(o.status)) return res.status(409).json({ error: 'not_cancellable' });
    orders.setStatus(o, 'cancelled', { by: 'customer' }); res.json({ ok: true });
  });
  app.post('/api/auth/orders/:id/return', needCustomer, (req, res) => {
    const o = ownOrder(req); if (!o) return res.status(404).end();
    if (o.status !== 'delivered') return res.status(409).json({ error: 'not_returnable' });
    o.returnReason = str(req.body.reason, 300); orders.setStatus(o, 'return_requested', { by: 'customer' }); res.json({ ok: true });
  });
  // cart snapshot for abandoned-cart reminders
  app.put('/api/auth/cart', needCustomer, (req, res) => {
    const items = (Array.isArray(req.body.items) ? req.body.items : []).slice(0, 50).map((i) => ({ productId: Number(i.productId), size: str(i.size, 20), qty: Math.max(1, Math.floor(Number(i.qty)) || 1) }));
    req.customer.cart = items; req.customer.cartAt = items.length ? Date.now() : 0; db.save(); res.json({ ok: true });
  });

  // ----- stock watch ("notify me when back in stock") -----
  app.post('/api/stock-watch', (req, res) => {
    const s = db.get(), phone = req.customer ? req.customer.phone : sms.normPhone(req.body.phone);
    const p = s.products.find((x) => x.id === Number(req.body.productId) && x.active), size = str(req.body.size, 20);
    if (!phone) return res.status(400).json({ error: 'invalid_phone' });
    if (!p || !p.sizes.some((z) => z.name === size)) return res.status(404).end();
    if (ipLimit(req, 30)) return res.status(429).json({ error: 'too_many' });
    if (s.stockWatch.filter((w) => w.phone === phone).length >= 20) return res.status(429).json({ error: 'too_many' });
    if (!s.stockWatch.some((w) => w.phone === phone && w.productId === p.id && w.size === size))
      s.stockWatch.push({ id: db.nextId(), productId: p.id, size, phone, name: req.customer ? req.customer.name : '', customerId: req.customer ? req.customer.id : 0, at: Date.now() });
    db.save(); res.json({ ok: true });
  });

  // ----- quote + orders -----
  function priceLines(items) {
    const s = db.get(), lines = [];
    if (!Array.isArray(items) || !items.length || items.length > 50) return { error: 'empty_cart' };
    for (const it of items) {
      const p = s.products.find((x) => x.id === Number(it.productId) && x.active), size = p && p.sizes.find((z) => z.name === it.size), qty = Math.floor(Number(it.qty));
      if (!p || !size || !(qty > 0) || qty > size.stock) return { error: 'unavailable', productId: it.productId };
      lines.push({ product: p, size: size.name, qty });
    }
    return { lines };
  }
  app.post('/api/cart/quote', (req, res) => {
    const r = priceLines(req.body.items); if (r.error) return res.status(409).json(r);
    const phone = req.customer ? req.customer.phone : sms.normPhone(req.body.phone);
    const q = pricing.quote(r.lines, str(req.body.coupon, 40), phone);
    res.json({ subtotal: q.subtotal, discount: q.discount, total: q.total, coupon: q.coupon, error: q.error, min: q.min,
      lines: q.lines.map((l) => ({ productId: l.product.id, size: l.size, qty: l.qty, price: l.price, base: l.base, onSale: l.onSale })) });
  });

  app.post('/api/orders', (req, res) => {
    const s = db.get(), b = req.body || {};
    if (checkout().requireLogin && !req.customer) return res.status(401).json({ error: 'login_required' });
    const phone = req.customer ? req.customer.phone : sms.normPhone(b.phone);
    const customer = { name: str(b.name, 100) || (req.customer && req.customer.name) || '', phone, address: str(b.address, 500), note: str(b.note, 500) };
    if (!customer.name || !phone || !customer.address) return res.status(400).json({ error: 'invalid_customer' });
    const r = priceLines(b.items); if (r.error) return res.status(r.error === 'empty_cart' ? 400 : 409).json(r);
    const q = pricing.quote(r.lines, str(b.coupon, 40), phone);
    if (q.error) return res.status(400).json({ error: q.error, min: q.min });
    const items = q.lines.map((l) => ({ productId: l.product.id, name: l.product.name, size: l.size, qty: l.qty, price: l.price, base: l.base, image: (l.product.images[0] || {}).file || '' }));
    for (const l of q.lines) l.product.sizes.find((z) => z.name === l.size).stock -= l.qty;
    const { customer: cust } = sms.upsertCustomer(phone, { name: customer.name, address: customer.address, ...(b.marketingOptIn === true ? { marketingOptIn: true } : {}) });
    cust.cart = []; cust.cartAt = 0;
    const order = { id: db.nextId(), items, customer, customerId: cust.id, subtotal: q.subtotal, discount: q.discount, coupon: q.coupon ? { id: q.coupon.id, code: q.coupon.code } : null, total: q.total,
      status: 'new', paymentStatus: 'unpaid', history: [{ status: 'new', at: Date.now(), by: req.customer ? 'customer' : 'guest' }], createdAt: Date.now() };
    if (q.coupon) { const d = s.discounts.find((x) => x.id === q.coupon.id); if (d) d.uses = (d.uses || 0) + 1; }
    s.orders.push(order); db.bump('orders'); db.bump('revenue', order.total); db.save();
    orders.onCreated(order);
    res.json({ ok: true, orderId: order.id, total: order.total });
  });
};
