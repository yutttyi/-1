<template>
  <div class="admin-page">
    <!-- ═══ 未登录：登录页 ═══ -->
    <div v-if="!token" class="login-wrapper">
      <div class="login-card">
        <h1>🎰 抽奖管理后台</h1>
        <form @submit.prevent="doLogin">
          <label>用户名 <input v-model="loginForm.username" required placeholder="admin" /></label>
          <label>密码 <input type="password" v-model="loginForm.password" required placeholder="请输入密码" /></label>
          <p class="login-error" v-if="loginError">{{ loginError }}</p>
          <button type="submit" class="btn-login">登 录</button>
        </form>
      </div>
    </div>

    <!-- ═══ 已登录 ═══ -->
    <template v-else>
      <div class="admin-header">
        <h1>🎰 管理后台</h1>
        <div class="header-right">
          <span class="user-badge">{{ adminInfo.username }}</span>
          <a href="#/" class="back-link">← 返回抽奖页</a>
          <button class="btn-logout" @click="logout">退出</button>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="admin-tabs">
        <button :class="{ active: activeTab === 'dashboard' }" @click="activeTab = 'dashboard'">数据看板</button>
        <button :class="{ active: activeTab === 'prizes' }" @click="activeTab = 'prizes'; loadPrizes()">奖品管理</button>
        <button :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'; loadUsers()">用户管理</button>
        <button :class="{ active: activeTab === 'claims' }" @click="activeTab = 'claims'; loadClaims()">领奖记录</button>
        <button :class="{ active: activeTab === 'config' }" @click="activeTab = 'config'; loadConfigs()">页面配置</button>
      </div>

      <!-- ═══ 数据看板 ═══ -->
      <div v-if="activeTab === 'dashboard'" class="tab-content">
        <div class="stats-grid">
          <div class="stat-card"><span class="stat-num">{{ dashboard.stats?.totalStock || 0 }}</span><span class="stat-label">总库存</span></div>
          <div class="stat-card"><span class="stat-num drawn">{{ dashboard.stats?.drawnCount || 0 }}</span><span class="stat-label">已抽取</span></div>
          <div class="stat-card"><span class="stat-num remain">{{ dashboard.stats?.remainingCount || 0 }}</span><span class="stat-label">剩余</span></div>
          <div class="stat-card"><span class="stat-num users">{{ dashboard.stats?.drawnUsers || 0 }}</span><span class="stat-label">已抽人数</span></div>
          <div class="stat-card"><span class="stat-num total-u">{{ dashboard.stats?.totalUsers || 0 }}</span><span class="stat-label">白名单总数</span></div>
        </div>
        <div class="section-header" style="margin-top:24px"><h2>奖品明细</h2></div>
        <table class="data-table">
          <thead><tr><th>奖品名</th><th>总库存</th><th>已抽</th><th>剩余</th></tr></thead>
          <tbody><tr v-for="(p,i) in dashboard.prizes" :key="i"><td>{{ p.prizeName }}</td><td>{{ p.totalStock }}</td><td>{{ p.drawnCount }}</td><td>{{ p.remainingCount }}</td></tr></tbody>
        </table>
        <div class="section-header" style="margin-top:24px;justify-content:space-between">
          <h2>中奖名单（最近）</h2>
          <button class="btn-primary btn-small" @click="exportRecords('records')">导出Excel</button>
        </div>
        <table class="data-table">
          <thead><tr><th>姓名</th><th>工号</th><th>奖品</th><th>时间</th><th>状态</th><th>领取方式</th></tr></thead>
          <tbody><tr v-for="(r,i) in dashboard.records" :key="i"><td>{{ r.name }}</td><td>{{ r.employee_id }}</td><td>{{ r.prize }}</td><td>{{ r.drawTime }}</td><td><span :class="'status-'+r.claimStatus">{{ r.claimStatus==='claimed'?'已领取':'未领取' }}</span></td><td>{{ r.claimMethod||'-' }}</td></tr></tbody>
        </table>
        <div v-if="!dashboard.records?.length" class="empty-tip">暂无中奖记录</div>
      </div>

      <!-- ═══ 奖品管理 ═══ -->
      <div v-if="activeTab === 'prizes'" class="tab-content">
        <div class="section-header">
          <h2>奖品列表</h2>
          <div class="header-actions">
            <select v-model="prizeCategoryFilter" @change="loadPrizes()" class="filter-select">
              <option value="">全部分类</option>
              <option value="bowen">bowen（博闻多识一堂课）</option>
              <option value="aisee">aisee（AISee实战沙龙）</option>
            </select>
            <button class="btn-primary" @click="openPrizeForm(null)">+ 添加奖品</button>
          </div>
        </div>

        <table class="data-table">
          <thead><tr><th>ID</th><th>名称</th><th>分类</th><th>图片</th><th>总库存</th><th>剩余</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="p in prizes" :key="p.id">
              <td>{{ p.id }}</td>
              <td><strong>{{ p.name }}</strong><br/><small style="color:#888">{{ p.description||'' }}</small></td>
              <td><span class="cat-badge cat-{{ p.category }}">{{ p.category }}</span></td>
              <td>
                <img v-if="p.image" :src="imageUrl(p.image)" class="thumb-img" />
                <span v-else class="no-img">无图</span>
              </td>
              <td>{{ p.total_stock }}</td>
              <td><span :class="p.remaining_stock > 0 ? 'text-green' : 'text-red'">{{ p.remaining_stock }}</span></td>
              <td><span :class="'status-'+(p.is_active?'on':'off')">{{ p.is_active ? '启用' : '禁用' }}</span></td>
              <td>
                <button class="btn-edit" @click="openPrizeForm(p)">编辑</button>
                <button class="btn-danger btn-small" @click="deletePrize(p.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!prizes.length" class="empty-tip">暂无奖品</div>

        <!-- 添加/编辑弹窗 -->
        <div v-if="showPrizeModal" class="modal-overlay" @click.self="showPrizeModal=false">
          <div class="modal-card-admin">
            <h3>{{ editingPrize ? '编辑奖品' : '添加奖品' }}</h3>
            <form @submit.prevent="savePrize">
              <label>分类
                <select v-model="prizeForm.category">
                  <option value="bowen">bowen（博闻多识一堂课）</option>
                  <option value="aisee">aisee（AISee实战沙龙）</option>
                </select>
              </label>
              <label>奖品名称 * <input v-model="prizeForm.name" required placeholder="如：定制水杯" /></label>
              <label>描述 <textarea v-model="prizeForm.description" rows="2"></textarea></label>
              <label>总库存 * <input type="number" v-model.number="prizeForm.total_stock" min="0" /></label>
              <label>排序权重 <input type="number" v-model.number="prizeForm.sort_order" min="0" /></label>
              <label>是否启用 <select v-model="prizeForm.is_active"><option :value="1">启用</option><option :value="0">禁用</option></select></label>
              <label>图片上传
                <input type="file" accept="image/*" @change="onImageSelect" />
                <div v-if="prizeForm.image && !imageFile" class="current-img">
                  当前：<img :src="imageUrl(prizeForm.image)" style="max-height:80px;margin:5px 0"/>
                </div>
                <div v-if="imageFile" class="file-info">已选：{{ imageFile.name }}</div>
              </label>
              <div class="form-actions">
                <button type="submit" class="btn-primary">{{ editingPrize ? '保存修改' : '添加' }}</button>
                <button type="button" @click="showPrizeModal=false">取消</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- ═══ 用户管理 ═══ -->
      <div v-if="activeTab === 'users'" class="tab-content">
        <div class="section-header">
          <h2>白名单用户 ({{ users.length }} 人)</h2>
          <div class="header-actions">
            <input v-model="userSearch" placeholder="搜姓名/工号" class="search-input" @keyup.enter="loadUsers()" />
            <button class="btn-primary btn-small" @click="loadUsers()">搜索</button>
            <button class="btn-primary" @click="showAddUser=true">+ 添加用户</button>
            <button class="btn-danger btn-small" @click="batchReset()">批量重置</button>
          </div>
        </div>
        <table class="data-table">
          <thead><tr><th>ID</th><th>姓名</th><th>工号</th><th>部门</th><th>中心</th><th>已抽奖</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.id }}</td><td><strong>{{ u.name }}</strong></td><td>{{ u.employee_id }}</td><td>{{ u.department||'-' }}</td><td>{{ u.center||'-' }}</td>
              <td><span :class="u.has_drawn ? 'text-red' : 'text-green'">{{ u.has_drawn ? '是' : '否' }}</span></td>
              <td>
                <button class="btn-danger btn-small" v-if="u.has_drawn" @click="resetUser(u.id)">重置</button>
                <button class="btn-danger btn-small" @click="disableUser(u.id)">禁用</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!users.length" class="empty-tip">暂无用户数据</div>

        <!-- 导入Excel & 添加单人 -->
        <div class="import-section" style="margin-top:20px">
          <h3 style="font-size:16px;margin-bottom:10px">导入Excel名单</h3>
          <input type="file" accept=".xlsx,.xls" @change="importExcel" />
          <p style="font-size:12px;color:#888;margin-top:6px">支持列：姓名、工号、部门、中心</p>
        </div>
      </div>

      <!-- ═══ 领奖记录 ═══ -->
      <div v-if="activeTab === 'claims'" class="tab-content">
        <div class="section-header">
          <h2>领奖记录 ({{ claims.length }} 条)</h2>
          <div class="header-actions">
            <button class="btn-primary btn-small" @click="exportRecords('claims')">导出Excel</button>
            <button class="btn-primary btn-small" @click="loadClaims()">刷新</button>
          </div>
        </div>
        <table class="data-table">
          <thead><tr><th>ID</th><th>姓名</th><th>工号</th><th>部门</th><th>奖品</th><th>时间</th><th>领取方式</th><th>状态</th><th>详情</th></tr></thead>
          <tbody>
            <tr v-for="c in claims" :key="c.id">
              <td>{{ c.id }}</td><td>{{ c.userName }}</td><td>{{ c.employee_id }}</td><td>{{ c.department||'-' }}</td><td><strong>{{ c.prizeName }}</strong></td><td style="font-size:12px">{{ c.draw_time }}</td><td>{{ c.claim_method||'-' }}</td>
              <td><span :class="'status-'+c.status">{{ c.status==='claimed'?'已领':'待领' }}</span></td>
              <td>
                <button class="btn-edit btn-small" v-if="c.info?.length" @click="showClaimDetail(c)">查看</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!claims.length" class="empty-tip">暂无领奖记录</div>

        <!-- 详情弹窗 -->
        <div v-if="detailClaim" class="modal-overlay" @click.self="detailClaim=null">
          <div class="modal-card-admin" style="width:420px">
            <h3>领奖详情 #{{ detailClaim.id }}</h3>
            <div v-for="inf in detailClaim.info" :key="inf.field_key" class="detail-row">
              <b>{{ inf.field_key }}：</b>{{ inf.field_value }}
            </div>
            <button type="button" class="btn-primary" style="margin-top:16px;width:100%" @click="detailClaim=null">关闭</button>
          </div>
        </div>
      </div>

      <!-- ═══ 页面配置 ═══ -->
      <div v-if="activeTab === 'config'" class="tab-content">
        <div class="section-header">
          <h2>页面配置</h2>
          <button class="btn-primary" @click="saveConfigs()">保存所有配置</button>
        </div>

        <!-- 领取方式选项（重点编辑区） -->
        <div class="config-highlight">
          <h3 style="font-size:18px;margin-bottom:12px">📦 领取方式选项（用户中奖时看到的下拉框）</h3>
          <p style="font-size:13px;color:#666;margin-bottom:10px">添加/删除/修改领取方式选项，前端中奖卡片会实时显示这些选项</p>
          <div class="options-editor">
            <div v-for="(opt, idx) in deliveryOptions" :key="'do'+idx" class="option-row">
              <input type="text" v-model="deliveryOptions[idx]" class="option-input" placeholder="选项文字，如：自取、邮寄..." />
              <button class="btn-danger btn-small" @click="removeDeliveryOption(idx)" :disabled="deliveryOptions.length <=1">删除</button>
            </div>
            <button class="btn-small" style="border:2px dashed #4A90E2;color:#4A90E2;background:transparent" @click="addDeliveryOption()">+ 添加选项</button>
          </div>
        </div>

        <!-- 额外领奖字段 -->
        <div style="margin-top:24px">
          <h3 style="font-size:16px;margin-bottom:10px">📝 额外收集字段（选填）</h3>
          <p style="font-size:12px;color:#888;margin-bottom:8px">用户选择领取方式后可额外填写的字段（如地址、姓名等）</p>
          <table class="data-table">
            <thead><tr><th>字段名</th><th>显示标签</th><th>类型</th><th>必填</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="(f, i) in extraFormFields" :key="'ef'+i">
                <td><code>{{ f.key }}</code></td>
                <td><input v-model="f.label" class="config-input-sm" /></td>
                <td>
                  <select v-model="f.type" class="config-input-sm">
                    <option value="text">文本</option>
                    <option value="tel">手机号</option>
                    <option value="textarea">多行文本</option>
                  </select>
                </td>
                <td><input type="checkbox" v-model="f.required" /></td>
                <td><button class="btn-danger btn-small" @click="extraFormFields.splice(i,1)">删</button></td>
              </tr>
            </tbody>
          </table>
          <button class="btn-small" style="margin-top:8px" @click="addExtraField()">+ 添加字段</button>
        </div>

        <!-- 通用配置表 -->
        <div style="margin-top:24px">
          <h3 style="font-size:18px;margin-bottom:12px">其他配置项</h3>
        <table class="data-table">
          <thead><tr><th>配置项</th><th>说明</th><th>类型</th><th>值</th></tr></thead>
          <tbody>
            <tr v-for="c in generalConfigs" :key="c.key">
              <td><code>{{ c.key }}</code></td><td style="color:#666;font-size:13px">{{ c.label }}</td><td><span class="type-tag">{{ c.type }}</span></td>
              <td style="min-width:300px">
                <textarea v-if="c.type==='textarea'||c.type==='json'" v-model="c.value" rows="3" class="config-input" />
                <input v-else v-model="c.value" class="config-input" />
              </td>
            </tr>
          </tbody>
        </table>
        </div>
        <!-- 抽奖券配置 -->
        <div style="margin-top:28px">
          <h3 style="font-size:18px;margin-bottom:12px">抽奖券数量设置</h3>
          <div class="ticket-configs">
            <div class="ticket-item">
              <label>博闻多识一堂课 (bowen) <input type="number" v-model.number="tickets.bowen" min="0" /></label>
            </div>
            <div class="ticket-item">
              <label>AISee实战沙龙 (aisee) <input type="number" v-model.number="tickets.aisee" min="0" /></label>
            </div>
            <button class="btn-primary" @click="saveTickets()">保存抽奖券</button>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import axios from 'axios'

