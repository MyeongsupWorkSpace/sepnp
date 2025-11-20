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
    host: process.env.MYSQLHOST || urlCfg?.host,
    port: +(process.env.MYSQLPORT || urlCfg?.port || 3306),
    user: process.env.MYSQLUSER || urlCfg?.user || 'root',
    password: process.env.MYSQLPASSWORD || urlCfg?.password,
    database: process.env.MYSQLDATABASE || urlCfg?.database || 'railway',
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