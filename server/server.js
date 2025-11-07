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

// 정적 파일 제공 (프론트엔드) ← 추가!
app.use(express.static(path.join(__dirname, '../sepnp-portal')));

// DB 연결
const db = require('./db');

// 라우트
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

// 루트 경로 (index.html) ← 추가!
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../sepnp-portal/index.html'));
});

// HTML 페이지들 ← 추가!
app.get('/*.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../sepnp-portal', req.path));
});

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

// 404 처리
app.use((req, res) => {
  res.status(404).json({ error: '요청한 경로를 찾을 수 없습니다.' });
});

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';
  
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
      }
    });
  });
  
  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ SEPNP 통합 서버 실행 중');
  console.log('═'.repeat(60));
  console.log(`  📡 로컬: http://localhost:${PORT}`);
  console.log(`  🌐 네트워크: http://${localIP}:${PORT}`);
  console.log(`  🔍 헬스체크: http://localhost:${PORT}/api/health`);
  console.log(`  🏠 프론트엔드: http://localhost:${PORT}/`);
  console.log(`  👤 인증 API: http://localhost:${PORT}/api/auth`);
  console.log(`  📦 제품 API: http://localhost:${PORT}/api/products`);
  console.log('═'.repeat(60) + '\n');
});