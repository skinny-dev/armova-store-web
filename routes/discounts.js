// Admin API: discounts & coupons.
const db = require('../lib/db');
const A = require('../lib/auth');
const sms = require('../lib/sms');
const pricing = require('../lib/pricing');
const orders = require('../lib/orders');
const campaign = require('../lib/campaign');

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bi = (v, max) => ({ fa: str(v && v.fa, max), en: str(v && v.en, max) });
const ts = (v) => { if (v === '' || v === null || v === undefined || v === 0) return 0; const n = typeof v === 'number' ? v : Date.parse(v); return Number.isFinite(n) ? n : 0; };
const ids = (v) => [...new Set((Array.isArray(v) ? v : []).map(Number).filter(Number.isFinite))];

function apply(d, b) {
  const s = db.get(), name = bi(b.name, 80);
  if (!name.fa && !name.en) return 'name_required';
  name.fa ||= name.en; name.en ||= name.fa;
  const kind = b.kind === 'coupon' ? 'coupon' : 'auto', type = b.type === 'fixed' ? 'fixed' : 'percent', value = Number(b.value);
  if (!(value > 0) || (type === 'percent' && value > 100)) return 'bad_value';
  const mode = ['all', 'categories', 'products'].includes(b.scope && b.scope.mode) ? b.scope.mode : 'all';
  const scope = { mode, categoryIds: ids(b.scope && b.scope.categoryIds).filter((id) => s.categories.some((c) => c.id === id)), productIds: ids(b.scope && b.scope.productIds).filter((id) => s.products.some((p) => p.id === id)) };
  if (mode === 'categories' && !scope.categoryIds.length) return 'scope_empty';
  if (mode === 'products' && !scope.productIds.length) return 'scope_empty';
  let code = '';
  if (kind === 'coupon') {
    code = str(b.code, 30).toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return 'bad_code';
    if (s.discounts.some((x) => x.kind === 'coupon' && x.code === code && x.id !== d.id)) return 'code_taken';
  }
  const startsAt = ts(b.startsAt), endsAt = ts(b.endsAt);
  if (startsAt && endsAt && endsAt < startsAt) return 'bad_dates';
  Object.assign(d, { name, kind, type, value: type === 'percent' ? Math.min(100, value) : Math.round(value), scope, code, startsAt, endsAt, active: b.active !== false,
    minOrder: Math.max(0, Math.round(Number(b.minOrder)) || 0), maxUses: Math.max(0, Math.floor(Number(b.maxUses)) || 0), perCustomer: Math.max(0, Math.floor(Number(b.perCustomer)) || 0), excludeSaleItems: !!b.excludeSaleItems });
  return null;
}
const state = (d, now = Date.now()) => (d.active === false ? 'off' : d.endsAt && d.endsAt < now ? 'expired' : d.startsAt && d.startsAt > now ? 'scheduled' : d.maxUses && (d.uses || 0) >= d.maxUses ? 'used_up' : 'live');

module.exports = function (admin) {
  admin.get('/discounts', A.can('discounts.manage'), (req, res) => {
    const s = db.get();
    res.json(s.discounts.map((d) => ({ ...d, state: state(d), covered: s.products.filter((p) => pricing.covers(d, p)).length })).sort((a, b) => b.createdAt - a.createdAt));
  });
  admin.post('/discounts', A.can('discounts.manage'), (req, res) => {
    const d = { id: db.nextId(), uses: 0, createdAt: Date.now(), createdBy: req.user.id };
    const err = apply(d, req.body || {}); if (err) return res.status(400).json({ error: err });
    db.get().discounts.push(d); db.save(); res.json(d);
  });
  admin.put('/discounts/:id', A.can('discounts.manage'), (req, res) => {
    const d = db.get().discounts.find((x) => x.id === Number(req.params.id)); if (!d) return res.status(404).end();
    const err = apply(d, req.body || {}); if (err) return res.status(400).json({ error: err });
    db.save(); res.json(d);
  });
  admin.post('/discounts/:id/toggle', A.can('discounts.manage'), (req, res) => {
    const d = db.get().discounts.find((x) => x.id === Number(req.params.id)); if (!d) return res.status(404).end();
    d.active = !(d.active !== false); db.save(); res.json(d);
  });
  admin.delete('/discounts/:id', A.can('discounts.manage'), (req, res) => {
    const s = db.get(); s.discounts = s.discounts.filter((x) => x.id !== Number(req.params.id)); db.save(); res.json({ ok: true });
  });
  // Remind opted-in customers that a coupon is about to expire (uses the "coupon_expiring" template text).
  admin.post('/discounts/:id/remind', A.can('discounts.manage', 'crm.send'), (req, res) => {
    const d = db.get().discounts.find((x) => x.id === Number(req.params.id) && x.kind === 'coupon'); if (!d) return res.status(404).end();
    if (!A.has(req.perms, 'crm.send')) return res.status(403).json({ error: 'forbidden' });
    const t = sms.templates().find((x) => x.key === 'coupon_expiring');
    const list = db.get().customers.filter((c) => c.marketingOptIn && !c.blocked && c.phone);
    if (!list.length) return res.status(400).json({ error: 'no_recipients' });
    const lab = pricing.label(d), endsAt = d.endsAt ? new Date(d.endsAt).toLocaleDateString('fa-IR') : '';
    const camp = campaign.start({ name: 'Coupon ' + d.code, kind: 'promo', text: t.text, recipients: list, by: req.user.id, templateKey: 'coupon_expiring', vars: () => ({ code: d.code, discount: lab.fa, endsAt }) });
    res.json({ ok: true, campaignId: camp.id, total: list.length });
  });
};
