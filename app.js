const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');

// PORT env wins; inside Kubernetes (Runflare) default to 80, which is the port the platform exposes; locally 4000.
const PORT = process.env.PORT || (process.env.KUBERNETES_SERVICE_HOST ? 80 : 4000);
const UPLOADS = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
const A = require('./lib/auth');
A.ensure();
const sms = require('./lib/sms');
const pricing = require('./lib/pricing');
const ordersLib = require('./lib/orders');
sms.syncCustomersFromOrders();

if (process.env.AUTO_SEED !== '0' && !db.get().categories.length && !db.get().products.length) require('./scripts/seed.js').main(); // demo data on first run

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---------- admin router (auth lives in routes/staff.js) ----------
const admin = express.Router();
admin.use(A.requireAuth);
require('./routes/staff')(app, admin);

// ---------- helpers ----------
const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bi = (v, max) => ({ fa: str(v && v.fa, max), en: str(v && v.en, max) });
const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-+|-+$/g, '');
function uniqueSlug(list, base, selfId) {
  let s = slugify(base) || 'item', n = 1, out = s;
  while (list.some((x) => x.slug === out && x.id !== selfId)) out = `${s}-${++n}`;
  return out;
}
const pub = (p) => ({ id: p.id, slug: p.slug, name: p.name, description: p.description, details: p.details, categoryId: p.categoryId,
  price: p.price, comparePrice: p.comparePrice, sizes: p.sizes, images: p.images, createdAt: p.createdAt,
  group: p.group || '', color: p.color || null, sku: p.sku || '', properties: p.properties || [], sale: pricing.sale(p) });

// ---------- public API ----------
app.get('/api/store', (req, res) => {
  const s = db.get();
  res.json({ categories: [...s.categories].sort((a, b) => a.order - b.order).map((c) => ({ id: c.id, slug: c.slug, name: c.name, order: c.order, parentId: c.parentId || null })),
    products: s.products.filter((p) => p.active).sort((a, b) => b.createdAt - a.createdAt).map(pub) });
});
app.post('/api/track', (req, res) => {
  const t = req.body.type, s = db.get();
  if (t === 'view') db.bump('views');
  else if (t === 'product') {
    const p = s.products.find((x) => x.id === Number(req.body.productId));
    if (p) { p.views = (p.views || 0) + 1; db.bump('productViews'); }
  } else if (t === 'cart') db.bump('addToCart');
  else return res.status(400).end();
  db.save(); res.json({ ok: true });
});
require('./routes/shop')(app);

// ---------- admin API: categories ----------

