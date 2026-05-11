const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db = null;
let dbPath;

async function initDatabase() {
  // 确定数据目录（Render 使用 /data 持久化，本地用 server/data）
  const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_ID;
  const dataDir = isRender ? '/data' : path.join(__dirname, '../data');
  const uploadsDir = path.join(__dirname, '../uploads');
  
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  dbPath = path.join(dataDir, 'lottery.db');

  const SQL = await initSqlJs();
  
  // 尝试加载已有数据库
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      employee_id TEXT UNIQUE NOT NULL,
      department TEXT DEFAULT '',
      center TEXT DEFAULT '',
      has_drawn INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS prizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      image TEXT DEFAULT '',
      total_stock INTEGER NOT NULL DEFAULT 0,
      remaining_stock INTEGER NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'bowen',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 如果已存在旧表，添加category字段
  try {
    db.run(`ALTER TABLE prizes ADD COLUMN category TEXT DEFAULT 'bowen'`);
  } catch(e) { /* column already exists */ }

  // 抽奖券表（按分类独立计数）
  db.run(`
    CREATE TABLE IF NOT EXISTS ticket_pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL UNIQUE,
      total_tickets INTEGER NOT NULL DEFAULT 50
    )
  `);

  // 初始化两个分类的抽奖券池
  const insertTicket = db.prepare('INSERT OR IGNORE INTO ticket_pools (category, total_tickets) VALUES (?, ?)');
  insertTicket.run(['bowen', 50]);
  insertTicket.run(['aisee', 50]);

  db.run(`
    CREATE TABLE IF NOT EXISTS lottery_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      prize_id INTEGER NOT NULL,
      prize_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      draw_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      claim_time DATETIME,
      claim_method TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (prize_id) REFERENCES prizes(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS claim_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      field_key TEXT NOT NULL,
      field_value TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (record_id) REFERENCES lottery_records(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS config_fields (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      category TEXT DEFAULT 'general',
      label TEXT DEFAULT ''
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      last_login DATETIME
    )
  `);

  // 初始化默认配置
  const defaultConfigs = [
    ['app_title', '安全产品二部&三部', 'text', 'general', '顶部标题'],
    ['main_slogan', '你的惊喜盲盒已就位！', 'text', 'general', '主文案'],
    ['button_text', '点击拆盲盒✨', 'text', 'general', '按钮文案'],
    ['footer_notice', '抽中即锁定，请及时填写领奖信息', 'text', 'general', '底部说明'],
    ['loading_text', '正在摇晃盲盒，一起听听里面有什么…', 'text', 'lottery', '加载语'],
    ['congrats_text', '🎊 恭喜中奖！下方领取你的幸运奖品！🎊', 'textarea', 'result', '中奖提示'],
    ['form_subtitle', '请填写领奖信息，奖品将尽快送达！', 'text', 'form', '表单副标题'],
    ['footer_thanks', '🎉感谢参与本期活动，快去群里晒一下你的欧气吧！', 'textarea', 'footer', '感谢语'],
    ['next_event_text', '🔥 下期博闻多识一堂课 & AI See 实战沙龙已在筹备中，点击报名👉', 'textarea', 'footer', '下期预告文字'],
    ['next_event_link', '', 'link', 'footer', '下期报名链接'],
    ['custom_form_fields', JSON.stringify([
      { key: 'deliveryMethod', label: '领取方式', type: 'select', required: true, options: ['自取', '邮寄', '现场发放'] }
    ]), 'json', 'form', '领取方式配置(管理员可编辑)']
  ];

  const insertConfig = db.prepare('INSERT OR IGNORE INTO config_fields (key, value, type, category, label) VALUES (?, ?, ?, ?, ?)');
  defaultConfigs.forEach(c => insertConfig.run(c));

  // 初始化默认管理员
  const admins = db.exec("SELECT id FROM admins WHERE username = 'admin'");
  if (!admins.length || !admins[0].values || admins[0].values.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(['admin', hash]);
  }

  // 初始化默认奖品（仅在奖品表为空时插入）
  const existingPrizes = db.exec("SELECT COUNT(*) as cnt FROM prizes");
  if (!existingPrizes.length || !existingPrizes[0].values || existingPrizes[0].values[0][0] === 0) {
    const insertPrize = db.prepare(
      "INSERT INTO prizes (name, image, total_stock, remaining_stock, description, category, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    // bowen 分类
    insertPrize.run(['定制保温杯', '', 5, 5, '安全产品定制款保温杯，实用又好看', 'bowen', 1, 1]);
    insertPrize.run(['蓝牙耳机', '', 3, 3, '高品质无线蓝牙耳机', 'bowen', 2, 1]);
    insertPrize.run(['精美笔记本套装', '', 10, 10, '品牌笔记本+笔套装', 'bowen', 3, 1]);
    insertPrize.run(['咖啡券', '', 20, 20, '星巴克/瑞幸咖啡兑换券', 'bowen', 4, 1]);
    insertPrize.run(['神秘大奖', '', 1, 1, '🏆 超级神秘大奖！', 'bowen', 99, 1]);
    // aisee 分类
    insertPrize.run(['AI工具会员卡', '', 5, 5, '主流AI工具月度会员卡', 'aisee', 1, 1]);
    insertPrize.run(['机械键盘', '', 2, 2, 'RGB机械键盘', 'aisee', 2, 1]);
    insertPrize.run(['充电宝', '', 8, 8, '20000mAh大容量充电宝', 'aisee', 3, 1]);
    insertPrize.run(['书券', '', 15, 15, '当当/京东图书券', 'aisee', 4, 1]);
    console.log('🎁 已初始化默认奖品数据');
  }

  saveDB();

  console.log('✅ 数据库初始化完成（sql.js 纯JS模式）');
}

// 定期自动保存（每5秒）
let saveTimer = null;
function startAutoSave() {
  if (saveTimer) return;
  saveTimer = setInterval(saveDB, 5000);
}

function saveDB() {
  if (db && dbPath) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (e) {
      console.error('保存数据库失败:', e.message);
    }
  }
}

// 辅助方法：将SQL查询结果转换为对象数组
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  if (params && params.length > 0) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  } else {
    db.run(sql);
  }
}

// 获取最后插入的行ID
function lastInsertId() {
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return null;
}

// 获取受影响行数
function changesCount() {
  return db.getRowsModified();
}

function getDB() {
  startAutoSave();
  return { 
    queryAll, 
    queryOne, 
    run, 
    prepare: (sql) => db.prepare(sql),
    exec: (sql) => db.exec(sql),
    lastInsertId,
    changes: () => changesCount(),
    save: saveDB
  };
}

module.exports = { initDatabase, getDB };
