const fs = require('fs');
const path = require('path');

// Railway 등 외부에서 MYSQLHOST 주입되면 .env(local) 로드 생략
const isProd = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
const localEnvPath = path.resolve(__dirname, '.env.local');
if (!isProd && fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
  console.log('ℹ️ 로컬 환경변수 로드 (.env.local)');
} else {
  console.log('ℹ️ 프로덕션: .env.local 무시');
}

const mysql = require('mysql2/promise');

// Railway 변수 우선
const cfg = {
  host: process.env.MYSQLHOST
        || process.env.RAILWAY_PRIVATE_DOMAIN
        || process.env.DB_HOST,
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME
};

console.log('[DB] 최종 설정:', {
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  database: cfg.database,
  passwordSet: !!cfg.password,
  sourceHostEnv: {
    MYSQLHOST: process.env.MYSQLHOST,
    RAILWAY_PRIVATE_DOMAIN: process.env.RAILWAY_PRIVATE_DOMAIN,
    DB_HOST: process.env.DB_HOST
  }
});

// 필수값 체크
let missing = [];
['host','user','password','database'].forEach(k => {
  if (!cfg[k]) {
    missing.push(k);
    console.error(`❌ [DB] 누락: ${k}`);
  }
});
if (missing.length) {
  console.error('⚠️ [DB] 누락된 항목 때문에 연결 실패 예상:', missing.join(', '));
}

const pool = mysql.createPool({
  ...cfg,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(c => {
    console.log(`✅ [DB] 연결 성공: ${cfg.host}:${cfg.port}/${cfg.database}`);
    c.release();
  })
  .catch(e => {
    console.error('❌ [DB] 연결 실패:', e.message);
    console.error('    code:', e.code, 'errno:', e.errno);
  });

module.exports = pool;