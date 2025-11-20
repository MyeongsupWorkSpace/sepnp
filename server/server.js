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

function parseDbUrl(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: +u.port,
      user: u.username,
      password: u.password,
      database: u.pathname.slice(1)
    };
  } catch { return null; }
}

const urlCfg = parseDbUrl(process.env.RAILWAY_DATABASE_URL || '');
const dbCfg = {
  host: process.env.MYSQLHOST || urlCfg?.host,
  port: +(process.env.MYSQLPORT || urlCfg?.port || 3306),
  user: process.env.MYSQLUSER || urlCfg?.user || 'root',
  password: process.env.MYSQLPASSWORD || urlCfg?.password,
  database: process.env.MYSQLDATABASE || urlCfg?.database || 'railway',
  ssl: process.env.MYSQLSSL === '1' ? { rejectUnauthorized: false } : undefined
};

console.log('[DB CONFIG INIT]', {
  host: dbCfg.host, port: dbCfg.port, user: dbCfg.user,
  database: dbCfg.database, passwordSet: !!dbCfg.password, sslEnabled: !!dbCfg.ssl
});

async function dnsResolve(host) {
  return new Promise(r => {
    if (!host) return r({ error: 'NO_HOST' });
    dns.lookup(host, (err, addr) => r(err ? { error: err.code || err.message } : { address: addr }));
  });
}

async function connectWithRetry(max = 6) {
  for (let i = 1; i <= max; i++) {
    try {
      const pool = mysql.createPool({
        host: dbCfg.host,
        port: dbCfg.port,
        user: dbCfg.user,
        password: dbCfg.password,
        database: dbCfg.database,
        ssl: dbCfg.ssl,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 15000
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
  console.log('[DNS RESOLVE]', await dnsResolve(dbCfg.host));
  try { pool = await connectWithRetry(); }
  catch (e) { console.error('[DB] 최종 실패:', e.message); }
})();

// 진단
app.get('/api/dbinfo', async (_req, res) => {
  res.json({
    ready: !!pool,
    cfg: { host: dbCfg.host, port: dbCfg.port, user: dbCfg.user, database: dbCfg.database, ssl: !!dbCfg.ssl, password: dbCfg.password ? '***' : null },
    dns: await dnsResolve(dbCfg.host)
  });
});

app.get('/api/health', async (_req, res) => {
  if (!pool) return res.status(503).json({ ok: false, error: 'DB not ready' });
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// 간단 API (저장 확인용)
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
    const [rows] = await pool.execute('SELECT id,name,created_at FROM suppliers WHERE name LIKE ? ORDER BY name LIMIT 50', [like]);
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