const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db/init');

// 导入路由
const lotteryRoutes = require('./routes/lottery');
const adminRoutes = require('./routes/admin');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务（奖品图片上传目录）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 初始化数据库
initDatabase();

// 健康检查端点（Railway 需要）
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API路由
app.use('/api/lottery', lotteryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);

// 开发环境：提示用户通过 Vite 前端访问
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (req, res) => {
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h1>🎰 抽奖后端运行中</h1>
      <p>API服务已启动在 <code>http://localhost:${PORT}</code></p>
      <p>请通过前端访问：<a href="http://localhost:5173">http://localhost:5173</a></p>
      <p>管理后台：<a href="http://localhost:5173/#/admin">http://localhost:5173/#/admin</a></p>
    </body></html>`);
  });
}

// 生产环境托管前端静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎰 抽奖服务运行在 http://localhost:${PORT}`);
  console.log(`🌐 外部访问: http://0.0.0.0:${PORT} (或本机IP)`);
  console.log(`📊 管理后台: http://localhost:${PORT}/admin`);
});
