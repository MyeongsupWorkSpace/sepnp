const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'sepnp_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 연결 테스트
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('  ✅ MySQL 연결 성공!');
    console.log(`     데이터베이스: ${process.env.DB_NAME || 'sepnp_db'}`);
    conn.release();
  } catch (err) {
    console.error('\n  ❌ MySQL 연결 실패!');
    console.error('     오류:', err.message);
    console.error('     💡 .env 파일의 DB_PASSWORD를 확인하세요!\n');
  }
})();

module.exports = pool;