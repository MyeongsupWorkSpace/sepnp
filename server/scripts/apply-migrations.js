const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function parseDbUrl(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: +u.port,
      user: u.username,
      password: u.password,
      database: u.pathname.slice(1)
    };
  } catch { return null; }
}

(async () => {
  const urlCfg = parseDbUrl(process.env.RAILWAY_DATABASE_URL || '');
  const cfg = {
    host: (urlCfg?.host) || process.env.MYSQLHOST,
    port: +(urlCfg?.port || process.env.MYSQLPORT || 3306),
    user: (urlCfg?.user) || process.env.MYSQLUSER || 'root',
    password: (urlCfg?.password) || process.env.MYSQLPASSWORD,
    database: (urlCfg?.database) || process.env.MYSQLDATABASE || 'railway',
    multipleStatements: true,
    ssl: process.env.MYSQLSSL === '1' ? { rejectUnauthorized: false } : undefined
  };
  console.log('[MIGRATE CFG]', { ...cfg, password: cfg.password ? '***' : null, sslEnabled: !!cfg.ssl });

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