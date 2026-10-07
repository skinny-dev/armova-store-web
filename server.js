const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');

const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const UPLOADS = path.join(__dirname, 'uploads');
const SECRET_FILE = path.join(__dirname, 'data', '.secret');
fs.mkdirSync(UPLOADS, { recursive: true });
let SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  try { SECRET = fs.readFileSync(SECRET_FILE, 'utf8'); }
  catch { SECRET = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(SECRET_FILE, SECRET); }
}
if (!process.env.ADMIN_PASSWORD) console.warn('! Using default admin password "admin123" — set ADMIN_PASSWORD.');

if (process.env.AUTO_SEED !== '0' && !db.get().categories.length && !db.get().products.length) require('./scripts/seed.js'); // demo data on first run

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---------- auth ----------
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
const safeEq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
function makeToken() { const exp = String(Date.now() + 12 * 3600e3); return exp + '.' + sign(exp); }
function validToken(t) {
  if (!t || typeof t !== 'string') return false;
  const [exp, sig] = t.split('.');
  return !!sig && Number(exp) > Date.now() && safeEq(sig, sign(exp));
}
const requireAdmin = (req, res, next) => validToken(req.cookies.armova_admin) ? next() : res.status(401).json({ error: 'unauthorized' });
const attempts = new Map();

app.post('/api/admin/login', (req, res) => {
  const ip = req.ip, a = attempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
  if (a.n >= 8) return res.status(429).json({ error: 'too_many' });
  const ok = typeof req.body.password === 'string' && safeEq(sign(req.body.password), sign(ADMIN_PASSWORD));
  if (!ok) { a.n++; attempts.set(ip, a); return res.status(401).json({ error: 'bad_password' }); }
  attempts.delete(ip);
  res.cookie('armova_admin', makeToken(), { httpOnly: true, sameSite: 'strict', maxAge: 12 * 3600e3 });
  res.json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => { res.clearCookie('armova_admin'); res.json({ ok: true }); });
app.get('/api/admin/me', requireAdmin, (req, res) => res.json({ ok: true }));

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
  group: p.group || '', color: p.color || null, sku: p.sku || '', properties: p.properties || [] });

