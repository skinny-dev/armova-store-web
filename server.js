// Entry point: connect storage first, then start the app.
// optional local .env (Node 20.12+); hosts such as Runflare set the variables in their dashboard instead
try { const f = require('path').join(__dirname, '.env'); if (typeof process.loadEnvFile === 'function' && require('fs').existsSync(f)) process.loadEnvFile(f); } catch (e) { console.error('.env not loaded:', e.message); }
const db = require('./lib/db');
db.init().then(() => require('./app')).catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
process.on('SIGTERM', () => db.flush().finally(() => process.exit(0)));
