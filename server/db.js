const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME
};

['host','user','password','database'].forEach(k => {
  if (!cfg[k]) console.error(`❌ Missing MySQL key: ${k}`);
});

const pool = mysql.createPool({
  ...cfg,
  waitForConnections: true,
  connectionLimit: 10
});

pool.getConnection()
  .then(c => { console.log(`✅ MySQL 연결 성공 host=${cfg.host}`); c.release(); })
  .catch(e => { console.error('❌ MySQL 연결 실패:', e.message); });

module.exports = pool;