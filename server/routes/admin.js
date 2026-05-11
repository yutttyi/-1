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

// 管理员登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDB();
  
  // 使用LIKE查询避免大小写问题，但username是UNIQUE的
  const admins = db.queryAll("SELECT * FROM admins WHERE username = ?", [username]);
  if (!admins.length) return res.status(401).json({ error: '用户名或密码错误' });
  
  const admin = admins[0];
  const bcrypt = require('bcryptjs');
  if (!bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  db.run("UPDATE admins SET last_login = datetime('now') WHERE id = ?", [admin.id]);
  db.save();

  const token = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, admin: { id: admin.id, username: admin.username, role: admin.role } });
});

// ===== 数据看板 =====
router.get('/dashboard', verifyToken, (req, res) => {
  const db = getDB();

  // 总库存、已抽数、剩余数
  const prizeStats = db.queryOne(`
    SELECT 
      COALESCE(SUM(total_stock), 0) as totalStock,
      COALESCE(SUM(total_stock - remaining_stock), 0) as drawnCount,
      COALESCE(SUM(remaining_stock), 0) as remainingCount
    FROM prizes WHERE is_active = 1
  `);

  // 已抽人数、未抽人数（白名单内）
  const userStats = db.queryOne(`
    SELECT 
      COUNT(CASE WHEN has_drawn = 1 THEN 1 END) as drawnUsers,
      COUNT(CASE WHEN has_drawn = 0 AND is_active = 1 THEN 1 END) as notDrawnUsers,
      COUNT(*) as totalUsers
    FROM users WHERE is_active = 1
  `);

  // 奖品维度表
  let prizes = [];
  try {
    prizes = db.queryAll(`
      SELECT name as prizeName, total_stock as totalStock, 
             total_stock - remaining_stock as drawnCount, 
             remaining_stock as remainingCount
      FROM prizes ORDER BY sort_order ASC, id ASC
    `);
  } catch(e) {}

  // 中奖名单表
  let records = [];
  try {
    records = db.queryAll(`
      SELECT u.name, u.employee_id, l.prize_name as prize, l.draw_time as drawTime,
             l.status as claimStatus, l.claim_method as claimMethod, l.id as recordId
      FROM lottery_records l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.draw_time DESC
    `);
  } catch(e) {}

  res.json({
    stats: { ...prizeStats, ...(userStats || {}) },
    prizes: prizes || [],
    records: records || []
  });
});

// 导出中奖名单Excel
router.get('/export/records', verifyToken, (req, res) => {
  const XLSX = require('xlsx');
  const db = getDB();
  
  const records = db.queryAll(`
    SELECT 
      u.name AS 姓名, u.employee_id AS 工号, u.department AS 部门, u.center AS 中心,
      l.prize_name AS 奖品, l.draw_time AS 抽奖时间,
       CASE WHEN l.status = 'claimed' THEN '已领取' ELSE '未领取' END AS 领奖状态,
      l.claim_method AS 领取方式,
      l.claim_time AS 领取时间
    FROM lottery_records l
    JOIN users u ON l.user_id = u.id
    ORDER BY l.draw_time DESC
  `);

  const ws = XLSX.utils.json_to_sheet(records);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '中奖名单');
  
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=lottery_records.xlsx');
  res.send(buf);
});

// ===== 资格管理 =====
router.get('/users', verifyToken, (req, res) => {
  const db = getDB();
  const { search, department, center } = req.query;
  let sql = 'SELECT * FROM users WHERE is_active = 1';
  const params = [];
  
  if (search) {
    sql += ' AND (name LIKE ? OR employee_id LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (department) {
    sql += ' AND department LIKE ?';
    params.push(`%${department}%`);
  }
  if (center) {
    sql += ' AND center LIKE ?';
    params.push(`%${center}%`);
  }
  
  sql += ' ORDER BY id DESC';
  const users = db.queryAll(sql, params.length > 0 ? params : undefined);
  res.json(users || []);
});

