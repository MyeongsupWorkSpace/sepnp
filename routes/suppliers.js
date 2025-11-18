const express = require('express');
const router = express.Router();
const db = require('../db'); // 기존 db 모듈( mysql2 pool ) 사용 가정

// GET /api/suppliers
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, contact, phone, email FROM suppliers ORDER BY name LIMIT 1000');
    res.json(rows);
  } catch (e) {
    console.error('[suppliers.GET] error:', e);
    res.status(500).json({ error: e.message || 'server error' });
  }
});

// POST /api/suppliers { name, contact, phone, email }
router.post('/', async (req, res) => {
  try {
    console.log('[suppliers.POST] body:', req.body);
    const { name, contact, phone, email } = req.body;
    if(!name || !name.trim()) {
      console.warn('[suppliers.POST] invalid name:', name);
      return res.status(400).json({ error: 'name required' });
    }

    // 중복 검사
    const [exists] = await db.query('SELECT id, name FROM suppliers WHERE name = ? LIMIT 1', [name.trim()]);
    if(exists && exists.length){
      console.log('[suppliers.POST] existed ->', exists[0]);
      return res.status(200).json({ id: exists[0].id, name: exists[0].name, existed: true });
    }

    const [r] = await db.query('INSERT INTO suppliers (name, contact, phone, email) VALUES (?, ?, ?, ?)', [name.trim(), contact||null, phone||null, email||null]);
    console.log('[suppliers.POST] inserted id=', r.insertId);
    return res.status(201).json({ id: r.insertId, name: name.trim() });

  } catch (e) {
    console.error('[suppliers.POST] error:', e);
    // 개발 환경에서는 상세 메시지, 운영 시엔 간단히
    res.status(500).json({ error: (e && e.message) ? e.message : 'server error' });
  }
});

module.exports = router;