// Admin API: customers (CRM), messages & campaigns, SMS templates, settings.
const db = require('../lib/db');
const A = require('../lib/auth');
const sms = require('../lib/sms');
const orders = require('../lib/orders');
const campaign = require('../lib/campaign');

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanTags = (v) => [...new Set((Array.isArray(v) ? v : String(v || '').split(/[,،]/)).map((t) => str(t, 30)).filter(Boolean))].slice(0, 15);
const mask = (k) => (k ? k.slice(0, 4) + '••••' + k.slice(-3) : '');

function withStats(c) { return { ...c, cart: undefined, ...sms.statsOf(c) }; }
function filterCustomers(f = {}) {
  const q = str(f.q, 60).toLowerCase(), now = Date.now();
  return db.get().customers.map(withStats).filter((c) => {
    if (q && !`${c.name} ${c.phone} ${(c.tags || []).join(' ')}`.toLowerCase().includes(q)) return false;
    if (f.tag && !(c.tags || []).includes(f.tag)) return false;
    if (f.optIn === true || f.optIn === 'true') if (!c.marketingOptIn) return false;
    if (f.minOrders !== undefined && f.minOrders !== '' && c.orders < Number(f.minOrders)) return false;
    if (f.maxOrders !== undefined && f.maxOrders !== '' && c.orders > Number(f.maxOrders)) return false;
    if (f.minSpent !== undefined && f.minSpent !== '' && c.spent < Number(f.minSpent)) return false;
    if (f.inactiveDays !== undefined && f.inactiveDays !== '' && !(c.lastOrderAt && now - c.lastOrderAt > Number(f.inactiveDays) * 864e5)) return false;
    return true;
  });
}