// 导入Excel名单
router.post('/users/import', verifyToken, (req, res) => {
  try {
    const XLSX = require('xlsx');
    const db = getDB();
    const { data } = req.body;

    let rows;
    if (Array.isArray(data)) {
      rows = data;
    } else {
      const workbook = XLSX.read(data, { type: 'base64' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet);
    }
    
    let added = 0, updated = 0;
    rows.forEach(row => {
      const name = row['姓名'] || row['name'] || '';
      const empId = String(row['工号'] || row['employee_id'] || '').trim();
      if (!name || !empId) return;

      const exists = db.queryOne('SELECT * FROM users WHERE employee_id = ?', [empId]);
      if (exists) {
        db.run("UPDATE users SET is_active = 1, name = ?, department = ?, center = ? WHERE employee_id = ?", 
          [name, row['部门'] || row['department'] || '', row['中心'] || row['center'] || '', empId]);
        updated++;
      } else {
        db.run("INSERT INTO users (name, employee_id, department, center) VALUES (?, ?, ?, ?)", 
          [name, empId, row['部门'] || row['department'] || '', row['中心'] || row['center'] || '']);
        added++;
      }
    });

    db.save();
    res.json({ success: true, added, updated, message: `导入成功：新增${added}人，更新${updated}人` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '导入失败: ' + e.message });
  }
});

// 手动添加单人
router.post('/users/add', verifyToken, (req, res) => {
  const db = getDB();
  const { name, employee_id, department, center } = req.body;
  if (!name || !employee_id) return res.status(400).json({ error: '姓名和工号为必填项' });

  try {
    db.run('INSERT INTO users (name, employee_id, department, center) VALUES (?, ?, ?, ?)',
      [name, employee_id, department || '', center || '']);
    db.save();
    res.json({ success: true, id: db.lastInsertId() });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      res.status(400).json({ error: '该工号已存在' });
    } else {
      throw e;
    }
  }
});

// 删除/禁用用户
router.delete('/users/:id', verifyToken, (req, res) => {
  const db = getDB();
  db.run('UPDATE users SET is_active = 0 WHERE id = ?', [parseInt(req.params.id)]);
  db.save();
  res.json({ success: true });
});

// 重置单人状态
router.post('/users/:id/reset', verifyToken, (req, res) => {
  const db = getDB();
  const user = db.queryOne('SELECT * FROM users WHERE id = ?', [parseInt(req.params.id)]);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (!user.has_drawn) return res.json({ message: '该用户还未抽奖，无需重置' });

  const record = db.queryOne('SELECT * FROM lottery_records WHERE user_id = ?', [user.id]);
  if (record && record.prize_id) {
    db.run('UPDATE prizes SET remaining_stock = remaining_stock + 1 WHERE id = ?', [record.prize_id]);
    db.run('DELETE FROM claim_info WHERE record_id = ?', [record.id]);
    db.run('DELETE FROM lottery_records WHERE id = ?', [record.id]);
  }
  
  db.run('UPDATE users SET has_drawn = 0 WHERE id = ?', [user.id]);
  db.save();
  res.json({ success: true, message: `已重置 ${user.name} 的抽奖状态` });
});

// 批量重置
router.post('/users/batch-reset', verifyToken, (req, res) => {
  const db = getDB();
  
  // 获取所有中奖记录
  const records = db.queryAll(`
    SELECT lr.*, u.name, u.employee_id 
    FROM lottery_records lr JOIN users u ON lr.user_id = u.id
  `);

  let resetCount = (records || []).length;
  
  // 恢复所有库存
  (records || []).forEach(r => {
    if (r.prize_id) {
      try { db.run('UPDATE prizes SET remaining_stock = remaining_stock + 1 WHERE id = ?', [r.prize_id]); } catch(e) {}
      try { db.run('DELETE FROM claim_info WHERE record_id = ?', [r.id]); } catch(e) {}
      try { db.run('DELETE FROM lottery_records WHERE id = ?', [r.id]); } catch(e) {}
    }
    try { db.run('UPDATE users SET has_drawn = 0 WHERE id = ?', [r.user_id]); } catch(e) {}
  });

  db.save();
  res.json({ success: true, resetCount });
});

// ===== 奖品管理（支持分类）=====
router.get('/prizes', verifyToken, (req, res) => {
  const db = getDB();
  const { category } = req.query;
  let sql = 'SELECT * FROM prizes ORDER BY category, sort_order, id';
  let params = [];
  if (category) {
    sql = 'SELECT * FROM prizes WHERE category = ? ORDER BY sort_order, id';
    params = [category];
  }
  const prizes = db.queryAll(sql, params.length > 0 ? params : undefined);
  res.json(prizes || []);
});

router.post('/prizes', verifyToken, (req, res) => {
  const db = getDB();
  const { name, image, total_stock, description, sort_order, category } = req.body;
  if (!name) return res.status(400).json({ error: '奖品名称为必填项' });
  
  const cat = (category === 'aisee') ? 'aisee' : 'bowen';
  const stock = parseInt(total_stock) || 0;
  db.run(
    'INSERT INTO prizes (name, image, total_stock, remaining_stock, description, sort_order, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, image || '', stock, stock, description || '', parseInt(sort_order) || 0, cat]
  );
  db.save();
  res.json({ success: true, id: db.lastInsertId() });
});

