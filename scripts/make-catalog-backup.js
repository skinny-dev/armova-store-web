// Packs the current products + categories and the images they use into a .tar.gz that the admin
// "Backup → Restore" page accepts (choose "Products and categories only").
// Usage: node scripts/make-catalog-backup.js [output.tar.gz]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const db = require('../lib/db');

db.init().then(() => {
  const s = db.get();
  const out = path.resolve(process.argv[2] || 'armova-catalog.tar.gz');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'armova-cat-'));
  fs.mkdirSync(path.join(tmp, 'uploads'));
  const used = new Set();
  s.products.forEach((p) => (p.images || []).forEach((i) => used.add(i.file)));
  let n = 0;
  for (const f of used) { const src = path.join(__dirname, '..', 'uploads', f); if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(tmp, 'uploads', f)); n++; } }
  fs.writeFileSync(path.join(tmp, 'db.json'), JSON.stringify({ seq: s.seq, categories: s.categories, products: s.products }));
  const r = spawnSync('tar', ['-czf', out, '-C', tmp, 'db.json', 'uploads'], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  if (r.status !== 0) { console.error('tar failed'); process.exit(1); }
  console.log(`${out}: ${s.products.length} products, ${s.categories.length} categories, ${n} images (${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);
}).then(() => db.flush()).catch((e) => { console.error(e); process.exit(1); });