// ─── Auth ───
const token = ref(localStorage.getItem('lottery_admin_token'))
const adminInfo = reactive({ username: '', role: '' })
const loginError = ref('')
const loginForm = reactive({ username: '', password: '' })

// ─── Tab ───
const activeTab = ref('dashboard')

// ─── Dashboard ───
const dashboard = reactive({ stats: {}, prizes: [], records: [] })

// ─── Prizes ───
const prizes = ref([])
const prizeCategoryFilter = ref('')
const showPrizeModal = ref(false)
const editingPrize = ref(null)
const prizeForm = reactive({ name: '', description: '', total_stock: 0, sort_order: 0, category: 'bowen', is_active: 1, image: '' })
const imageFile = ref(null)

// ─── Users ───
const users = ref([])
const userSearch = ref('')
const showAddUser = ref(false)

// ─── Claims ───
const claims = ref([])
const detailClaim = ref(null)

// ─── Config ───
const configsList = ref([])
const generalConfigs = ref([])
const tickets = reactive({ bowen: 50, aisee: 50 })

// 领取方式选项（可编辑）
const deliveryOptions = ref(['自取', '邮寄', '现场发放'])
// 额外表单字段（地址等）
const extraFormFields = ref([])

// ─── Helpers ───
const API_BASE = ''
function headers() {
  return { Authorization: `Bearer ${token.value}` }
}
function imageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http') || path.startsWith('/uploads')) return path
  return '/uploads/' + path.replace(/^\/+/, '')
}

