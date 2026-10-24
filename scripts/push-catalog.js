// Push the local catalog (categories + products + photos) to another running instance, e.g. your live site.
//
//   node scripts/push-catalog.js --init https://your-app.runflare.run   (once: saves the URL and creates a secret token in data/sync.json)
//   node scripts/push-catalog.js --dry                                   (show what would change, send nothing)
//   node scripts/push-catalog.js                                         (push)
//
// Flags: --stock    also overwrite stock of products that already exist live (default: keep live stock)
//        --active   also overwrite visibility (active/draft) of existing live products (default: keep)
// Env alternative to data/sync.json: SYNC_URL, SYNC_TOKEN. The target must run with the same SYNC_TOKEN set.
// Orders, customers, users, discounts and settings on the target are never touched.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const UPLOADS = process.env.UPLOADS_DIR || path.join(ROOT, 'uploads');
const CFG = path.join(DATA, 'sync.json');
const args = process.argv.slice(2), has = (f) => args.includes(f);

if (has('--init')) {
  const url = args[args.indexOf('--init') + 1];
  if (!url || !/^https?:\/\//.test(url)) { console.error('Usage: node scripts/push-catalog.js --init https://your-site'); process.exit(1); }
  const old = fs.existsSync(CFG) ? JSON.parse(fs.readFileSync(CFG, 'utf8')) : {};
  const cfg = { url: url.replace(/\/$/, ''), token: old.token || crypto.randomBytes(32).toString('hex') };
  fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2));
  console.log(`Saved ${CFG}`);
  console.log('Next: on your host (Runflare) set the environment variable SYNC_TOKEN to the "token" value inside that file, redeploy, then run:  node scripts/push-catalog.js --dry');
  process.exit(0);
}

