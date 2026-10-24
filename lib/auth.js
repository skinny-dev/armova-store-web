// Staff accounts, roles/permissions and signed session tokens (no external deps).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const SECRET_FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), '.secret');
let SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  try { SECRET = fs.readFileSync(SECRET_FILE, 'utf8'); }
  catch { SECRET = crypto.randomBytes(32).toString('hex'); fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true }); fs.writeFileSync(SECRET_FILE, SECRET); }
}
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// ---------- permission catalog ----------
// key -> group (used to lay out the matrix in the admin UI)
const PERMS = {
  'stats.view': 'general',
  'products.view': 'catalog', 'products.edit': 'catalog', 'products.bulk': 'catalog', 'products.delete': 'catalog', 'categories.manage': 'catalog', 'files.manage': 'catalog',
  'discounts.manage': 'sales', 'orders.view': 'sales', 'orders.manage': 'sales',
  'customers.view': 'crm', 'customers.manage': 'crm', 'crm.send': 'crm', 'templates.edit': 'crm', 'sms.log': 'crm',
  'settings.manage': 'system', 'users.manage': 'system', 'roles.manage': 'system',
};
const ALL = Object.keys(PERMS);
const without = (list, drop) => list.filter((p) => !drop.some((d) => p.startsWith(d)));
const DEFAULT_ROLES = [
  { key: 'owner', name: { fa: 'مالک', en: 'Owner' }, system: true, permissions: ['*'] },
  { key: 'developer', name: { fa: 'توسعه‌دهنده', en: 'Developer' }, permissions: [...ALL] },
  { key: 'manager', name: { fa: 'مدیر', en: 'Manager' }, permissions: without(ALL, ['settings.', 'users.', 'roles.']) },
  { key: 'marketing', name: { fa: 'بازاریابی', en: 'Marketing' }, permissions: ['stats.view', 'products.view', 'discounts.manage', 'orders.view', 'customers.view', 'customers.manage', 'crm.send', 'templates.edit', 'sms.log'] },
  { key: 'support', name: { fa: 'پشتیبانی', en: 'Support' }, permissions: ['products.view', 'orders.view', 'orders.manage', 'customers.view', 'crm.send'] },
  { key: 'catalog', name: { fa: 'محتوا و کاتالوگ', en: 'Catalog editor' }, permissions: ['products.view', 'products.edit', 'products.bulk', 'categories.manage', 'files.manage'] },
];

// ---------- passwords ----------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(String(pw), salt, 64).toString('hex');
}
function checkPassword(pw, stored) {
  if (!stored || typeof pw !== 'string') return false;
  const [salt, hash] = stored.split(':');
  return !!hash && safeEq(crypto.scryptSync(pw, salt, 64).toString('hex'), hash);
}

// ---------- bootstrap ----------
const SEED_OWNERS = [
  { username: 'javadi', name: 'Javadi', phone: '09120753894', role: 'owner' },
  { username: 'khodabakhshi', name: 'Khodabakhshi', phone: '09197916676', role: 'developer' },
];
function ensure() {
  const s = db.get();
  let dirty = false;
  if (!s.roles.length) { s.roles = JSON.parse(JSON.stringify(DEFAULT_ROLES)); dirty = true; }
  if (!s.roles.some((r) => r.key === 'owner')) { s.roles.unshift(JSON.parse(JSON.stringify(DEFAULT_ROLES[0]))); dirty = true; }
  if (!s.users.length) {
    const pw = process.env.ADMIN_PASSWORD;
    s.users.push({ id: db.nextId(), username: 'owner', name: 'Owner', phone: '', role: 'owner', active: true, passwordHash: hashPassword(pw || 'admin123'), mustChange: !pw, tokenVersion: 1, createdAt: Date.now() });
    if (!pw) console.warn('! Created owner account "owner" with the default password "admin123" — change it after logging in (or set ADMIN_PASSWORD before the first run).');
    dirty = true;
  }
  // Seeded owners (created once). They have no password yet: they log in with an SMS code sent to their phone,
  // then set a password under "My account".
  if (!s.settings.seededOwners) {
    for (const o of SEED_OWNERS) {
      if (s.users.some((u) => u.username === o.username || u.phone === o.phone)) continue;
      s.users.push({ id: db.nextId(), username: o.username, name: o.name, phone: o.phone, role: o.role, active: true, passwordHash: hashPassword(crypto.randomBytes(24).toString('hex')), noPassword: true, mustChange: true, tokenVersion: 1, createdAt: Date.now() });
      console.log(`+ Seeded ${o.role} ${o.name} (${o.phone}) — logs in with an SMS code.`);
    }
    s.settings.seededOwners = true; dirty = true;
  }
  // One-time migration: add the Developer role and move the seeded developer account onto it.
  if (!s.settings.developerSeeded) {
    if (!s.roles.some((r) => r.key === 'developer')) s.roles.push(JSON.parse(JSON.stringify(DEFAULT_ROLES.find((r) => r.key === 'developer'))));
    for (const o of SEED_OWNERS.filter((x) => x.role === 'developer')) {
      const u = s.users.find((x) => x.phone === o.phone);
      if (u && u.role !== 'developer') { u.role = 'developer'; u.tokenVersion = (u.tokenVersion || 1) + 1; console.log(`+ ${o.name} (${o.phone}) is now a developer.`); }
    }
    s.settings.developerSeeded = true; dirty = true;
  }
  if (dirty) db.save();
}

// ---------- tokens: kind:id:exp:tokenVersion ----------
function makeToken(kind, id, ttlMs, tv = 0) {
  const body = Buffer.from(`${kind}:${id}:${Date.now() + ttlMs}:${tv}`).toString('base64url');
  return body + '.' + sign(body);
}
function readToken(token, kind) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!sig || !safeEq(sig, sign(body))) return null;
  const [k, id, exp, tv] = Buffer.from(body, 'base64url').toString().split(':');
  if (k !== kind || Number(exp) < Date.now()) return null;
  return { id: Number(id), tv: Number(tv) };
}

// ---------- permissions ----------
const roleOf = (key) => db.get().roles.find((r) => r.key === key);
function permsOf(user) {
  const r = user && roleOf(user.role);
  if (!r) return new Set();
  return new Set(r.permissions.includes('*') ? ['*', ...ALL] : r.permissions.filter((p) => PERMS[p]));
}
const has = (perms, p) => perms.has('*') || perms.has(p);

function loadStaff(req) {
  const t = readToken(req.cookies && req.cookies.armova_admin, 'staff');
  if (!t) return null;
  const user = db.get().users.find((u) => u.id === t.id);
  if (!user || !user.active || (user.tokenVersion || 1) !== t.tv) return null;
  return user;
}
function requireAuth(req, res, next) {
  const user = loadStaff(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  req.user = user; req.perms = permsOf(user); next();
}
// can('a') = needs a; can('a','b') = needs any of them
const can = (...need) => (req, res, next) => (need.some((p) => has(req.perms, p)) ? next() : res.status(403).json({ error: 'forbidden', need }));

const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, phone: u.phone || '', role: u.role, active: u.active, mustChange: !!u.mustChange, noPassword: !!u.noPassword, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt || 0 });

module.exports = { PERMS, ALL, DEFAULT_ROLES, hashPassword, checkPassword, ensure, makeToken, readToken, permsOf, has, requireAuth, can, loadStaff, roleOf, publicUser, sign, safeEq };