// ─── Auth Methods ───
async function doLogin() {
  try {
    const res = await axios.post(`${API_BASE}/api/admin/login`, { username: loginForm.username, password: loginForm.password })
    token.value = res.data.token
    adminInfo.username = res.data.admin.username
    adminInfo.role = res.data.admin.role
    localStorage.setItem('lottery_admin_token', res.data.token)
    loginError.value = ''
    await loadDashboard()
  } catch (e) {
    loginError.value = e.response?.data?.error || '登录失败'
  }
}

function logout() {
  token.value = null
  localStorage.removeItem('lottery_admin_token')
}

// ─── Dashboard ───
async function loadDashboard() {
  try {
    const res = await axios.get(`${API_BASE}/api/admin/dashboard`, { headers: headers() })
    Object.assign(res.data, dashboard)
  } catch (e) {
    console.error('加载看板失败', e)
  }
}

// ─── Prizes ───
async function loadPrizes() {
  try {
    const params = prizeCategoryFilter.value ? { category: prizeCategoryFilter.value } : {}
    const res = await axios.get(`${API_BASE}/api/admin/prizes`, { params, headers: headers() })
    prizes.value = res.data || []
  } catch (e) { console.error('加载奖品失败', e) }
}

function openPrizeForm(p) {
  editingPrize.value = p
  if (p) {
    Object.assign(prizeForm, { name: p.name, description: p.description || '', total_stock: p.total_stock, sort_order: p.sort_order || 0, category: p.category || 'bowen', is_active: p.is_active ?? 1, image: p.image || '' })
  } else {
    Object.assign(prizeForm, { name: '', description: '', total_stock: 1, sort_order: 0, category: 'bowen', is_active: 1, image: '' })
  }
  imageFile.value = null
  showPrizeModal.value = true
}

