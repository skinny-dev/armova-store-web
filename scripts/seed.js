// Creates demo categories/products with generated placeholder SVG images.
// Usage: node scripts/seed.js   (refuses to run if data already exists, unless --force)
const fs = require('fs');
const path = require('path');
const db = require('../lib/db');

const s = db.get();
if ((s.products.length || s.categories.length) && !process.argv.includes('--force')) { console.log('Data exists; use --force to reseed.'); process.exit(0); }
Object.assign(s, { seq: 1, categories: [], products: [], orders: [], daily: {} });
const UP = path.join(__dirname, '..', 'uploads'); fs.mkdirSync(UP, { recursive: true });

const shapes = {
  jacket: '<path d="M170 120 L230 100 Q300 130 370 100 L430 120 L520 360 L460 385 L430 300 L430 470 L170 470 L170 300 L140 385 L80 360 Z"/><path d="M300 118 V470" stroke="rgba(0,0,0,.25)" stroke-width="4" fill="none"/>',
  tee: '<path d="M190 110 Q300 160 410 110 L520 190 L470 250 L430 225 V470 H170 V225 L130 250 L80 190 Z"/>',
  pants: '<path d="M190 90 H410 L440 470 H330 L300 220 L270 470 H160 Z"/><path d="M190 120 H410" stroke="rgba(0,0,0,.25)" stroke-width="4"/>',
  cap: '<path d="M170 330 Q180 180 300 180 Q420 180 430 330 Z"/><path d="M150 330 H470 Q430 370 330 360 Z" opacity=".8"/>',
};
function svg(type, color, bg, model) {
  const person = model ? '<circle cx="300" cy="50" r="38" fill="#c9a98a"/>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -115 600 750"><rect y="-115" width="600" height="750" fill="${bg}"/>${person}<g fill="${color}">${shapes[type]}</g></svg>`;
}
function img(slug, type, color, model) {
  const name = `${slug}-${model ? 'model' : 'product'}.svg`;
  fs.writeFileSync(path.join(UP, name), svg(type, color, model ? '#e4e2de' : '#f1f1f1', model));
  return { file: name, kind: model ? 'model' : 'product' };
}
const cat = (fa, en) => { const c = { id: db.nextId(), slug: en.toLowerCase(), name: { fa, en }, order: s.categories.length }; s.categories.push(c); return c.id; };
const tops = cat('پوشاک بالاتنه', 'Tops'), bottoms = cat('شلوار', 'Bottoms'), acc = cat('اکسسوری', 'Accessories');
const SZ = (a) => ['S', 'M', 'L', 'XL'].map((n, i) => ({ name: n, stock: a[i] }));
const items = [
  ['ژاکت واریتی سابِ مصنوعی', 'Faux Suede Varsity Jacket', 'jacket', '#8d8a85', tops, 8900000, 'ژاکت واریتی با آستر پشمی و گلدوزی برجسته.', 'Varsity jacket with sherpa lining and embossed logo.', [2, 5, 4, 0]],
  ['بمبر ساتن زیتونی', 'Satin Bomber Olive', 'jacket', '#6b6a3b', tops, 9900000, 'بمبر سبک با یقه آستین‌دار.', 'Lightweight bomber with ribbed collar.', [3, 3, 3, 1]],
  ['ژاکت پولار چهارخانه', 'Plaid Fleece Jacket', 'jacket', '#1f4a3d', tops, 7400000, 'پولار گرم با طرح چهارخانه.', 'Warm fleece with plaid pattern.', [0, 2, 6, 2]],
  ['تیشرت لوگو', 'Logo Tee', 'tee', '#1c2a4f', tops, 1900000, 'تیشرت نخی ۲۴۰ گرم.', '240gsm cotton tee.', [10, 12, 9, 5]],
  ['شلوار کارگو مشکی', 'Black Cargo Pants', 'pants', '#1b1b1b', bottoms, 5200000, 'شلوار کارگو گشاد با جیب‌های بزرگ.', 'Relaxed cargo pants with oversized pockets.', [4, 6, 6, 3]],
  ['جین گشاد آبی', 'Baggy Denim Blue', 'pants', '#2c4a7a', bottoms, 4800000, 'جین گشاد با شستشوی سنگی.', 'Baggy denim, stone washed.', [3, 4, 2, 2]],
  ['کلاه کپ', 'Dad Cap', 'cap', '#b7a27d', acc, 1200000, 'کپ نخی با بند قابل تنظیم.', 'Cotton cap with adjustable strap.', [20, 20, 0, 0]],
];
for (const [fa, en, type, color, categoryId, price, dfa, den, st] of items) {
  const slug = en.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  s.products.push({ id: db.nextId(), slug, name: { fa, en }, description: { fa: dfa, en: den },
    details: { fa: 'جنس: ترکیب پنبه و پلی‌استر\nشستشو با آب سرد', en: 'Material: cotton/poly blend\nCold wash only' },
    categoryId, price, comparePrice: 0, sizes: type === 'cap' ? [{ name: 'Free', stock: 20 }] : SZ(st),
    images: [img(slug, type, color, false), img(slug, type, color, true)], active: true, createdAt: Date.now() - s.seq * 1000, views: 0 });
}
db.save(); console.log(`Seeded ${s.categories.length} categories, ${s.products.length} products.`);