admin.get('/categories', (req, res) => {
  const s = db.get();
  res.json(s.categories.sort((a, b) => a.order - b.order).map((c) => ({ ...c, parentId: c.parentId || null, count: s.products.filter((p) => p.categoryId === c.id).length,
    total: s.products.filter((p) => pricing.descendants(c.id).has(p.categoryId)).length, children: s.categories.filter((x) => x.parentId === c.id).length })));
});
function applyCategory(c, b) {
  const s = db.get();
  c.name = bi(b.name, 80);
  if (!c.name.fa && !c.name.en) return 'name_required';
  c.name.fa ||= c.name.en; c.name.en ||= c.name.fa;
  if (b.parentId !== undefined) {
    const pid = b.parentId === null || b.parentId === '' || Number(b.parentId) === 0 ? null : Number(b.parentId);
    if (pid !== null) {
      if (!s.categories.some((x) => x.id === pid)) return 'bad_parent';
      if (c.id && pricing.descendants(c.id).has(pid)) return 'parent_cycle'; // cannot move a category under itself or its own children
      if (pricing.categoryPath(pid).length >= 4) return 'too_deep';
    }
    c.parentId = pid;
  } else if (c.parentId === undefined) c.parentId = null;
  if (b.order !== undefined) c.order = Number(b.order) || 0;
  else if (c.order === undefined) c.order = s.categories.filter((x) => (x.parentId || null) === c.parentId).length;
  return null;
}
admin.post('/categories', A.can('categories.manage'), (req, res) => {
  const s = db.get(), c = { id: db.nextId() };
  const err = applyCategory(c, req.body); if (err) return res.status(400).json({ error: err });
  c.slug = uniqueSlug(s.categories, c.name.en);
  s.categories.push(c); db.save(); res.json(c);
});
admin.put('/categories/:id', A.can('categories.manage'), (req, res) => {
  const s = db.get(), c = s.categories.find((x) => x.id === Number(req.params.id));
  if (!c) return res.status(404).end();
  const err = applyCategory(c, req.body); if (err) return res.status(400).json({ error: err });
  db.save(); res.json(c);
});
// Move up/down among siblings
admin.post('/categories/:id/move', A.can('categories.manage'), (req, res) => {
  const s = db.get(), c = s.categories.find((x) => x.id === Number(req.params.id));
  if (!c) return res.status(404).end();
  const sib = s.categories.filter((x) => (x.parentId || null) === (c.parentId || null)).sort((a, b) => a.order - b.order || a.id - b.id);
  const i = sib.indexOf(c), j = req.body.direction === 'up' ? i - 1 : i + 1;
  if (sib[j]) { sib.splice(j, 0, sib.splice(i, 1)[0]); }
  sib.forEach((x, k) => (x.order = k)); db.save(); res.json({ ok: true });
});
// Drag & drop: put a category under `parentId` (null = top level) right before `beforeId` (null = at the end).
admin.post('/categories/:id/place', A.can('categories.manage'), (req, res) => {
  const s = db.get(), c = s.categories.find((x) => x.id === Number(req.params.id)), b = req.body || {};
  if (!c) return res.status(404).end();
  const parentId = b.parentId ? Number(b.parentId) : null, beforeId = b.beforeId ? Number(b.beforeId) : null;
  if (parentId !== null) {
    if (!s.categories.some((x) => x.id === parentId)) return res.status(400).json({ error: 'bad_parent' });
    if (pricing.descendants(c.id).has(parentId)) return res.status(400).json({ error: 'parent_cycle' });
    const height = (id) => 1 + Math.max(0, ...s.categories.filter((x) => x.parentId === id).map((x) => height(x.id)));
    if (pricing.categoryPath(parentId).length + height(c.id) > 4) return res.status(400).json({ error: 'too_deep' });
  }
  c.parentId = parentId;
  const sib = s.categories.filter((x) => (x.parentId || null) === parentId && x.id !== c.id).sort((x, y) => x.order - y.order || x.id - y.id);
  let i = beforeId ? sib.findIndex((x) => x.id === beforeId) : -1; if (i < 0) i = sib.length;
  sib.splice(i, 0, c); sib.forEach((x, k) => (x.order = k));
  db.save(); res.json({ ok: true });
});
admin.delete('/categories/:id', A.can('categories.manage'), (req, res) => {
  const s = db.get(), id = Number(req.params.id);
  if (s.categories.some((c) => c.parentId === id)) return res.status(409).json({ error: 'category_has_children' });
  if (s.products.some((p) => p.categoryId === id)) return res.status(409).json({ error: 'category_in_use' });
  s.categories = s.categories.filter((c) => c.id !== id);
  s.discounts.forEach((d) => { if (d.scope && d.scope.categoryIds) d.scope.categoryIds = d.scope.categoryIds.filter((x) => x !== id); });
  db.save(); res.json({ ok: true });
});