function onImageSelect(e) {
  imageFile.value = e.target.files[0] || null
}

async function savePrize() {
  try {
    // 如果有新图片先上传
    let imgPath = prizeForm.image
    if (imageFile.value) {
      const fd = new FormData()
      fd.append('image', imageFile.value)
      const uploadRes = await axios.post(`${API_BASE}/api/lottery/upload`, fd, { headers: { ...headers(), 'Content-Type': 'multipart/form-data' } })
      imgPath = uploadRes.data.url
    }

    const data = {
      name: prizeForm.name,
      image: imgPath,
      total_stock: prizeForm.total_stock,
      description: prizeForm.description,
      sort_order: prizeForm.sort_order,
      is_active: prizeForm.is_active,
      category: prizeForm.category
    }

    if (editingPrize.value) {
      await axios.put(`${API_BASE}/api/admin/prizes/${editingPrize.value.id}`, data, { headers: headers() })
    } else {
      await axios.post(`${API_BASE}/api/admin/prizes`, data, { headers: headers() })
    }
    showPrizeModal.value = false
    await loadPrizes()
  } catch (e) {
    alert(e.response?.data?.error || '操作失败')
  }
}

async function deletePrize(id) {
  if (!confirm('确认删除此奖品？')) return
  try {
    await axios.delete(`${API_BASE}/api/admin/prizes/${id}`, { headers: headers() })
    await loadPrizes()
  } catch (e) { alert(e.response?.data?.error || '删除失败') }
}

