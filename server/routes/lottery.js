const express = require('express');
const router = express.Router();
const { getDB } = require('../db/init');
const multer = require('multer');
const path = require('path');

// 使用内存存储（适配 Railway 无状态环境）
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  }
});

// 奖品图片上传 - 返回 Base64
router.post('/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: '上传失败：' + err.message });
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    
    // 转换为 Base64 Data URL，直接存入数据库
    const ext = path.extname(req.file.originalname).toLowerCase();
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    const mime = mimeMap[ext] || 'image/jpeg';
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${base64}`;
    
    res.json({ url: dataUrl });
  });
});

// 获取页面配置（支持分类）
router.get('/config', (req, res) => {
  const db = getDB();
  let configs;
  try {
    configs = db.queryAll('SELECT * FROM config_fields');
  } catch(e) {
    configs = [];
  }
  
  const configMap = {};
  ((configs || [])).forEach(c => { 
    configMap[c.key] = c.value; 
    configMap[`_meta_${c.key}`] = { type: c.type, category: c.category, label: c.label };
  });

  // 按分类获取奖品列表
  const categories = ['bowen', 'aisee'];
  const prizesByCategory = {};
  for (const cat of categories) {
    try {
      const catPrizes = db.queryAll(
        "SELECT id, name, image, remaining_stock, category FROM prizes WHERE is_active = 1 AND remaining_stock > 0 AND category = ? ORDER BY sort_order, id",
        [cat]
      );
      prizesByCategory[cat] = catPrizes || [];
    } catch(e) {
      prizesByCategory[cat] = [];
    }
  }

  // 获取所有可用奖品（兼容旧逻辑）
  let allPrizes = [];
  try {
    allPrizes = db.queryAll(
      "SELECT id, name, image, remaining_stock FROM prizes WHERE is_active = 1 AND remaining_stock > 0 ORDER BY sort_order, id"
    );
  } catch(e) {}

  // 获取各分类抽奖券数量
  const ticketsByCategory = {};
  for (const cat of categories) {
    try {
      const ticket = db.queryOne("SELECT total_tickets FROM ticket_pools WHERE category = ?", [cat]);
      ticketsByCategory[cat] = ticket ? ticket.total_tickets : 50;
    } catch(e) {
      ticketsByCategory[cat] = 50;
    }
  }

  configMap._prizes = allPrizes || [];
  configMap._prizesByCategory = prizesByCategory;
  configMap._hasPrizes = (allPrizes || []).length > 0 && (allPrizes || []).some(p => p.remaining_stock > 0);
  configMap._tickets = ticketsByCategory;

  res.json(configMap);
});

// 验证用户资格（根据工号）
router.get('/check/:employeeId', (req, res) => {
  const db = getDB();
  const user = db.queryOne(
    "SELECT * FROM users WHERE employee_id = ? AND is_active = 1", 
    [decodeURIComponent(req.params.employeeId)]
  );

  if (!user) {
    return res.json({ eligible: false, reason: 'not_in_whitelist' });
  }
  if (user.has_drawn) {
    return res.json({ eligible: false, reason: 'already_drawn', user });
  }

  // 检查是否还有奖品
  const hasStock = db.queryOne('SELECT COUNT(*) as cnt FROM prizes WHERE is_active = 1 AND remaining_stock > 0');
  if (!hasStock || hasStock.cnt === 0) {
    return res.json({ eligible: false, reason: 'no_stock' });
  }

  res.json({ eligible: true, user });
});

// 执行抽奖（支持按分类抽取）
router.post('/draw', (req, res) => {
  const db = getDB();
  const { category } = req.body; // category: 'bowen' | 'aisee'
  const cat = (category === 'aisee') ? 'aisee' : 'bowen';

  // 获取该分类有库存的奖品
  const availablePrizes = db.queryAll(
    "SELECT * FROM prizes WHERE is_active = 1 AND remaining_stock > 0 AND category = ? ORDER BY sort_order, id",
    [cat]
  );

  if (!availablePrizes || !availablePrizes.length) {
    return res.status(403).json({ success: false, error: `${cat === 'bowen' ? '博闻多识一堂课' : 'AISee实战沙龙'}的奖品已抽完` });
  }

  // 检查该分类的抽奖券是否还有
  const ticketInfo = db.queryOne("SELECT total_tickets FROM ticket_pools WHERE category = ?", [cat]);
  let ticketCount = ticketInfo ? ticketInfo.total_tickets : 50;
  
  // 查询该分类已抽次数
  const drawnCount = db.queryOne(
    "SELECT COUNT(*) as cnt FROM lottery_records lr JOIN prizes p ON lr.prize_id = p.id WHERE p.category = ?",
    [cat]
  );
  const alreadyDrawn = drawnCount ? drawnCount.cnt : 0;

  if (alreadyDrawn >= ticketCount) {
    return res.status(403).json({ success: false, error: `${cat === 'bowen' ? '博闻多识一堂课' : 'AISee实战沙龙'}的抽奖券已用完` });
  }

  // 随机抽取
  const prize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)];

  try {
    // 插入中奖记录（匿名用户）
    db.run(`
      INSERT INTO lottery_records (user_id, prize_id, prize_name)
      VALUES (0, ?, ?)
    `, [prize.id, prize.name]);

    const recordId = db.lastInsertId();

    db.run("UPDATE prizes SET remaining_stock = remaining_stock - 1 WHERE id = ?", [prize.id]);

    db.save();

    res.json({
      success: true,
      category: cat,
      prize: {
        id: prize.id,
        name: prize.name,
        image: prize.image,
        description: prize.description,
        category: cat
      },
      recordId
    });
  } catch (e) {
    console.error('抽奖出错:', e);
    res.status(500).json({ success: false, error: '抽奖失败，请重试' });
  }
});

// 提交领奖信息（简化版，只需领取方式）
router.post('/claim', (req, res) => {
  const db = getDB();
  const { prizeId, deliveryMethod } = req.body;

  if (!prizeId || !deliveryMethod) {
    return res.status(400).json({ success: false, error: '请选择领取方式' });
  }

  try {
    // 找到最近一条该奖品的中奖记录且未填领奖信息
    const record = db.queryOne(
      "SELECT * FROM lottery_records WHERE prize_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1",
      [prizeId]
    );

    if (!record) {
      return res.status(400).json({ success: false, error: '未找到对应的中奖记录' });
    }

    // 保存领取方式
    db.run("INSERT OR REPLACE INTO claim_info (record_id, user_id, field_key, field_value) VALUES (?, 0, 'deliveryMethod', ?)", [record.id, deliveryMethod]);

    // 更新状态
    db.run(
      "UPDATE lottery_records SET status='claimed', claim_time=datetime('now'), claim_method=? WHERE id=?",
      [deliveryMethod, record.id]
    );

    db.save();
    res.json({ success: true });
  } catch (e) {
    console.error('提交领奖信息出错:', e);
    res.status(500).json({ success: false, error: '提交失败，请重试' });
  }
});

// 原有接口保留兼容
router.post('/claim/:recordId', (req, res) => {
  const db = getDB();
  const recordId = parseInt(req.params.recordId);

  const record = db.queryOne('SELECT * FROM lottery_records WHERE id = ?', [recordId]);
  if (!record) return res.status(404).json({ error: '记录不存在' });

  const { fields } = req.body;
  const claimMethod = req.body.claim_method || '';

  db.run('DELETE FROM claim_info WHERE record_id = ?', [recordId]);

  for (const [key, value] of Object.entries(fields || {})) {
    db.run(
      "INSERT INTO claim_info (record_id, user_id, field_key, field_value) VALUES (?, ?, ?, ?)",
      [recordId, record.user_id || 0, key, value]
    );
  }

  db.run(
    "UPDATE lottery_records SET status='claimed', claim_time=datetime('now'), claim_method=? WHERE id=?",
    [claimMethod, recordId]
  );

  db.save();
  res.json({ success: true });
});

// 获取用户的中奖记录（背包数据）
router.get('/user/records', (req, res) => {
  const db = getDB();
  try {
    const records = db.queryAll(`
      SELECT lr.id, lr.prize_id, lr.prize_name, lr.status, lr.draw_time, 
             lr.claim_time, lr.claim_method, p.image
      FROM lottery_records lr
      LEFT JOIN prizes p ON p.id = lr.prize_id
      ORDER BY lr.draw_time DESC
      LIMIT 50
    `);

    res.json(records || []);
  } catch (e) {
    console.error('获取记录出错:', e);
    res.status(500).json({ error: '获取记录失败' });
  }
});

module.exports = router;
