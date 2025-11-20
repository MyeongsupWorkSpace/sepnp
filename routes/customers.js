const express = require('express');
const db = require('../db');

// 거래처 테이블 자동 생성
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        category ENUM('매출처', '매입처', '양방') DEFAULT '매출처',
        ceo VARCHAR(100),
        business_no VARCHAR(20),
        tel VARCHAR(20),
        fax VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        note TEXT,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_category (category),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ 거래처 테이블 준비 완료');
  } catch (error) {
    console.error('  ❌ 거래처 테이블 생성 오류:', error);
  }
})();

module.exports = (pool) => {
  const r = express.Router();

  // 거래처 등록
  r.post('/', async (req, res, next) => {
    try {
      const { id, code, name, category, ceo, business_no, tel, fax, email, address, note, status } = req.body;
      const _id = id || crypto.randomUUID();
      
      await pool.execute(
        `INSERT INTO customers (id, code, name, category, ceo, business_no, tel, fax, email, address, note, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [_id, code, name, category, ceo, business_no, tel, fax, email, address, note, status || 'active']
      );
      
      console.log(`  ✅ 거래처 등록: ${name}`);
      res.json({ ok: true });
    } catch (error) {
      console.error('  ❌ 거래처 등록 오류:', error);
      res.status(500).json({ ok: false, error: '등록 실패' });
    }
  });

  // 거래처 목록 조회
  r.get('/', async (req, res, next) => {
    try {
      const { category, status } = req.query;
      
      let query = 'SELECT * FROM customers WHERE 1=1';
      let params = [];
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const [rows] = await pool.execute(query, params);
      res.json(rows);
    } catch (e) { next(e); }
  });

  // 거래처 수정
  r.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { code, name, category, ceo, business_no, tel, fax, email, address, note, status } = req.body;
      
      await db.query(
        `UPDATE customers SET 
          code = ?, name = ?, category = ?, ceo = ?, business_no = ?, 
          tel = ?, fax = ?, email = ?, address = ?, note = ?, status = ?
         WHERE id = ?`,
        [code, name, category, ceo, business_no, tel, fax, email, address, note, status, id]
      );
      
      console.log(`  ✅ 거래처 수정: ${name}`);
      res.json({ ok: true });
    } catch (error) {
      console.error('  ❌ 거래처 수정 오류:', error);
      res.status(500).json({ ok: false, error: '수정 실패' });
    }
  });

  // 거래처 삭제
  r.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM customers WHERE id = ?', [id]);
      
      console.log(`  ✅ 거래처 삭제: ID ${id}`);
      res.json({ ok: true });
    } catch (error) {
      console.error('  ❌ 거래처 삭제 오류:', error);
      res.status(500).json({ ok: false, error: '삭제 실패' });
    }
  });

  return { handle: r };
};