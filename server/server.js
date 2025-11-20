const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('tiny'));

function parseUrl(url) {
  // mysql://user:pass@host:port/dbname
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: +u.port,
      user: u.username,
      password: u.password,
      database: u.pathname.replace('/', '')
    };
  } catch { return null; }
}

const urlCfg = parseUrl(process.env.RAILWAY_DATABASE_URL || '');
const cfg = {
  host: process.env.MYSQLHOST || (urlCfg?.host) || 'mysql.railway.internal',
  port: +(process.env.MYSQLPORT || urlCfg?.port || 3306),
  user: process.env.MYSQLUSER || (urlCfg?.user) || 'root',
  password: process.env.MYSQLPASSWORD || (urlCfg?.password),
  database: process.env.MYSQLDATABASE || (urlCfg?.database) || 'railway'
};

console.log('[DB CONFIG]', { ...cfg, passwordSet: !!cfg.password });

async function makePool(retries = 5) {
  let attempt = 0;
  while (attempt < retries) {
    attempt++;
    try {
      const pool = mysql.createPool({
        ...cfg,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 15000
      });
      await pool.query('SELECT 1');
      console.log('[DB] 연결 성공 attempt', attempt);
      return pool;
    } catch (e) {
      console.error(`[DB] 연결 실패 attempt ${attempt}:`, e.message);
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, attempt * 1500));
    }
  }
}

let pool;
makePool().then(p => pool = p).catch(e => {
  console.error('[DB] 최종 실패 종료:', e.message);
  process.exit(1);
});

app.get('/api/health', async (_req, res) => {
  if (!pool) return res.status(503).json({ ok: false, error: 'DB not ready' });
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// 디버그: 현재 변수/접속 테스트
app.get('/api/dbinfo', async (_req, res) => {
  res.json({
    ready: !!pool,
    cfg: { ...cfg, password: cfg.password ? '***' : null }
  });
});

// suppliers 라우트만 우선
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
      'SELECT id,name,created_at FROM suppliers WHERE name LIKE ? ORDER BY name LIMIT 50', [like]
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