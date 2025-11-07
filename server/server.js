const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 정적 서빙
app.use(express.static(path.resolve(__dirname, '../sepnp-portal')));

// DB 연결
const db = require('./db');

// 라우트
const authRoutes = require('./routes/auth');
const assignmentRoutes = require('./routes/assignments');
const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');

// API 라우트들
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);

// 루트/HTML 라우트
app.get('/', (_req, res) =>
  res.sendFile(path.resolve(__dirname, '../sepnp-portal/index.html'))
);
app.get('/*.html', (req, res) =>
  res.sendFile(path.resolve(__dirname, '../sepnp-portal', req.path))
);

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'SEPNP API 서버 정상 작동 중'
  });
});

// 통계 API
app.get('/api/stats', async (req, res) => {
  try {
    const [empCount] = await db.query('SELECT COUNT(*) as count FROM employees WHERE status = "active"');
    const [productCount] = await db.query('SELECT COUNT(*) as count FROM products WHERE status = "active"');
    const [orderCount] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status != "취소"');
    const [assignmentCount] = await db.query('SELECT COUNT(*) as count FROM worker_assignments WHERE date = CURDATE()');
    
    res.json({
      employees: empCount[0].count,
      products: productCount[0].count,
      orders: orderCount[0].count,
      assignments: assignmentCount[0].count
    });
  } catch (error) {
    console.error('  ❌ 통계 조회 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 마지막 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// 0.0.0.0에 바인딩(중요)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on ${PORT}`);
});