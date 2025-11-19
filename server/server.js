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
  multipleStatements: true
});

// 헬스체크
app.get('/api/health', async (_req,res) => {
  try { await pool.query('SELECT 1'); res.json({ ok:true }); }
  catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// 거래처(테이블 자동보장)
async function ensureSuppliers() {
  await pool.query(`CREATE TABLE IF NOT EXISTS suppliers(
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    contact VARCHAR(120), phone VARCHAR(40), email VARCHAR(120),
    address VARCHAR(255), memo TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;`);
}
app.post('/api/suppliers', async (req,res,next)=>{
  try {
    const name = (req.body?.name||'').trim();
    if(!name) return res.status(400).json({ msg:'name required' });
    await ensureSuppliers();
    await pool.execute('INSERT INTO suppliers(name) VALUES(?)',[name]);
    res.status(201).json({ name });
  } catch(e){
    if(e.code==='ER_DUP_ENTRY') return res.status(409).json({ msg:'duplicate' });
    next(e);
  }
});
app.get('/api/suppliers', async (req,res,next)=>{
  try {
    await ensureSuppliers();
    const q = (req.query.q||'').trim();
    const like = `%${q}%`;
    const [rows] = await pool.execute(
      'SELECT id,name FROM suppliers WHERE name LIKE ? ORDER BY name LIMIT 50',[like]
    );
    res.json(rows);
  } catch(e){ next(e); }
});

// 정적 파일
app.use(express.static(path.join(__dirname,'..','public')));

// 에러 핸들러
app.use((err,_req,res,_next)=>{
  console.error('[API ERROR]', err);
  res.status(500).json({ msg:'server error', detail:err.message });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=> console.log(`Server listening :${PORT}`));