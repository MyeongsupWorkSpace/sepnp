const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mysql = require('mysql2/promise');

// 디버그 로그 (문제 해결되면 제거 가능)
console.log('[DB] env check', {
  MYSQL_URL: !!process.env.MYSQL_URL,
  MYSQLHOST: process.env.MYSQLHOST,
  MYSQLPORT: process.env.MYSQLPORT,
  MYSQLUSER: process.env.MYSQLUSER,
  MYSQLDATABASE: process.env.MYSQLDATABASE,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME
});

let poolConfig;

if (process.env.MYSQL_URL) {
  poolConfig = process.env.MYSQL_URL;
} else {
  const host = process.env.MYSQLHOST || process.env.DB_HOST;
  const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10);
  const user = process.env.MYSQLUSER || process.env.DB_USER;
  const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME;

  // 필수값 검증(프로덕션에서 localhost로 떨어지지 않도록)
  ['host', 'user', 'password', 'database'].forEach((k) => {
    const v = { host, user, password, database }[k];
    if (!v) console.error(`❌ Missing MySQL config key: ${k}`);
  });

  poolConfig = {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };
}

const pool = mysql.createPool(poolConfig);

// 연결 테스트
pool.getConnection()
  .then((conn) => {
    console.log(`✅ MySQL 연결 성공 (host=${typeof poolConfig === 'object' ? poolConfig.host : 'URL'})`);
    conn.release();
  })
  .catch((err) => {
    console.error('❌ MySQL 연결 실패:', err.message);
    console.error('    host 시도값 =', typeof poolConfig === 'object' ? poolConfig.host : 'URL');
  });

module.exports = pool;