router.put('/prizes/:id', verifyToken, (req, res) => {
  const db = getDB();
  const { name, image, total_stock, description, sort_order, is_active, category } = req.body;
  const pid = parseInt(req.params.id);
  
  const prize = db.queryOne('SELECT * FROM prizes WHERE id = ?', [pid]);
  if (!prize) return res.status(404).json({ error: '奖品不存在' });

  const newTotal = total_stock !== undefined ? parseInt(total_stock) : prize.total_stock;
  const diff = newTotal - prize.total_stock;
  const newRemaining = Math.max(0, (prize.remaining_stock || 0) + diff);
  
  db.run(
    "UPDATE prizes SET name=?, image=?, total_stock=?, remaining_stock=?, description=?, sort_order=?, is_active=?, category=? WHERE id=?",
    [
      name || prize.name, image !== undefined ? image : prize.image, newTotal, newRemaining,
      description !== undefined ? description : prize.description, 
      sort_order !== undefined ? sort_order : prize.sort_order,
      is_active !== undefined ? is_active : prize.is_active,
      category !== undefined ? ((category === 'aisee' ? 'aisee' : 'bowen')) : (prize.category || 'bowen'),
      pid
    ]
  );
  db.save();
  res.json({ success: true });
});

router.delete('/prizes/:id', verifyToken, (req, res) => {
  const db = getDB();
  db.run('DELETE FROM prizes WHERE id = ?', [parseInt(req.params.id)]);
  db.save();
  res.json({ success: true });
});

// ===== 领奖信息管理 =====
router.get('/claims', verifyToken, (req, res) => {
  const db = getDB();
  const { prize_filter, method_filter } = req.query;
  
  let sql = `
    SELECT l.*, u.name as userName, u.employee_id, u.department,
           p.name as prizeName
    FROM lottery_records l
    JOIN users u ON l.user_id = u.id
    LEFT JOIN prizes p ON l.prize_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (prize_filter && prize_filter !== '') { 
    sql += ' AND l.prize_id = ?'; 
    params.push(parseInt(prize_filter)); 
  }
  if (method_filter && method_filter !== '') { 
    sql += ' AND l.claim_method = ?'; 
    params.push(method_filter); 
  }
  
  sql += ' ORDER BY l.draw_time DESC';
  const claims = db.queryAll(sql, params.length > 0 ? params : undefined);

  // 附带领奖详情
  ((claims || [])).forEach(c => {
    c.info = db.queryAll("SELECT field_key, field_value FROM claim_info WHERE record_id = ?", [c.id]);
  });

  res.json(claims || []);
});

// 更新领奖状态
router.put('/claims/:recordId/status', verifyToken, (req, res) => {
  const db = getDB();
  const { status } = req.body;
  db.run("UPDATE lottery_records SET status = ?, claim_time = datetime('now') WHERE id = ?", 
    [status, parseInt(req.params.recordId)]);
  db.save();
  res.json({ success: true });
});

// 导出领奖信息Excel
router.get('/export/claims', verifyToken, (req, res) => {
  const XLSX = require('xlsx');
  const db = getDB();
  
  const claims = db.queryAll(`
    SELECT 
      u.name AS 姓名, u.employee_id AS 工号, u.department AS 部门,
      p.name AS 奖品, l.draw_time AS 抽奖时间,
      l.claim_method AS 领取方式, l.status AS 状态
    FROM lottery_records l
    JOIN users u ON l.user_id = u.id
    LEFT JOIN prizes p ON l.prize_id = p.id
    ORDER BY l.draw_time DESC
  `);
  
  const ws = XLSX.utils.json_to_sheet(claims || []);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '领奖信息');
  res.setHeader('Content-Disposition', 'attachment; filename=claim_info.xlsx');
  res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
});

// ===== 抽奖券管理（按分类） =====
router.get('/tickets', verifyToken, (req, res) => {
  const db = getDB();
  const tickets = db.queryAll("SELECT * FROM ticket_pools");
  if (!tickets || !tickets.length) {
    // 如果没有记录，返回默认值
    res.json([
      { category: 'bowen', total_tickets: 50 },
      { category: 'aisee', total_tickets: 50 }
    ]);
  } else {
    res.json(tickets);
  }
});

router.put('/tickets/:category', verifyToken, (req, res) => {
  const db = getDB();
  const { total_tickets } = req.body;
  const cat = req.params.category;
  
  if (!['bowen', 'aisee'].includes(cat)) {
    return res.status(400).json({ error: '无效的分类' });
  }
  
  const count = parseInt(total_tickets) || 50;
  
  // 查找是否存在
  const existing = db.queryOne("SELECT * FROM ticket_pools WHERE category = ?", [cat]);
  if (existing) {
    db.run("UPDATE ticket_pools SET total_tickets = ? WHERE category = ?", [count, cat]);
  } else {
    db.run("INSERT INTO ticket_pools (category, total_tickets) VALUES (?, ?)", [cat, count]);
  }
  
  db.save();
  res.json({ success: true });
});

module.exports = router;
