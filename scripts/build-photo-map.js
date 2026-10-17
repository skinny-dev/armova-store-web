// Generates scripts/photo-map.json: camera filenames -> named products (style x colour).
// Names, categories and colour lists follow the shop owner's own descriptions (Telegram chat, Oct 2026).
// Each product: first file = main product shot, rest = extra/model shots.
// Edit STYLES / LIST below and re-run: node scripts/build-photo-map.js
const fs = require('fs'), path = require('path');

// Categories (order = display order)
const CATS = {
  blouse: ['بلوز', 'Blouses'], polo: ['پولوشرت', 'Polo Shirts'], tee: ['تی‌شرت', 'T-Shirts'],
  turtle: ['یقه اسکی', 'Turtlenecks'], vest: ['وست', 'Vests'], shirt: ['پیراهن', 'Shirts'],
};
// Colours (owner's wording; "نسکافه‌ای" = nescafé/beige)
const COL = {
  green: ['سبز', 'Green', '#3f9d85'], yellow: ['زرد', 'Yellow', '#e5a912'], black: ['مشکی', 'Black', '#111111'], white: ['سفید', 'White', '#f5f5f2'],
  red: ['قرمز', 'Red', '#c0272d'], pink: ['صورتی', 'Pink', '#e8a5b5'], beige: ['نسکافه‌ای', 'Beige', '#c8b49a'], grey: ['طوسی', 'Grey', '#7a7d80'],
  navy: ['سرمه‌ای', 'Navy', '#1b2a4a'], purple: ['بنفش', 'Purple', '#8a5cc7'], blue: ['آبی', 'Blue', '#5bb7e8'], brown: ['قهوه‌ای', 'Brown', '#6b4a3a'],
};
const EIGHT = ['green', 'yellow', 'black', 'white', 'red', 'pink', 'beige', 'grey'];
// style key -> [fa, en, category, colours the shop sells]
const STYLES = {
  scarf: ['بلوز شال‌دار', 'Scarf Blouse', 'blouse', EIGHT],
  gisu: ['بلوز شرت مدل گیسو', 'Gisu Zip Blouse', 'blouse', EIGHT],
  ny: ['بلوز ساده نیویورک', 'New York Blouse', 'blouse', EIGHT],
  flare: ['بلوز آستین شیپوری', 'Flared Sleeve Blouse', 'blouse', EIGHT],
  lace: ['بلوز مدل دانتل', 'Lace Cuff Blouse', 'blouse', EIGHT],
  trim: ['پولوشرت یقه‌زیپ', 'Zip Trim Polo', 'polo', EIGHT],
  ribpolo: ['پولوشرت ریب', 'Ribbed Polo', 'polo', [...EIGHT, 'purple', 'blue']],
  scallop: ['پولوشرت مدل گیسو', 'Gisu Scallop Polo', 'polo', EIGHT],
  polo: ['پولوشرت کلاسیک', 'Classic Polo', 'polo', null],
  tee: ['تیشرت لانگ', 'Long Tee', 'tee', ['navy', 'black', 'white']],
  cb: ['تی‌شرت رنگی', 'Colorblock Tee', 'tee', null],
  heart: ['یقه اسکی قلب', 'Heart Turtleneck', 'turtle', EIGHT],
  vneck: ['وست بافت طرح‌دار', 'Patterned Knit Vest', 'vest', EIGHT],
  rib: ['وست ریب', 'Ribbed Vest', 'vest', null],
  pocket: ['پیراهن جیب‌دار', 'Pocket Shirt', 'shirt', null],
};
const P = (s, c, ...f) => ({ s, c, f });
const LIST = [
  // بلوز
  P('scarf','grey','DSC01920'), P('scarf','red','DSC01921','DSC01923'), P('scarf','yellow','DSC01925'), P('scarf','pink','DSC01926'),
  P('scarf','green','DSC01930'), P('scarf','beige','DSC01931'),
  P('gisu','pink','DSC01490','DSC01919'), P('gisu','green','DSC01526','DSC01528','IMG_8989','DSC01912'), P('gisu','beige','DSC01568','IMG_8990'),
  P('gisu','black','DSC01924'), P('gisu','grey','DSC01928'),
  P('ny','yellow','DSC01587'), P('ny','grey','DSC01616','IMG_8913'), P('ny','black','IMG_8901'), P('ny','beige','IMG_8903'),
  P('ny','white','IMG_8904'), P('ny','pink','IMG_8906'), P('ny','green','IMG_8910'), P('ny','red','IMG_8912'),
  P('flare','yellow','DSC01582'), P('flare','pink','DSC01615'),
  P('lace','grey','DSC01934','DSC01935'), P('lace','beige','DSC01937'), P('lace','green','DSC01941'),
  // پولوشرت
  P('trim','green','IMG_8993','DSC01746'), P('trim','red','IMG_8994'), P('trim','black','IMG_8995'), P('trim','grey','IMG_8996'),
  P('trim','yellow','IMG_8997'), P('trim','white','IMG_8998'),
  P('ribpolo','blue','DSC01845'), P('ribpolo','purple','DSC01855','DSC01864'), P('ribpolo','green','DSC01875'),
  P('scallop','green','DSC01895'), P('scallop','yellow','DSC01904'),
  P('polo','red','DSC01411','DSC01409'), P('polo','blue','DSC01444'), P('polo','white','DSC01478'), P('polo','black','DSC01781'),
  // تی‌شرت
  P('tee','black','DSC01654','DSC01657','DSC01659'), P('tee','navy','DSC01670','DSC01671'), P('cb','black','DSC01747'),
  // یقه اسکی
  P('heart','black','DSC01680','DSC01681'), P('heart','green','DSC01686'), P('heart','yellow','DSC01861','DSC01687'),
  P('heart','pink','DSC01702'), P('heart','beige','DSC01706','DSC01711','DSC01858'), P('heart','red','DSC01715'), P('heart','grey','DSC01726'),
  // وست
  P('vneck','white','DSC01870'), P('vneck','grey','DSC01881'), P('vneck','green','DSC01886'),
  P('rib','red','DSC01487'), P('rib','beige','DSC01491'),
  // پیراهن
  P('pocket','white','DSC01329','DSC01331','DSC01327','DSC01332'), P('pocket','brown','DSC01391'),
];

