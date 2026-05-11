const express = require('express');
const router = express.Router();
const { getDB } = require('../db/init');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'lottery-secret-2024';

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

// 获取所有配置（公开接口）
router.get('/', (req, res) => {
  const db = getDB();
  let configs;
  try {
    configs = db.queryAll('SELECT key, value, type, category, label FROM config_fields');
  } catch(e) {
    configs = [];
  }
  
  const result = {};
  (configs || []).forEach(c => { 
    result[c.key] = { value: c.value, type: c.type, category: c.category, label: c.label }; 
  });
  res.json(result);
});

// 更新配置
router.put('/:key', verifyToken, (req, res) => {
  const db = getDB();
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: '缺少value参数' });

  // 如果更新的是表单字段定义，需要验证JSON格式
  if (req.params.key === 'custom_form_fields') {
    try {
      JSON.parse(value); // 验证JSON格式
    } catch (e) {
      return res.status(400).json({ error: 'JSON格式错误: ' + e.message });
    }
  }

  db.run("UPDATE config_fields SET value = ? WHERE key = ?", [value, req.params.key]);
  db.save();

  res.json({ success: true });
});

// 批量更新配置
router.put('/batch/update', verifyToken, (req, res) => {
  const db = getDB();
  const { configs } = req.body;

  if (!configs || !Array.isArray(configs)) return res.status(400).json({ error: '参数错误' });

  (configs).forEach(({ key, value }) => {
    try {
      db.run("UPDATE config_fields SET value = ? WHERE key = ?", [value, key]);
    } catch(e) {}
  });

  db.save();
  res.json({ success: true });
});

module.exports = router;
