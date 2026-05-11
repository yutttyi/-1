const init = require('./server/db/init');
(async () => {
  await init.initDatabase();
  const db = init.getDB();
  console.log('=== 奖品 ===');
  db.queryAll('SELECT id, name, category, total_stock, remaining_stock, is_active FROM prizes').forEach(p => 
    console.log(JSON.stringify(p))
  );
  console.log('\n=== 抽奖券 ===');
  db.queryAll('SELECT * FROM ticket_pools').forEach(t => console.log(JSON.stringify(t)));
  console.log('\n=== 已抽记录数 ===');
  const r = db.queryOne("SELECT COUNT(*) as cnt FROM lottery_records");
  console.log('总记录:', r ? r.cnt : 0);
  process.exit(0);
})();
