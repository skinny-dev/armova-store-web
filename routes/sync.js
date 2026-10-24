// Catalog sync: push categories + products (+ their photos) from one instance (e.g. your computer) to another (e.g. the live site).
// Enabled only when the env var SYNC_TOKEN is set (>= 24 chars). Authenticated with `Authorization: Bearer <SYNC_TOKEN>`.
// It only upserts categories and products by slug; it never touches orders, customers, users, discounts or settings.
const fs = require('fs');
const path = require('path');
const db = require('../lib/db');
const A = require('../lib/auth');

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bi = (v, max) => ({ fa: str(v && v.fa, max), en: str(v && v.en, max) });
const slugOk = (s) => typeof s === 'string' && /^[a-z0-9؀-ۿ]+(?:-[a-z0-9؀-ۿ]+)*$/i.test(s) && s.length <= 120;
const FILE_OK = /^[\w.-]{1,120}\.(webp|jpe?g|png|gif|avif)$/i;
const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : '');
const fails = new Map();

// minimal magic-byte check so only real images are written to disk
function looksLikeImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  const h = buf.subarray(0, 12);
  return (h[0] === 0xff && h[1] === 0xd8) || (h.toString('latin1', 0, 4) === '\x89PNG') || h.toString('latin1', 0, 3) === 'GIF'
    || (h.toString('latin1', 0, 4) === 'RIFF' && h.toString('latin1', 8, 12) === 'WEBP') || h.toString('latin1', 4, 8) === 'ftyp';
}

