<template>
  <div class="lottery-page" :class="{ 'shaking': isShaking }">
    <!-- ═══ 街机边框 ═══ -->
    <div class="arcade-frame"></div>

    <!-- ═══ 像素云层（远景+近景） ═══ -->
    <div class="clouds-container">
      <!-- 远景层：慢速半透明 -->
      <div class="cloud-track track-slow">
        <div class="pixel-cloud" v-for="(c, i) in slowClouds" :key="'s'+i"
          :style="{ top: c.top, left: c.left, transform: c.transform }"
        ><div class="cloud-sprite-a"></div></div>
        <div class="pixel-cloud" v-for="(c, i) in slowCloudsDup" :key="'sd'+i"
          :style="{ top: c.top, left: c.left, transform: c.transform }"
        ><div class="cloud-sprite-a"></div></div>
      </div>
      <!-- 近景层：快速清晰 -->
      <div class="cloud-track track-fast">
        <div class="pixel-cloud" v-for="(c, i) in fastClouds" :key="'f'+i"
          :style="{ top: c.top, left: c.left, transform: c.transform }"
        ><div :class="c.sprite || 'cloud-sprite-a'"></div></div>
        <div class="pixel-cloud" v-for="(c, i) in fastCloudsDup" :key="'fd'+i"
          :style="{ top: c.top, left: c.left, transform: c.transform }"
       ><div :class="c.sprite || 'cloud-sprite-a'"></div></div>
      </div>

      <!-- ═══ 右侧云层（反向滚动） ═══ -->
      <div class="cloud-track track-slow track-right">
        <div class="pixel-cloud" v-for="(c, i) in rightSlowClouds" :key="'rs'+i"
          :style="{ top: c.top, right: c.right, transform: c.transform }"
        ><div class="cloud-sprite-b"></div></div>
        <div class="pixel-cloud" v-for="(c, i) in rightSlowCloudsDup" :key="'rsd'+i"
          :style="{ top: c.top, right: c.right, transform: c.transform }"
        ><div class="cloud-sprite-b"></div></div>
      </div>
      <div class="cloud-track track-fast track-right">
        <div class="pixel-cloud" v-for="(c, i) in rightFastClouds" :key="'rf'+i"
          :style="{ top: c.top, right: c.right, transform: c.transform }"
        ><div class="cloud-sprite-c"></div></div>
        <div class="pixel-cloud" v-for="(c, i) in rightFastCloudsDup" :key="'rfd'+i"
          :style="{ top: c.top, right: c.right, transform: c.transform }"
        ><div class="cloud-sprite-c"></div></div>
      </div>
    </div>

    <!-- ═══ 像素风街机标题 ═══ -->
    <div class="pixel-title-group">
      <span class="dept-badge">安全产品二部三部</span>
      <h1 class="main-title">LUCKY DRAW</h1>
    </div>

    <!-- ═══ 顶部 HUD（玩家名 + 抽奖券） ═══ -->
    <div class="hud-top">
      <div class="hud-box"><span>PLAYER:</span><span class="val">DEV_MODE</span></div>
      <div class="hud-box"><span>TICKETS:</span><span class="val">{{ ticketCount }}</span></div>
    </div>

    <!-- ═══ 看板娘像素长鹅 ═══ -->
    <div class="mascot-area">
      <div class="dialog-bubble">{{ gooseText }}</div>
      <div class="pixel-goose">
        <div class="goose-body"></div>
        <div class="goose-neck"></div>
        <div class="goose-head"><div class="goose-eye"></div><div class="goose-beak"></div></div>
      </div>
    </div>

    <!-- ═══ 像素企鹅（盲盒上方） ═══ -->
    <div class="penguin-mascot" v-if="!showEgg && step !== 'result'" :class="{ 'p-hop': step === 'idle', 'p-excited': step === 'opening' }">
      <div class="pixel-penguin"></div>
      <div class="p-speech" v-if="step === 'opening'">{{ penguinSpeech }}</div>
    </div>

    <!-- ═══ 核心舞台：3D 盲盒方块 ═══ -->
    <div v-if="!prize && !showNoAccess && step !== 'result'" class="stage">
      <div class="scene">
        <div class="cube-wrapper"
          :class="{ 'is-hit': isHitting, 'is-opened': isOpened }"
          @click="handleDraw"
        >
          <div class="cube">
            <div class="cube-face front">?</div>
            <div class="cube-face back">?</div>
            <div class="cube-face right">?</div>
            <div class="cube-face left">?</div>
            <div class="cube-face top"></div>
            <div class="cube-face bottom"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ 🎁礼物卡片（独立于stage，抽奖后弹出） ═══ -->
    <transition name="egg-fade">
      <div v-if="showEgg && step !== 'result'" class="pixel-egg show-egg">🎁</div>
    </transition>

    <!-- ═══ Tab 切换栏 ═══ -->
    <div v-if="!prize && !showNoAccess && step === 'idle'" class="tab-bar">
      <button v-for="(tab, i) in tabList" :key="i"
        class="tab-btn" :class="{ active: activeTab === i }"
        @click="switchTab(i)"
      >{{ tab }}</button>
    </div>

    <!-- ═══ 开启盲盒按钮 ═══ -->
    <transition name="btn-pop">
      <button v-if="step === 'idle' && !showNoAccess" class="open-btn" @click="handleDraw">
        <span class="btn-text">开启盲盒</span>
      </button>
    </transition>

    <!-- ═══ 手指提示（按钮下方） ═══ -->
    <div class="pointer-arrow" :style="{ opacity: step === 'idle' ? 1 : 0 }">☝️</div>



    <!-- 无资格提示 -->
    <transition name="fade-scale">
      <div v-if="showNoAccess" class="no-access-box">
        <div class="no-access-icon">🔒</div>
        <p class="no-access-text">本期盲盒暂未激活<br/>敬请关注下期沙龙！！</p>
      </div>
    </transition>

    <!-- 奖品卡片（中 prize 后显示） -->
      <PrizeCard
        v-if="prize && step === 'result'"
        :prize="prize"
        :claim-options="claimOptions"
        @submit="handleClaimSubmit"
        @close="resetGame"
      />

    <!-- ═══ 左侧功能按钮区 ═══ -->
    <div v-if="!prize && !showNoAccess && step === 'idle'" class="corner-actions">
      <button class="action-btn action-btn-vertical" @click="showRules = true">
        <span class="act-icon">📋</span>
        <span class="act-text">查看规则</span>
      </button>
      <button class="action-btn action-btn-vertical" @click="openBag">
        <span class="act-icon">🎒</span>
        <span class="act-text">背包{{ bagCount > 0 ? '(' + bagCount + ')' : '' }}</span>
      </button>
    </div>

    <!-- ═══ 底部奖品轮播条 ═══ -->
    <div v-if="!prize && !showNoAccess && prizeStripItems.length && step === 'idle'" class="ticker-wrap">
      <div class="strip-label">奖品池</div>
      <div class="strip-track" :class="{ paused: stripPaused }"
           @mouseenter="stripPaused = true" @mouseleave="stripPaused = false">
        <div v-for="(item, i) in prizeStripItemsDuplicated" :key="'ps'+i" class="strip-card">
          <img v-if="item.image" :src="item.image" :alt="item.name" class="strip-card-img" />
          <div v-else class="strip-card-img strip-no-img">{{ item.name?.charAt(0) || '?' }}</div>
          <div v-if="item.name" class="strip-card-name">{{ item.name }}</div>
        </div>
      </div>
    </div>
    <!-- 兜底跑马灯（无奖品数据时） -->
    <div v-if="!prizeStripItems.length && !prize" class="ticker-wrap-simple">
      <div class="ticker">{{ tickerText }}</div>
    </div>

    <!-- ═══ 规则弹窗 ═══ -->
    <transition name="modal-fade">
      <div v-if="showRules" class="modal-overlay" @click.self="showRules = false">
        <div class="modal-card-rules">
          <h2>📋 活动规则</h2>
          <ul>
            <li>每次开启消耗 1 张抽奖券</li>
            <li>抽中奖品后请及时填写领奖信息</li>
            <li>奖品一旦锁定不可更换</li>
            <li>活动最终解释权归主办方所有</li>
          </ul>
          <button class="hud-box btn-confirm" style="cursor:pointer; margin: 16px auto 0;" @click="showRules = false">
            我知道了
          </button>
        </div>
      </div>
    </transition>

    <!-- ═══ 背包弹窗 ═══ -->
    <transition name="modal-fade">
      <div v-if="showBag" class="modal-overlay" @click.self="showBag = false">
        <div class="bag-modal-pixel">
          <div class="bag-header">
            <h3>🎒 我的背包</h3>
            <button class="bag-close-btn" @click="showBag = false">×</button>
          </div>
          <div v-if="bagLoading" class="bag-loading">加载中...</div>
          <div v-else-if="!bagRecords.length" class="bag-empty">
            <span class="bag-empty-icon">📦</span>
            <p>背包空空的，快去抽个奖吧~</p>
          </div>
          <div v-else class="bag-list">
            <div v-for="(record, i) in bagRecords" :key="'br'+i" class="bag-item">
              <div class="bag-item-img">
                <img v-if="record.prizeImage" :src="record.prizeImage" :alt="record.prizeName" />
                <span v-else class="bag-no-img">{{ record.prizeName?.charAt(0) || '?' }}</span>
              </div>
              <div class="bag-item-info">
                <h4>{{ record.prizeName }}</h4>
                <p>{{ formatTime(record.drawTime) }}</p>
                <span v-if="record.claimMethod" class="bag-method-tag">领取方式: {{ record.claimMethod }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import PrizeCard from '../components/PrizeCard.vue'

// ==================== 状态 ====================
const step = ref('idle')       // idle | opening | result
const prize = ref(null)
const showNoAccess = ref(false)
const isShaking = ref(false)
const showEgg = ref(false)
const isHitting = ref(false)
const isOpened = ref(false)

// 分类
const categories = [
  { key: 'bowen', label: '博闻多识一堂课' },
  { key: 'aisee', label: 'AISee实战沙龙' }
]
const activeTab = ref(0)
const tabList = computed(() => categories.map(c => c.label))

// 抽奖券
const ticketCounts = reactive({ bowen: 50, aisee: 50 })
const ticketCount = computed(() => {
  const key = categories[activeTab.value]?.key || 'bowen'
  return ticketCounts[key] || 0
})

// 领取方式配置（从后端动态加载，PrizeCard 直接显示下拉框）
const claimOptions = reactive({
  selectOptions: ['自取', '邮寄', '现场发放'],
  extraFields: [],
  success_message: ''
})

// 公告/轮播
const noticeList = reactive([])
const prizeStripItems = reactive([])
const prizeStripItemsDuplicated = computed(() => [...prizeStripItems, ...prizeStripItems])
const stripPaused = ref(false)

// 跑马灯文本
const tickerText = ref('🚀 云端挑战已开启！恭喜 AICODING_VIP 获得传说级大奖！ 🚀 不要停下来，大奖在向你招手！ 🚀')

// 弹窗状态
const showRules = ref(false)
const showBag = ref(false)

// 长鹅台词
const gooseText = ref('HONK! 冲向云端!\n看看能砸出什么大宝贝!')

// 企鹅台词
const penguinSpeech = ref('出金啦！出金啦！')

// 背包
const bagRecords = reactive([])
const bagLoading = ref(false)
const bagCount = ref(0)

// ==================== 云朵配置 ====================
const slowClouds = [
  { top: '15%', left: '5%', transform: 'scale(3)' },
  { top: '45%', right: '15%', left: 'auto', transform: 'scale(3.5) scaleX(-1)', sprite: 'cloud-sprite-b' },
  { top: '80%', left: '25%', transform: 'scale(2.5)' },
]
const slowCloudsDup = slowClouds.map(c => ({
  ...c,
  top: `calc(100vh + ${c.top})`,
}))
const fastClouds = [
  { top: '25%', right: '10%', left: 'auto', transform: 'scale(4.5)' },
  { top: '60%', left: '-5%', transform: 'scale(5)', sprite: 'cloud-sprite-b' },
  { top: '90%', right: '30%', left: 'auto', transform: 'scale(4) scaleX(-1)' },
]
const fastCloudsDup = fastClouds.map(c => ({
  ...c,
  top: `calc(100vh + ${c.top})`,
}))

// ==================== 右侧云朵配置（靠右定位） ====================
const rightSlowClouds = [
  { top: '10%', right: '8%', transform: 'scale(3) scaleX(-1)' },
  { top: '50%', right: '5%', transform: 'scale(4)', sprite: 'cloud-sprite-b' },
  { top: '85%', right: '20%', transform: 'scale(2.8) scaleX(-1)' },
]
const rightSlowCloudsDup = rightSlowClouds.map(c => ({
  ...c, top: `calc(100vh + ${c.top})`,
}))
const rightFastClouds = [
  { top: '30%', right: '-2%', transform: 'scale(4.5)' },
  { top: '70%', right: '12%', transform: 'scale(3.8) scaleX(-1)', sprite: 'cloud-sprite-b' },
]
const rightFastCloudsDup = rightFastClouds.map(c => ({
  ...c, top: `calc(100vh + ${c.top})`,
}))

// ==================== API 加载 ====================
async function loadNoticeData() {
  try {
    const res = await axios.get('/api/lottery/user/records', { timeout: 5000 })
    const records = Array.isArray(res.data) ? res.data : []
    if (records.length > 0) {
      noticeList.length = 0
      records.slice(0, 8).forEach(r => {
        noticeList.push(`恭喜获得 ${r.prize_name || r.prizeName || '***'} 🎉`)
      })
      // 更新跑马灯为真实中奖数据
      tickerText.value = noticeList.map(n => `🎉 ${n}`).join('   ')
    }
  } catch(e) {
    console.log('公告加载失败:', e.message)
  }
}

async function loadPrizesForStrip() {
  try {
    const res = await axios.get('/api/lottery/config', { timeout: 5000 })
    const catKey = categories[activeTab.value]?.key || 'bowen'
    const prizesByCat = res.data?._prizesByCategory || {}
    const prizes = prizesByCat[catKey] || []
    const allPrizes = res.data?._prizes || []
    const finalPrizes = prizes.length > 0 ? prizes : allPrizes

    prizeStripItems.length = 0
    if (Array.isArray(finalPrizes)) {
      finalPrizes.forEach(p => {
        prizeStripItems.push({ id: p.id, name: p.name, image: p.image || '' })
      })
    }
  } catch(e) {
    console.log('奖品轮播加载失败:', e.message)
  }
}

function switchTab(index) {
  if (activeTab.value === index) return
  activeTab.value = index
  loadPrizesForStrip()
}

async function loadConfig() {
  try {
    const res = await axios.get('/api/lottery/config', { timeout: 5000 })

    // 解析 custom_form_fields 配置（管理员后台可编辑）
    const optsRaw = res.data?.custom_form_fields?.value || res.data?.custom_form_fields
    if (optsRaw) {
      try {
        const parsed = typeof optsRaw === 'string' ? JSON.parse(optsRaw) : optsRaw
        if (Array.isArray(parsed)) {
          // 提取 deliveryMethod 的选项作为领取方式下拉框
          const dmField = parsed.find(f => f.key === 'deliveryMethod')
          if (dmField?.options && Array.isArray(dmField.options)) {
            claimOptions.selectOptions.length = 0
            dmField.options.forEach(opt => claimOptions.selectOptions.push(opt))
          }
          // 其他字段作为额外表单（地址、姓名等）→ extraFields
          const extras = parsed.filter(f => f.key !== 'deliveryMethod').map(f => ({
            key: f.key,
            name: f.key,
            label: f.label || f.name,
            type: f.type || 'text',
            required: !!f.required
          }))
          claimOptions.extraFields.length = 0
          extras.forEach(e => claimOptions.extraFields.push(e))
        }
      } catch(e) { console.error('解析配置失败:', e) }
    }
    if (!claimOptions.selectOptions?.length) {
      claimOptions.selectOptions = ['自取', '邮寄', '现场发放']
    }

    // 各分类抽奖券
    const ticketsData = res.data?._tickets
    if (ticketsData) Object.assign(ticketCounts, ticketsData)
    const tc = res.data?.ticket_count?.value
    if (tc && !ticketsData) {
      ticketCounts.bowen = parseInt(tc) || 50
      ticketCounts.aisee = parseInt(tc) || 50
    }
  } catch(e) {
    console.log('配置加载失败:', e.message)
    claimOptions.selectOptions = ['自取', '邮寄', '现场发放']
  }
}

// ==================== 抽奖逻辑 ====================
function playSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1)
    g.gain.setValueAtTime(0.1, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.2)
  } catch(e) {}
}

