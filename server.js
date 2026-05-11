import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'
import { dirname, join, existsSync, mkdirSync } from 'path'
import { readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ==================== 目录初始化 ====================
const UPLOADS_DIR = join(__dirname, 'uploads')
const DATA_FILE = join(__dirname, 'data.json')

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

function loadData() {
  try {
    if (existsSync(DATA_FILE)) return JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
  } catch (e) { console.error('加载数据失败:', e) }
  return { prizes: {}, claimFields: [], claims: [] }
}
function saveData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

let db = loadData()

// 默认奖品数据（首次启动时）
if (!db.prizes.bowen || db.prizes.bowen.length === 0) {
  db.prizes.bowen = [
    { id: uuidv4(), name: '超级玛丽企鹅手办', description: '限量版像素风企鹅手办', image_url: '', rarity: 'legendary', weight: 1 },
    { id: uuidv4(), name: '像素金币 x100', description: '游戏内货币奖励', image_url: '', rarity: 'rare', weight: 10 },
    { id: uuidv4(), name: '神秘礼包', description: '随机惊喜内容', image_url: '', rarity: 'epic', weight: 5 },
    { id: uuidv4(), name: '谢谢参与', description: '再接再厉！', image_url: '', rarity: 'common', weight: 84 },
  ]
}

// 默认地址收集字段
if (!db.claimFields || db.claimFields.length === 0) {
  db.claimFields = [
    { name: 'name', label: '姓名', type: 'text', required: true },
    { name: 'phone', label: '手机号', type: 'text', required: true },
    { name: 'address', label: '收货地址', type: 'text', required: false },
  ]
}
saveData(db)

// ==================== Express 配置 ====================
const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

// ==================== 文件上传配置 ====================
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop() || 'png'
    cb(null, `${uuidv4()}.${ext}`)
  }
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  cb(null, allowed.includes(file.mimetype))
}})

// ==================== 前端 API ====================

// GET /api/lottery/config
app.get('/api/lottery/config', (req, res) => {
  res.json({
    success: true,
    data: {
      categories: Object.keys(db.prizes),
      tickets: 99,
      prizes: db.prizes,
      claimOptions: { fields: db.claimFields, action_text: '立即领取', submit_text: '确认领取', success_message: '领取成功！' }
    }
  })
})

// POST /api/lottery/draw
app.post('/api/lottery/draw', (req, res) => {
  const category = req.body.category || 'bowen'
  const prizes = db.prizes[category] || Object.values(db.prizes)[0]
  if (!prizes || prizes.length === 0) return res.status(400).json({ success: false, error: '无奖品数据' })

  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0)
  let random = Math.random() * totalWeight
  let selected = prizes[0]
  for (const prize of prizes) {
    random -= prize.weight
    if (random <= 0) { selected = prize; break }
  }

  res.json({ success: true, prize: { ...selected }, category })
})

