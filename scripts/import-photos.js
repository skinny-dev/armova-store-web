// Import product photos from a folder into products.
// Usage: node scripts/import-photos.js [folder] [--clear] [--publish]
//   folder    default: public/armova-products (subfolders become categories)
//   --clear   remove existing products & categories first (e.g. the demo data)
//   --publish make products visible immediately (default: draft, since price is 0)
// Grouping: "jacket-1.jpg", "jacket_2.jpg", "jacket (3).jpg" -> one product "jacket".
// A filename containing "model" is tagged as a model shot. Set prices/names in /admin afterwards.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../lib/db');

const args = process.argv.slice(2), flags = args.filter((a) => a.startsWith('--'));
const root = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(__dirname, '..', 'public', 'armova-products'));
const UP = path.join(__dirname, '..', 'uploads'); fs.mkdirSync(UP, { recursive: true });
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
if (!fs.existsSync(root)) { console.error('Folder not found:', root); process.exit(1); }

const s = db.get();
if (flags.includes('--clear')) { s.products = []; s.categories = []; }
const slugify = (x) => x.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
const title = (x) => x.replace(/[-_]+/g, ' ').trim();
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);

function category(name) {
  let c = s.categories.find((x) => x.name.en === name || x.name.fa === name);
  if (!c) { c = { id: db.nextId(), slug: slugify(name), name: { fa: name, en: name }, order: s.categories.length }; s.categories.push(c); }
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

let n = 0;
for (const g of groups.values()) {
  const slug = slugify(g.base);
  if (s.products.some((p) => p.slug === slug)) { console.log('skip (exists):', slug); continue; }
  const images = g.files.map(({ f, ext, isModel }) => {
    const name = `${slug}-${crypto.randomBytes(3).toString('hex')}${ext === '.jpeg' ? '.jpg' : ext}`;
    fs.copyFileSync(f, path.join(UP, name)); return { file: name, kind: isModel ? 'model' : 'product' };
  }).sort((a, b) => (a.kind === 'product' ? 0 : 1) - (b.kind === 'product' ? 0 : 1));
  const nm = title(g.base);
  s.products.push({ id: db.nextId(), slug, name: { fa: nm, en: nm }, description: { fa: '', en: '' }, details: { fa: '', en: '' },
    categoryId: category(g.cat), price: 0, comparePrice: 0, sizes: ['S', 'M', 'L', 'XL'].map((x) => ({ name: x, stock: 0 })),
    images, active: flags.includes('--publish'), createdAt: Date.now() + n, views: 0 });
  n++; console.log(`+ ${nm} (${g.cat}) — ${images.length} image(s)`);
}
db.save();
console.log(`Imported ${n} product(s). Open /admin to set names (Farsi), prices and stock${flags.includes('--publish') ? '' : ', then switch them to Active'}.`);