async function handleDraw() {
  if (step.value !== 'idle') return
  if ((ticketCount.value || 0) <= 0) {
    alert('抽奖券已用完啦！')
    return
  }

  step.value = 'opening'
  isShaking.value = true
  await nextTick()

  playSound()
  gooseText.value = '喔喔喔!\n出金啦出金啦!'
  penguinSpeech.value = '冲鸭！出金啦！'
  isHitting.value = true

  // 下砸动画
  setTimeout(() => {
    isHitting.value = false
    isOpened.value = true
    showEgg.value = true
  }, 150)

  // 获取结果
  const catKey = categories[activeTab.value]?.key || 'bowen'
  try {
    const res = await axios.post('/api/lottery/draw', { category: catKey }, { timeout: 8000 })
    if (res.data.success) {
      prize.value = res.data.prize
      prize.value._category = res.data.category

      setTimeout(() => {
        step.value = 'result'
      }, 1500)
    } else {
      alert(res.data.error || '抽奖失败')
      resetGame()
    }
  } catch(err) {
    console.error('抽奖失败:', err)
    resetGame()
  }
}

async function handleClaimSubmit(data) {
  try {
    // 后端期望 { prizeId, deliveryMethod }
    await axios.post('/api/lottery/claim', {
      prizeId: data.prize_id || data.prizeId,
      deliveryMethod: data.deliveryMethod || ''
    })
    // 提交成功，静默处理
  } catch(e) {
    alert('提交失败，请稍后重试')
    return
  }
}

