// State lives in memory (fast sync reads for the whole app) and is written through to storage:
//   - PostgreSQL when DATABASE_URL (or PGHOST) is set  -> one JSONB document in table `armova_state`
//   - otherwise the local file data/db.json
// Call `await db.init()` once before using the store. Run a single app instance (state is cached in-process).
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'db.json');
const EMPTY = { seq: 1, categories: [], products: [], orders: [], daily: {}, users: [], roles: [], customers: [], discounts: [], templates: [], smsLog: [], campaigns: [], stockWatch: [], settings: {} };
const clone = (o) => JSON.parse(JSON.stringify(o));
const USE_PG = !!(process.env.DATABASE_URL || process.env.PGHOST);
let state = clone(EMPTY), pool = null, initP = null;

function readFile() {
  try { return { ...clone(EMPTY), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { return null; }
}

async function init() {
  if (initP) return initP;
  initP = (async () => {
    if (!USE_PG) { state = readFile() || clone(EMPTY); return; }
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, ssl: process.env.PG_SSL === '1' ? { rejectUnauthorized: false } : undefined });
    pool.on('error', (e) => console.error('pg pool error:', e.message));
    await pool.query('CREATE TABLE IF NOT EXISTS armova_state (id INT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    const r = await pool.query('SELECT data FROM armova_state WHERE id = 1');
    if (r.rows.length) state = { ...clone(EMPTY), ...r.rows[0].data };
    else { // first run on this database: import the old file if there is one
      state = readFile() || clone(EMPTY);
      await pool.query('INSERT INTO armova_state (id, data) VALUES (1, $1)', [JSON.stringify(state)]);
      if (fs.existsSync(FILE)) console.log('Imported data/db.json into PostgreSQL.');
    }
    console.log('Storage: PostgreSQL');
  })();
  return initP;
}

// Serialized write-through: bursts of save() calls collapse into one write of the latest state.
let writing = null, dirty = false;
function save() {
  if (!USE_PG) {
    const tmp = FILE + '.tmp';
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, FILE);
    return;
  }
  dirty = true;
  if (writing) return;
  writing = (async () => {
    while (dirty) {
      dirty = false;
      try { await pool.query('UPDATE armova_state SET data = $1, updated_at = now() WHERE id = 1', [JSON.stringify(state)]); }
      catch (e) { console.error('DB write failed:', e.message); dirty = true; await new Promise((r) => setTimeout(r, 2000)); }
    }
    writing = null;
  })();
}
const flush = async () => { while (writing) await writing; };

function nextId() { return state.seq++; }
function today() { return new Date().toISOString().slice(0, 10); }
function bump(key, n = 1) {
  const d = (state.daily[today()] ||= { views: 0, productViews: 0, addToCart: 0, orders: 0, revenue: 0 });
  d[key] = (d[key] || 0) + n;
}
module.exports = { init, flush, get: () => state, save, nextId, bump, today, mode: USE_PG ? 'postgres' : 'file' };
