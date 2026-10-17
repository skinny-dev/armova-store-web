// Discounts: automatic sales (change the displayed price) and coupon codes (entered at checkout).
// Discount: { id, name:{fa,en}, kind:'auto'|'coupon', code, type:'percent'|'fixed', value,
//   scope:{ mode:'all'|'categories'|'products', categoryIds:[], productIds:[] },
//   startsAt, endsAt, active, minOrder, maxUses, uses, perCustomer, excludeSaleItems, createdAt }
const db = require('./db');

const kids = (parent) => db.get().categories.filter((c) => (c.parentId || null) === parent);
function descendants(id) {
  const out = new Set([id]); const walk = (pid) => kids(pid).forEach((c) => { if (!out.has(c.id)) { out.add(c.id); walk(c.id); } });
  walk(id); return out;
}
function categoryPath(id) {
  const cats = db.get().categories, path = []; let c = cats.find((x) => x.id === id), guard = 0;
  while (c && guard++ < 20) { path.unshift(c); c = c.parentId ? cats.find((x) => x.id === c.parentId) : null; }
  return path;
}

const live = (d, now = Date.now()) => d.active !== false && (!d.startsAt || d.startsAt <= now) && (!d.endsAt || d.endsAt >= now);
function covers(d, p) {
  const sc = d.scope || { mode: 'all' };
  if (sc.mode === 'products') return (sc.productIds || []).includes(p.id);
  if (sc.mode === 'categories') { const ids = new Set(); (sc.categoryIds || []).forEach((c) => descendants(c).forEach((x) => ids.add(x))); return ids.has(p.categoryId); }
  return true;
}
const cut = (d, price) => (d.type === 'fixed' ? Math.max(0, price - Math.round(d.value)) : Math.max(0, Math.round(price * (100 - Math.min(100, d.value)) / 100)));
const label = (d) => (d.type === 'fixed' ? { fa: `${Math.round(d.value).toLocaleString('fa-IR')} تومان`, en: `${Math.round(d.value).toLocaleString('en-US')} Toman` } : { fa: `${Number(d.value).toLocaleString('fa-IR')}٪`, en: `${d.value}%` });

// Best automatic sale for a product: { price, discountId, percent, endsAt } or null.
function sale(p, now = Date.now()) {
  let best = null;
  for (const d of db.get().discounts) {
    if (d.kind !== 'auto' || !live(d, now) || !covers(d, p) || !(p.price > 0)) continue;
    const price = cut(d, p.price);
    if (price < p.price && (!best || price < best.price)) best = { price, discountId: d.id, percent: Math.round((1 - price / p.price) * 100), endsAt: d.endsAt || 0 };
  }
  return best;
}
const unit = (p) => { const s = sale(p); return s ? s.price : p.price; };

function couponByCode(code) {
  const c = String(code || '').trim().toLowerCase();
  return c ? db.get().discounts.find((d) => d.kind === 'coupon' && String(d.code || '').toLowerCase() === c) : null;
}
function couponUsesBy(d, phone) {
  return db.get().orders.filter((o) => o.coupon && o.coupon.id === d.id && o.status !== 'cancelled' && o.customer && o.customer.phone === phone).length;
}

// lines: [{ product, size, qty }] -> priced lines + coupon result.
function quote(lines, code, phone) {
  const out = lines.map((l) => { const s = sale(l.product); return { ...l, base: l.product.price, price: s ? s.price : l.product.price, onSale: !!s }; });
  const subtotal = out.reduce((a, l) => a + l.price * l.qty, 0);
  const res = { lines: out, subtotal, discount: 0, total: subtotal, coupon: null, error: null };
  if (!code) return res;
  const d = couponByCode(code), now = Date.now();
  const fail = (e, extra = {}) => ({ ...res, error: e, ...extra });
  if (!d || d.active === false) return fail('coupon_invalid');
  if ((d.startsAt && d.startsAt > now) || (d.endsAt && d.endsAt < now)) return fail('coupon_expired');
  if (d.maxUses && (d.uses || 0) >= d.maxUses) return fail('coupon_used_up');
  if (d.perCustomer && phone && couponUsesBy(d, phone) >= d.perCustomer) return fail('coupon_customer_limit');
  if (d.minOrder && subtotal < d.minOrder) return fail('coupon_min_order', { min: d.minOrder });
  const eligible = out.filter((l) => covers(d, l.product) && !(d.excludeSaleItems && l.onSale));
  const base = eligible.reduce((a, l) => a + l.price * l.qty, 0);
  if (!base) return fail('coupon_not_applicable');
  const discount = Math.min(base, d.type === 'fixed' ? Math.round(d.value) : Math.round(base * Math.min(100, d.value) / 100));
  return { ...res, discount, total: subtotal - discount, coupon: { id: d.id, code: d.code, type: d.type, value: d.value, label: label(d) } };
}

module.exports = { descendants, categoryPath, live, covers, sale, unit, quote, couponByCode, label, cut };