module.exports = function (app, express, UPLOADS) {
  const token = process.env.SYNC_TOKEN || '';
  if (token.length < 24) return; // disabled: the routes do not even exist
  console.log('Catalog sync is ENABLED (SYNC_TOKEN is set).');
  const r = express.Router();

  r.use((req, res, next) => {
    const k = req.ip, now = Date.now(), f = (fails.get(k) || []).filter((t) => now - t < 600e3);
    if (f.length >= 20) return res.status(429).json({ error: 'too_many' });
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m || !A.safeEq(m[1], token)) { f.push(now); fails.set(k, f); return res.status(401).json({ error: 'unauthorized' }); }
    next();
  });

  // what the target already has
  r.get('/status', (req, res) => {
    const s = db.get();
    const files = fs.existsSync(UPLOADS) ? fs.readdirSync(UPLOADS).filter((f) => FILE_OK.test(f)).map((name) => ({ name, size: fs.statSync(path.join(UPLOADS, name)).size })) : [];
    res.json({ ok: true, categories: s.categories.length, products: s.products.length, files });
  });

  // upload one photo (raw bytes). Skips files that already exist with the same size.
  r.put('/file/:name', express.raw({ type: () => true, limit: '12mb' }), (req, res) => {
    const name = req.params.name;
    if (!FILE_OK.test(name)) return res.status(400).json({ error: 'bad_name' });
    if (!looksLikeImage(req.body)) return res.status(400).json({ error: 'not_an_image' });
    fs.mkdirSync(UPLOADS, { recursive: true });
    const dest = path.join(UPLOADS, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size === req.body.length) return res.json({ ok: true, skipped: true });
    fs.writeFileSync(dest, req.body); res.json({ ok: true, written: true });
  });

  // upsert categories (by slug, parents first) and products (by slug)
  r.post('/catalog', express.json({ limit: '10mb' }), (req, res) => {
    const s = db.get(), b = req.body || {}, dry = req.query.dry === '1', keepStock = req.query.stock !== '1', keepActive = req.query.active !== '1';
    const cats = Array.isArray(b.categories) ? b.categories : [], prods = Array.isArray(b.products) ? b.products : [];
    if (cats.length > 500 || prods.length > 5000) return res.status(400).json({ error: 'too_large' });
    const seq0 = s.seq, snapshot = JSON.stringify([s.categories, s.products]), report = { categories: { created: 0, updated: 0 }, products: { created: 0, updated: 0, unchanged: 0 }, missingImages: [], skipped: [] };
    const files = new Set(fs.existsSync(UPLOADS) ? fs.readdirSync(UPLOADS) : []);
    const bySlug = (list, slug) => list.find((x) => x.slug === slug);

    // order categories so parents come before children
    const pending = cats.filter((c) => slugOk(c.slug)), ordered = [], placed = new Set(), exists = (sl) => !!sl && (placed.has(sl) || !!bySlug(s.categories, sl));
    for (let guard = 0; pending.length && guard < 10; guard++) {
      for (let i = pending.length - 1; i >= 0; i--) { const c = pending[i]; if (!c.parentSlug || exists(c.parentSlug)) { ordered.push(c); placed.add(c.slug); pending.splice(i, 1); } }
    }
    pending.forEach((c) => report.skipped.push('category ' + c.slug + ' (parent missing)'));
    for (const c of ordered) {
      const name = bi(c.name, 80); if (!name.fa && !name.en) { report.skipped.push('category ' + c.slug + ' (no name)'); continue; }
      name.fa ||= name.en; name.en ||= name.fa;
      const parent = c.parentSlug ? bySlug(s.categories, c.parentSlug) : null;
      let cur = bySlug(s.categories, c.slug);
      if (!cur) { cur = { id: db.nextId(), slug: c.slug }; s.categories.push(cur); report.categories.created++; }
      else if (JSON.stringify([cur.name, cur.parentId || null, cur.order]) !== JSON.stringify([name, parent ? parent.id : null, Number(c.order) || 0])) report.categories.updated++;
      Object.assign(cur, { name, parentId: parent ? parent.id : null, order: Number(c.order) || 0 });
    }

    for (const p of prods) {
      if (!slugOk(p.slug)) { report.skipped.push('product ' + p.slug + ' (bad slug)'); continue; }
      const name = bi(p.name, 120); if (!name.fa && !name.en) { report.skipped.push('product ' + p.slug + ' (no name)'); continue; }
      name.fa ||= name.en; name.en ||= name.fa;
      const cat = bySlug(s.categories, p.categorySlug); if (!cat) { report.skipped.push('product ' + p.slug + ' (category ' + p.categorySlug + ' missing)'); continue; }
      const price = Math.max(0, Math.round(Number(p.price)) || 0);
      const images = (Array.isArray(p.images) ? p.images : []).filter((i) => i && FILE_OK.test(i.file || '')).map((i) => ({ file: i.file, kind: i.kind === 'model' ? 'model' : 'product' }))
        .filter((i) => { const ok = files.has(i.file) || dry; if (!ok) report.missingImages.push(i.file); return ok; });
      const sizesIn = (Array.isArray(p.sizes) ? p.sizes : []).map((z) => ({ name: str(z.name, 20), stock: Math.max(0, Math.floor(Number(z.stock)) || 0) })).filter((z) => z.name);
      const color = p.color && (str(p.color.fa, 40) || str(p.color.en, 40)) ? { ...bi(p.color, 40), hex: hex(p.color.hex) } : null;
      const properties = (Array.isArray(p.properties) ? p.properties : []).slice(0, 20).map((x) => ({ label: bi(x && x.label, 60), value: bi(x && x.value, 200) })).filter((x) => (x.label.fa || x.label.en) && (x.value.fa || x.value.en));
      const fields = { name, description: bi(p.description, 4000), details: bi(p.details, 4000), categoryId: cat.id, price, comparePrice: Number(p.comparePrice) > price ? Math.round(Number(p.comparePrice)) : 0, images,
        group: str(p.group, 60).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''), sku: str(p.sku, 40), color, properties };
      let cur = bySlug(s.products, p.slug);
      if (!cur) {
        s.products.push({ id: db.nextId(), slug: p.slug, createdAt: Number(p.createdAt) || Date.now(), views: 0, active: p.active !== false, sizes: sizesIn, ...fields }); report.products.created++; continue;
      }
      const before = JSON.stringify(cur);
      // existing product: refresh catalog fields; keep the live stock / visibility unless asked otherwise
      const sizes = keepStock ? [...cur.sizes, ...sizesIn.filter((z) => !cur.sizes.some((q) => q.name === z.name)).map((z) => ({ ...z }))] : sizesIn;
      Object.assign(cur, fields, { sizes, ...(keepActive ? {} : { active: p.active !== false }) });
      JSON.stringify(cur) === before ? report.products.unchanged++ : report.products.updated++;
    }
    if (dry) { s.categories = JSON.parse(snapshot)[0]; s.products = JSON.parse(snapshot)[1]; s.seq = seq0; return res.json({ ok: true, dry: true, ...report }); }
    db.save(); res.json({ ok: true, ...report });
  });

  // remove products (and categories that end up empty) by explicit slug, e.g. leftover demo data. Never removes anything not named.
  r.post('/remove', express.json({ limit: '100kb' }), (req, res) => {
    const s = db.get(), b = req.body || {}, dry = req.query.dry === '1';
    const ps = new Set((Array.isArray(b.products) ? b.products : []).filter(slugOk)), cs = new Set((Array.isArray(b.categories) ? b.categories : []).filter(slugOk));
    const gone = s.products.filter((p) => ps.has(p.slug)), goneIds = new Set(gone.map((p) => p.id));
    const left = s.products.filter((p) => !goneIds.has(p.id));
    const cats = s.categories.filter((c) => cs.has(c.slug) && !left.some((p) => p.categoryId === c.id) && !s.categories.some((k) => k.parentId === c.id && !cs.has(k.slug)));
    const kept = [...cs].filter((sl) => !cats.some((c) => c.slug === sl) && s.categories.some((c) => c.slug === sl));
    if (!dry) { s.products = left; s.categories = s.categories.filter((c) => !cats.includes(c)); db.save(); }
    res.json({ ok: true, dry, products: gone.map((p) => p.slug), categories: cats.map((c) => c.slug), categoriesKept: kept });
  });

  app.use('/api/sync', r);
};