// ─── Users ───
async function loadUsers() {
  try {
    const params = {}
    if (userSearch.value.trim()) params.search = userSearch.value.trim()
    const res = await axios.get(`${API_BASE}/api/admin/users`, { params, headers: headers() })
    users.value = res.data || []
  } catch (e) { console.error('加载用户失败', e) }
}

async function resetUser(id) {
  if (!confirm('重置该用户的抽奖状态？')) return
  try {
    await axios.post(`${API_BASE}/api/admin/users/${id}/reset`, {}, { headers: headers() })
    await loadUsers()
  } catch (e) { alert(e.response?.data?.message || '重置失败') }
}

async function disableUser(id) {
  if (!confirm('确认禁用？')) return
  try {
    await axios.delete(`${API_BASE}/api/admin/users/${id}`, { headers: headers() })
    await loadUsers()
  } catch (e) {}
}

async function batchReset() {
  if (!confirm('⚠️ 将重置所有用户的抽奖状态并恢复库存！确认？')) return
  try {
    const res = await axios.post(`${API_BASE}/api/admin/users/batch-reset`, {}, { headers: headers() })
    alert(`已重置 ${res.data.resetCount} 条记录`)
    await loadUsers()
  } catch (e) { alert(e.response?.data?.error || '批量重置失败') }
}

