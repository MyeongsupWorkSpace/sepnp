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

// 제품 등록: body에 { code, name, description, price, supplier: { name, contact }, paper: { name, size, weight } }
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { code, name, description, price } = req.body;
    const supplier = req.body.supplier || {};
    const paper = req.body.paper || {};

    // 1) supplier upsert by name
    let supplierId = null;
    if (supplier && supplier.name) {
      const [rows] = await conn.query('SELECT id FROM suppliers WHERE name = ? LIMIT 1', [supplier.name]);
      if (rows.length) {
        supplierId = rows[0].id;
        // optional: update contact
        if (supplier.contact) {
          await conn.query('UPDATE suppliers SET contact=? WHERE id=?', [supplier.contact, supplierId]);
        }
      } else {
        const [r] = await conn.query('INSERT INTO suppliers (name, contact) VALUES (?, ?)', [supplier.name, supplier.contact || null]);
        supplierId = r.insertId;
      }
    }

    // 2) paper upsert by name
    let paperId = null;
    if (paper && paper.name) {
      const [rows2] = await conn.query('SELECT id FROM papers WHERE name = ? LIMIT 1', [paper.name]);
      if (rows2.length) {
        paperId = rows2[0].id;
        // optional: update size/weight
        await conn.query('UPDATE papers SET size = COALESCE(?, size), weight = COALESCE(?, weight) WHERE id = ?', [paper.size || null, paper.weight || null, paperId]);
      } else {
        const [r2] = await conn.query('INSERT INTO papers (name, size, weight) VALUES (?, ?, ?)', [paper.name, paper.size || null, paper.weight || null]);
        paperId = r2.insertId;
      }
    }

    // 3) insert product
    const [pr] = await conn.query(
      'INSERT INTO products (code, name, description, price, supplier_id, paper_id) VALUES (?, ?, ?, ?, ?, ?)',
      [code || null, name, description || null, price || 0, supplierId, paperId]
    );

    await conn.commit();
    res.status(201).json({ ok: true, productId: pr.insertId });
  } catch (err) {
    await conn.rollback();
    console.error('제품 등록 오류:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
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