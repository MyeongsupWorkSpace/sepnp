const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const cfg = {
    host: process.env.MYSQLHOST,
    port: +(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE || 'railway',
    multipleStatements: true
  };
  console.log('[MIGRATE CFG]', { ...cfg, password: cfg.password ? '***' : null });

  const conn = await mysql.createConnection(cfg);
  const dir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    await conn.query(sql);
    console.log('Applied:', f);
  }
  await conn.end();
  console.log('Migrations complete.');
})().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});