// ---------- admin API: products ----------
admin.get('/products', A.can('products.view'), (req, res) => res.json([...db.get().products].sort((a, b) => b.createdAt - a.createdAt)));
function applyProduct(p, b) {
  const s = db.get();
  const name = bi(b.name, 120);
  if (!name.fa && !name.en) return 'name_required';
  name.fa ||= name.en; name.en ||= name.fa;
  const price = Math.round(Number(b.price));
  if (!(price >= 0)) return 'bad_price';
  const categoryId = Number(b.categoryId);
  if (!s.categories.some((c) => c.id === categoryId)) return 'bad_category';
  const sizes = (Array.isArray(b.sizes) ? b.sizes : []).map((z) => ({ name: str(z.name, 20), stock: Math.max(0, Math.floor(Number(z.stock)) || 0) })).filter((z) => z.name);
  const files = new Set(fs.readdirSync(UPLOADS));
  const images = (Array.isArray(b.images) ? b.images : []).filter((i) => i && files.has(i.file))
    .map((i) => ({ file: i.file, kind: i.kind === 'model' ? 'model' : 'product' }));
  const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : '');
  const color = b.color && (str(b.color.fa, 40) || str(b.color.en, 40)) ? { ...bi(b.color, 40), hex: hex(b.color.hex) } : null;
  const properties = (Array.isArray(b.properties) ? b.properties : []).slice(0, 20)
    .map((r) => ({ label: bi(r && r.label, 60), value: bi(r && r.value, 200) })).filter((r) => (r.label.fa || r.label.en) && (r.value.fa || r.value.en));
  Object.assign(p, { group: str(b.group, 60).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''), sku: str(b.sku, 40), color, properties,
    name, description: bi(b.description, 4000), details: bi(b.details, 4000), categoryId, price,
    comparePrice: Number(b.comparePrice) > price ? Math.round(Number(b.comparePrice)) : 0, sizes, images, active: b.active !== false });
  return null;
}
admin.post('/products', A.can('products.edit'), (req, res) => {
  const s = db.get(), p = { id: db.nextId(), createdAt: Date.now(), views: 0 };
  const err = applyProduct(p, req.body); if (err) return res.status(400).json({ error: err });
  p.slug = uniqueSlug(s.products, p.name.en); s.products.push(p); db.save(); res.json(p);
});
admin.put('/products/:id', A.can('products.edit'), (req, res) => {
  const p = db.get().products.find((x) => x.id === Number(req.params.id));
  if (!p) return res.status(404).end();
  const err = applyProduct(p, req.body); if (err) return res.status(400).json({ error: err });
  db.save(); ordersLib.checkBackInStock(); ordersLib.clearLowStockFlags(); res.json(p);
});
// Bulk edit: { ids, active?, price?, categoryId?, stock?, delete? } — only provided fields are applied.
admin.post('/products/bulk', A.can('products.bulk', 'products.edit'), (req, res) => {
  const s = db.get(), b = req.body || {};
  const ids = new Set((Array.isArray(b.ids) ? b.ids : []).map(Number));
  const has = (k) => b[k] !== undefined && b[k] !== null && b[k] !== '';
  if (has('price') && !(Math.round(Number(b.price)) >= 0)) return res.status(400).json({ error: 'bad_price' });
  if (has('categoryId') && !s.categories.some((c) => c.id === Number(b.categoryId))) return res.status(400).json({ error: 'bad_category' });
  if (has('stock') && !(Math.floor(Number(b.stock)) >= 0)) return res.status(400).json({ error: 'bad_stock' });
  if (has('priceAdjustPct') && !(Number(b.priceAdjustPct) > -100 && Number(b.priceAdjustPct) < 1000)) return res.status(400).json({ error: 'bad_price' });
  if (has('stockAdd') && !Number.isFinite(Number(b.stockAdd))) return res.status(400).json({ error: 'bad_stock' });
  if (b.delete === true && !A.has(req.perms, 'products.delete')) return res.status(403).json({ error: 'forbidden' });
  if (b.delete !== true && !A.has(req.perms, 'products.bulk') && !A.has(req.perms, 'products.edit')) return res.status(403).json({ error: 'forbidden' });
  let n = 0;
  if (b.delete === true) { const before = s.products.length; s.products = s.products.filter((p) => !ids.has(p.id)); n = before - s.products.length; }
  else for (const p of s.products) {
    if (!ids.has(p.id)) continue; n++;
    if (has('active')) p.active = b.active === true || b.active === 'true' || b.active === 1 || b.active === '1';
    if (has('price')) { p.price = Math.round(Number(b.price)); if (p.comparePrice <= p.price) p.comparePrice = 0; }
    if (has('categoryId')) p.categoryId = Number(b.categoryId);
    if (has('stock')) p.sizes.forEach((z) => (z.stock = Math.floor(Number(b.stock))));
    if (has('stockAdd')) p.sizes.forEach((z) => (z.stock = Math.max(0, z.stock + Math.floor(Number(b.stockAdd)))));
    if (has('priceAdjustPct')) { // e.g. -10 lowers by 10%, 15 raises by 15%; roundTo snaps to a multiple (e.g. 1000)
      const r = Math.max(1, Math.floor(Number(b.roundTo)) || 1); p.price = Math.max(0, Math.round(p.price * (100 + Number(b.priceAdjustPct)) / 100 / r) * r);
      if (p.comparePrice <= p.price) p.comparePrice = 0;
    }
    if (has('comparePrice')) p.comparePrice = Number(b.comparePrice) > p.price ? Math.round(Number(b.comparePrice)) : 0;
    if (Array.isArray(b.addSizes)) b.addSizes.map((x) => str(x, 20)).filter(Boolean).forEach((nm) => { if (!p.sizes.some((z) => z.name === nm)) p.sizes.push({ name: nm, stock: 0 }); });
    if (has('slugRefresh')) p.slug = uniqueSlug(s.products, p.name.en, p.id);
  }
  db.save(); ordersLib.checkBackInStock(); ordersLib.clearLowStockFlags(); res.json({ ok: true, updated: n });
});
admin.delete('/products/:id', A.can('products.delete'), (req, res) => {
  const s = db.get(); s.products = s.products.filter((p) => p.id !== Number(req.params.id)); db.save(); res.json({ ok: true });
});

