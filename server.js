// Entry point: connect storage first, then start the app.
const db = require('./lib/db');
db.init().then(() => require('./app')).catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
process.on('SIGTERM', () => db.flush().finally(() => process.exit(0)));
