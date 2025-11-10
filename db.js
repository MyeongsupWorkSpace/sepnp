const path = require('path');
const fs = require('fs');

// .env 로드(로컬용). Railway에선 무시됨.
const envCandidates = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, 'server/.env')
];
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    break;
  }
}

const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME
};

console.log('[DB] 설정:', {
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  database: cfg.database,
  hasPassword: !!cfg.password
});

['host','user','password','database'].forEach(k => {
  if (!cfg[k]) console.error(`❌ [DB] 누락된 설정: ${k}`);
});

const pool = mysql.createPool({
  ...cfg,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// 연결 테스트(앱 중단 없음)
pool.getConnection()
  .then(c => { console.log(`✅ [DB] 연결 성공: ${cfg.host}:${cfg.port}/${cfg.database}`); c.release(); })
  .catch(e => { console.error('❌ [DB] 연결 실패:', e.message, '(host=', cfg.host, ')'); });

module.exports = pool;