function resetGame() {
  prize.value = null
  isOpened.value = false
  showEgg.value = false
  isShaking.value = false
  isHitting.value = false
  step.value = 'idle'
  gooseText.value = 'HONK! 冲向云端!\n看看能砸出什么大宝贝!'
}

// ==================== 背包 ====================
async function openBag() {
  showBag.value = true
  bagLoading.value = true
  bagRecords.length = 0
  try {
    const res = await axios.get('/api/lottery/user/records', { timeout: 8000 })
    const list = Array.isArray(res.data) ? res.data : (res.data?.records || [])
    list.forEach(r => {
      bagRecords.push({
        id: r.id,
        prizeName: r.prize_name || r.prizeName || '未知奖品',
        prizeImage: r.image || r.prize_image || '',
        status: r.status || 'pending',
        drawTime: r.draw_time || r.drawTime || '',
        claimMethod: r.claim_method || r.claimMethod || ''
      })
    })
  } catch(e) {
    console.log('背包加载失败:', e.message)
  } finally {
    bagLoading.value = false
  }
}

async function loadBagCount() {
  try {
    const res = await axios.get('/api/lottery/user/records', { timeout: 5000 })
    const list = Array.isArray(res.data) ? res.data : (res.data?.records || [])
    bagCount.value = list.length
  } catch(e) {}
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  if (isNaN(d.getTime())) return timeStr
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// ==================== 初始化 ====================
onMounted(async () => {
  await Promise.all([loadNoticeData(), loadPrizesForStrip(), loadConfig(), loadBagCount()])
})
</script>

<style>
/* ═══ 全局 CSS 变量（非 scoped） ═══ */
:root {
  --px-blue: #4facfe;
  --px-dark-blue: #3a8ceb;
  --px-yellow: #ffd700;
  --px-light-yellow: #ffea00;
  --px-dark-yellow: #ccaa00;
  --px-red: #f43f5e;
  --px-black: #000000;
  --px-white: #ffffff;
  --px-green: #4ade80;
}
</style>

<style scoped>
/* ════════════════════════════════════════════
   RETRO CLOUD QUEST - 像素风组件样式
   ════════════════════════════════════════════ */

/* ─── 像素风街机标题组 ─── */
.pixel-title-group {
  position: relative;
  text-align: center;
  margin-top: 60px;
  margin-bottom: 60px;
  z-index: 10;
  animation: floatTitle 3s ease-in-out infinite;
}

@keyframes floatTitle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.dept-badge {
  display: inline-block;
  background: var(--px-red, #f43f5e);
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 2px;
  padding: 8px 20px;
  border: 4px solid #000;
  box-shadow: 6px 6px 0 #000;
  margin-bottom: 20px;
  transform: rotate(-3deg);
}

.main-title {
  font-size: 64px;
  font-weight: 900;
  font-family: "Microsoft YaHei", "微软雅黑", sans-serif;
  color: var(--px-yellow, #ffd700);
  letter-spacing: 8px;
  margin: 0;
  -webkit-text-stroke: 3px #000;
  text-shadow:
    4px 4px 0 #000,
    8px 8px 0 var(--px-blue, #4A90E2),
    12px 12px 0 #000;
}

.pixel-sparkle {
  position: absolute;
  width: 14px; height: 14px;
  background: #fff;
  border: 4px solid #000;
  animation: sparkleBlink 1s infinite alternate steps(2);
}
.sp-1 { top: -20px; left: 15%; box-shadow: 4px 4px 0 #000; }
.sp-2 { bottom: 0px; right: 12%; box-shadow: 4px 4px 0 #000; transform: scale(0.8); }

@keyframes sparkleBlink {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

@media (max-width: 768px) {
  .main-title { font-size: 40px; letter-spacing: 4px; -webkit-text-stroke: 2px #000; text-shadow: 3px 3px 0 #000, 6px 6px 0 var(--px-blue), 9px 9px 0 #000; }
  .dept-badge { font-size: 14px; padding: 6px 12px; }
}

/* ═══ 像素企鹅（盲盒上方） ═══ */

.lottery-page {
  background-color: var(--px-blue);
  background-image: radial-gradient(var(--px-dark-blue) 15%, transparent 16%);
  background-size: 30px 30px;
  font-family: 'Press Start 2P', cursive;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  user-select: none;
}

/* ═══ 街机边框 ═══ */
.arcade-frame {
  position: fixed; inset: 0;
  border: 12px solid var(--px-black);
  box-shadow: inset 0 0 0 6px var(--px-white);
  pointer-events: none; z-index: 99;
}

/* ═══ 云层容器 ═══ */
.clouds-container {
  position: absolute; inset: 0; overflow: hidden; z-index: 1;
}
.cloud-track {
  position: absolute; width: 100%; height: 200vh;
  animation: scrollUp linear infinite;
}
.track-fast { animation-duration: 20s; z-index: 2; }
.track-slow { animation-duration: 40s; z-index: 1; opacity: 0.6; }
.track-right { animation-name: scrollUpRight; }
@keyframes scrollUp {
  0% { transform: translateY(0); }
  100% { transform: translateY(-100vh); }
}
@keyframes scrollUpRight {
  0% { transform: translateY(-50vh); }
  100% { transform: translateY(50vh); }
}
.pixel-cloud {
  position: absolute;
  filter: drop-shadow(4px 4px 0 rgba(0,0,0,0.15));
}
.cloud-sprite-a {
  width: 10px; height: 10px;
  background: var(--px-white);
  box-shadow:
    10px 0 #fff, 20px 0 #fff, 30px 0 #fff, 40px 0 #fff, 50px 0 #fff,
    60px 0 #fff, 70px 0 #fff, 80px 0 #fff, 90px 0 #fff, 100px 0 #fff,
    0 -10px #fff, 10px -10px #fff, 20px -10px #fff, 30px -10px #fff,
    40px -10px #fff, 50px -10px #fff, 60px -10px #fff, 70px -10px #fff,
    80px -10px #fff, 90px -10px #fff, 100px -10px #fff,
    10px -20px #fff, 20px -20px #fff, 30px -20px #fff, 40px -20px #fff,
    50px -20px #fff, 60px -20px #fff, 70px -20px #fff, 80px -20px #fff,
    90px -20px #fff,
    20px -30px #fff, 30px -30px #fff, 40px -30px #fff, 50px -30px #fff,
    60px -30px #fff, 70px -30px #fff, 80px -30px #fff,
    30px -40px #fff, 40px -40px #fff, 60px -40px #fff, 70px -40px #fff;
}
.cloud-sprite-b {
  width: 10px; height: 10px;
  background: var(--px-white);
  box-shadow:
    10px 0 #fff, 20px 0 #fff, 30px 0 #fff, 40px 0 #fff, 50px 0 #fff,
    60px 0 #fff, 70px 0 #fff, 80px 0 #fff, 90px 0 #fff, 100px 0 #fff,
    110px 0 #fff, 120px 0 #fff, 130px 0 #fff, 140px 0 #fff, 150px 0 #fff,
    0 -10px #fff, 10px -10px #fff, 20px -10px #fff, 30px -10px #fff,
    40px -10px #fff, 50px -10px #fff, 60px -10px #fff, 70px -10px #fff,
    80px -10px #fff, 90px -10px #fff, 100px -10px #fff, 110px -10px #fff,
    120px -10px #fff, 130px -10px #fff, 140px -10px #fff, 150px -10px #fff,
    10px -20px #fff, 20px -20px #fff, 30px -20px #fff, 40px -20px #fff,
    50px -20px #fff, 60px -20px #fff, 70px -20px #fff, 80px -20px #fff,
    90px -20px #fff, 100px -20px #fff, 110px -20px #fff, 120px -20px #fff,
    130px -20px #fff, 140px -20px #fff,
    20px -30px #fff, 30px -30px #fff, 40px -30px #fff, 50px -30px #fff,
    60px -30px #fff, 70px -30px #fff, 80px -30px #fff, 90px -30px #fff,
    100px -30px #fff, 110px -30px #fff, 120px -30px #fff, 130px -30px #fff,
    30px -40px #fff, 40px -40px #fff, 50px -40px #fff, 60px -40px #fff,
    70px -40px #fff, 90px -40px #fff, 100px -40px #fff, 110px -40px #fff,
    120px -40px #fff,
    40px -50px #fff, 50px -50px #fff, 60px -50px #fff, 100px -50px #fff, 110px -50px #fff;
}
.cloud-sprite-c {
  width: 10px; height: 10px;
  background: rgba(255,255,255,0.85);
  box-shadow:
    8px 0 #fff, 16px 0 #fff, 24px 0 #fff, 32px 0 #fff, 40px 0 #fff,
    48px 0 #fff, 56px 0 #fff, 64px 0 #fff, 72px 0 #fff, 80px 0 #fff,
    88px 0 #fff, 96px 0 #fff, 104px 0 #fff, 112px 0 #fff, 120px 0 #fff,
    0 -8px #fff, 8px -8px #fff, 16px -8px #fff, 24px -8px #fff,
    32px -8px #fff, 40px -8px #fff, 48px -8px #fff, 56px -8px #fff,
    64px -8px #fff, 72px -8px #fff, 80px -8px #fff, 88px -8px #fff,
    96px -8px #fff, 104px -8px #fff, 112px -8px #fff, 120px -8px #fff,
    8px -16px #fff, 16px -16px #fff, 24px -16px #fff, 32px -16px #fff,
    40px -16px #fff, 48px -16px #fff, 56px -16px #fff, 64px -16px #fff,
    72px -16px #fff, 80px -16px #fff, 88px -16px #fff, 96px -16px #fff,
    16px -24px #fff, 24px -24px #fff, 32px -24px #fff, 40px -24px #fff,
    48px -24px #fff, 56px -24px #fff, 64px -24px #fff, 72px -24px #fff,
    80px -24px #fff, 24px -32px #fff, 32px -32px #fff, 48px -32px #fff,
    64px -32px #fff, 80px -32px #fff, 32px -40px #fff, 48px -40px #fff, 64px -40px #fff;
}

/* ═══ HUD 顶部信息 ═══ */
.hud-top {
  position: absolute; top: 30px; left: 30px; right: 30px;
  display: flex; justify-content: space-between; z-index: 10;
}
.hud-box {
  background: var(--px-white); border: 4px solid var(--px-black);
  padding: 12px 20px; box-shadow: 6px 6px 0 var(--px-black);
  display: flex; align-items: center; gap: 10px; font-size: 16px;
}
.hud-box .val { color: var(--px-red); font-size: 20px; }

/* ═══ 看板娘像素长鹅 ═══ */
.mascot-area {
  position: absolute; bottom: 80px; right: 40px;
  z-index: 10; display: flex; flex-direction: column; align-items: center;
}
.dialog-bubble {
  background: var(--px-white); border: 4px solid var(--px-black);
  padding: 15px; box-shadow: 6px 6px 0 var(--px-black);
  font-size: 14px; margin-bottom: 15px; position: relative;
  animation: floatObj 2s infinite alternate; line-height: 1.7;
  white-space: pre-line; text-align: center; max-width: 200px;
}
.dialog-bubble::after {
  content: ''; position: absolute; bottom: -12px; right: 30px;
  border-width: 12px 12px 0; border-style: solid;
  border-color: var(--px-black) transparent transparent transparent;
}
.pixel-goose { position: relative; width: 50px; height: 60px; animation: hop 0.8s infinite steps(2); }
.goose-head { position: absolute; top: 0; right: 10px; width: 24px; height: 24px; background: #fff; border: 4px solid #000; }
.goose-eye { position: absolute; top: 6px; right: 4px; width: 4px; height: 4px; background: #000; }
.goose-beak { position: absolute; top: 12px; right: -12px; width: 16px; height: 8px; background: #ff8c00; border: 4px solid #000; }
.goose-neck { position: absolute; top: 20px; right: 14px; width: 16px; height: 20px; background: #fff; border-left: 4px solid #000; border-right: 4px solid #000; }
.goose-body { position: absolute; bottom: 0; right: -5px; width: 45px; height: 25px; background: #fff; border: 4px solid #000; border-radius: 20px 0 0 20px; }

/* ═══ 像素企鹅（盲盒上方） ═══ */
.penguin-mascot {
  position: absolute; top: calc(50% - 220px); left: 50%;
  margin-left: -55px;
  z-index: 6; display: flex; flex-direction: column; align-items: center;
  transform: scale(0.28); /* 缩小企鹅 */
}
.pixel-penguin {
  width: 18px; height: 18px;
  box-shadow:
    144px 0 #000, 162px 0 #000, 180px 0 #000,
    126px 18px #000, 144px 18px #000, 162px 18px #000, 180px 18px #000, 198px 18px #000,
    108px 36px #000, 126px 36px #000, 144px 36px #000, 162px 36px #000, 180px 36px #000, 198px 36px #000, 216px 36px #000,
    90px 54px #000, 108px 54px #000, 126px 54px #000, 144px 54px #000, 162px 54px #000, 180px 54px #000, 198px 54px #000, 216px 54px #000, 234px 54px #000,
    72px 72px #000, 90px 72px #000, 108px 72px #fff, 126px 72px #fff, 144px 72px #000, 162px 72px #000, 180px 72px #fff, 198px 72px #fff, 216px 72px #000, 234px 72px #000,
    72px 90px #000, 90px 90px #fff, 108px 90px #000, 126px 90px #fff, 144px 90px #ffcc00, 162px 90px #ffcc00, 180px 90px #fff, 198px 90px #000, 216px 90px #fff, 234px 90px #000,
    72px 108px #000, 90px 108px #fff, 108px 108px #f4dfae, 126px 108px #fff, 144px 108px #fff, 162px 108px #ffcc00, 180px 108px #fff, 198px 108px #fff, 216px 108px #f4dfae, 234px 108px #000,
    54px 126px #000, 72px 126px #000, 90px 126px #000, 108px 126px #fff, 126px 126px #fff, 144px 126px #fff, 162px 126px #fff, 180px 126px #fff, 198px 126px #fff, 216px 126px #000, 234px 126px #000, 252px 126px #000,
    36px 144px #000, 54px 144px #000, 72px 144px #000, 90px 144px #fff, 108px 144px #fff, 126px 144px #fff, 144px 144px #fff, 162px 144px #fff, 180px 144px #fff, 198px 144px #fff, 216px 144px #000, 234px 144px #000, 252px 144px #000,
    36px 162px #000, 54px 162px #000, 72px 162px #000, 90px 162px #fff, 108px 162px #fff, 126px 162px #fff, 144px 162px #fff, 162px 162px #fff, 180px 162px #fff, 198px 162px #fff, 216px 162px #000, 234px 162px #000, 252px 162px #000,
    36px 180px #000, 54px 180px #000, 72px 180px #000, 90px 180px #fff, 108px 180px #fff, 126px 180px #fff, 144px 180px #fff, 162px 180px #fff, 180px 180px #fff, 198px 180px #fff, 216px 180px #000, 234px 180px #000, 252px 180px #000,
    54px 198px #000, 72px 198px #000, 90px 198px #fff, 108px 198px #fff, 126px 198px #fff, 144px 198px #fff, 162px 198px #fff, 180px 198px #fff, 198px 198px #fff, 216px 198px #000, 234px 198px #000,
    72px 216px #000, 90px 216px #000, 108px 216px #fff, 126px 216px #fff, 144px 216px #fff, 162px 216px #fff, 180px 216px #fff, 198px 216px #fff, 216px 216px #000,
    90px 234px #ffcc00, 108px 234px #ffcc00, 126px 234px #000,
    180px 234px #000, 198px 234px #ffcc00, 216px 234px #ffcc00;
  filter: drop-shadow(3px 3px 0 rgba(0,0,0,0.2));
  transition: transform 0.15s;
}
.p-hop .pixel-penguin { animation: pBounce 1.2s ease-in-out infinite; }
@keyframes pBounce { 0%,100%{ transform:translateY(0) scale(1,1);} 50%{ transform:translateY(-60px) scale(0.96,1.06);} }
.p-excited .pixel-penguin { animation: pExcited 0.2s ease-in-out infinite; }
@keyframes pExcited { 0%,100%{ transform:translateY(0) rotate(-5deg);} 50%{ transform:translateY(-8px) rotate(5deg);} }
.p-speech {
  background: var(--px-white); border: 3px solid var(--px-black);
  padding: 6px 12px; font-size: 14px; margin-top: 8px;
  box-shadow: 4px 4px 0 var(--px-black);
  animation: speechPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  white-space: nowrap;
}
.p-speech::after {
  content: ''; position: absolute; bottom: -9px; left: 50%; transform: translateX(-50%);
  border-width: 9px 7px 0; border-style: solid;
  border-color: var(--px-black) transparent transparent transparent;
}
@keyframes speechPop { from{transform:scale(0) translateY(10px);opacity:0;} to{transform:scale(1) translateY(0);opacity:1;} }

/* ═══ 核心舞台 & 3D 方块 ═══ */
.stage {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -90%);
  display: flex; flex-direction: column; align-items: center;
  z-index: 5;
}
/* ═══ 手指提示（按钮下方） ═══ */
.pointer-arrow {
  position: absolute; top: calc(50% + 165px); left: calc(50% - 40px);
  transform: translateX(-50%);
  color: var(--px-red); font-size: 48px;
  text-shadow: 4px 4px 0 var(--px-black);
  animation: bounce 0.5s infinite alternate; transition: opacity 0.3s;
  z-index: 9;
}
.scene { width: 150px; height: 150px; perspective: 1000px; }
.cube-wrapper {
  width: 100%; height: 100%; position: relative; cursor: pointer;
  animation: levitate 3s ease-in-out infinite;
}
.cube {
  width: 100%; height: 100%; position: absolute; transform-style: preserve-3d;
  animation: spin3D 8s infinite linear; transition: transform 0.1s;
}
.cube-face {
  position: absolute; width: 150px; height: 150px; border: 6px solid var(--px-black);
  display: flex; align-items: center; justify-content: center;
  font-size: 80px; color: var(--px-black); text-shadow: 4px 4px 0px rgba(0,0,0,0.3);
  box-shadow: inset -8px -8px 0px rgba(0,0,0,0.1), inset 8px 8px 0px rgba(255,255,255,0.4);
}
.cube-face.front  { transform: rotateY(  0deg) translateZ(75px); background: var(--px-yellow); }
.cube-face.right  { transform: rotateY( 90deg) translateZ(75px); background: var(--px-dark-yellow); }
.cube-face.back   { transform: rotateY(180deg) translateZ(75px); background: var(--px-dark-yellow); }
.cube-face.left   { transform: rotateY(-90deg) translateZ(75px); background: var(--px-yellow); }
.cube-face.top    { transform: rotateX( 90deg) translateZ(75px); background: var(--px-light-yellow); }
.cube-face.bottom { transform: rotateX(-90deg) translateZ(75px); background: #b89600; }
.cube-face::after {
  content: ""; position: absolute; width: 12px; height: 12px; background: #000;
  box-shadow: 114px 0 #000, 0 114px #000, 114px 114px #000; top: 6px; left: 6px;
}
.cube-face.top::after, .cube-face.bottom::after { display: none; }

.is-hit .cube { transform: rotateX(-20deg) rotateY(45deg) scaleY(0.4) translateY(60px); }
.is-opened .cube-face { background: #94a3b8 !important; color: transparent; text-shadow: none; }

.pixel-egg {
  position: fixed; top: 40%; left: 50%; width: 100px; height: 100px;
  margin-left: -50px;
  background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
  border: 5px solid #000; border-radius: 12px; z-index: 150;
  display: flex; align-items: center; justify-content: center; font-size: 48px;
  box-shadow: 10px 10px 0 rgba(0,0,0,0.3), inset -3px -3px 0 #ddd, inset 3px 3px 0 rgba(255,255,255,0.8);
  animation: popUp 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
.egg-fade-enter-active { transition: all .6s ease; }
.egg-fade-leave-active { transition: all .4s ease; transform: scale(1) translateY(-180px); }
.egg-fade-enter-from { opacity: 0; transform: scale(0.3); }
.egg-fade-leave-to { opacity: 0; transform: scale(1.5) translateY(-300px); }

/* ═══ Tab 栏 ═══ */
.tab-bar {
  position: absolute; top: calc(50% + 45px); left: 50%;
  transform: translateX(-50%); z-index: 8;
  display: flex; gap: 0;
  background: rgba(255,255,255,0.9);
  border: 4px solid var(--px-black);
  box-shadow: 6px 6px 0 var(--px-black);
  padding: 4px;
  border-radius: 8px;
}
.tab-btn {
  padding: 10px 18px; font-size: 14px; font-weight: bold;
  color: var(--px-black); background: none; border: none;
  cursor: pointer; border-radius: 4px; transition: all 0.2s; white-space: nowrap;
}
.tab-btn.active {
  background: var(--px-yellow);
  box-shadow: 2px 2px 0 var(--px-black);
}
.tab-btn:not(.active):hover { background: rgba(0,0,0,0.08); }

/* ═══ 开启按钮 ═══ */
.open-btn {
  position: absolute; top: calc(50% + 120px); left: 50%;
  transform: translateX(-50%);
  padding: 18px 56px; font-size: 20px; font-weight: bold;
  letter-spacing: 3px; color: var(--px-black); cursor: pointer;
  border: 4px solid var(--px-black); border-radius: 8px;
  background: var(--px-yellow);
  box-shadow: 6px 6px 0 var(--px-black);
  transition: all 0.15s; z-index: 9;
  animation: btnFloat 2.8s ease-in-out infinite;
}
.open-btn:hover {
  transform: translateX(-50%) translateY(-4px);
  box-shadow: 10px 10px 0 var(--px-black);
  background: var(--px-light-yellow);
}
.open-btn:active {
  transform: translateX(-50%) translateY(6px) scale(0.98);
  box-shadow: 2px 2px 0 var(--px-black);
}
.btn-text{position:relative;z-index:2}
@keyframes btnFloat{0%,100%{transform:translateX(-50%)translateY(0)}50%{transform:translateX(-50%)translateY(-5px)}}
.btn-pop-enter-active{transition:all .5s cubic-bezier(.34,1.56,.64,1)}.btn-pop-leave-active{transition:all .3s ease}.btn-pop-enter-from{opacity:0;transform:translateX(-50%)translateY(18px)scale(.88)}.btn-pop-leave-to{opacity:0;transform:translateX(-50%)translateY(-8px)}

.loading-text {
  position: absolute; top: calc(50% + 110px); left: 50%;
  transform: translateX(-50%);
  font-size: 11px; color: var(--px-black);
  text-shadow: 2px 2px 0 rgba(255,255,255,0.5);
  z-index: 9; animation: loadingPulse 1.2s ease infinite;
}
.loading-text::after{content:'';animation:dots 1.5s steps(4,end) infinite}@keyframes dots{0%,20%{content:''}40%{content:'.'}60%{content:'..'}80%,100%{content:'...'}}@keyframes loadingPulse{0%,100%{opacity:1}50%{opacity:.4}}
.fade-up-enter-active{transition:all .4s ease-out}.fade-up-leave-active{transition:all .3s ease}.fade-up-enter-from{opacity:0;transform:translateY(12px)}

/* ═══ 无资格提示 ═══ */
.no-access-box{
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: var(--px-white); border: 6px solid var(--px-black);
  box-shadow: 10px 10px 0 var(--px-black);
  padding: 36px 28px; text-align: center; z-index: 10;
  animation: modalIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.no-access-icon{font-size:48px;margin-bottom:12px}
.no-access-text{font-size:16px;color:var(--px-black);line-height:2;font-weight:normal}
.fade-scale-enter-active{transition:all .4s ease-out}.fade-scale-leave-active{transition:all .2s ease}.fade-scale-enter-from{opacity:0;transform:scale(.85)}.fade-scale-leave-to{opacity:0;transform:scale(.95)}

.card-appear-enter-active{transition:all .7s cubic-bezier(.34,1.56,.64,1)}.card-appear-leave-active{transition:all .3s ease}.card-appear-enter-from{opacity:0}.card-appear-leave-to{opacity:0}

/* ═══ 左侧功能按钮 ═══ */
.corner-actions{
  position:absolute;bottom:132px;left:30px;z-index:10;display:flex;flex-direction:column;gap:12px
}
.action-btn{
  display:flex;align-items:center;gap:8px;padding:11px 16px;
  background:var(--px-white);border:4px solid var(--px-black);
  box-shadow:4px 4px 0 var(--px-black);
  color:var(--px-black);font-size:14px;cursor:pointer;
  transition:all .2s;white-space:nowrap;border-radius:4px
}
.action-btn:hover{transform:translateY(-2px);box-shadow:6px 6px 0 var(--px-black)}
.action-btn:active{transform:scale(.97);box-shadow:2px 2px 0 var(--px-black)}
.act-icon{font-size:18px;line-height:1}.act-text{font-weight:bold}

/* ═══ 底部奖品轮播 ═══ */
.ticker-wrap{
  position:fixed;bottom:0;left:0;width:100%;
  background:var(--px-black);border-top:6px solid var(--px-white);
  color:var(--px-yellow);padding:10px;z-index:10;display:flex;align-items:center;overflow:hidden
}
.strip-label{
  writing-mode:vertical-lr;text-orientation:upright;
  font-size:8px;font-weight:bold;color:var(--px-dark-yellow);
  letter-spacing:1px;margin-right:10px;flex-shrink:0;padding-top:4px;text-transform:uppercase
}
.strip-track{display:flex;gap:12px;animation:stripScroll 20s linear infinite;will-change:transform}
.strip-track.paused{animation-play-state:paused}
.strip-card{flex-shrink:0;width:68px;display:flex;flex-direction:column;align-items:center;gap:3px}
.strip-card-img{
  width:58px;height:58px;border-radius:4px;background:#333;border:2px solid #666;
  object-fit:cover;box-sizing:border-box
}
.strip-card-img.strip-no-img{
  display:flex;align-items:center;justify-content:center;
  font-size:22px;font-weight:bold;color:#888
}
.strip-card-name{font-size:7px;color:var(--px-light-yellow);text-align:center;white-space:nowrap;max-width:68px;text-overflow:ellipsis;overflow:hidden}
@keyframes stripScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

.ticker-wrap-simple{
  position:fixed;bottom:0;left:0;width:100%;
  background:var(--px-black);border-top:6px solid var(--px-white);
  color:var(--px-yellow);padding:12px;z-index:10;overflow:hidden
}
.ticker{display:inline-block;white-space:nowrap;animation:ticker 25s linear infinite;font-size:10px}
@keyframes ticker{from{transform:translateX(100vw)}to{transform:translateX(-100%)}}

/* ═══ 弹窗遮罩 ═══ */
.modal-overlay{
  position:fixed;inset:0;background:rgba(0,0,20,0.85);
  display:flex;align-items:center;justify-content:center;z-index:200
}
.modal-fade-enter-active,.modal-fade-leave-active{transition:opacity .3s}
.modal-fade-enter-from,.modal-fade-leave-to{opacity:0}

.modal-card-rules {
  background: var(--px-white); border: 8px solid var(--px-black);
  box-shadow: 20px 20px 0 var(--px-black);
  width: 360px; max-width: 90vw; padding: 32px 28px; text-align: center;
  animation: modalIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.modal-card-rules h2 { color: var(--px-red); font-size: 16px; margin-bottom: 20px; text-shadow: 2px 2px 0 #000; line-height: 1.6; }
.modal-card-rules ul { list-style: none; text-align: left; margin-bottom: 8px; }
.modal-card-rules li {
  font-size: 10px; color: var(--px-black); padding: 8px 0;
  border-bottom: 2px dashed rgba(0,0,0,0.15); line-height: 1.7;
}
.modal-card-rules li:last-child { border-bottom: none; }
.btn-confirm:hover { transform: translateY(-2px); box-shadow: 8px 8px 0 var(--px-black); }

/* ═══ 背包弹窗（像素风） ═══ */
.bag-modal-pixel {
  background: var(--px-white); border: 8px solid var(--px-black);
  box-shadow: 20px 20px 0 var(--px-black);
  width: 380px; max-width: 92vw; max-height: 70vh;
  color: var(--px-black); display: flex; flex-direction: column;
  animation: modalIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.bag-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 4px solid var(--px-black);
}
.bag-header h3 { font-size: 13px; margin: 0; letter-spacing: 1px; }
.bag-close-btn {
  width: 34px; height: 34px; border: 3px solid var(--px-black);
  background: var(--px-red); color: #fff; font-size: 18px; font-weight: bold;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 3px 3px 0 var(--px-black); transition: all 0.15s;
}
.bag-close-btn:hover { background: #dc2626; transform: translateY(-2px); }
.bag-loading { text-align: center; padding: 40px; font-size: 11px; color: #888; }
.bag-empty { text-align: center; padding: 36px 20px; }
.bag-empty-icon { font-size: 48px; display: block; margin-bottom: 10px; }
.bag-empty p { font-size: 10px; color: #888; margin: 0; }
.bag-list { overflow-y: auto; padding: 8px 14px 18px; scrollbar-width: thin; }
.bag-list::-webkit-scrollbar { width: 6px; }
.bag-list::-webkit-scrollbar-thumb { background: var(--px-black); border-radius: 3px; }
.bag-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  margin-bottom: 8px; background: #f0f0f0;
  border: 3px solid var(--px-black); border-radius: 4px;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.15);
  transition: all 0.15s;
}
.bag-item:hover { transform: translateY(-2px); box-shadow: 5px 5px 0 rgba(0,0,0,0.25); }
.bag-item-img {
  width: 52px; height: 52px; min-width: 52px; border-radius: 4px;
  overflow: hidden; background: #ddd; border: 3px solid var(--px-black);
  display: flex; align-items: center; justify-content: center;
}
.bag-item-img img { width: 100%; height: 100%; object-fit: cover; }
.bag-no-img { font-size: 22px; font-weight: bold; color: #999; }
.bag-item-info { flex: 1; min-width: 0; }
.bag-item-info h4 { font-size: 10px; font-weight: bold; margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bag-item-info p { font-size: 8px; color: #999; margin: 0 0 4px; }
.bag-method-tag {
  font-size: 8px; display: inline-block; background: var(--px-yellow);
  padding: 2px 8px; border: 2px solid var(--px-black); border-radius: 4px; font-weight: bold;
}

/* ═══ 动画关键帧 ═══ */
@keyframes spin3D { 0% { transform: rotateX(-15deg) rotateY(0deg); } 100% { transform: rotateX(-15deg) rotateY(360deg); } }
@keyframes levitate { 0%, 100% { top: 0; } 50% { top: -20px; } }
@keyframes bounce { 0% { transform: translateY(0); } 100% { transform: translateY(15px); } }
@keyframes popUp {
  0%   { opacity: 0; transform: translateX(-50%) translateY(0) scale(0.3) rotate(-15deg); }
  25%  { opacity: 1; }
  55%  { transform: translateX(-50%) translateY(-200px) scale(1.2) rotate(360deg); }
  75%  { transform: translateX(-50%) translateY(-170px) scale(1) rotate(680deg); }
  100% { opacity: 1; transform: translateX(-50%) translateY(-180px) scale(1) rotate(720deg); }
}
@keyframes modalIn { from { transform: scale(0) rotate(-10deg); } to { transform: scale(1) rotate(0); } }
@keyframes ticker { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }
@keyframes hop { 0% { transform: translateY(0); } 100% { transform: translateY(-8px); } }
@keyframes floatObj { from { transform: translateY(0); } to { transform: translateY(-10px); } }

/* ═══ 屏幕抖动 ═══ */
.shaking .stage { animation: cameraImpact 0.2s ease-out; }
@keyframes cameraImpact {
  0%   { transform: translate(-50%, -45%) scale(1) translate(0, 0); }
  20%  { transform: translate(-50%, -45%) scale(1.02) translate(3px, -3px); }
  40%  { transform: translate(-50%, -45%) scale(1.01) translate(-2px, 2px); }
  60%  { transform: translate(-50%, -45%) scale(1.015) translate(1px, -1px); }
  80%  { transform: translate(-50%, -45%) scale(1.005) translate(-1px, 1px); }
  100% { transform: translate(-50%, -45%) scale(1) translate(0, 0); }
}

/* ═══ 响应式适配 ═══ */
@media(max-width: 600px) {
  .arcade-frame { border-width: 8px; box-shadow: inset 0 0 0 4px var(--px-white); }
  .hud-top { top: 16px; left: 16px; right: 16px; gap: 8px; }
  .hud-box { padding: 8px 14px; font-size: 9px; box-shadow: 4px 4px 0 #000; }
  .hud-box .val { font-size: 13px; }
  .scene { width: 120px; height: 120px; }
  .cube-face { width: 120px; height: 120px; font-size: 60px; border-width: 4px; }
  .cube-face.front  { transform: rotateY(  0deg) translateZ(60px); }
  .cube-face.right  { transform: rotateY( 90deg) translateZ(60px); }
  .cube-face.back   { transform: rotateY(180deg) translateZ(60px); }
  .cube-face.left   { transform: rotateY(-90deg) translateZ(60px); }
  .cube-face.top    { transform: rotateX( 90deg) translateZ(60px); }
  .cube-face.bottom { transform: rotateX(-90deg) translateZ(60px); }
  .cube-face::after { width: 8px; height: 8px; box-shadow: 88px 0 #000, 0 88px #000, 88px 88px #000; top: 4px; left: 4px; }
  .pointer-arrow { font-size: 30px; margin-bottom: 14px; }
  .mascot-area { bottom: 120px; right: 16px; }
  .dialog-bubble { font-size: 8px; padding: 10px; }
  .pixel-goose { width: 38px; height: 46px; }
  .tab-bar { top: calc(50% + 95px); padding: 3px; }
  .tab-btn { padding: 7px 14px; font-size: 8px; }
  .open-btn { top: calc(50% + 145px); padding: 14px 40px; font-size: 12px; letter-spacing: 2px; border-width: 3px; box-shadow: 4px 4px 0 #000; }
  .loading-text { top: calc(50% + 155px); font-size: 10px; }
  .corner-actions { bottom: 105px; left: 16px; gap: 8px; }
  .action-btn { padding: 8px 12px; font-size: 9px; }
  .strip-card-img { width: 46px; height: 46px; }
  .strip-card { width: 54px; }
  .bag-modal-pixel { width: 92vw; }
}

@media(max-width: 380px) {
  .scene { width: 100px; height: 100px; }
  .cube-face { width: 100px; height: 100px; font-size: 48px; border-width: 3px; }
  .cube-face.front  { transform: rotateY(  0deg) translateZ(50px); }
  .cube-face.right  { transform: rotateY( 90deg) translateZ(50px); }
  .cube-face.back   { transform: rotateY(180deg) translateZ(50px); }
  .cube-face.left   { transform: rotateY(-90deg) translateZ(50px); }
  .cube-face.top    { transform: rotateX( 90deg) translateZ(50px); }
  .cube-face.bottom { transform: rotateX(-90deg) translateZ(50px); }
  .cube-face::after { width: 6px; height: 6px; box-shadow: 72px 0 #000, 0 72px #000, 72px 72px #000; top: 3px; left: 3px; }
  .pointer-arrow { font-size: 24px; margin-bottom: 10px; }
  .open-btn { padding: 12px 32px; font-size: 11px; }
  .tab-btn { padding: 6px 11px; font-size: 7px; }
  .hud-box { padding: 6px 10px; font-size: 8px; }
}
</style>
