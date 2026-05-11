<template>
  <div class="penguin-test">
    <!-- 像素边框 -->
    <div class="pixel-border">

      <!-- 标题区 -->
      <header class="test-header">
        <h1 class="pixel-title">🐧 PENGUIN TEST</h1>
        <span class="subtitle">PIXEL ART - BLACK & WHITE EDITION</span>
      </header>

      <!-- 企鹅展示区 -->
      <section class="showcase">
        <!-- 大型企鹅展示 -->
        <div class="penguin-stage">
          <div class="stage-label">STANDING</div>
          <div class="penguin penguin-large" :class="{ bounce: isBouncing }" @click="toggleBounce">
            <!-- 身体 -->
            <div class="pg-body">
              <!-- 白色肚皮 -->
              <div class="pg-belly"></div>
              <!-- 眼睛区域 -->
              <div class="pg-eyes">
                <div class="pg-eye pg-eye-left">
                  <div class="pg-pupil"></div>
                </div>
                <div class="pg-eye pg-eye-right">
                  <div class="pg-pupil"></div>
                </div>
              </div>
              <!-- 嘴巴 -->
              <div class="pg-beak"></div>
              <!-- 腮红 -->
              <div class="pg-blush pg-blush-left"></div>
              <div class="pg-blush pg-blush-right"></div>
            </div>
            <!-- 翅膀 -->
            <div class="pg-wing pg-wing-left"></div>
            <div class="pg-wing pg-wing-right"></div>
            <!-- 脚 -->
            <div class="pg-foot pg-foot-left"></div>
            <div class="pg-foot pg-foot-right"></div>
          </div>
        </div>

        <!-- 动作展示行 -->
        <div class="action-row">
          <div class="action-item" v-for="(action, idx) in actions" :key="idx">
            <div class="action-label">{{ action.name }}</div>
            <div class="penguin penguin-mini" :class="action.cls" @click="playAction(idx)">
              <div class="pg-body-mini">
                <div class="pg-belly-mini"></div>
                <div class="pg-eyes-mini">
                  <div class="pg-eye-dot"></div>
                  <div class="pg-eye-dot"></div>
                </div>
                <div class="pg-beak-mini"></div>
              </div>
              <div class="pg-wing-mini pg-wl"></div>
              <div class="pg-wing-mini pg-wr"></div>
            </div>
          </div>
        </div>

        <!-- 互动按钮 -->
        <div class="controls">
          <button class="px-btn" @click="toggleBounce">
            {{ isBouncing ? 'STOP BOUNCE' : 'BOUNCE!' }}
          </button>
          <button class="px-btn" @click="spinPenguin">
            🔄 SPIN
          </button>
          <button class="px-btn px-btn-red" @click="flipPenguin">
            ↔️ FLIP
          </button>
        </div>
      </section>

      <!-- 像素网格展示 -->
      <section class="grid-section">
        <h2 class="section-title">PIXEL GRID</h2>
        <div class="pixel-grid" :class="{ flipped: isFlipped }">
          <div v-for="(row, y) in pixelArt" :key="y" class="grid-row">
            <div
              v-for="(cell, x) in row"
              :key="x"
              class="grid-cell"
              :class="'c-' + cell"
              @mouseenter="hoverCell = { x, y, c: cell }"
            ></div>
          </div>
        </div>
        <div class="grid-info" v-if="hoverCell">
          [{{ hoverCell.x }}, {{ hoverCell.y }}] = {{ hoverCell.c === 'b' ? 'BLACK' : hoverCell.c === 'w' ? 'WHITE' : hoverCell.c === 'g' ? 'GRAY' : 'EMPTY' }}
        </div>
      </section>

      <!-- 动画状态面板 -->
      <section class="status-panel">
        <h2 class="section-title">STATUS</h2>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">BOUNCE</span>
            <span class="status-value" :class="isBouncing ? 'val-on' : 'val-off'">{{ isBouncing ? 'ON' : 'OFF' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">FLIP</span>
            <span class="status-value" :class="isFlipped ? 'val-on' : 'val-off'">{{ isFlipped ? 'YES' : 'NO' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">SPINS</span>
            <span class="status-val-num">{{ spinCount }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">CLICKS</span>
            <span class="status-val-num">{{ clickCount }}</span>
          </div>
        </div>
      </section>

      <!-- 底部信息 -->
      <footer class="test-footer">
        <span>PIXEL PENGUIN v0.1 TEST</span>
        <span>|</span>
        <router-link to="/">← BACK TO LOTTERY</router-link>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const isBouncing = ref(false)
const isFlipped = ref(false)
const spinCount = ref(0)
const clickCount = ref(0)
const hoverCell = ref(null)

const actions = [
  { name: 'IDLE', cls: '' },
  { name: 'WAVE', cls: 'wave' },
  { name: 'HAPPY', cls: 'happy' },
  { name: 'SAD', cls: 'sad' },
  { name: 'WALK', cls: 'walk' },
]

function toggleBounce() {
  isBouncing.value = !isBouncing.value
  clickCount.value++
}

function spinPenguin() {
  spinCount.value++
  clickCount.value++
}

function flipPenguin() {
  isFlipped.value = !isFlipped.value
  clickCount.value++
}

function playAction(idx) {
  clickCount.value++
}

// 像素艺术数据 (16x20) b=黑 w=白 g=灰 .=空
const pixelArt = reactive([
  '................', // 0
  '...bbbbbbbb....', // 1 头顶
  '..bbbbwwbbbb...', // 2
  '.bbbbwwwwwbbb..', // 3
  '.bbwwbgwgbwwbb.', // 4 眼睛
  '.bbwwgggggwbb..', // 5
  '..bbbbwbbbb....', // 6 嘴
  '...bbbbbbb.....', // 7 下巴
  '..bbbbbbbbbb...', // 8 脖子
  '.bbbbwwwwbbbb.', // 9 身体上部
  '.bwwwgwwwwgwb.', // 10 翅膀
  '.bwwwgwwwwgwb.', // 11
  '.bwwwwwwwwwwb.', // 12 肚子
  '.bwggggggggwb.', // 13
  '.bwwwwwwwwwwb.', // 14
  '..bbbbbbbbbb..', // 15 底部
  '...bg......gb..', // 16 脚
  '...bgg....ggb..', // 17
  '...bggg..gggb..', // 18
  '...............', // 19
])
</script>

<style scoped>
/* ═══ 全局变量 ═══ */
.penguin-test {
  --px-bg: #e8f4fc;
  --px-black: #1a1a2e;
  --px-white: #ffffff;
  --px-gray: #888888;
  --px-light-gray: #cccccc;
  --px-accent: #ffd700;
  --px-border: #1a1a2e;
}

.penguin-test {
  min-height: 100vh;
  background: var(--px-bg);
  background-image:
    radial-gradient(circle at 20% 50%, rgba(79, 172, 254, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.06) 0%, transparent 50%);
  padding: 20px;
  font-family: 'Courier New', monospace;
}

/* 像素边框 */
.pixel-border {
  max-width: 800px;
  margin: 0 auto;
  border: 4px solid var(--px-border);
  box-shadow:
    8px 8px 0 var(--px-border),
    inset 0 0 0 2px var(--px-white);
  background: var(--px-white);
  padding: 24px;
  position: relative;
}

/* 标题 */
.test-header {
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 3px dashed var(--px-black);
  padding-bottom: 16px;
}

.pixel-title {
  font-size: 28px;
  font-weight: 900;
  color: var(--px-black);
  letter-spacing: 4px;
  margin: 0 0 8px;
  image-rendering: pixelated;
}

.subtitle {
  font-size: 12px;
  color: var(--px-gray);
  letter-spacing: 3px;
}

/* ====== 大企鹅 ====== */
.showcase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
}

.penguin-stage {
  text-align: center;
}

.stage-label {
  font-size: 11px;
  color: var(--px-gray);
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.penguin {
  position: relative;
  cursor: pointer;
  user-select: none;
  transition: transform 0.3s;
}

.penguin:hover {
  transform: scale(1.05);
}

.penguinLargeSize() {
  width: 140px;
  height: 180px;
}

.penguin-large {
  .penguinLargeSize();
  margin: 0 auto;
}

/* 身体 */
.pg-body {
  .penguinLargeSize();
  background: var(--px-black);
  border-radius: 70% 70% 60% 60% / 60% 60% 40% 40%;
  position: relative;
  z-index: 2;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.15);
}

/* 白色肚皮 */
.pg-belly {
  position: absolute;
  top: 45%;
  left: 15%;
  width: 70%;
  height: 50%;
  background: var(--px-white);
  border-radius: 50% 50% 45% 45% / 55% 55% 40% 40%;
}

/* 眼睛 */
.pg-eyes {
  position: absolute;
  top: 28%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 22px;
}

.pg-eye {
  width: 26px;
  height: 28px;
  background: var(--px-white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--px-black);
}

.pg-pupil {
  width: 14px;
  height: 14px;
  background: var(--px-black);
  border-radius: 50%;
  animation: blink 3s infinite;
}

@keyframes blink {
  0%, 95%, 100% { transform: scaleY(1); }
  97% { transform: scaleY(0.1); }
}

/* 嘴巴 */
.pg-beak {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 14px solid var(--px-light-gray);
}

/* 腮红 */
.pg-blush {
  position: absolute;
  top: 42%;
  width: 18px;
  height: 10px;
  background: rgba(0,0,0,0.08);
  border-radius: 50%;
}
.pg-blush-left { left: 8%; }
.pg-blush-right { right: 8%; }

/* 翅膀 */
.pg-wing {
  position: absolute;
  top: 50%;
  width: 28px;
  height: 55px;
  background: var(--px-black);
  border-radius: 40%;
  z-index: 1;
  transition: transform 0.3s;
}
.pg-wing-left {
  left: -12px;
  transform-origin: top right;
}
.pg-wing-right {
  right: -12px;
  transform-origin: top left;
}

.penguin:hover .pg-wing-left {
  transform: rotate(-20deg);
}
.penguin:hover .pg-wing-right {
  transform: rotate(20deg);
}

/* 脚 */
.pg-foot {
  position: absolute;
  bottom: -5px;
  width: 34px;
  height: 14px;
  background: var(--px-light-gray);
  border-radius: 50%;
  z-index: 3;
}
.pg-foot-left { left: 18px; }
.pg-foot-right { right: 18px; }

/* 跳动动画 */
.penguin.bounce {
  animation: penguinBounce 0.5s ease-in-out infinite;
}

@keyframes penguinBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-25px); }
}

.penguin.bounce .pg-wing-left {
  animation: wingFlapL 0.25s ease-in-out infinite alternate;
}
.penguin.bounce .pg-wing-right {
  animation: wingFlapR 0.25s ease-in-out infinite alternate;
}

@keyframes wingFlapL {
  from { transform: rotate(-15deg); }
  to { transform: rotate(-45deg); }
}
@keyframes wingFlapR {
  from { transform: rotate(15deg); }
  to { transform: rotate(45deg); }
}

/* 旋转动画 */
@keyframes penguinSpin {
  from { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(0.85); }
  to { transform: rotate(360deg) scale(1); }
}

/* ====== 动作展示行 ====== */
.action-row {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-item {
  text-align: center;
}

.action-label {
  font-size: 10px;
  color: var(--px-gray);
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.penguin-mini {
  width: 56px;
  height: 72px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
}

.penguin-mini:hover {
  transform: scale(1.15);
}

.pg-body-mini {
  width: 100%;
  height: 100%;
  background: var(--px-black);
  border-radius: 70% 70% 60% 60% / 60% 60% 40% 40%;
  position: relative;
}

.pg-belly-mini {
  position: absolute;
  top: 44%;
  left: 18%;
  width: 64%;
  height: 46%;
  background: var(--px-white);
  border-radius: 50% 50% 45% 45% / 55% 55% 35% 35%;
}

.pg-eyes-mini {
  position: absolute;
  top: 26%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.pg-eye-dot {
  width: 8px;
  height: 8px;
  background: var(--px-white);
  border-radius: 50%;
  box-shadow: inset 2px 2px 0 var(--px-black);
}

.pg-beak-mini {
  position: absolute;
  top: 44%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid var(--px-light-gray);
}

.pg-wing-mini {
  position: absolute;
  top: 48%;
  width: 12px;
  height: 24px;
  background: var(--px-black);
  border-radius: 40%;
  z-index: 0;
}
.pg-wl { left: -5px; }
.pg-wr { right: -5px; }

/* 动作变体 */
.penguin-mini.wave .pg-wr {
  animation: miniWave 0.4s ease-in-out infinite alternate;
  transform-origin: top left;
}
@keyframes miniWave {
  from { transform: rotate(10deg); }
  to { transform: rotate(60deg); }
}

.penguin-mini.happy .pg-body-mini {
  animation: happyHop 0.35s ease-in-out infinite;
}
@keyframes happyHop {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-6px) scale(1.05); }
}

.penguin-mini.sad .pg-body-mini {
  animation: sadSquish 1.5s ease-in-out infinite;
}
@keyframes sadSquish {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.92) scaleX(1.04); }
}