// POST /api/lottery/claim
app.post('/api/lottery/claim', (req, res) => {
  try {
    const record = { id: uuidv4(), ...req.body, created_at: new Date().toISOString() }
    db.claims.push(record)
    saveData(db)
    console.log('领奖记录:', record.name || record.未知)
    res.json({ success: true, message: '提交成功！' })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// GET /api/lottery/user/records
app.get('/api/lottery/user/records', (req, res) => {
  res.json({ success: true, records: db.claims })
})

// ==================== 管理员 API ====================

// 获取所有奖品
app.get('/api/admin/prizes', (req, res) => {
  res.json({ success: true, data: db.prizes })
})

// 创建奖品
app.post('/api/admin/prize', upload.single('image'), (req, res) => {
  try {
    const prize = {
      id: uuidv4(),
      name: req.body.name,
      description: req.body.description || '',
      image_url: req.file ? `/uploads/${req.file.filename}` : '',
      rarity: req.body.rarity || 'common',
      weight: parseInt(req.body.weight) || 1,
      category: req.body.category || 'bowen'
    }

    if (!db.prizes[prize.category]) db.prizes[prize.category] = []
    db.prizes[prize.category].push(prize)
    saveData(db)
    res.json({ success: true, data: prize })
  } catch (e) { res.status(400).json({ success: false, error: e.message }) }
})

// 更新奖品
app.put('/api/admin/prize/:id', upload.single('image'), (req, res) => {
  try {
    for (const cat of Object.values(db.prizes)) {
      const idx = cat.findIndex(p => p.id === req.params.id)
      if (idx !== -1) {
        cat[idx].name = req.body.name ?? cat[idx].name
        cat[idx].description = req.body.description ?? cat[idx].description
        cat[idx].rarity = req.body.rarity ?? cat[idx].rarity
        cat[idx].weight = parseInt(req.body.weight) ?? cat[idx].weight
        if (req.file) cat[idx].image_url = `/uploads/${req.file.filename}`
        if (req.body.delete_image === 'true') { cat[idx].image_url = '' }
        if (req.body.category && req.body.category !== cat[idx].category) {
          const [p] = cat.splice(idx, 1)
          p.category = req.body.category
          if (!db.prizes[p.category]) db.prizes[p.category] = []
          db.prizes[p.category].push(p)
        }
        saveData(db)
        return res.json({ success: true, data: cat.find(p => p.id === req.params.id) })
      }
    }
    res.status(404).json({ success: false, error: '未找到奖品' })
  } catch (e) { res.status(400).json({ success: false, error: e.message }) }
})

// 删除奖品
app.delete('/api/admin/prize/:id', (req, res) => {
  for (const cat of Object.keys(db.prizes)) {
    const idx = db.prizes[cat].findIndex(p => p.id === req.params.id)
    if (idx !== -1) {
      const [removed] = db.prizes[cat].splice(idx, 1)
      // 删除关联图片
      if (removed.image_url) {
        const fPath = join(__dirname, removed.image_url)
        try { existsSync(fPath) && unlinkSync(fPath) } catch {}
      }
      saveData(db)
      return res.json({ success: true })
    }
  }
  res.status(404).json({ success: false, error: '未找到奖品' })
})

// 获取/更新 地址收集字段
app.get('/api/admin/fields', (req, res) => res.json({ success: true, data: db.claimFields }))
app.post('/api/admin/field', (req, res) => {
  const field = { id: uuidv4(), ...req.body }
  db.claimFields.push(field); saveData(db)
  res.json({ success: true, data: field })
})
app.put('/api/admin/field/:id', (req, res) => {
  const idx = db.claimFields.findIndex(f => f.id === req.params.id)
  if (idx === -1) return res.status(404).json({ success: false, error: '未找到字段' })
  Object.assign(db.claimFields[idx], req.body)
  saveData(db)
  res.json({ success: true, data: db.claimFields[idx] })
})
app.delete('/api/admin/field/:id', (req, res) => {
  const idx = db.claimFields.findIndex(f => f.id === req.params.id)
  if (idx !== -1) { db.claimFields.splice(idx, 1); saveData(db) }
  res.json({ success: true })
})

// 获取领奖记录
app.get('/api/admin/claims', (req, res) => res.json({ success: true, data: db.claims }))
app.delete('/api/admin/claim/:id', (req, res) => {
  db.claims = db.claims.filter(c => c.id !== req.params.id)
  saveData(db)
  res.json({ success: true })
})

// 启动服务
const PORT = 3000
app.listen(PORT, () => {
  console.log(`🎰 后端已启动: http://localhost:${PORT}`)
  console.log(`   管理员页面: http://localhost:${PORT}/admin`)
  console.log(`   API:`)
  console.log(`   GET  /api/lottery/config     - 抽奖配置`)
  console.log(`   POST /api/lottery/draw        - 执行抽奖`)
  console.log(`   POST /api/lottery/claim       - 提交领奖`)
  console.log(`   GET  /api/admin/prizes         - 奖品列表`)
  console.log(`   POST /api/admin/prize          - 新增奖品`)
  console.log(`   PUT  /api/admin/prize/:id      - 编辑奖品`)
  console.log(`   DEL  /api/admin/prize/:id      - 删除奖品`)
  console.log(`   GET  /api/admin/fields         - 地址字段列表`)
  console.log(`   POST /api/admin/field          - 新增字段`)
  console.log(`   PUT  /api/admin/field/:id      - 编辑字段`)
  console.log(`   DEL  /api/admin/field/:id      - 删除字段`)
  console.log(`   GET  /api/admin/claims         - 领奖记录`)
  console.log(`   DEL  /api/admin/claim/:id      - 删除记录`)
})
