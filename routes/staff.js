// Staff auth, account, users and roles.
const db = require('../lib/db');
const A = require('../lib/auth');
const sms = require('../lib/sms');
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bi = (v, max) => ({ fa: str(v && v.fa, max), en: str(v && v.en, max) });
const SESSION_MS = 12 * 3600e3;
const attempts = new Map();

function throttle(key) {
  const a = attempts.get(key) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
  attempts.set(key, a);
  return a;
}
function startSession(res, user) {
  user.lastLoginAt = Date.now(); db.save();
  res.cookie('armova_admin', A.makeToken('staff', user.id, SESSION_MS, user.tokenVersion || 1), { httpOnly: true, sameSite: 'strict', maxAge: SESSION_MS });
}
const me = (user) => ({ user: A.publicUser(user), role: A.roleOf(user.role), permissions: [...A.permsOf(user)].filter((p) => p !== '*'), all: A.permsOf(user).has('*') });
const activeOwners = () => db.get().users.filter((u) => u.active && u.role === 'owner');

module.exports = function (app, admin) {
  app.post('/api/admin/login', (req, res) => {
    const username = str(req.body.username, 60).toLowerCase() || 'owner', pw = req.body.password;
    const a = throttle(req.ip), b = throttle('u:' + username);
    if (a.n >= 10 || b.n >= 6) return res.status(429).json({ error: 'too_many' });
    const user = db.get().users.find((u) => u.username === username);
    if (!user || !user.active || !A.checkPassword(pw, user.passwordHash)) { a.n++; b.n++; return res.status(401).json({ error: 'bad_password' }); }
    attempts.delete(req.ip); attempts.delete('u:' + username);
    startSession(res, user); res.json({ ok: true, ...me(user) });
  });
  // Staff can also log in with an SMS code sent to the phone saved on their account.
  app.post('/api/admin/otp/request', async (req, res) => {
    const phone = sms.normPhone(req.body.phone), a = throttle(req.ip);
    if (!phone) return res.status(400).json({ error: 'invalid_phone' });
    if (a.n >= 10) return res.status(429).json({ error: 'too_many' });
    a.n++;
    const user = db.get().users.find((u) => u.active && sms.normPhone(u.phone) === phone);
    if (!user) return res.json({ ok: true }); // do not reveal whether the number belongs to staff
    const r = await sms.requestOtp(phone, 'staff'); res.status(r.error ? 429 : 200).json(r.error ? r : { ok: true, expiresIn: r.expiresIn });
  });
  app.post('/api/admin/otp/verify', (req, res) => {
    const phone = sms.normPhone(req.body.phone), a = throttle(req.ip);
    if (a.n >= 10) return res.status(429).json({ error: 'too_many' });
    const user = phone && db.get().users.find((u) => u.active && sms.normPhone(u.phone) === phone);
    if (!user || !sms.verifyOtp(phone, 'staff', req.body.code)) { a.n++; return res.status(401).json({ error: 'bad_code' }); }
    startSession(res, user); res.json({ ok: true, ...me(user) });
  });
  app.post('/api/admin/logout', (req, res) => { res.clearCookie('armova_admin'); res.json({ ok: true }); });

  admin.get('/me', (req, res) => res.json({ ...me(req.user), catalog: A.PERMS }));
  admin.post('/account/password', (req, res) => {
    const { current, next } = req.body || {};
    if (!A.checkPassword(current, req.user.passwordHash)) return res.status(400).json({ error: 'bad_password' });
    if (typeof next !== 'string' || next.length < 8) return res.status(400).json({ error: 'weak_password' });
    req.user.passwordHash = A.hashPassword(next); req.user.mustChange = false; req.user.tokenVersion = (req.user.tokenVersion || 1) + 1;
    db.save(); startSession(res, req.user); res.json({ ok: true });
  });
  admin.put('/account', (req, res) => { req.user.name = str(req.body.name, 80) || req.user.name; req.user.phone = str(req.body.phone, 20); db.save(); res.json(A.publicUser(req.user)); });

  // ----- users -----
  admin.get('/users', A.can('users.manage'), (req, res) => res.json(db.get().users.map(A.publicUser)));
  const canGrantRole = (req, key) => {
    const role = A.roleOf(key); if (!role) return false;
    if (A.has(req.perms, '*')) return true;
    return !role.permissions.includes('*') && role.permissions.every((p) => A.has(req.perms, p));
  };
  admin.post('/users', A.can('users.manage'), (req, res) => {
    const s = db.get(), b = req.body || {}, username = str(b.username, 60).toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return res.status(400).json({ error: 'bad_username' });
    if (s.users.some((u) => u.username === username)) return res.status(409).json({ error: 'username_taken' });
    if (typeof b.password !== 'string' || b.password.length < 8) return res.status(400).json({ error: 'weak_password' });
    if (!canGrantRole(req, b.role)) return res.status(403).json({ error: 'cannot_grant_role' });
    const u = { id: db.nextId(), username, name: str(b.name, 80) || username, phone: str(b.phone, 20), role: b.role, active: true, passwordHash: A.hashPassword(b.password), mustChange: true, tokenVersion: 1, createdAt: Date.now() };
    s.users.push(u); db.save(); res.json(A.publicUser(u));
  });
  admin.put('/users/:id', A.can('users.manage'), (req, res) => {
    const s = db.get(), u = s.users.find((x) => x.id === Number(req.params.id)), b = req.body || {};
    if (!u) return res.status(404).end();
    if (u.role === 'owner' && !A.has(req.perms, '*')) return res.status(403).json({ error: 'forbidden' });
    const nextRole = b.role !== undefined ? b.role : u.role, nextActive = b.active !== undefined ? !!b.active : u.active;
    if (nextRole !== u.role && !canGrantRole(req, nextRole)) return res.status(403).json({ error: 'cannot_grant_role' });
    if (u.role === 'owner' && (nextRole !== 'owner' || !nextActive) && activeOwners().length <= 1) return res.status(409).json({ error: 'last_owner' });
    if (u.id === req.user.id && !nextActive) return res.status(409).json({ error: 'cannot_disable_self' });
    let bump = nextRole !== u.role || nextActive !== u.active;
    u.role = nextRole; u.active = nextActive;
    if (b.name !== undefined) u.name = str(b.name, 80) || u.name;
    if (b.phone !== undefined) u.phone = str(b.phone, 20);
    if (b.password) { if (typeof b.password !== 'string' || b.password.length < 8) return res.status(400).json({ error: 'weak_password' }); u.passwordHash = A.hashPassword(b.password); u.mustChange = true; bump = true; }
    if (bump) u.tokenVersion = (u.tokenVersion || 1) + 1;
    db.save(); res.json(A.publicUser(u));
  });
  admin.delete('/users/:id', A.can('users.manage'), (req, res) => {
    const s = db.get(), u = s.users.find((x) => x.id === Number(req.params.id));
    if (!u) return res.status(404).end();
    if (u.id === req.user.id) return res.status(409).json({ error: 'cannot_delete_self' });
    if (u.role === 'owner' && (!A.has(req.perms, '*') || activeOwners().length <= 1)) return res.status(409).json({ error: 'last_owner' });
    s.users = s.users.filter((x) => x.id !== u.id); db.save(); res.json({ ok: true });
  });

  // ----- roles -----
  admin.get('/roles', A.can('roles.manage', 'users.manage'), (req, res) => {
    const s = db.get();
    res.json({ roles: s.roles.map((r) => ({ ...r, users: s.users.filter((u) => u.role === r.key).length })), catalog: A.PERMS });
  });
  const cleanPerms = (req, list) => {
    const want = [...new Set((Array.isArray(list) ? list : []).filter((p) => A.PERMS[p]))];
    return A.has(req.perms, '*') ? want : want.filter((p) => A.has(req.perms, p)); // cannot grant what you lack
  };
  admin.post('/roles', A.can('roles.manage'), (req, res) => {
    const s = db.get(), b = req.body || {}, name = bi(b.name, 60);
    const key = str(b.key, 30).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!key || (!name.fa && !name.en)) return res.status(400).json({ error: 'name_required' });
    if (s.roles.some((r) => r.key === key)) return res.status(409).json({ error: 'role_exists' });
    name.fa ||= name.en; name.en ||= name.fa;
    const r = { key, name, permissions: cleanPerms(req, b.permissions) }; s.roles.push(r); db.save(); res.json(r);
  });
  admin.put('/roles/:key', A.can('roles.manage'), (req, res) => {
    const r = db.get().roles.find((x) => x.key === req.params.key), b = req.body || {};
    if (!r) return res.status(404).end();
    if (r.system) return res.status(409).json({ error: 'system_role' });
    if (r.key === req.user.role && !A.has(req.perms, '*')) return res.status(403).json({ error: 'cannot_edit_own_role' });
    if (b.name) { const n = bi(b.name, 60); if (n.fa || n.en) r.name = { fa: n.fa || n.en, en: n.en || n.fa }; }
    if (b.permissions) {
      // keep permissions the editor cannot see/grant untouched
      const keep = A.has(req.perms, '*') ? [] : r.permissions.filter((p) => !A.has(req.perms, p));
      r.permissions = [...new Set([...cleanPerms(req, b.permissions), ...keep])];
      db.get().users.filter((u) => u.role === r.key).forEach((u) => (u.tokenVersion = (u.tokenVersion || 1) + 1)); // re-login to pick up changes
    }
    db.save(); res.json(r);
  });
  admin.delete('/roles/:key', A.can('roles.manage'), (req, res) => {
    const s = db.get(), r = s.roles.find((x) => x.key === req.params.key);
    if (!r) return res.status(404).end();
    if (r.system) return res.status(409).json({ error: 'system_role' });
    if (s.users.some((u) => u.role === r.key)) return res.status(409).json({ error: 'role_in_use' });
    s.roles = s.roles.filter((x) => x.key !== r.key); db.save(); res.json({ ok: true });
  });
};
