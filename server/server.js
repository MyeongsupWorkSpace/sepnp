const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('tiny'));

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

// 간단 ping (30초마다)
setInterval(async () => {
  try { await pool.query('SELECT 1'); }
  catch (e) { console.error('[PING FAIL]', e.message); }
}, 30000);

// 헬스체크
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

function mount(name, rel) {
  const router = require(path.join(__dirname, '..', 'routes', rel))(pool);
  app.use(`/api/${name}`, router);
}

// 필요한 라우트만 남김 (중복/미사용 제거 가능)
mount('suppliers', 'suppliers.js');
mount('products', 'products.js');
mount('orders', 'orders.js');
mount('customers', 'customers.js');
mount('users', 'users.js');
mount('assignments', 'assignments.js');
mount('auth', 'auth.js');
mount('debug', 'debug.js');

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, _req, res, _next) => {
  console.error('[API ERROR]', err);
  res.status(500).json({ message: 'server error', detail: err.message });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening :${PORT}`));