require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const initDb = require('./db-init');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 프론트엔드 정적 파일 서빙
app.use(express.static(path.resolve(__dirname, '../sepnp-portal')));

// API 라우트
const authRoutes = require('./routes/auth');
const assignmentRoutes = require('./routes/assignments');
const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');

app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'SEPNP API 서버 정상 작동 중',
    env: process.env.NODE_ENV || 'development'
  });
});

// 통계 API (대시보드용)
app.get('/api/stats', async (req, res) => {
  try {
    const [empCount] = await db.query('SELECT COUNT(*) as count FROM employees WHERE status = "active"');
    const [prodCount] = await db.query('SELECT COUNT(*) as count FROM products WHERE status = "active"');
    const [orderCount] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status != "취소"');

    res.json({
      employees: empCount[0].count,
      products: prodCount[0].count,
      orders: orderCount[0].count
    });
  } catch (err) {
    console.error('통계 조회 실패:', err);
    res.status(500).json({ error: '통계 조회 실패' });
  }
});

// 루트 및 HTML 라우트
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../sepnp-portal/index.html'));
});

app.get('/*.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../sepnp-portal', req.path));
});

// 404 처리
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 서버 시작 + DB 초기화
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ SEPNP 서버 실행 중: http://localhost:${PORT}`);
  console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
  
  // DB 스키마 초기화 (비동기, 서버 시작은 차단 안 함)
  initDb().catch(err => {
    console.error('⚠️ DB 초기화 실패했지만 서버는 계속 실행됩니다:', err.message);
  });
});