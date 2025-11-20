const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const dns = require('dns');

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));
app.use(morgan('tiny'));

function parseRailwayUrl(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: +u.port,
      user: u.username,
      password: u.password,
      database: u.pathname.slice(1)
    };
  } catch {
    return null;
  }
}

const urlCfg = parseRailwayUrl(process.env.RAILWAY_DATABASE_URL || '');
const cfg = {
  host: process.env.MYSQLHOST || urlCfg?.host,
  port: +(process.env.MYSQLPORT || urlCfg?.port || 3306),
  user: process.env.MYSQLUSER || urlCfg?.user || 'root',
  password: process.env.MYSQLPASSWORD || urlCfg?.password,
  database: process.env.MYSQLDATABASE || urlCfg?.database || 'railway',
  ssl: process.env.MYSQLSSL === '1' ? { rejectUnauthorized: false } : undefined
};

console.log('[DB CONFIG INIT]', {
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  database: cfg.database,
  passwordSet: !!cfg.password,
  sslEnabled: !!cfg.ssl
});

async function resolveHostDebug(host) {
  return new Promise(r => {
    if (!host) return r({ error: 'no-host' });
    dns.lookup(host, (err, address) => {
      if (err) return r({ error: err.code || err.message });
      r({ address });
    });
  });
}

async function connectWithRetry(max = 6) {
  for (let i = 1; i <= max; i++) {
    try {
      const pool = mysql.createPool({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 15000,
        ssl: cfg.ssl
      });
      await pool.query('SELECT 1');
      console.log(`[DB] 연결 성공 attempt ${i}`);
      return pool;
    } catch (e) {
      console.error(`[DB] 연결 실패 attempt ${i}:`, e.code || e.message);
      if (i === max) throw e;
      await new Promise(r => setTimeout(r, i * 1500));
    }
  }
}

let pool;
(async () => {
  // DNS 먼저
  const dnsInfo = await resolveHostDebug(cfg.host);
  console.log('[DNS RESOLVE]', dnsInfo);
  try {
    pool = await connectWithRetry();
  } catch (e) {
    console.error('[DB] 최종 실패:', e.message);
    // pool 미생성 상태 유지 (진단 엔드포인트로 상태 확인)
  }
})();

// 진단 엔드포인트
app.get('/api/dbinfo', async (_req, res) => {
  const dnsInfo = await resolveHostDebug(cfg.host);
  res.json({
    ready: !!pool,
    cfg: {
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      database: cfg.database,
      password: cfg.password ? '***' : null,
      ssl: !!cfg.ssl
    },
    dns: dnsInfo
  });
});

app.get('/api/health', async (_req, res) => {
  if (!pool) return res.status(503).json({ ok: false, error: 'DB not ready' });
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
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