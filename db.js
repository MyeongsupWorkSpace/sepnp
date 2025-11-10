const fs = require('fs');
const path = require('path');

console.log('🔍 [DEBUG] 모든 환경변수:', {
  MYSQL_URL: process.env.MYSQL_URL ? '설정됨' : 'undefined',
  MYSQLHOST: process.env.MYSQLHOST,
  RAILWAY_PRIVATE_DOMAIN: process.env.RAILWAY_PRIVATE_DOMAIN,
  DB_HOST: process.env.DB_HOST,
  MYSQLPORT: process.env.MYSQLPORT,
  MYSQLUSER: process.env.MYSQLUSER,
  MYSQLDATABASE: process.env.MYSQLDATABASE,
  MYSQLPASSWORD: process.env.MYSQLPASSWORD ? '***설정됨***' : 'undefined',
  MYSQL_ROOT_PASSWORD: process.env.MYSQL_ROOT_PASSWORD ? '***설정됨***' : 'undefined',
  NODE_ENV: process.env.NODE_ENV,
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT
});

const isProd = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
const localEnvPath = path.resolve(__dirname, '.env.local');
if (!isProd && fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
  console.log('ℹ️ 로컬 환경변수 로드 (.env.local)');
} else {
  console.log('ℹ️ 프로덕션: .env.local 무시');
}

const mysql = require('mysql2/promise');

// MYSQL_URL이 있으면 그것 사용 (가장 간단)
let pool;
if (process.env.MYSQL_URL) {
  console.log('ℹ️ [DB] MYSQL_URL 사용');
  pool = mysql.createPool({
    uri: process.env.MYSQL_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
} else {
  // 개별 변수로 연결
  const cfg = {
    host: process.env.MYSQLHOST
          || process.env.RAILWAY_PRIVATE_DOMAIN
          || process.env.DB_HOST,
    port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD 
              || process.env.MYSQL_ROOT_PASSWORD
              || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME
  };

  console.log('[DB] 최종 설정:', {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    database: cfg.database,
    passwordSet: !!cfg.password
  });

  let missing = [];
  ['host','user','password','database'].forEach(k => {
    if (!cfg[k]) {
      missing.push(k);
      console.error(`❌ [DB] 누락: ${k}`);
    }
  });
  if (missing.length) {
    console.error('⚠️ [DB] 누락된 항목:', missing.join(', '));
  }

  pool = mysql.createPool({
    ...cfg,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// 연결 테스트
pool.getConnection()
  .then(c => {
    console.log(`✅ [DB] 연결 성공`);
    c.release();
  })
  .catch(e => {
    console.error('❌ [DB] 연결 실패:', e.message);
    console.error('    code:', e.code, 'errno:', e.errno);
  });

module.exports = pool;