async function importExcel(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      // 使用后端导入接口（base64）
      const base64 = reader.result.split(',')[1]
      await axios.post(`${API_BASE}/api/admin/users/import`, { data: base64 }, { headers: headers() })
      alert('导入成功')
      await loadUsers()
    } catch (err) {
      alert(err.response?.data?.error || '导入失败')
    }
  }
  reader.readAsDataURL(file)
}

// ─── Claims ───
async function loadClaims() {
  try {
    const res = await axios.get(`${API_BASE}/api/admin/claims`, { headers: headers() })
    claims.value = res.data || []
  } catch (e) { console.error('加载记录失败', e) }
}

// ─── Export ───
async function exportRecords(type) {
  const url = type === 'records' ? `${API_BASE}/api/admin/export/records` : `${API_BASE}/api/admin/export/claims`
  window.open(url + '?token=' + token.value, '_blank')
}

// ─── Config ───
async function loadConfigs() {
  try {
    const res = await axios.get(`${API_BASE}/api/config/`)
    const allEntries = Object.entries(res.data).map(([k, v]) => ({ key: k, label: v.label || k, type: v.type || 'text', value: typeof v.value !== 'undefined' ? v.value : '', category: v.category }))

    // 分离 custom_form_fields 和通用配置
    const cff = allEntries.find(c => c.key === 'custom_form_fields')
    generalConfigs.value = allEntries.filter(c => !c.key.startsWith('_meta_') && c.key !== 'custom_form_fields')
    configsList.value = allEntries.filter(c => !c.key.startsWith('_meta_'))

    // 解析领取方式选项
    if (cff?.value) {
      try {
        const parsed = typeof cff.value === 'string' ? JSON.parse(cff.value) : cff.value
        if (Array.isArray(parsed)) {
          const dmField = parsed.find(f => f.key === 'deliveryMethod')
          if (dmField?.options && Array.isArray(dmField.options)) {
            deliveryOptions.value = [...dmField.options]
          }
          // 额外字段
          extraFormFields.value = parsed.filter(f => f.key !== 'deliveryMethod').map(f => ({
            key: f.key,
            label: f.label || f.name || f.key,
            type: f.type || 'text',
            required: !!f.required
          }))
        }
      } catch (e) { console.error('解析领取方式失败', e) }
    }
  } catch (e) { console.error('加载配置失败', e) }

  try {
    const tRes = await axios.get(`${API_BASE}/api/admin/tickets`, { headers: headers() })
    ;(tRes.data || []).forEach(t => { tickets[t.category] = t.total_tickets })
  } catch (e) {}
}

// 领取方式操作
function addDeliveryOption() { deliveryOptions.value.push('新选项') }
function removeDeliveryOption(idx) { deliveryOptions.value.splice(idx, 1) }
function addExtraField() { extraFormFields.value.push({ key: `field_${Date.now()}`, label: '新字段', type: 'text', required: false }) }

