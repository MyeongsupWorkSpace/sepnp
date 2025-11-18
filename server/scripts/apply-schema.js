/*
  Railway/MySQL에 schema.sql을 적용.
  - MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE(또는 DB_NAME) 사용
*/
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const host = process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306);
  const user = process.env.MYSQLUSER || process.env.DB_USER || 'root';
  const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '';
  const dbName = process.env.MYSQLDATABASE || process.env.DB_NAME || 'sepmp';

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const conn = await mysql.createConnection({
    host, port, user, password, multipleStatements: true
  });

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`; USE \`${dbName}\`; ${sql}`);
    console.log('Schema applied successfully.');
  } finally {
    await conn.end();
  }
})().catch(err => {
  console.error('Schema apply failed:', err.message);
  process.exit(1);
});