// ---------- admin API: file system ----------
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (req, file, cb) => {
      const base = slugify(path.parse(file.originalname).name).slice(0, 40) || 'file';
      cb(null, `${base}-${crypto.randomBytes(3).toString('hex')}${ALLOWED[file.mimetype]}`);
    },
  }),
  fileFilter: (req, file, cb) => cb(null, !!ALLOWED[file.mimetype]),
});
const SAFE_NAME = /^[\w؀-ۿ.-]+$/;
admin.get('/files', A.can('files.manage', 'products.edit'), (req, res) => {
  const s = db.get(), usage = {};
  s.products.forEach((p) => p.images.forEach((i) => (usage[i.file] ||= []).push({ id: p.id, name: p.name })));
  const files = fs.readdirSync(UPLOADS).filter((f) => !f.startsWith('.')).map((name) => {
    const st = fs.statSync(path.join(UPLOADS, name));
    return { name, size: st.size, mtime: st.mtimeMs, url: '/uploads/' + encodeURIComponent(name), usedBy: usage[name] || [] };
  }).sort((a, b) => b.mtime - a.mtime);
  res.json({ files, totalSize: files.reduce((a, f) => a + f.size, 0) });
});
admin.post('/files', A.can('files.manage', 'products.edit'), upload.array('files', 20), (req, res) => res.json({ uploaded: (req.files || []).map((f) => f.filename) }));
admin.delete('/files/:name', A.can('files.manage'), (req, res) => {
  const name = req.params.name;
  if (!SAFE_NAME.test(name) || name.startsWith('.')) return res.status(400).end();
  if (db.get().products.some((p) => p.images.some((i) => i.file === name))) return res.status(409).json({ error: 'file_in_use' });
  try { fs.unlinkSync(path.join(UPLOADS, name)); } catch { return res.status(404).end(); }
  res.json({ ok: true });
});

