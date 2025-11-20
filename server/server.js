const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('tiny'));

async function createPoolWithRetry(maxAttempts = 5) {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const pool = mysql.createPool({
        host: process.env.MYSQLHOST || 'mysql.railway.internal',
        port: +(process.env.MYSQLPORT || 3306),
        user: process.env.MYSQLUSER || 'root',
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE || 'railway',
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0
      });
      // 테스트 쿼리
      await pool.query('SELECT 1');
      console.log(`DB 연결 성공 (attempt ${attempt})`);
      return pool;
    } catch (e) {
      console.error(`DB 연결 실패 (attempt ${attempt}):`, e.message);
      if (attempt >= maxAttempts) throw e;
      await new Promise(r => setTimeout(r, attempt * 1000)); // 점진적 backoff
    }
  }
}

let pool;
(async () => {
  try {
    pool = await createPoolWithRetry();
  } catch (e) {
    console.error('최종 DB 연결 실패:', e.message);
    process.exit(1);
  }
})();

// 헬스체크
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

function mount(name, file) {
  const routerFactory = require(path.join(__dirname, '..', 'routes', file));
  app.use(`/api/${name}`, (req, res, next) => {
    if (!pool) return res.status(503).json({ message: 'DB not ready' });
    return routerFactory(pool)(req, res, next);
  });
}

// 필요한 라우트만
mount('suppliers', 'suppliers.js');

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, _req, res, _next) => {
  console.error('[API ERROR]', err);
  res.status(500).json({ message: 'server error', detail: err.message });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening :${PORT}`));