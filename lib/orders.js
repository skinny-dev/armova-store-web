// Order lifecycle: statuses, payment status, tracking, stock, customer SMS and admin alerts.
const db = require('./db');
const sms = require('./sms');

const STATUSES = ['new', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'ready_pickup', 'delivered', 'cancelled', 'return_requested', 'return_approved', 'return_rejected', 'returned'];
const PAYMENTS = ['unpaid', 'paid', 'failed', 'refunded', 'refund_failed'];
const STATUS_TPL = { confirmed: 'order_confirmed', processing: 'order_processing', shipped: 'order_shipped', out_for_delivery: 'out_for_delivery', ready_pickup: 'ready_pickup', delivered: 'order_delivered', cancelled: 'order_cancelled', return_requested: 'return_requested', return_approved: 'return_approved', return_rejected: 'return_rejected' };
const PAY_TPL = { paid: 'payment_success', failed: 'payment_failed', refunded: 'refund_processed', refund_failed: 'refund_failed' };
const SHIPPED = new Set(['shipped', 'out_for_delivery', 'ready_pickup', 'delivered']);

const settings = () => db.get().settings;
const alerts = () => ({ phones: [], newOrder: true, lowStock: true, lowStockThreshold: 3, highValue: true, highValueThreshold: 20000000, bigQty: 10, ...(settings().alerts || {}) });
const baseUrl = () => String(process.env.PUBLIC_URL || settings().publicUrl || '').replace(/\/$/, '');
const fa = (n) => Number(n || 0).toLocaleString('fa-IR');
const vars = (o) => ({ name: o.customer.name, orderId: fa(o.id), total: fa(o.total), tracking: o.trackingCode || '', link: baseUrl() ? baseUrl() + '/account' : '' });
const fire = (p) => p && p.catch && p.catch((e) => console.error('[sms]', e.message));

function notify(o, key, extra = {}) { fire(sms.sendTemplate(key, o.customer.phone, { ...vars(o), ...extra }, { customerId: o.customerId, orderId: o.id })); }
function notifyAdmins(key, v) { const a = alerts(); a.phones.forEach((ph) => fire(sms.sendTemplate(key, ph, v, { type: key }))); }

function restock(o) {
  if (o.restocked) return;
  o.items.forEach((it) => { const p = db.get().products.find((x) => x.id === it.productId); const z = p && p.sizes.find((q) => q.name === it.size); if (z) z.stock += it.qty; });
  o.restocked = true;
  if (o.coupon) { const d = db.get().discounts.find((x) => x.id === o.coupon.id); if (d && d.uses > 0) d.uses--; }
}

// Called after any stock increase: notify customers waiting for a size.
function checkBackInStock() {
  const s = db.get(); s.stockWatch = s.stockWatch || [];
  const keep = [];
  for (const w of s.stockWatch) {
    const p = s.products.find((x) => x.id === w.productId), z = p && p.active && p.sizes.find((q) => q.name === w.size);
    if (z && z.stock > 0) fire(sms.sendTemplate('back_in_stock', w.phone, { name: w.name || '', product: p.name.fa, size: w.size, link: baseUrl() ? `${baseUrl()}/product/${p.slug}` : '' }, { type: 'back_in_stock', customerId: w.customerId }));
    else keep.push(w);
  }
  if (keep.length !== s.stockWatch.length) { s.stockWatch = keep; db.save(); }
}

function setStatus(o, status, { by = null, tracking } = {}) {
  if (!STATUSES.includes(status)) return 'bad_status';
  if (o.status === 'cancelled' && status !== 'cancelled') return 'order_cancelled';
  const prev = o.status, hadTracking = o.trackingCode || '';
  if (tracking !== undefined) o.trackingCode = String(tracking || '').trim().slice(0, 60);
  if (status !== prev) {
    o.status = status; (o.history ||= []).push({ status, at: Date.now(), by });
    if (status === 'cancelled' || status === 'returned') restock(o);
    if (status === 'delivered') o.deliveredAt = Date.now();
    const tpl = STATUS_TPL[status]; if (tpl) notify(o, tpl);
    if (status === 'cancelled' || status === 'returned') checkBackInStock();
  } else if (o.trackingCode && o.trackingCode !== hadTracking && SHIPPED.has(o.status)) notify(o, 'tracking_available');
  db.save(); return null;
}
function setTracking(o, code) {
  const prev = o.trackingCode || ''; o.trackingCode = String(code || '').trim().slice(0, 60);
  if (o.trackingCode && o.trackingCode !== prev && SHIPPED.has(o.status)) notify(o, 'tracking_available');
  db.save();
}
function setPayment(o, ps, by = null) {
  if (!PAYMENTS.includes(ps)) return 'bad_payment';
  if (o.paymentStatus === ps) return null;
  o.paymentStatus = ps; (o.history ||= []).push({ payment: ps, at: Date.now(), by });
  if (PAY_TPL[ps]) notify(o, PAY_TPL[ps]);
  db.save(); return null;
}

// After an order is created: customer SMS + admin alerts (new order, low stock, high-value/suspicious).
function onCreated(o) {
  notify(o, 'order_new');
  const a = alerts(); if (!a.phones.length) return;
  const cname = `${o.customer.name} ${o.customer.phone}`;
  if (a.newOrder) notifyAdmins('admin_new_order', { orderId: fa(o.id), customer: cname, total: fa(o.total) });
  if (a.highValue) {
    const reasons = [];
    if (o.total >= a.highValueThreshold) reasons.push('مبلغ بالا');
    if (o.items.some((i) => i.qty >= a.bigQty)) reasons.push('تعداد زیاد');
    const recent = db.get().orders.filter((x) => x.id !== o.id && x.customer.phone === o.customer.phone && Date.now() - x.createdAt < 3600e3).length;
    if (recent >= 2) reasons.push('سفارش‌های پشت‌سرهم');
    if (reasons.length) notifyAdmins('admin_high_value', { orderId: fa(o.id), customer: cname, total: fa(o.total), reason: reasons.join('، ') });
  }
  if (a.lowStock) for (const it of o.items) {
    const p = db.get().products.find((x) => x.id === it.productId), z = p && p.sizes.find((q) => q.name === it.size);
    if (!z) continue;
    if (z.stock <= a.lowStockThreshold && !z.alerted) { z.alerted = true; notifyAdmins('admin_low_stock', { product: p.name.fa, size: z.name, stock: fa(z.stock) }); }
  }
  db.save();
}
// reset low-stock debounce when restocked above the threshold
function clearLowStockFlags() { const th = alerts().lowStockThreshold; db.get().products.forEach((p) => p.sizes.forEach((z) => { if (z.alerted && z.stock > th) delete z.alerted; })); }

module.exports = { STATUSES, PAYMENTS, SHIPPED, setStatus, setTracking, setPayment, onCreated, notify, restock, checkBackInStock, clearLowStockFlags, alerts, baseUrl, vars, fa };
