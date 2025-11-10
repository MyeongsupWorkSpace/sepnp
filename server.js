const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config(); // 경로 제거

const db = require('./db');
const initDb = require('./db-init');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 정적 파일 (public 폴더)
app.use(express.static(path.join(__dirname, 'public')));

// API 라우트
app.use('/api/auth', require('./routes/auth'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// 서버 시작
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ 서버 포트 ${PORT}`);
  console.log(`🌍 ENV: ${process.env.NODE_ENV || 'development'}`);
  initDb().catch(e => console.error('⚠️ DB 초기화 실패:', e.message));
});