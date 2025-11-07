const express = require('express');
const router = express.Router();
const db = require('../db');

// 수주 테이블 자동 생성
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        order_no VARCHAR(50) UNIQUE NOT NULL,
        order_date DATE NOT NULL,
        customer_id VARCHAR(50),
        customer_name VARCHAR(200),
        product_id VARCHAR(50),
        product_name VARCHAR(200),
        quantity INT NOT NULL,
        unit_price DECIMAL(12,2),
        total_price DECIMAL(12,2),
        delivery_date DATE,
        status ENUM('대기', '진행중', '완료', '취소') DEFAULT '대기',
        note TEXT,
        created_by VARCHAR(20),
        created_by_name VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_no (order_no),
        INDEX idx_order_date (order_date),
        INDEX idx_customer_id (customer_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ 수주 테이블 준비 완료');
  } catch (error) {
    console.error('  ❌ 수주 테이블 생성 오류:', error);
  }
})();

// 수주 목록 조회
router.get('/', async (req, res) => {
  try {
    const { status, start_date, end_date } = req.query;
    
    let query = 'SELECT * FROM orders WHERE 1=1';
    let params = [];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (start_date) {
      query += ' AND order_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND order_date <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY order_date DESC, created_at DESC';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('  ❌ 수주 조회 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 수주 등록
router.post('/', async (req, res) => {
  try {
    const { 
      id, order_no, order_date, customer_id, customer_name, 
      product_id, product_name, quantity, unit_price, total_price, 
      delivery_date, status, note, created_by, created_by_name 
    } = req.body;
    
    await db.query(
      `INSERT INTO orders 
       (id, order_no, order_date, customer_id, customer_name, product_id, product_name, 
        quantity, unit_price, total_price, delivery_date, status, note, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, order_no, order_date, customer_id, customer_name, product_id, product_name, 
       quantity, unit_price, total_price, delivery_date, status || '대기', note, created_by, created_by_name]
    );
    
    console.log(`  ✅ 수주 등록: ${order_no}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('  ❌ 수주 등록 오류:', error);
    res.status(500).json({ ok: false, error: '등록 실패' });
  }
});

// 수주 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unit_price, total_price, delivery_date, status, note } = req.body;
    
    await db.query(
      `UPDATE orders SET 
        quantity = ?, unit_price = ?, total_price = ?, 
        delivery_date = ?, status = ?, note = ?
       WHERE id = ?`,
      [quantity, unit_price, total_price, delivery_date, status, note, id]
    );
    
    console.log(`  ✅ 수주 수정: ID ${id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('  ❌ 수주 수정 오류:', error);
    res.status(500).json({ ok: false, error: '수정 실패' });
  }
});

// 수주 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM orders WHERE id = ?', [id]);
    
    console.log(`  ✅ 수주 삭제: ID ${id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('  ❌ 수주 삭제 오류:', error);
    res.status(500).json({ ok: false, error: '삭제 실패' });
  }
});

module.exports = router;