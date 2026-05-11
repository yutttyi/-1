const axios = require('axios');
const API = 'http://localhost:3000';

(async () => {
  try {
    const login = await axios.post(`${API}/api/admin/login`, { username: 'admin', password: 'admin123' });
    const token = login.data.token;
    const h = { Authorization: `Bearer ${token}` };

    const prizes = [
      // bowen
      { name:'定制保温杯', image:'', total_stock:10, description:'安全产品定制款保温杯，实用又好看', category:'bowen', sort_order:1, is_active:1 },
      { name:'蓝牙耳机', image:'', total_stock:5, description:'高品质无线蓝牙耳机', category:'bowen', sort_order:2, is_active:1 },
      { name:'精美笔记本套装', image:'', total_stock:15, description:'品牌笔记本+笔套装', category:'bowen', sort_order:3, is_active:1 },
      { name:'咖啡券', image:'', total_stock:30, description:'星巴克/瑞幸咖啡兑换券', category:'bowen', sort_order:4, is_active:1 },
      { name:'神秘大奖', image:'', total_stock:2, description:'超级神秘大奖！', category:'bowen', sort_order:99, is_active:1 },
      // aisee
      { name:'AI工具会员卡', image:'', total_stock:10, description:'主流AI工具月度会员卡', category:'aisee', sort_order:1, is_active:1 },
      { name:'机械键盘', image:'', total_stock:3, description:'RGB机械键盘', category:'aisee', sort_order:2, is_active:1 },
      { name:'充电宝', image:'', total_stock:8, description:'20000mAh大容量充电宝', category:'aisee', sort_order:3, is_active:1 },
      { name:'书券', image:'', total_stock:20, description:'当当/京东图书券', category:'aisee', sort_order:4, is_active:1 },
    ];

    for (const p of prizes) {
      await axios.post(`${API}/api/admin/prizes`, p, { headers: h });
      console.log(`OK: ${p.name} [${p.category}]`);
    }

    console.log('\nDone! All prizes inserted.');
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
    process.exit(1);
  }
})();