module.exports = function (admin) {
  // ----- customers -----
  admin.get('/customers', A.can('customers.view'), (req, res) => {
    const f = { ...req.query }, list = filterCustomers(f).sort((a, b) => (b.lastOrderAt || b.createdAt) - (a.lastOrderAt || a.createdAt));
    const tags = [...new Set(db.get().customers.flatMap((c) => c.tags || []))].sort();
    res.json({ customers: list, tags });
  });
  admin.get('/customers/export', A.can('customers.view'), (req, res) => {
    const rows = [['name', 'phone', 'orders', 'spent', 'last_order', 'marketing_opt_in', 'tags'], ...filterCustomers(req.query).map((c) => [c.name, c.phone, c.orders, c.spent, c.lastOrderAt ? new Date(c.lastOrderAt).toISOString().slice(0, 10) : '', c.marketingOptIn ? 1 : 0, (c.tags || []).join('|')])];
    const csv = '﻿' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="customers.csv"' }).send(csv);
  });
  admin.get('/customers/:id', A.can('customers.view'), (req, res) => {
    const c = db.get().customers.find((x) => x.id === Number(req.params.id));
    if (!c) return res.status(404).end();
    res.json({ customer: withStats(c), orders: sms.ordersOf(c).sort((a, b) => b.createdAt - a.createdAt),
      messages: A.has(req.perms, 'sms.log') || A.has(req.perms, 'crm.send') ? db.get().smsLog.filter((m) => m.customerId === c.id || m.to === c.phone).slice(-50).reverse() : [] });
  });
  admin.post('/customers', A.can('customers.manage'), (req, res) => {
    const b = req.body || {}, phone = sms.normPhone(b.phone);
    if (!phone) return res.status(400).json({ error: 'invalid_phone' });
    if (sms.findCustomer(phone)) return res.status(409).json({ error: 'customer_exists' });
    const { customer } = sms.upsertCustomer(phone, { name: str(b.name, 100), address: str(b.address, 500), notes: str(b.notes, 2000), tags: cleanTags(b.tags), marketingOptIn: !!b.marketingOptIn });
    res.json(withStats(customer));
  });
  admin.put('/customers/:id', A.can('customers.manage'), (req, res) => {
    const c = db.get().customers.find((x) => x.id === Number(req.params.id)), b = req.body || {};
    if (!c) return res.status(404).end();
    if (b.name !== undefined) c.name = str(b.name, 100);
    if (b.address !== undefined) c.address = str(b.address, 500);
    if (b.notes !== undefined) c.notes = str(b.notes, 2000);
    if (b.tags !== undefined) c.tags = cleanTags(b.tags);
    if (b.marketingOptIn !== undefined) c.marketingOptIn = !!b.marketingOptIn;
    if (b.blocked !== undefined) { c.blocked = !!b.blocked; c.tokenVersion = (c.tokenVersion || 1) + 1; }
    db.save(); res.json(withStats(c));
  });
  admin.post('/customers/bulk', A.can('customers.manage'), (req, res) => {
    const b = req.body || {}, ids = new Set((Array.isArray(b.ids) ? b.ids : []).map(Number)); let n = 0;
    const add = cleanTags(b.addTags), remove = cleanTags(b.removeTags);
    for (const c of db.get().customers) {
      if (!ids.has(c.id)) continue; n++;
      if (add.length || remove.length) c.tags = [...new Set([...(c.tags || []), ...add])].filter((t) => !remove.includes(t));
      if (b.marketingOptIn !== undefined) c.marketingOptIn = !!b.marketingOptIn;
    }
    db.save(); res.json({ ok: true, updated: n });
  });

  // ----- messages & campaigns -----
  const recipients = (b) => {
    const s = db.get(), list = Array.isArray(b.ids) ? b.ids.map(Number).map((id) => s.customers.find((c) => c.id === id)).filter(Boolean).map(withStats) : filterCustomers(b.filter || {});
    const promo = b.kind === 'promo', send = list.filter((c) => !c.blocked && c.phone && (!promo || c.marketingOptIn));
    return { list, send, skipped: list.length - send.length };
  };
  admin.post('/messages/preview', A.can('crm.send'), (req, res) => { const r = recipients(req.body || {}); res.json({ total: r.list.length, willSend: r.send.length, skipped: r.skipped }); });
  admin.post('/messages/send', A.can('crm.send'), (req, res) => {
    const b = req.body || {}, text = str(b.text, 800);
    if (!text) return res.status(400).json({ error: 'text_required' });
    const kind = b.kind === 'promo' ? 'promo' : 'info', r = recipients({ ...b, kind });
    if (!r.send.length) return res.status(400).json({ error: 'no_recipients', skipped: r.skipped });
    if (r.send.length > 3000) return res.status(400).json({ error: 'too_many_recipients' });
    const camp = campaign.start({ name: str(b.name, 80) || (kind === 'promo' ? 'Campaign' : 'Message'), kind, text, recipients: r.send, skipped: r.skipped, by: req.user.id });
    res.json({ ok: true, campaignId: camp.id, total: camp.total, skipped: r.skipped });
  });
  admin.get('/campaigns', A.can('crm.send', 'sms.log'), (req, res) => res.json([...db.get().campaigns].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100)));
  admin.get('/messages/log', A.can('sms.log'), (req, res) => {
    const q = str(req.query.q, 40), st = str(req.query.status, 10), type = str(req.query.type, 40), limit = Math.min(500, Number(req.query.limit) || 200);
    res.json(db.get().smsLog.filter((m) => (!q || (m.to || '').includes(q) || (m.text || '').includes(q)) && (!st || m.status === st) && (!type || m.type === type)).slice(-limit).reverse());
  });

  // ----- templates -----
  admin.get('/templates', A.can('templates.edit', 'crm.send', 'sms.log'), (req, res) => res.json(sms.templates()));
  admin.put('/templates/:key', A.can('templates.edit'), (req, res) => {
    const t = sms.templates().find((x) => x.key === req.params.key), b = req.body || {};
    if (!t) return res.status(404).end();
    if (b.text !== undefined) { const text = str(b.text, 600); if (!text) return res.status(400).json({ error: 'text_required' }); t.text = text; }
    if (b.enabled !== undefined) { if (t.key === 'otp' && !b.enabled) return res.status(409).json({ error: 'otp_required' }); t.enabled = !!b.enabled; }
    t.updatedAt = Date.now(); t.updatedBy = req.user.id; db.save(); res.json(t);
  });
  admin.post('/templates/:key/reset', A.can('templates.edit'), (req, res) => {
    const t = sms.templates().find((x) => x.key === req.params.key), d = sms.DEFAULT_TEMPLATES.find((x) => x.key === req.params.key);
    if (!t || !d) return res.status(404).end();
    t.text = d.text; t.updatedAt = Date.now(); t.updatedBy = req.user.id; db.save(); res.json(t);
  });
  admin.post('/templates/:key/test', A.can('templates.edit'), async (req, res) => {
    const t = sms.templates().find((x) => x.key === req.params.key), phone = sms.normPhone(req.body.phone);
    if (!t) return res.status(404).end(); if (!phone) return res.status(400).json({ error: 'invalid_phone' });
    const sample = { name: 'علی', orderId: '۱۲۳', total: '۱٬۲۵۰٬۰۰۰', tracking: '123456789', code: '123456', store: sms.storeName(), product: 'بلوز شال‌دار', size: 'M', link: orders.baseUrl() || 'https://example.com', customer: 'علی 09120000000', reason: 'مبلغ بالا', stock: '2', discount: '۲۰٪', endsAt: '۱۴۰۵/۰۸/۳۰', ...(req.body.vars || {}) };
    const e = await sms.send(phone, sms.render(t.text, sample), { type: 'test:' + t.key, by: req.user.id });
    res.json({ ok: e && e.status !== 'failed', status: e && e.status, error: e && e.error });
  });

  // ----- settings -----
  const settingsView = () => {
    const s = db.get().settings || {}, c = sms.config();
    return { sms: { provider: c.provider, configured: sms.configured(), enabled: c.enabled, sender: c.sender, otpTemplate: c.otpTemplate, apiKeyMasked: mask(c.apiKey), fromEnv: c.fromEnv },
      checkout: { requireLogin: false, ...(s.checkout || {}) }, alerts: orders.alerts(), automation: { abandonedHours: 3, reviewDays: 3, ...(s.automation || {}) },
      lastFailure: sms.lastFailure(), publicUrl: s.publicUrl || '', storeName: s.storeName || '', promoFooter: s.promoFooter || '' };
  };
  admin.get('/settings/status', A.can('settings.manage', 'templates.edit', 'crm.send', 'sms.log'), (req, res) => res.json({ smsConfigured: sms.configured() }));
  admin.get('/settings', A.can('settings.manage'), (req, res) => res.json(settingsView()));
  admin.put('/settings', A.can('settings.manage'), (req, res) => {
    const s = db.get(), b = req.body || {}; s.settings ||= {};
    if (b.sms) {
      const cur = (s.settings.sms ||= {});
      if (['apiir', 'kavenegar'].includes(b.sms.provider)) cur.provider = b.sms.provider;
      const api = (cur.provider || 'apiir') === 'apiir', keyField = api ? 'apiirToken' : 'kavenegarKey';
      if (typeof b.sms.apiKey === 'string' && b.sms.apiKey.trim() && !b.sms.apiKey.includes('•')) cur[keyField] = b.sms.apiKey.trim().replace(/^Bearer\s+/i, '').slice(0, 600);
      if (b.sms.clearApiKey) cur[keyField] = '';
      if (b.sms.sender !== undefined) cur.sender = str(b.sms.sender, 30);
      if (b.sms.otpTemplate !== undefined) cur[api ? 'apiirOtpTemplate' : 'otpTemplate'] = str(b.sms.otpTemplate, 60);
      if (b.sms.enabled !== undefined) cur.enabled = !!b.sms.enabled;
    }
    if (b.checkout) s.settings.checkout = { requireLogin: !!b.checkout.requireLogin };
    if (b.alerts) {
      const a = b.alerts, num = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);
      s.settings.alerts = { phones: [...new Set((Array.isArray(a.phones) ? a.phones : String(a.phones || '').split(/[\s,،]+/)).map(sms.normPhone).filter(Boolean))].slice(0, 10), newOrder: !!a.newOrder, lowStock: !!a.lowStock, highValue: !!a.highValue,
        lowStockThreshold: num(a.lowStockThreshold, 3), highValueThreshold: num(a.highValueThreshold, 20000000), bigQty: num(a.bigQty, 10) };
    }
    if (b.automation) s.settings.automation = { abandonedHours: Math.max(1, Number(b.automation.abandonedHours) || 3), reviewDays: Math.max(1, Number(b.automation.reviewDays) || 3) };
    if (b.publicUrl !== undefined) s.settings.publicUrl = str(b.publicUrl, 200).replace(/\/$/, '');
    if (b.storeName !== undefined) s.settings.storeName = str(b.storeName, 60);
    if (b.promoFooter !== undefined) s.settings.promoFooter = str(b.promoFooter, 100);
    db.save(); res.json(settingsView());
  });
  admin.post('/settings/sms/test', A.can('settings.manage'), async (req, res) => {
    const phone = sms.normPhone(req.body.phone); if (!phone) return res.status(400).json({ error: 'invalid_phone' });
    const e = await sms.send(phone, sms.render('پیام آزمایشی از {store}', { store: sms.storeName() }), { type: 'test', by: req.user.id });
    res.json({ ok: e.status !== 'failed', status: e.status, error: e.error });
  });
};
