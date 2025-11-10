require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306'),
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'sepnp_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// 연결 테스트
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL 연결 성공!');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MySQL 연결 실패:', err.message);
  });

module.exports = pool;