.penguin-mini.walk .pg-body-mini {
  animation: walkWaddle 0.4s ease-in-out infinite;
}
@keyframes walkWaddle {
  0%, 100% { transform: rotate(-5deg) translateX(-2px); }
  50% { transform: rotate(5deg) translateX(2px); }
}
.penguin-mini.walk .pg-wl {
  animation: walkWingL 0.4s ease-in-out infinite;
}
.penguin-mini.walk .pg-wr {
  animation: walkWingR 0.4s ease-in-out infinite;
}
@keyframes walkWingL {
  0%, 100% { transform: rotate(20deg); }
  50% { transform: rotate(-20deg); }
}
@keyframes walkWingR {
  0%, 100% { transform: rotate(-20deg); }
  50% { transform: rotate(20deg); }
}

/* ====== 控制按钮 ====== */
.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.px-btn {
  font-family: 'Courier New', monospace;
  font-weight: 900;
  font-size: 13px;
  letter-spacing: 1px;
  padding: 10px 24px;
  background: var(--px-black);
  color: var(--px-white);
  border: none;
  cursor: pointer;
  position: relative;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.2);
  transition: all 0.1s;
}

.px-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 rgba(0,0,0,0.25);
}

.px-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 rgba(0,0,0,0.2);
}

.px-btn-red {
  background: #333;
}

