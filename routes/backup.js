// Full backup / restore (database + uploaded images) as one .tar.gz. Needs the `tar` command (Linux, macOS, Windows 10+).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const multer = require('multer');
const db = require('../lib/db');
const A = require('../lib/auth');

const run = (args) => new Promise((resolve, reject) => {
  const p = spawn('tar', args); let out = '', err = '';
  p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
  p.on('error', () => reject(Object.assign(new Error('tar_missing'), { code: 'tar_missing' })));
  p.on('close', (c) => (c === 0 ? resolve(out) : reject(Object.assign(new Error(err.trim() || 'tar_failed'), { code: 'bad_archive' }))));
});
const SAFE_NAME = /^[\w؀-ۿ.-]+$/;
const rm = (p) => fs.rm(p, { recursive: true, force: true }, () => {});

module.exports = (admin, { UPLOADS }) => {
  admin.get('/backup', A.can('settings.manage'), (req, res) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'armova-bk-'));
    fs.writeFileSync(path.join(tmp, 'db.json'), JSON.stringify(db.get()));
    const args = ['-czf', '-', '-C', tmp, 'db.json'];
    if (fs.existsSync(UPLOADS)) args.push('-C', path.dirname(UPLOADS), path.basename(UPLOADS));
    const p = spawn('tar', args);
    res.set({ 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="armova-backup-${new Date().toISOString().slice(0, 10)}.tar.gz"`, 'Cache-Control': 'no-store' });
    p.stdout.pipe(res);
    p.stderr.on('data', (d) => console.error('tar:', String(d).trim()));
    p.on('error', () => { rm(tmp); if (!res.headersSent) res.status(500).json({ error: 'tar_missing' }); else res.end(); });
    p.on('close', () => rm(tmp));
    res.on('close', () => { p.kill(); rm(tmp); });
  });

  const up = multer({ dest: os.tmpdir(), limits: { fileSize: 2 * 1024 ** 3, files: 1 } });
  admin.post('/restore', A.can('settings.manage'), up.single('file'), async (req, res) => {
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'no_file' });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'armova-rs-'));
    try {
      // 1) inspect the archive before extracting: only db.json and flat uploads/<file>, regular files/dirs, no path tricks
      const names = (await run(['-tzf', f.path])).split('\n').filter(Boolean).map((n) => n.replace(/^\.\//, ''));
      const types = (await run(['-tvzf', f.path])).split('\n').filter(Boolean);
      const okName = (n) => !n.includes('..') && !/[\u0000-\u001f\\]/.test(n) && (n === 'db.json' || n === 'uploads' || n === 'uploads/' || /^uploads\/[^/]+$/.test(n));
      if (!names.includes('db.json') || !names.every(okName) || !types.every((l) => /^[-d]/.test(l))) throw Object.assign(new Error('bad_archive'), { code: 'bad_archive' });
      // 2) extract to a temp dir and validate the database
      await run(['-xzf', f.path, '-C', dir, '--no-same-owner']);
      const next = JSON.parse(fs.readFileSync(path.join(dir, 'db.json'), 'utf8'));
      if (!next || typeof next !== 'object' || !Array.isArray(next.products) || !Array.isArray(next.categories) || typeof next.seq !== 'number') throw Object.assign(new Error('bad_archive'), { code: 'bad_archive' });
      // 3) copy images, then swap the database
      let files = 0;
      const src = path.join(dir, 'uploads');
      if (fs.existsSync(src)) {
        fs.mkdirSync(UPLOADS, { recursive: true });
        for (const name of fs.readdirSync(src)) {
          if (!SAFE_NAME.test(name) || name.startsWith('.') || !fs.statSync(path.join(src, name)).isFile()) continue;
          fs.copyFileSync(path.join(src, name), path.join(UPLOADS, name)); files++;
        }
      }
      db.replace(next);
      try { A.ensure(); } catch {}
      await db.flush();
      res.json({ ok: true, products: next.products.length, categories: next.categories.length, orders: (next.orders || []).length, files });
    } catch (e) {
      res.status(e.code === 'tar_missing' ? 500 : 400).json({ error: e.code || 'bad_archive' });
    } finally { rm(dir); rm(f.path); }
  });
};
