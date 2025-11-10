require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME
};

// 디버깅: 환경변수 확인
console.log('[DB] 환경변수 체크:', {
  MYSQLHOST: process.env.MYSQLHOST ? '✅' : '❌',
  MYSQLPORT: process.env.MYSQLPORT ? '✅' : '❌',
  MYSQLUSER: process.env.MYSQLUSER ? '✅' : '❌',
  MYSQLPASSWORD: process.env.MYSQLPASSWORD ? '✅' : '❌',
  MYSQLDATABASE: process.env.MYSQLDATABASE ? '✅' : '❌',
  DB_HOST: process.env.DB_HOST ? '✅' : '❌',
});

console.log('[DB] 연결 설정:', {
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  database: cfg.database,
  hasPassword: !!cfg.password
});

// 필수값 검증
['host', 'user', 'password', 'database'].forEach(key => {
  if (!cfg[key]) {
    console.error(`❌ [DB] Missing required config: ${key}`);
  }
});

const pool = mysql.createPool({
  ...cfg,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// 연결 테스트
pool.getConnection()
  .then(c => {
    console.log(`✅ [DB] MySQL 연결 성공: ${cfg.host}:${cfg.port}/${cfg.database}`);
    c.release();
  })
  .catch(e => {
    console.error('❌ [DB] MySQL 연결 실패:', e.message);
    console.error('    코드:', e.code);
    console.error('    errno:', e.errno);
  });

module.exports = pool;