async function saveConfigs() {
  try {
    // 构建 custom_form_fields JSON（含领取方式+额外字段）
    const formFields = [
      { key: 'deliveryMethod', label: '领取方式', type: 'select', required: true, options: [...deliveryOptions.value] },
      ...extraFormFields.value.map(f => ({ key: f.key, label: f.label, type: f.type, required: f.required }))
    ]
    const cffValue = JSON.stringify(formFields)

    const updates = [
      // 保存领取方式配置
      { key: 'custom_form_fields', value: cffValue },
      // 保存其他通用配置
      ...generalConfigs.value.map(c => ({ key: c.key, value: c.value }))
    ]
    await axios.put(`${API_BASE}/api/config/batch/update`, { configs: updates }, { headers: headers() })
    alert('配置已保存！（领取方式选项已更新）')
  } catch (e) { alert(e.response?.data?.error || '保存失败') }
}

async function saveTickets() {
  try {
    for (const [cat, count] of Object.entries(tickets)) {
      await axios.put(`${API_BASE}/api/admin/tickets/${cat}`, { total_tickets: count }, { headers: headers() })
    }
    alert('抽奖券保存成功')
  } catch (e) { alert(e.response?.data?.error || '保存失败') }
}

// ─── Init ───
onMounted(async () => {
  if (token.value) {
    // 验证token有效性
    try {
      const res = await axios.post(`${API_BASE}/api/admin/login`, {}, { headers: headers() }).catch(() => { throw new Error('fail') })
    } catch (e) {
      logout()
      return
    }
    // 尝试获取管理员信息
    adminInfo.username = 'Admin'
    await loadDashboard()
  }
})
</script>

