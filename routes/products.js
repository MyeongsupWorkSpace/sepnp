const express = require('express');
const router = express.Router();
const db = require('../db');

// 제품 목록 조회
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    
    let query = 'SELECT * FROM products WHERE 1=1';
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
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('  ❌ 제품 조회 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 제품 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('  ❌ 제품 상세 조회 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 제품 등록
router.post('/', async (req, res) => {
  try {
    const { id, code, name, category, spec, unit, unit_price, stock, min_stock, status } = req.body;
    
    await db.query(
      `INSERT INTO products (id, code, name, category, spec, unit, unit_price, stock, min_stock, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, name, category, spec, unit, unit_price || 0, stock || 0, min_stock || 0, status || 'active']
    );
    
    console.log(`  ✅ 제품 등록: ${name} (${code})`);
    res.json({ ok: true });
  } catch (error) {
    console.error('  ❌ 제품 등록 오류:', error);
    res.status(500).json({ ok: false, error: '등록 실패' });
  }
});

// 제품 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, category, spec, unit, unit_price, stock, min_stock, status } = req.body;
    
    await db.query(
      `UPDATE products SET 
        code = ?, name = ?, category = ?, spec = ?, unit = ?, 
        unit_price = ?, stock = ?, min_stock = ?, status = ?
       WHERE id = ?`,
      [code, name, category, spec, unit, unit_price, stock, min_stock, status, id]
    );
    
    console.log(`  ✅ 제품 수정: ${name}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('  ❌ 제품 수정 오류:', error);
    res.status(500).json({ ok: false, error: '수정 실패' });
  }
});

// 제품 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    
    console.log(`  ✅ 제품 삭제: ID ${id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('  ❌ 제품 삭제 오류:', error);
    res.status(500).json({ ok: false, error: '삭제 실패' });
  }
});

// 재고 업데이트
router.patch('/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    
    await db.query('UPDATE products SET stock = ? WHERE id = ?', [stock, id]);
    
    console.log(`  ✅ 재고 업데이트: ID ${id} → ${stock}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('  ❌ 재고 업데이트 오류:', error);
    res.status(500).json({ ok: false, error: '업데이트 실패' });
  }
});

module.exports = router;