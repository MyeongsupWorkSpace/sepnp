const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일
app.use(express.static(path.join(__dirname, 'public')));

// DB 연결 (에러가 나도 서버는 시작됨)
const db = require('./db');

// DB 초기화 (선택)
let initDb;
try {
  initDb = require('./db-init');
} catch {
  console.log('ℹ️ db-init 없음');
  initDb = async () => {};
}

// API 라우트
app.use('/api/auth', require('./routes/auth'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));

// Railway Health Check용 루트 경로
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    time: new Date().toISOString(),
    env: process.env.RAILWAY_ENVIRONMENT || 'development'
  });
});

// SPA 라우팅 (맨 마지막에 위치)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ 서버 시작: http://0.0.0.0:${PORT}`);
  console.log(`📦 환경: ${process.env.RAILWAY_ENVIRONMENT || 'local'}`);
  
  try {
    await initDb();
    console.log('✅ DB 초기화 완료');
  } catch (e) {
    console.error('⚠️ DB 초기화 실패:', e.message);
  }
});