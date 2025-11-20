const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));
app.use(morgan('tiny'));

function loadCfg() {
  let parsed = null;
  if (process.env.RAILWAY_DATABASE_URL) {
    try {
      const u = new URL(process.env.RAILWAY_DATABASE_URL);
      parsed = {
        host: u.hostname,
        port: +u.port,
        user: u.username,
        password: u.password,
        database: u.pathname.slice(1)
      };
    } catch {}
  }
  return {
    host: process.env.MYSQLHOST || parsed?.host,
    port: +(process.env.MYSQLPORT || parsed?.port || 3306),
    user: process.env.MYSQLUSER || parsed?.user || 'root',
    password: process.env.MYSQLPASSWORD || parsed?.password,
    database: process.env.MYSQLDATABASE || parsed?.database || 'railway'
  };
}

const dbCfg = loadCfg();
console.log('[DB CONFIG]', { ...dbCfg, passwordSet: !!dbCfg.password });

async function connectRetry(max = 6) {
  for (let i = 1; i <= max; i++) {
    try {
      const pool = mysql.createPool({
        ...dbCfg,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 15000
      });
      await pool.query('SELECT 1');
      console.log('[DB] 연결 성공 attempt', i);
      return pool;
    } catch (e) {
      console.error(`[DB] 연결 실패 attempt ${i}: ${e.code || e.message}`);
      if (i === max) throw e;
      await new Promise(r => setTimeout(r, i * 1200));
    }
  }
}

let pool;
connectRetry().then(p => pool = p).catch(e => {
  console.error('[DB] 최종 실패(계속 재시도 없음):', e.message);
});

app.get('/api/dbinfo', (_req, res) => {
  res.json({ ready: !!pool, cfg: { ...dbCfg, password: dbCfg.password ? '***' : null } });
});

app.get('/api/health', async (_req, res) => {
  if (!pool) return res.status(503).json({ ok: false, error: 'DB not ready' });
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Suppliers
app.post('/api/suppliers', async (req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ message: 'DB not ready' });
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'name required' });
    await pool.execute('INSERT INTO suppliers(name) VALUES(?)', [name]);
    res.status(201).json({ name });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'duplicate' });
    next(e);
  }
});

app.get('/api/suppliers', async (req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ message: 'DB not ready' });
    const q = (req.query.q || '').trim();
    const like = `%${q}%`;
    const [rows] = await pool.execute(
      'SELECT id,name,created_at FROM suppliers WHERE name LIKE ? ORDER BY name LIMIT 50',
      [like]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Customers
app.post('/api/customers', async (req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ message: 'DB not ready' });
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'name required' });
    await pool.execute('INSERT INTO customers(name) VALUES(?)', [name]);
    res.status(201).json({ name });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'duplicate' });
    next(e);
  }
});

app.get('/api/customers', async (req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ message: 'DB not ready' });
    const q = (req.query.q || '').trim();
    const like = `%${q}%`;
    const [rows] = await pool.execute(
      'SELECT id,name,created_at FROM customers WHERE name LIKE ? ORDER BY name LIMIT 50',
      [like]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Orders
app.post('/api/orders', async (req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ message: 'DB not ready' });
    const customerId = +(req.body?.customer_id || 0);
    const orderNo = (req.body?.order_no || '').trim();
    if (!customerId || !orderNo) return res.status(400).json({ message: 'customer_id & order_no required' });
    await pool.execute(
      'INSERT INTO orders(customer_id, order_no) VALUES(?,?)',
      [customerId, orderNo]
    );
    res.status(201).json({ order_no: orderNo });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'duplicate' });
    next(e);
  }
});

app.get('/api/orders', async (_req, res, next) => {
  try {
    if (!pool) return res.status(503).json({ message: 'DB not ready' });
    const [rows] = await pool.execute(
      `SELECT o.id,o.order_no,o.status,o.created_at,
              c.name AS customer_name
       FROM orders o JOIN customers c ON o.customer_id=c.id
       ORDER BY o.id DESC LIMIT 50`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, _req, res, _next) => {
  console.error('[API ERROR]', err);
  res.status(500).json({ message: 'server error', detail: err.message });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening :${PORT}`));