<style scoped>
.admin-page { max-width: 1200px; margin: 0 auto; padding: 24px; font-family: "Microsoft YaHei", sans-serif; color: #1a1a2e; }

/* Login */
.login-wrapper { display: flex; align-items: center; justify-content: center; min-height: 70vh; }
.login-card { background: #fff; border-radius: 16px; padding: 48px 40px; width: 400px; box-shadow: 0 8px 40px rgba(0,0,0,.12); border: 3px solid #1a1a2e; }
.login-card h1 { text-align: center; font-size: 26px; margin-bottom: 30px; color: #1a1a2e; }
.login-card label { display: block; margin-bottom: 14px; font-size: 15px; font-weight: bold; }
.login-card input[type=text], .login-card input[type=password] {
  display: block; width: 100%; padding: 12px 14px; margin-top: 5px;
  border: 2px solid #ddd; border-radius: 8px; font-size: 15px; font-family: inherit; outline: none;
}
.login-card input:focus { border-color: #4A90E2; }
.btn-login { display: block; width: 100%; padding: 14px; background: #1a1a2e; color: #fff; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; margin-top: 8px; transition: .2s; }
.btn-login:hover { background: #333; }
.login-error { color: #ff4444; text-align: center; font-size: 14px; margin: 10px 0 0; }

/* Header */
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #1a1a2e; }
.admin-header h1 { font-size: 26px; margin: 0; color: #1a1a2e; }
.header-right { display: flex; gap: 12px; align-items: center; }
.user-badge { background: #f0f0f0; padding: 5px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; color: #555; }
.back-link { color: #4A90E2; text-decoration: none; font-size: 15px; font-weight: bold; white-space: nowrap; }
.btn-logout { padding: 7px 18px; background: #ff4444; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; }

/* Tabs */
.admin-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 2px solid #eee; padding-bottom: 8px; flex-wrap: wrap; }
.admin-tabs button { padding: 10px 22px; border: none; background: #f0f0f0; cursor: pointer; font-size: 14px; font-weight: bold; border-radius: 8px 8px 0 0; transition: .2s; }
.admin-tabs button.active { background: #1a1a2e; color: #fff; }
.tab-content { animation: fadeIn .25s ease; }
@keyframes fadeIn { from{opacity:.05;transform:translateY(6px)} to{opacity:1;transform:none} }

.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.section-header h2 { font-size: 20px; margin: 0; }
.header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Buttons */
.btn-primary { padding: 9px 20px; background: #4A90E2; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; transition: .2s; white-space: nowrap; }
.btn-primary:hover { background: #357abd; }
.btn-edit { padding: 6px 14px; background: #4A90E2; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; }
.btn-danger { padding: 6px 14px; background: #ff4444; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; }
.btn-small { padding: 5px 12px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; font-weight: bold; background: #eee; }
.btn-small:hover { background: #ddd; }

/* Filters */
.filter-select, .search-input { padding: 7px 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 13px; outline: none; }
.search-input { width: 150px; }

/* Stats Grid */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
.stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; text-align: center; color: #fff; }
.stat-num { display: block; font-size: 36px; font-weight: 900; line-height: 1.2; }
.stat-num.drawn { color: #ffd700; }
.stat-num.remain { color: #7bed9f; }
.stat-num.users { color: #ffa502; }
.stat-num.total-u { color: #dfe6e9; }
.stat-label { font-size: 13px; opacity: .85; margin-top: 4px; display: block; }

/* Tables */
table.data-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; vertical-align: middle; }
.data-table th { background: #f7f7f7; font-weight: bold; color: #333; position: sticky; top: 0; }
.data-table tr:hover td { background: #fafafa; }

.thumb-img { height: 50px; width: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; }
.no-img { color: #ccc; font-size: 12px; }
.cat-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: bold; color: #fff; }
.cat-bowen { background: #4A90E2; }
.cat-aisee { background: #9b59b6; }
.text-green { color: #27ae60; font-weight: bold; }
.text-red { color: #e74c3c; font-weight: bold; }
.status-on { color: #27ae60; font-weight: bold; }
.status-off { color: #999; }
.status-pending { color: #f39c12; font-weight: bold; }
.status-claimed { color: #27ae60; font-weight: bold; }
.type-tag { background: #eef; color: #445; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 500; display: flex; align-items: center; justify-content: center; overflow-y: auto; padding: 40px; }
.modal-card-admin { background: #fff; border-radius: 12px; padding: 28px; width: 560px; max-width: 92vw; box-shadow: 0 12px 40px rgba(0,0,0,.2); max-height: 85vh; overflow-y: auto; }
.modal-card-admin h3 { margin: 0 0 18px; font-size: 20px; color: #1a1a2e; border-bottom: 2px solid #eee; padding-bottom: 10px; }
.modal-card-admin label { display: block; margin-bottom: 12px; font-size: 14px; font-weight: bold; }
.modal-card-admin input[type=text], .modal-card-admin textarea, .modal-card-admin select, .modal-card-admin input[type=number] {
  display: block; width: 100%; padding: 9px 12px; border: 2px solid #ddd; border-radius: 6px;
  margin-top: 5px; font-size: 14px; font-family: inherit; outline: none; transition: border-color .15s;
}
.modal-card-admin input:focus, .modal-card-admin select:focus { border-color: #4A90E2; }
.form-actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
.form-actions button:not(.btn-primary) { padding: 10px 22px; border: 2px solid #ddd; background: #fff; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; }
.current-img { margin-top: 8px; padding: 8px; background: #f9f9f9; border-radius: 6px; }
.file-info { color: #4A90E2; font-size: 13px; margin-top: 5px; }

.config-input { width: 100%; padding: 8px 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 13px; font-family: inherit; outline: none; resize: vertical; }
.detail-row { padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 14px; }
.ticket-configs { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.ticket-item { background: #f7f7f7; padding: 12px 18px; border-radius: 8px; }
.ticket-item label { font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 10px; }
.ticket-item input { width: 80px; padding: 6px 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 15px; }

.empty-tip { text-align: center; padding: 48px 20px; color: #999; font-size: 15px; }
.import-section { padding: 16px; background: #fafafa; border-radius: 8px; border: 2px dashed #ddd; }

/* 领取方式编辑区 */
.config-highlight { background: linear-gradient(135deg, #eef6ff, #f0f4ff); border: 3px solid #4A90E2; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
.options-editor { display: flex; flex-direction: column; gap: 10px; }
.option-row { display: flex; gap: 8px; align-items: center; }
.option-input { flex: 1; padding: 10px 14px; border: 2px solid #4A90E2; border-radius: 8px; font-size: 15px; font-family: inherit; outline: none; transition: border-color .15s; }
.option-input:focus { border-color: #357abd; box-shadow: 0 0 0 3px rgba(74,144,226,.15); }

.config-input-sm { width: 100%; padding: 5px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-family: inherit; outline: none; }
</style>