/* ====== 像素网格展示 ====== */
.grid-section {
  margin-top: 30px;
  text-align: center;
}

.section-title {
  font-size: 14px;
  font-weight: 900;
  color: var(--px-black);
  letter-spacing: 2px;
  margin: 0 0 16px;
  border-bottom: 2px dotted var(--px-black);
  display: inline-block;
  padding-bottom: 4px;
}

.pixel-grid {
  display: inline-block;
  border: 2px solid var(--px-black);
  background: var(--px-bg);
  padding: 4px;
  transition: transform 0.5s;
}

.pixel-grid.flipped {
  transform: scaleX(-1);
}

.grid-row {
  display: flex;
  justify-content: center;
}

.grid-cell {
  width: 12px;
  height: 12px;
  border: 0.5px solid rgba(0,0,0,0.05);
  transition: all 0.15s;
}

.grid-cell:hover {
  outline: 2px solid var(--px-accent);
  z-index: 1;
  transform: scale(1.3);
}

.grid-cell.c-b { background: var(--px-black); }
.grid-cell.c-w { background: var(--px-white); }
.grid-cell.c-g { background: var(--px-gray); }

.grid-info {
  margin-top: 10px;
  font-size: 11px;
  color: var(--px-gray);
  font-family: monospace;
}

/* ====== 状态面板 ====== */
.status-panel {
  margin-top: 30px;
  text-align: center;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 300px;
  margin: 0 auto;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #f5f5f5;
  border: 2px solid var(--px-black);
}

.status-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--px-gray);
  letter-spacing: 1px;
}

.status-value {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1px;
}
.val-on { color: #22c55e; }
.val-off { color: #ef4444; }

.status-val-num {
  font-size: 18px;
  font-weight: 900;
  color: var(--px-black);
  font-family: 'Courier New', monospace;
}

/* ====== 底部 ====== */
.test-footer {
  margin-top: 30px;
  text-align: center;
  font-size: 11px;
  color: var(--px-gray);
  padding-top: 16px;
  border-top: 2px dashed var(--px-black);
  letter-spacing: 1px;
}

.test-footer a {
  color: var(--px-black);
  font-weight: 700;
  text-decoration: none;
}
.test-footer a:hover {
  text-decoration: underline;
}
</style>
