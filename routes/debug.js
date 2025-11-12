const express = require('express');
const router = express.Router();
const db = require('../db');

// 요청 로깅 미들웨어
router.use((req, res, next) => {
  console.log('[DEBUG][REQ]', req.method, req.originalUrl, { ip: req.ip, time: new Date().toISOString() });
  next();
});

// DB 연결/환경 확인
router.get('/whoami', async (req, res) => {
  const [[info]] = await db.query('SELECT DATABASE() AS db, @@hostname AS host, NOW() AS now');
  res.json(info);
});

// 임시 테스트 테이블에 한 행 삽입
router.post('/insert-test', async (req, res) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS debug_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      actor VARCHAR(64),
      note VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const [r] = await db.execute(
    'INSERT INTO debug_events(actor, note) VALUES (?, ?)',
    [req.body.actor || 'tester', req.body.note || 'from debug']
  );
  console.log('[DEBUG][INSERT]', { affectedRows: r.affectedRows, insertId: r.insertId });
  res.json({ ok: true, insertId: r.insertId });
});

// 최근 이벤트 보기
router.get('/events', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM debug_events ORDER BY id DESC LIMIT 20');
  res.json(rows);
});

module.exports = router;