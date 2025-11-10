const fs = require('fs');
const path = require('path');

const isProd = process.env.RAILWAY_ENVIRONMENT === 'production' 
               || process.env.NODE_ENV === 'production';

if (!isProd) {
  const localEnvPath = path.resolve(__dirname, '.env.local');
  if (fs.existsSync(localEnvPath)) {
    require('dotenv').config({ path: localEnvPath });
    console.log('ℹ️ 로컬 .env.local loaded');
  }
} else {
  console.log('ℹ️ 프로덕션: .env.local skip');
}

const mysql = require('mysql2/promise');

// 개별 변수 사용 (MYSQL_URL 문제 회피)
const cfg = {
  host: process.env.MYSQLHOST || 'mysql.railway.internal',
  port: parseInt(process.env.MYSQLPORT || '3306', 10),
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE || 'railway'
};

console.log('[DB] 연결 설정:', {
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  database: cfg.database,
  passwordSet: !!cfg.password,
  passwordLength: cfg.password ? cfg.password.length : 0
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
  console.error('⚠️ [DB] 누락된 항목:', missing.join(', '));
  console.error('⚠️ [DB] 현재 환경변수:', {
    MYSQLHOST: process.env.MYSQLHOST,
    MYSQLPORT: process.env.MYSQLPORT,
    MYSQLUSER: process.env.MYSQLUSER,
    MYSQLPASSWORD: process.env.MYSQLPASSWORD ? 'SET' : 'NOT SET',
    MYSQLDATABASE: process.env.MYSQLDATABASE
  });
}

const pool = mysql.createPool({
  ...cfg,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 30000,
  queueLimit: 0
});

pool.getConnection()
  .then(c => {
    console.log(`✅ [DB] MySQL 연결 성공: ${cfg.host}:${cfg.port}/${cfg.database}`);
    c.release();
  })
  .catch(e => {
    console.error('❌ [DB] 연결 실패:', e.message);
    console.error('    code:', e.code);
    if (e.code === 'ENOTFOUND') {
      console.error('    → 호스트를 찾을 수 없음. Private Network 확인 필요');
    } else if (e.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('    → 비밀번호가 틀렸습니다');
    }
  });

module.exports = pool;