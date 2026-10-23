// Loads the real Armova catalog (catalog/db.json + catalog/uploads/*) into the database.
// Replaces products and categories only; users, orders and settings are left alone. Light: copies files, no image processing.
// Usage: npm run seed:catalog        (also runs automatically on first start when the database has no products/categories)
const fs = require('fs');
const path = require('path');
const db = require('../lib/db');

const SRC = path.join(__dirname, '..', 'catalog');
const UPLOADS = path.join(__dirname, '..', 'uploads');

async function seedCatalog() {
  await db.init();
  const cat = JSON.parse(fs.readFileSync(path.join(SRC, 'db.json'), 'utf8'));
  fs.mkdirSync(UPLOADS, { recursive: true });
  let files = 0;
  const imgDir = path.join(SRC, 'uploads');
  for (const f of fs.existsSync(imgDir) ? fs.readdirSync(imgDir) : []) { fs.copyFileSync(path.join(imgDir, f), path.join(UPLOADS, f)); files++; }
  const s = db.get();
  s.products = cat.products; s.categories = cat.categories; s.seq = Math.max(s.seq || 1, cat.seq);
  db.save();
  await db.flush();
  console.log(`Catalog loaded: ${s.products.length} products, ${s.categories.length} categories, ${files} images.`);
}
module.exports = { seedCatalog };
if (require.main === module) seedCatalog().catch((e) => { console.error(e); process.exit(1); });
