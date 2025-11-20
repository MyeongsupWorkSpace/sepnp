const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('tiny'));

// DB 풀 (라우트 파일에서 사용하도록 주입)
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'mysql.railway.internal',
  port: +(process.env.MYSQLPORT || 3306),
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 5,
  multipleStatements: false
});

// 헬스체크
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// 라우트 로더 헬퍼
function mount(name, file) {
  const router = require(file)(pool);
  app.use(`/api/${name}`, router);
}

// 라우트 mount (suppliers 등)
mount('suppliers', path.join(__dirname, '..', 'routes', 'suppliers.js'));
mount('products', path.join(__dirname, '..', 'routes', 'products.js'));
mount('orders', path.join(__dirname, '..', 'routes', 'orders.js'));
mount('customers', path.join(__dirname, '..', 'routes', 'customers.js'));
mount('users', path.join(__dirname, '..', 'routes', 'users.js'));
mount('assignments', path.join(__dirname, '..', 'routes', 'assignments.js'));
mount('auth', path.join(__dirname, '..', 'routes', 'auth.js'));
mount('debug', path.join(__dirname, '..', 'routes', 'debug.js'));

// 정적 파일
app.use(express.static(path.join(__dirname, '..', 'public')));

// 에러 핸들러
app.use((err, _req, res, _next) => {
  console.error('[API ERROR]', err);
  res.status(500).json({ message: 'server error', detail: err.message });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening :${PORT}`));