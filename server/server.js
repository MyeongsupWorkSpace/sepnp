const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

// MySQL 풀
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: +process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 5,
  namedPlaceholders: true,
});

// 헬스체크
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// 거래처 생성
app.post('/api/suppliers', async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'name required' });
    await pool.query('INSERT INTO suppliers(name) VALUES(?)', [name]);
    res.status(201).json({ id: null, name });
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'duplicate' });
    }
    console.error('POST /api/suppliers', e);
    res.status(500).json({ message: 'server error' });
  }
});

// 거래처 검색(선택)
app.get('/api/suppliers', async (req, res) => {
  const q = (req.query.q || '').trim();
  const like = `%${q}%`;
  const [rows] = await pool.query('SELECT id, name FROM suppliers WHERE name LIKE ? ORDER BY name LIMIT 20', [like]);
  res.json(rows);
});

// 정적(선택: 같은 서비스에서 프런트 서빙 시)
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`server listening on :${PORT}`));