const dir = path.join(__dirname, '..', 'public', 'armova-products');
const real = fs.readdirSync(dir);
const find = (b) => real.find((x) => path.parse(x).name === b) || (() => { throw new Error('missing ' + b); })();
const used = new Set();
const products = LIST.map(({ s, c, f }) => {
  const [fa, en, cat] = STYLES[s], [cfa, cen, hex] = COL[c];
  f.forEach((x) => { if (used.has(x)) throw new Error('dup ' + x); used.add(x); });
  return { slug: `${s}-${c}`, group: s, color: { fa: cfa, en: cen, hex }, name: { fa: `${fa} ${cfa}`, en: `${en} ${cen}` },
    category: { fa: CATS[cat][0], en: CATS[cat][1], order: Object.keys(CATS).indexOf(cat) }, files: f.map(find) };
});
const missingFiles = real.filter((x) => !used.has(path.parse(x).name));
if (missingFiles.length) console.log('UNASSIGNED PHOTOS:', missingFiles.join(' '));
fs.writeFileSync(path.join(__dirname, 'photo-map.json'), JSON.stringify(products, null, 1));
console.log(products.length, 'products,', used.size, 'files,', new Set(products.map((p) => p.group)).size, 'styles');

// Colours the shop sells but we have no photo for yet
for (const [k, [fa, en, , want]] of Object.entries(STYLES)) {
  if (!want) continue;
  const have = new Set(LIST.filter((x) => x.s === k).map((x) => x.c));
  const miss = want.filter((c) => !have.has(c));
  if (miss.length) console.log(`missing photos — ${fa} (${en}): ${miss.map((c) => COL[c][0]).join('، ')}`);
}
