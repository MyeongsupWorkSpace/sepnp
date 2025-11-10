const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// .env 로드: 루트(.env) → server/.env 순서로 탐색, Railway에선 환경변수 주입됨
const envCandidates = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, 'server/.env')
];
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    console.log(`ℹ️ .env loaded: ${p}`);
    break;
  }
}

const db = require('./db');

// db-init이 없는 경우에도 서버가 죽지 않도록 처리
let initDb = async () => {};
try {
  initDb = require('./db-init');
} catch (e) {
  console.log('ℹ️ db-init 모듈이 없어 초기화를 생략합니다.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일
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

// 루트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// 서버 시작
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ 서버 포트 ${PORT}`);
  console.log(`🌍 ENV: ${process.env.NODE_ENV || 'development'}`);
  try {
    await initDb();
    console.log('✅ DB 초기화 시도 완료');
  } catch (e) {
    console.error('⚠️ DB 초기화 실패:', e.message);
  }
});