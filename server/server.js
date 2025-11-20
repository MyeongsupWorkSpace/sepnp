const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mysql = require('mysql2/promise');

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
const useUrl = !!urlCfg;
const cfg = useUrl ? {
  host: urlCfg.host,
  port: urlCfg.port,
  user: urlCfg.user,
  password: urlCfg.password,
  database: urlCfg.database
} : {
  host: process.env.MYSQLHOST,
  port: +(process.env.MYSQLPORT || 3306),
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE || 'railway'
};

const ssl = process.env.MYSQLSSL === '1' ? { rejectUnauthorized: false } : undefined;

const missing = [];
['host','port','user','password','database'].forEach(k => { if (!cfg[k]) missing.push(k); });

console.log('[DB CONFIG]', { ...cfg, passwordSet: !!cfg.password, ssl: !!ssl, source: useUrl?'url':'vars' });
if (missing.length) {
  console.error('✗ 누락된 필수 항목:', missing);
  console.error('→ 서버 서비스 Variables에 RAILWAY_DATABASE_URL (MYSQL_PUBLIC_URL 참조) 또는 MYSQLPASSWORD 등 추가 필요.');
}

const app = express();
app.use(express.json());
app.use(cors({ origin:true }));
app.use(morgan('tiny'));

let pool;
(async () => {
  if (missing.length) return; // 풀 생성 중단
  for (let i=1;i<=5;i++){
    try {
      pool = mysql.createPool({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        ssl,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 15000
      });
      await pool.query('SELECT 1');
      console.log('[DB] 연결 성공 attempt', i);
      break;
    } catch(e){
      console.error('[DB] 연결 실패 attempt', i, e.code||e.message);
      if (i===5) console.error('최종 실패');
      else await new Promise(r=>setTimeout(r, i*1200));
    }
  }
})();

app.get('/api/dbinfo', (_req,res)=>{
  res.json({
    ready: !!pool && !missing.length,
    missing,
    cfg: { host: cfg.host, port: cfg.port, user: cfg.user, database: cfg.database, ssl: !!ssl, password: cfg.password?'***':null }
  });
});

app.get('/api/health', async (_req,res)=>{
  if (!pool || missing.length) return res.status(503).json({ ok:false, error:'DB not ready' });
  try { await pool.query('SELECT 1'); res.json({ ok:true }); }
  catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

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