// ---------- admin API: orders & stats ----------
admin.get('/orders', A.can('orders.view'), (req, res) => res.json([...db.get().orders].sort((a, b) => b.createdAt - a.createdAt)));
admin.put('/orders/:id', A.can('orders.manage'), (req, res) => {
  const o = db.get().orders.find((x) => x.id === Number(req.params.id)), b = req.body || {};
  if (!o) return res.status(404).end();
  let err = null;
  if (b.status !== undefined) err = ordersLib.setStatus(o, b.status, { by: req.user.id, tracking: b.trackingCode });
  else if (b.trackingCode !== undefined) ordersLib.setTracking(o, b.trackingCode);
  if (!err && b.paymentStatus !== undefined) err = ordersLib.setPayment(o, b.paymentStatus, req.user.id);
  if (b.adminNote !== undefined) { o.adminNote = str(b.adminNote, 1000); db.save(); }
  if (err) return res.status(err === 'order_cancelled' ? 409 : 400).json({ error: err });
  res.json(o);
});
admin.post('/orders/:id/delay', A.can('orders.manage'), (req, res) => {
  const o = db.get().orders.find((x) => x.id === Number(req.params.id)); if (!o) return res.status(404).end();
  ordersLib.notify(o, 'shipping_delayed'); o.history = (o.history || []).concat([{ note: 'delay_notified', at: Date.now(), by: req.user.id }]); db.save(); res.json({ ok: true });
});
admin.get('/stats', A.can('stats.view'), (req, res) => {
  const s = db.get(), days = [];
  for (let i = 13; i >= 0; i--) {
    const k = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    days.push({ date: k, ...({ views: 0, productViews: 0, addToCart: 0, orders: 0, revenue: 0 }), ...(s.daily[k] || {}) });
  }
  const live = s.orders.filter((o) => o.status !== 'cancelled');
  res.json({
    totals: { products: s.products.length, categories: s.categories.length, orders: s.orders.length, newOrders: s.orders.filter((o) => o.status === 'new').length,
      revenue: live.reduce((a, o) => a + o.total, 0), views: Object.values(s.daily).reduce((a, d) => a + (d.views || 0), 0),
      lowStock: s.products.filter((p) => p.sizes.some((z) => z.stock > 0 && z.stock <= 3)).length,
      outOfStock: s.products.filter((p) => p.sizes.length && p.sizes.every((z) => z.stock === 0)).length },
    days,
    topProducts: [...s.products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map((p) => ({ id: p.id, name: p.name, views: p.views || 0 })),
    byCategory: s.categories.map((c) => ({ name: c.name, count: s.products.filter((p) => p.categoryId === c.id).length })),
  });
});
require('./routes/crm')(admin);
require('./routes/discounts')(admin);
app.use('/api/admin', admin);
app.use((err, req, res, next) => { console.error(err); res.status(err.status || 500).json({ error: err.code || 'server_error' }); });

// ---------- static ----------
// On-demand cached WebP thumbnails: /uploads/t/<file>?w=480|720 (default 720). Falls back to the original.
let sharp = null; try { sharp = require('sharp'); } catch {}
const THUMBS = path.join(__dirname, 'data', 'thumbs');
app.get('/uploads/t/:file', async (req, res, next) => {
  const f = path.basename(req.params.file), src = path.join(UPLOADS, f);
  if (!sharp || !fs.existsSync(src) || /\.(gif|svg)$/i.test(f)) return res.redirect('/uploads/' + encodeURIComponent(f));
  const w = req.query.w === '480' ? 480 : 720;
  const out = path.join(THUMBS, f.replace(/\.[^.]+$/, '') + '-' + w + '.webp');
  try {
    if (!fs.existsSync(out)) { fs.mkdirSync(THUMBS, { recursive: true }); await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 72 }).toFile(out); }
    res.set('Cache-Control', 'public, max-age=31536000, immutable'); res.sendFile(out);
  } catch { next(); }
});
// Pre-generate thumbnails in the background so the first visit is already fast.
async function warmThumbs() {
  if (!sharp) return;
  fs.mkdirSync(THUMBS, { recursive: true });
  const files = fs.readdirSync(UPLOADS).filter((f) => !/\.(gif|svg)$/i.test(f));
  for (const f of files) for (const w of [480, 720]) {
    const out = path.join(THUMBS, f.replace(/\.[^.]+$/, '') + '-' + w + '.webp');
    if (!fs.existsSync(out)) await sharp(path.join(UPLOADS, f)).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 72 }).toFile(out).catch(() => {});
  }
}
setTimeout(() => warmThumbs().catch(() => {}), 500);
app.use('/uploads', express.static(UPLOADS, { maxAge: '365d', immutable: true, setHeaders: (r) => r.set('X-Content-Type-Options', 'nosniff') }));
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.get('/api/*', (req, res) => res.status(404).json({ error: 'not_found' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

require('./lib/jobs').start();
app.listen(PORT, '0.0.0.0', () => console.log(`Armova running on port ${PORT}  (PORT env: ${process.env.PORT || 'not set'}, admin: /admin)`));