// ---------- public API ----------
app.get('/api/store', (req, res) => {
  const s = db.get();
  res.json({ categories: [...s.categories].sort((a, b) => a.order - b.order),
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
app.post('/api/orders', (req, res) => {
  const s = db.get(), b = req.body || {};
  const customer = { name: str(b.name, 100), phone: str(b.phone, 30), address: str(b.address, 500), note: str(b.note, 500) };
  if (!customer.name || !/^[\d+\-\s()۰-۹]{7,20}$/.test(customer.phone) || !customer.address) return res.status(400).json({ error: 'invalid_customer' });
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50) return res.status(400).json({ error: 'empty_cart' });
  const items = [];
  for (const it of b.items) {
    const p = s.products.find((x) => x.id === Number(it.productId) && x.active);
    const size = p && p.sizes.find((z) => z.name === it.size);
    const qty = Math.floor(Number(it.qty));
    if (!p || !size || !(qty > 0) || qty > size.stock) return res.status(409).json({ error: 'unavailable', productId: it.productId });
    items.push({ productId: p.id, name: p.name, size: size.name, qty, price: p.price, image: (p.images[0] || {}).file || '' });
  }
  for (const it of items) { const p = s.products.find((x) => x.id === it.productId); p.sizes.find((z) => z.name === it.size).stock -= it.qty; }
  const total = items.reduce((a, i) => a + i.price * i.qty, 0);
  const order = { id: db.nextId(), items, customer, total, status: 'new', createdAt: Date.now() };
  s.orders.push(order); db.bump('orders'); db.bump('revenue', total); db.save();
  res.json({ ok: true, orderId: order.id });
});

// ---------- admin API: categories ----------
const admin = express.Router();
admin.use(requireAdmin);

admin.get('/categories', (req, res) => {
  const s = db.get();
  res.json(s.categories.sort((a, b) => a.order - b.order).map((c) => ({ ...c, count: s.products.filter((p) => p.categoryId === c.id).length })));
});
function applyCategory(c, b) {
  c.name = bi(b.name, 80); c.order = Number(b.order) || 0;
  if (!c.name.fa && !c.name.en) return false;
  c.name.fa ||= c.name.en; c.name.en ||= c.name.fa; return true;
}
admin.post('/categories', (req, res) => {
  const s = db.get(), c = { id: db.nextId() };
  if (!applyCategory(c, req.body)) return res.status(400).json({ error: 'name_required' });
  c.slug = uniqueSlug(s.categories, c.name.en);
  s.categories.push(c); db.save(); res.json(c);
});
admin.put('/categories/:id', (req, res) => {
  const s = db.get(), c = s.categories.find((x) => x.id === Number(req.params.id));
  if (!c) return res.status(404).end();
  if (!applyCategory(c, req.body)) return res.status(400).json({ error: 'name_required' });
  db.save(); res.json(c);
});
admin.delete('/categories/:id', (req, res) => {
  const s = db.get(), id = Number(req.params.id);
  if (s.products.some((p) => p.categoryId === id)) return res.status(409).json({ error: 'category_in_use' });
  s.categories = s.categories.filter((c) => c.id !== id); db.save(); res.json({ ok: true });
});

// ---------- admin API: products ----------
admin.get('/products', (req, res) => res.json([...db.get().products].sort((a, b) => b.createdAt - a.createdAt)));
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
admin.post('/products', (req, res) => {
  const s = db.get(), p = { id: db.nextId(), createdAt: Date.now(), views: 0 };
  const err = applyProduct(p, req.body); if (err) return res.status(400).json({ error: err });
  p.slug = uniqueSlug(s.products, p.name.en); s.products.push(p); db.save(); res.json(p);
});
admin.put('/products/:id', (req, res) => {
  const p = db.get().products.find((x) => x.id === Number(req.params.id));
  if (!p) return res.status(404).end();
  const err = applyProduct(p, req.body); if (err) return res.status(400).json({ error: err });
  db.save(); res.json(p);
});
// Bulk edit: { ids, active?, price?, categoryId?, stock?, delete? } — only provided fields are applied.
admin.post('/products/bulk', (req, res) => {
  const s = db.get(), b = req.body || {};
  const ids = new Set((Array.isArray(b.ids) ? b.ids : []).map(Number));
  const has = (k) => b[k] !== undefined && b[k] !== null && b[k] !== '';
  if (has('price') && !(Math.round(Number(b.price)) >= 0)) return res.status(400).json({ error: 'bad_price' });
  if (has('categoryId') && !s.categories.some((c) => c.id === Number(b.categoryId))) return res.status(400).json({ error: 'bad_category' });
  if (has('stock') && !(Math.floor(Number(b.stock)) >= 0)) return res.status(400).json({ error: 'bad_stock' });
  let n = 0;
  if (b.delete === true) { const before = s.products.length; s.products = s.products.filter((p) => !ids.has(p.id)); n = before - s.products.length; }
  else for (const p of s.products) {
    if (!ids.has(p.id)) continue; n++;
    if (has('active')) p.active = b.active === true || b.active === 'true' || b.active === 1 || b.active === '1';
    if (has('price')) { p.price = Math.round(Number(b.price)); if (p.comparePrice <= p.price) p.comparePrice = 0; }
    if (has('categoryId')) p.categoryId = Number(b.categoryId);
    if (has('stock')) p.sizes.forEach((z) => (z.stock = Math.floor(Number(b.stock))));
  }
  db.save(); res.json({ ok: true, updated: n });
});
admin.delete('/products/:id', (req, res) => {
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
admin.get('/files', (req, res) => {
  const s = db.get(), usage = {};
  s.products.forEach((p) => p.images.forEach((i) => (usage[i.file] ||= []).push({ id: p.id, name: p.name })));
  const files = fs.readdirSync(UPLOADS).filter((f) => !f.startsWith('.')).map((name) => {
    const st = fs.statSync(path.join(UPLOADS, name));
    return { name, size: st.size, mtime: st.mtimeMs, url: '/uploads/' + encodeURIComponent(name), usedBy: usage[name] || [] };
  }).sort((a, b) => b.mtime - a.mtime);
  res.json({ files, totalSize: files.reduce((a, f) => a + f.size, 0) });
});
admin.post('/files', upload.array('files', 20), (req, res) => res.json({ uploaded: (req.files || []).map((f) => f.filename) }));
admin.delete('/files/:name', (req, res) => {
  const name = req.params.name;
  if (!SAFE_NAME.test(name) || name.startsWith('.')) return res.status(400).end();
  if (db.get().products.some((p) => p.images.some((i) => i.file === name))) return res.status(409).json({ error: 'file_in_use' });
  try { fs.unlinkSync(path.join(UPLOADS, name)); } catch { return res.status(404).end(); }
  res.json({ ok: true });
});

// ---------- admin API: orders & stats ----------
admin.get('/orders', (req, res) => res.json([...db.get().orders].sort((a, b) => b.createdAt - a.createdAt)));
admin.put('/orders/:id', (req, res) => {
  const o = db.get().orders.find((x) => x.id === Number(req.params.id));
  if (!o || !['new', 'processing', 'shipped', 'delivered', 'cancelled'].includes(req.body.status)) return res.status(400).end();
  if (req.body.status === 'cancelled' && o.status !== 'cancelled') // restock
    o.items.forEach((it) => { const p = db.get().products.find((x) => x.id === it.productId); const z = p && p.sizes.find((q) => q.name === it.size); if (z) z.stock += it.qty; });
  o.status = req.body.status; db.save(); res.json(o);
});
admin.get('/stats', (req, res) => {
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

app.listen(PORT, () => console.log(`Armova running on http://localhost:${PORT}  (admin: /admin)`));
