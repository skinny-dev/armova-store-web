// Fills catalog/db.json with placeholder prices (per model/group, rounded to 10,000 Toman) and stock per size.
// Deterministic (seeded), so re-running gives the same numbers. Real prices: edit in /admin afterwards.
// Usage: node scripts/randomize-catalog.js [--seed=N]
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'catalog', 'db.json');
const seedArg = (process.argv.find((a) => a.startsWith('--seed=')) || '--seed=7').split('=')[1];
let x = Number(seedArg) || 7;
const rnd = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }; // LCG
const between = (a, b) => a + rnd() * (b - a);

const RANGE = { // Toman, by category (English name)
  Blouses: [1200000, 2400000], 'Polo Shirts': [1000000, 1900000], 'T-Shirts': [800000, 1400000],
  Turtlenecks: [1300000, 2200000], Vests: [1500000, 2600000], Shirts: [1800000, 3000000],
};
const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const catName = Object.fromEntries(db.categories.map((c) => [c.id, c.name.en]));
const groupPrice = {};
for (const p of db.products) {
  const key = p.group || p.slug;                       // colours of one model share a price
  const [lo, hi] = RANGE[catName[p.categoryId]] || [900000, 2000000];
  groupPrice[key] ||= Math.round(between(lo, hi) / 10000) * 10000;
  p.price = groupPrice[key];
  p.comparePrice = 0;
  p.sizes = p.sizes.map((s) => ({ ...s, stock: Math.floor(between(0, 9)) }));
  if (p.sizes.every((s) => s.stock === 0)) p.sizes[Math.floor(rnd() * p.sizes.length)].stock = 3; // never fully sold out
}
fs.writeFileSync(FILE, JSON.stringify(db, null, 1));
const prices = db.products.map((p) => p.price);
console.log(`${db.products.length} products: ${Math.min(...prices).toLocaleString()} – ${Math.max(...prices).toLocaleString()} Toman, ${Object.keys(groupPrice).length} price groups`);
