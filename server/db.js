require('dotenv').config();
const mysql = require('mysql2/promise');

const isProduction = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';

// 환경 변수 로깅 (배포 초기 디버그용, 문제 해결되면 지워도 됨)
console.log('[DB] Incoming env:',
  {
    MYSQL_URL: process.env.MYSQL_URL,
    MYSQLHOST: process.env.MYSQLHOST,
    MYSQLPORT: process.env.MYSQLPORT,
    MYSQLUSER: process.env.MYSQLUSER,
    MYSQLDATABASE: process.env.MYSQLDATABASE
  }
);

// 프로덕션에서는 절대 localhost fallback 쓰지 않음
let poolConfig;

if (process.env.MYSQL_URL) {
  // Railway가 MYSQL_URL 제공하는 경우 (단일 커넥션 문자열)
  poolConfig = process.env.MYSQL_URL;
} else {
  poolConfig = {
    host: process.env.MYSQLHOST,
    port: parseInt(process.env.MYSQLPORT || '3306', 10),
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };
}

if (isProduction) {
  // 필수 값 검증
  ['host','user','password','database'].forEach(k => {
    const v = typeof poolConfig === 'object' ? poolConfig[k] : 'URL';
    if (!v) {
      console.error(`❌ Missing MySQL config key: ${k}`);
    }
  });
}

const pool = mysql.createPool(poolConfig);

// 연결 테스트
pool.getConnection()
  .then(conn => {
    console.log(`✅ MySQL 연결 성공: host=${typeof poolConfig === 'object' ? poolConfig.host : 'URL'}`);
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL 연결 실패:', err.message);
    console.error('    host 시도값 =', typeof poolConfig === 'object' ? poolConfig.host : 'URL');
  });

module.exports = pool;