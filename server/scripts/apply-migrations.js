const fs = require('fs'); const path = require('path'); const mysql = require('mysql2/promise');
(async () => {
  const host = process.env.MYSQLHOST || process.env.DB_HOST;
  const port = +(process.env.MYSQLPORT || process.env.DB_PORT || 3306);
  const user = process.env.MYSQLUSER || process.env.DB_USER;
  const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME;
  const dir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const conn = await mysql.createConnection({ host, port, user, password, database, multipleStatements:true });
  try {
    for (const f of files) {
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      await conn.query(sql);
      console.log('Applied:', f);
    }
    console.log('All migrations applied.');
  } finally { await conn.end(); }
})();