const cfg = (() => { try { return JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch { return {}; } })();
const URL_ = String(process.env.SYNC_URL || cfg.url || '').replace(/\/$/, ''), TOKEN = process.env.SYNC_TOKEN || cfg.token || '';
if (!URL_ || !TOKEN) { console.error('Not configured. Run:  node scripts/push-catalog.js --init https://your-site'); process.exit(1); }
const H = { Authorization: 'Bearer ' + TOKEN };
const dry = has('--dry');

async function call(method, p, body, headers = {}, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(URL_ + p, { method, headers: { ...H, ...headers }, body, signal: AbortSignal.timeout(60000) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) throw Object.assign(new Error('Unauthorized: SYNC_TOKEN on the site does not match data/sync.json (or the site has not been redeployed with sync support).'), { fatal: true });
      if (r.status === 404 && p.startsWith('/api/sync')) throw Object.assign(new Error('Sync endpoint not found: redeploy the latest code and set SYNC_TOKEN (at least 24 characters) on the site.'), { fatal: true });
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status} ${JSON.stringify(j).slice(0, 200)}`), { fatal: r.status < 500 && r.status !== 429 });
      return j;
    } catch (e) {
      if (e.fatal || i >= tries) throw e;
      await new Promise((res) => setTimeout(res, 1000 * i)); // flaky network: retry with backoff
    }
  }
}

if (has('--remove')) { // node scripts/push-catalog.js --remove product-slug,other-slug [--cats cat-slug,...] [--dry]
  const list = (f) => (args.includes(f) ? String(args[args.indexOf(f) + 1] || '').split(',').filter(Boolean) : []);
  call('POST', '/api/sync/remove' + (dry ? '?dry=1' : ''), JSON.stringify({ products: list('--remove'), categories: list('--cats') }), { 'Content-Type': 'application/json' }).then((r) => {
    console.log(`${dry ? 'Would remove' : 'Removed'} ${r.products.length} product(s): ${r.products.join(', ')}`);
    console.log(`${dry ? 'Would remove' : 'Removed'} ${r.categories.length} empty categor${r.categories.length === 1 ? 'y' : 'ies'}: ${r.categories.join(', ')}`);
    if (r.categoriesKept.length) console.log('Kept (not empty): ' + r.categoriesKept.join(', '));
  }).catch((e) => { console.error('Failed: ' + e.message); process.exit(1); });
} else (async () => {
  const db =JSON.parse(fs.readFileSync(path.join(DATA, 'db.json'), 'utf8'));
  const slugOf = (id) => (db.categories.find((c) => c.id === id) || {}).slug;
  const categories = db.categories.map((c) => ({ slug: c.slug, name: c.name, order: c.order, parentSlug: slugOf(c.parentId) || null }));
  const products = db.products.map((p) => ({ slug: p.slug, name: p.name, description: p.description, details: p.details, categorySlug: slugOf(p.categoryId), price: p.price, comparePrice: p.comparePrice,
    sizes: p.sizes.map((z) => ({ name: z.name, stock: z.stock })), images: p.images, active: p.active, group: p.group, color: p.color, sku: p.sku, properties: p.properties, createdAt: p.createdAt }));
  console.log(`Target: ${URL_}${dry ? '   (DRY RUN — nothing is sent)' : ''}`);
  console.log(`Local:  ${categories.length} categories, ${products.length} products`);

  const status = await call('GET', '/api/sync/status');
  console.log(`Live:   ${status.categories} categories, ${status.products} products, ${status.files.length} photos`);
  const remote = new Map(status.files.map((f) => [f.name, f.size]));

  // photos: only those missing (or different size) on the target
  const need = [...new Set(products.flatMap((p) => p.images.map((i) => i.file)))].filter((f) => {
    const fp = path.join(UPLOADS, f); return fs.existsSync(fp) && remote.get(f) !== fs.statSync(fp).size;
  });
  const absent = [...new Set(products.flatMap((p) => p.images.map((i) => i.file)))].filter((f) => !fs.existsSync(path.join(UPLOADS, f)));
  if (absent.length) console.log(`! ${absent.length} photo(s) referenced by products are missing locally: ${absent.slice(0, 5).join(', ')}${absent.length > 5 ? '…' : ''}`);
  console.log(`Photos to upload: ${need.length}${need.length ? ` (${(need.reduce((a, f) => a + fs.statSync(path.join(UPLOADS, f)).size, 0) / 1048576).toFixed(1)} MB)` : ''}`);

  if (!dry && need.length) {
    let done = 0, next = 0;
    const worker = async () => {
      while (next < need.length) {
        const f = need[next++];
        await call('PUT', '/api/sync/file/' + encodeURIComponent(f), fs.readFileSync(path.join(UPLOADS, f)), { 'Content-Type': 'application/octet-stream' });
        process.stdout.write(`\r  uploaded ${++done}/${need.length}`);
      }
    };
    await Promise.all([worker(), worker(), worker()]); process.stdout.write('\n');
  }

  const q = new URLSearchParams({ ...(dry ? { dry: '1' } : {}), ...(has('--stock') ? { stock: '1' } : {}), ...(has('--active') ? { active: '1' } : {}) }).toString();
  const rep = await call('POST', '/api/sync/catalog' + (q ? '?' + q : ''), JSON.stringify({ categories, products }), { 'Content-Type': 'application/json' });
  console.log(`Categories: +${rep.categories.created} new, ${rep.categories.updated} updated`);
  console.log(`Products:   +${rep.products.created} new, ${rep.products.updated} updated, ${rep.products.unchanged} unchanged`);
  if (rep.missingImages.length) console.log(`! ${rep.missingImages.length} image(s) not on the site, left out: ${rep.missingImages.slice(0, 5).join(', ')}`);
  if (rep.skipped.length) console.log('! skipped:\n  ' + rep.skipped.join('\n  '));
  console.log(dry ? 'Dry run finished. Run again without --dry to push.' : 'Done.');
})().catch((e) => { console.error('\nFailed: ' + e.message); process.exit(1); });
