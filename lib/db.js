const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'db.json');
const EMPTY = { seq: 1, categories: [], products: [], orders: [], daily: {} };
let state;

function load() {
  try { state = { ...EMPTY, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; }
  catch { state = JSON.parse(JSON.stringify(EMPTY)); }
}
function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, FILE);
}
function nextId() { const id = state.seq++; return id; }
function today() { return new Date().toISOString().slice(0, 10); }
function bump(key, n = 1) {
  const d = (state.daily[today()] ||= { views: 0, productViews: 0, addToCart: 0, orders: 0, revenue: 0 });
  d[key] = (d[key] || 0) + n;
}
load();
module.exports = { get: () => state, save, nextId, bump, today, reload: load, exists: () => fs.existsSync(FILE) };
