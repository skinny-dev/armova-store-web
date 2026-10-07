// Import product photos from a folder into products.
// Usage: node scripts/import-photos.js [folder] [--clear] [--publish]
//   folder    default: public/armova-products (subfolders become categories)
//   --clear   remove existing products & categories first (e.g. the demo data)
//   --publish make products visible immediately (default: draft, since price is 0)
// Grouping: "jacket-1.jpg", "jacket_2.jpg", "jacket (3).jpg" -> one product "jacket".
// A filename containing "model" is tagged as a model shot. Set prices/names in /admin afterwards.
// If scripts/photo-map.json exists (curated mapping of camera filenames -> named products, see
// scripts/build-photo-map.js) it is used instead; pass --auto to force filename grouping.
//   --price=N   default price in Toman (e.g. --price=890000)
//   --stock=N   default stock per size (default 0), e.g. --stock=5
//   --sizes=S,M,L  default sizes (default S,M,L,XL)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const db = require('../lib/db');

const args = process.argv.slice(2), flags = args.filter((a) => a.startsWith('--'));
const root = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(__dirname, '..', 'public', 'armova-products'));
const UP = path.join(__dirname, '..', 'uploads'); fs.mkdirSync(UP, { recursive: true });
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
if (!fs.existsSync(root)) { console.error('Folder not found:', root); process.exit(1); }

const opt = (k, d) => { const a = flags.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const PRICE = Math.max(0, parseInt(opt('price', '0'), 10) || 0), STOCK = Math.max(0, parseInt(opt('stock', '0'), 10) || 0);
const SIZES = opt('sizes', 'S,M,L,XL').split(',').map((x) => x.trim()).filter(Boolean);
const MAP = path.join(__dirname, 'photo-map.json');
const s = db.get();
if (flags.includes('--clear')) { s.products = []; s.categories = []; }
const slugify = (x) => x.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
const title = (x) => x.replace(/[-_]+/g, ' ').trim();
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);

function category(name) {
  const nm = typeof name === 'string' ? { fa: name, en: name } : name;
  let c = s.categories.find((x) => x.name.en === nm.en || x.name.fa === nm.fa);
  if (!c) { c = { id: db.nextId(), slug: slugify(nm.en), name: nm, order: s.categories.length }; s.categories.push(c); }
  return c.id;
}
const groups = new Map();
for (const f of walk(root).sort()) {
  const ext = path.extname(f).toLowerCase(); if (!EXT.has(ext)) continue;
  const rel = path.relative(root, f), parts = rel.split(path.sep);
  const cat = parts.length > 1 ? parts[0] : 'Products';
  const stem = path.parse(f).name;
  const isModel = /model/i.test(stem);
  const base = stem.replace(/[-_ ]*model[-_ ]*/i, ' ').replace(/[-_ ]*\(?\d+\)?$/, '').trim() || stem;
  const key = cat + '/' + base.toLowerCase();
  if (!groups.has(key)) groups.set(key, { cat, base, files: [] });
  groups.get(key).files.push({ f, ext, isModel });
}

const useMap = fs.existsSync(MAP) && !flags.includes('--auto') && !args.find((a) => !a.startsWith('--'));
if (useMap) {
  groups.clear();
  for (const m of JSON.parse(fs.readFileSync(MAP, 'utf8'))) {
    groups.set(m.slug, { cat: m.category, base: m.slug, slug: m.slug, name: m.name, files: m.files.map((x, i) => ({ f: path.join(root, x), ext: path.extname(x).toLowerCase(), isModel: i > 0 })) });
  }
}
// Photos are resized to max 1400px wide (web JPEG, EXIF-rotated) so the store stays fast.
const WEB = (f, out) => sharp(f).rotate().resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
(async () => {
let n = 0;
for (const g of groups.values()) {
  const slug = g.slug || slugify(g.base);
  const ex = s.products.find((p) => p.slug === slug);
  if (ex) { if (flags.includes('--publish')) ex.active = true; console.log('skip (exists):', slug); continue; }
  const images = (await Promise.all(g.files.map(async ({ f, isModel }) => {
    const name = `${slug}-${crypto.randomBytes(3).toString('hex')}.jpg`;
    await WEB(f, path.join(UP, name)); return { file: name, kind: isModel ? 'model' : 'product' };
  }))).sort((a, b) => (a.kind === 'product' ? 0 : 1) - (b.kind === 'product' ? 0 : 1));
  const nm = g.name || { fa: title(g.base), en: title(g.base) };
  s.products.push({ id: db.nextId(), slug, name: nm, description: { fa: '', en: '' }, details: { fa: '', en: '' },
    categoryId: category(g.cat), price: PRICE, comparePrice: 0, sizes: SIZES.map((x) => ({ name: x, stock: STOCK })),
    images, active: flags.includes('--publish') || (PRICE > 0 && STOCK > 0), createdAt: Date.now() + n, views: 0 });
  n++; console.log(`+ ${nm.en || nm} (${g.cat.en || g.cat}) — ${images.length} image(s)`);
}
db.save();
console.log(`Imported ${n} product(s). Open /admin to set names (Farsi), prices and stock${flags.includes('--publish') ? '' : ', then switch them to Active'}.`);
})();
