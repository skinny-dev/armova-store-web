// Generates scripts/photo-map.json (hand-curated from the actual photos). Edit and re-run if needed.
// Each product: first file = main product shot, rest = extra/model shots.
const C = { knit: ['بافت', 'Knitwear'], polo: ['پولو', 'Polos'], tee: ['تی‌شرت', 'T-Shirts'], shirt: ['پیراهن', 'Shirts'] };
const COL = { white: ['سفید', 'White'], brown: ['قهوه‌ای', 'Brown'], red: ['قرمز', 'Red'], blue: ['آبی', 'Blue'], pink: ['صورتی', 'Pink'], green: ['سبز', 'Green'],
  beige: ['بژ', 'Beige'], yellow: ['زرد', 'Yellow'], grey: ['طوسی', 'Grey'], black: ['مشکی', 'Black'], navy: ['سرمه‌ای', 'Navy'], purple: ['بنفش', 'Purple'], lblue: ['آبی روشن', 'Light Blue'], lime: ['سبز فسفری', 'Neon Green'] };
const HEX = { white: '#f5f5f2', brown: '#6b4a3a', red: '#c0272d', blue: '#1f4fbf', pink: '#e8a5b5', green: '#3f9d85', beige: '#c8b49a', yellow: '#e5a912', grey: '#7a7d80', black: '#111111', navy: '#1b2a4a', purple: '#8a5cc7', lblue: '#5bb7e8', lime: '#8cd21a' };
const STYLES = {
  pocket: ['پیراهن جیب‌دار', 'Pocket Shirt', 'shirt'], polo: ['پولو کلاسیک', 'Classic Polo', 'polo'],
  rib: ['تاپ ریب', 'Ribbed Top', 'knit'], zip: ['بافت یقه‌زیپ', 'Zip Knit', 'knit'], ruffle: ['بافت دامنی', 'Ruffle Hem Knit', 'knit'],
  ny: ['بافت نیویورک', 'New York Knit', 'knit'], tee: ['تی‌شرت اورسایز', 'Oversized Tee', 'tee'], heart: ['بافت یقه‌اسکی قلب', 'Heart Turtleneck', 'knit'],
  trim: ['تی‌شرت یقه‌زیپ', 'Zip Trim Tee', 'tee'], ribpolo: ['پولو ریب', 'Ribbed Polo', 'polo'], vneck: ['تاپ یقه‌هفت', 'V-Neck Top', 'knit'],
  scallop: ['تی‌شرت لبه‌دار', 'Scallop Tee', 'tee'], cable: ['بافت طرح‌دار یقه‌زیپ', 'Cable Zip Knit', 'knit'], scarf: ['بافت شالی', 'Scarf Knit', 'knit'],
  lace: ['بافت آستین توری', 'Lace Cuff Knit', 'knit'], cb: ['تی‌شرت رنگی', 'Colorblock Tee', 'tee'],
};
const P = (s, c, ...f) => ({ s, c, f });
const L = [
  P('pocket','white','DSC01329','DSC01331','DSC01327','DSC01332'), P('pocket','brown','DSC01391'),
  P('polo','red','DSC01411','DSC01409'), P('polo','blue','DSC01444'), P('polo','white','DSC01478'), P('polo','black','DSC01781'),
  P('rib','red','DSC01487'), P('rib','beige','DSC01491'),
  P('zip','pink','DSC01490'), P('zip','green','DSC01526','DSC01528','IMG_8989'), P('zip','beige','DSC01568','IMG_8990'),
  P('ruffle','yellow','DSC01582'), P('ruffle','pink','DSC01615'),
  P('ny','yellow','DSC01587'), P('ny','grey','DSC01616','IMG_8913'), P('ny','black','IMG_8901'), P('ny','beige','IMG_8903'),
  P('ny','white','IMG_8904'), P('ny','pink','IMG_8906'), P('ny','green','IMG_8910'), P('ny','red','IMG_8912'),
  P('tee','black','DSC01654','DSC01657','DSC01659'), P('tee','navy','DSC01670','DSC01671'),
  P('heart','black','DSC01680','DSC01681'), P('heart','green','DSC01686'), P('heart','yellow','DSC01861','DSC01687'),
  P('heart','pink','DSC01702'), P('heart','beige','DSC01706','DSC01711','DSC01858'), P('heart','red','DSC01715'), P('heart','grey','DSC01726'),
  P('trim','green','IMG_8993','DSC01746'), P('cb','black','DSC01747'), P('trim','red','IMG_8994'), P('trim','black','IMG_8995'),
  P('trim','grey','IMG_8996'), P('trim','yellow','IMG_8997'), P('trim','white','IMG_8998'),
  P('ribpolo','lblue','DSC01845'), P('ribpolo','purple','DSC01855','DSC01864'), P('ribpolo','lime','DSC01875'),
  P('vneck','white','DSC01870'), P('vneck','grey','DSC01881'), P('vneck','green','DSC01886'),
  P('scallop','green','DSC01895'), P('scallop','yellow','DSC01904'),
  P('cable','green','DSC01912'), P('cable','pink','DSC01919'), P('cable','black','DSC01924'), P('cable','grey','DSC01928'),
  P('scarf','grey','DSC01920'), P('scarf','red','DSC01921','DSC01923'), P('scarf','yellow','DSC01925'), P('scarf','pink','DSC01926'),
  P('scarf','green','DSC01930'), P('scarf','beige','DSC01931'),
  P('lace','grey','DSC01934','DSC01935'), P('lace','beige','DSC01937'), P('lace','green','DSC01941'),
];
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'public', 'armova-products');
const real = fs.readdirSync(dir);
const find = (b) => real.find((x) => path.parse(x).name === b) || (() => { throw new Error('missing ' + b); })();
const used = new Set(), count = {};
const products = L.map(({ s, c, f }) => {
  const [fa, en, cat] = STYLES[s], [cfa, cen] = COL[c];
  f.forEach((x) => { if (used.has(x)) throw new Error('dup ' + x); used.add(x); });
  return { slug: `${s}-${c}`, group: s, color: { fa: cfa, en: cen, hex: HEX[c] }, name: { fa: `${fa} ${cfa}`, en: `${en} ${cen}` }, category: { fa: C[cat][0], en: C[cat][1] }, files: f.map(find) };
});
const missing = real.filter((x) => !used.has(path.parse(x).name)); if (missing.length) console.log('UNASSIGNED:', missing.join(' '));
fs.writeFileSync(path.join(__dirname, 'photo-map.json'), JSON.stringify(products, null, 1));
console.log(products.length, 'products,', used.size, 'files');
