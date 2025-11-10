const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const isProd = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
const localEnvPath = path.resolve(__dirname, '.env.local');
if (!isProd && fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
  console.log('ℹ️ 로컬 .env.local loaded');
} else {
  console.log('ℹ️ 프로덕션: .env.local skip');
}

const db = require('./db');
let initDb = async () => {};
try { initDb = require('./db-init'); } catch { console.log('ℹ️ db-init 없음, 스킵'); }

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ 서버 시작: ${PORT}`);
  try {
    await initDb();
    console.log('✅ DB 초기화 완료 시도');
  } catch (e) {
    console.error('⚠️ DB 초기화 오류:', e.message);
  }
});