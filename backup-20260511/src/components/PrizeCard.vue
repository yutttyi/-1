<template>
  <div class="prize-card-pixel">
    <!-- 黄色成功提示弹窗 -->
    <Transition name="toast-fade">
      <div v-if="showSuccessToast" class="success-toast-yellow">
        <button class="toast-close" @click="closeToast">✕</button>
        <div class="toast-icon">🎉</div>
        <p>领取成功！</p>
        <p class="toast-sub">若异地邮寄，请稍等奖品到货</p>
      </div>
    </Transition>

    <!-- 像素风格奖品展示卡片 -->
    <div class="card-inner" v-if="!showSuccessToast">
      <div class="card-header-pixel">
        <h2 class="card-title-pixel">🎉 恭喜获得 🎉</h2>
        <button class="close-btn-pixel" @click="emit('close')">✕</button>
      </div>

      <div class="prize-img-wrapper-pixel" v-if="prizeImage">
        <img :src="prizeImage" :alt="prize.name" class="prize-img-pixel" />
      </div>

      <div class="prize-info-pixel">
        <h3 class="prize-name-pixel">{{ prize.name }}</h3>
        <p class="prize-desc-pixel" v-if="prize.description">{{ prize.description }}</p>

        <!-- 已领取状态 -->
        <div v-if="submitted" class="success-state-pixel">
          <button class="action-btn-pixel" @click="emit('close')">完成</button>
        </div>

        <!-- 领取表单（动态字段） -->
        <form v-else @submit.prevent="handleSubmit" class="claim-form-pixel">

          <!-- 1. 领取方式下拉框（始终显示） -->
          <div v-if="deliveryOptions.length > 0" class="form-group-pixel">
            <label class="form-label-pixel">
              <span class="label-required">*</span> 请选择领取方式
            </label>
            <select v-model="formData.deliveryMethod"
              class="form-select-pixel"
              required
              @change="onMethodChange">
              <option value="" disabled>— 请选择 —</option>
              <option v-for="opt in deliveryOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>

          <!-- 2. 动态额外字段（管理员配置） -->
          <template v-if="visibleExtraFields.length > 0">
            <!-- 分隔提示 -->
            <div class="form-section-title" v-if="visibleExtraFields.length > 0">
              📝 补充信息
            </div>

            <div v-for="(field, index) in visibleExtraFields" :key="'ef'+index" class="form-group-pixel">
              <label class="form-label-pixel">
                <span v-if="field.required" class="label-required">*</span>
                {{ field.label }}
                <span v-if="field.hint" class="label-hint">（{{ field.hint }}）</span>
              </label>

              <!-- 文本输入 -->
              <input v-if="!field.type || field.type === 'text'"
                type="text"
                v-model="formData[field.key]"
                class="form-input-pixel"
                :placeholder="`请输入${field.label}`"
                :required="!!field.required" />

              <!-- 手机号 -->
              <input v-else-if="field.type === 'tel'"
                type="tel"
                v-model="formData[field.key]"
                class="form-input-pixel"
                placeholder="请输入手机号"
                pattern="[0-9]{11}"
                :required="!!field.required" />

              <!-- 邮箱 -->
              <input v-else-if="field.type === 'email'"
                type="email"
                v-model="formData[field.key]"
                class="form-input-pixel"
                placeholder="请输入邮箱地址"
                :required="!!field.required" />

              <!-- 多行文本/地址 -->
              <textarea v-else-if="field.type === 'textarea'"
                v-model="formData[field.key]"
                class="form-textarea-pixel"
                :placeholder="`请输入${field.label}`"
                rows="3"
                :required="!!field.required"></textarea>

              <!-- 下拉选择 -->
              <select v-else-if="field.type === 'select' && field.options?.length"
                v-model="formData[field.key]"
                class="form-select-pixel"
                :required="!!field.required">
                <option value="" disabled>— 请选择{{ field.label }} —</option>
                <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>

              <!-- 默认文本兜底 -->
              <input v-else
                type="text"
                v-model="formData[field.key]"
                class="form-input-pixel"
                :placeholder="`请输入${field.label}`"
                :required="!!field.required" />
            </div>
          </template>

          <!-- 提交按钮 -->
          <button type="submit" class="submit-btn-pixel" :disabled="submitting || !canSubmit">
            {{ submitting ? '提交中...' : '确认领取' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'

const props = defineProps({
  prize: { type: Object, required: true },
  claimOptions: {
    type: Object,
    default: () => ({
      selectOptions: ['自取', '邮寄'],
      extraFields: [],
      success_message: '领取成功！'
    })
  }
})

// 兼容后端返回 image / image_url
const prizeImage = computed(() => props.prize?.image_url || props.prize?.image || '')

const emit = defineEmits(['submit', 'close'])

const submitting = ref(false)
const submitted = ref(false)
const showSuccessToast = ref(false)

// 领取方式选项
const deliveryOptions = computed(() => {
  const opts = props.claimOptions?.selectOptions
  return (Array.isArray(opts) && opts.length > 0) ? opts : ['自取', '邮寄', '现场发放']
})

// 可见的额外字段（支持条件显示：showWhen 匹配当前选中方法时才显示）
const visibleExtraFields = computed(() => {
  const fields = props.claimOptions?.extraFields || []
  return fields.filter(f => {
    // 如果有 showWhen 条件，只有匹配时才显示
    if (f.showWhen && Array.isArray(f.showWhen)) {
      return f.showWhen.includes(formData.deliveryMethod)
    }
    if (f.showWhen && typeof f.showWhen === 'string') {
      return f.showWhen === formData.deliveryMethod || f.showWhen === '*'
    }
    return true // 无条件限制则始终显示
  })
})

// 表单数据
const formData = reactive({ deliveryMethod: '' })

// 初始化/同步额外字段
function syncExtraFields() {
  const fields = props.claimOptions?.extraFields || []
  fields.forEach(field => {
    const key = field.key || field.name
    if (key && key !== 'deliveryMethod' && !(key in formData)) {
      formData[key] = ''
    }
  })
}

// 监听 extraFields 变化，自动同步新字段
watch(() => props.claimOptions?.extraFields, () => {
  syncExtraFields()
}, { deep: true, immediate: true })

// 切换领取方式时清空条件字段的值
function onMethodChange() {
  const fields = props.claimOptions?.extraFields || []
  fields.forEach(field => {
    const key = field.key || field.name
    // 有 showWhen 条件的字段，切换时重置
    if ((field.showWhen && !visibleExtraFields.value.find(f => f.key === key || f.name === key))) {
      if (key in formData) formData[key] = ''
    }
  })
}

// 是否可以提交
const canSubmit = computed(() => {
  if (!formData.deliveryMethod) return false
  // 检查必填字段
  const fields = visibleExtraFields.value
  for (const f of fields) {
    if (f.required) {
      const key = f.key || f.name
      if (!formData[key] || formData[key].trim() === '') return false
    }
  }
  return true
})

const handleSubmit = async () => {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    // 收集所有表单数据
    const submitData = {
      deliveryMethod: formData.deliveryMethod,
      prize_id: props.prize.id
    }
    // 追加额外字段值
    const fields = props.claimOptions?.extraFields || []
    fields.forEach(field => {
      const key = field.key || field.name
      if (key && key !== 'deliveryMethod' && formData[key] !== undefined) {
        submitData[key] = formData[key]
      }
    })
    await emit('submit', submitData)
    showSuccessToast.value = true
  } finally {
    submitting.value = false
  }
}

function closeToast() {
  showSuccessToast.value = false
  emit('close')
}
</script>

<style scoped>
.prize-card-pixel {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,20,0.85);
}

.card-inner {
  background: var(--px-white, #fff);
  border: 4px solid var(--px-black, #000);
  box-shadow: 12px 12px 0 var(--px-black, #000);
  width: 80vw !important;
  max-width: 460px !important;
  padding: 28px 24px;
  text-align: center;
  animation: modalIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
  max-height: 90vh;
  overflow-y: auto;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0) rotate(-10deg); }
  to   { opacity: 1; transform: scale(1) rotate(0); }
}

.card-header-pixel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.card-title-pixel {
  font-size: 22px;
  font-weight: bold;
  color: var(--px-black, #000);
  letter-spacing: 2px;
  text-shadow: 2px 2px 0 var(--px-yellow, #FFD700);
  -webkit-text-stroke: 1px var(--px-black, #000);
}

.close-btn-pixel {
  width: 32px; height: 32px;
  border: 3px solid var(--px-black, #000);
  background: var(--px-red, #FF4444);
  color: var(--px-white, #fff);
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--px-black, #000);
}
.close-btn-pixel:hover { transform: translate(2px,2px); box-shadow: 1px 1px 0 var(--px-black, #000); }

.prize-img-wrapper-pixel { margin-bottom: 16px; display: flex; justify-content: center; }
.prize-img-pixel {
  max-width: 160px; max-height: 160px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(4px 4px 0 var(--px-black, #000));
}
.prize-name-pixel { font-size: 20px; font-weight: bold; color: var(--px-black, #000); margin-bottom: 8px; }
.prize-desc-pixel { font-size: 14px; color: var(--px-dark-gray, #555); line-height: 1.6; margin-bottom: 16px; }

.claim-form-pixel { margin-top: 16px; }

.form-section-title {
  text-align: left;
  font-size: 14px;
  font-weight: bold;
  color: var(--px-black, #000);
  margin: 12px 0 8px;
  padding-bottom: 4px;
  border-bottom: 2px dashed #ddd;
}

.form-group-pixel { margin-bottom: 14px; text-align: left; }

.form-label-pixel {
  display: block;
  font-size: 14px;
  font-weight: bold;
  color: var(--px-black, #000);
  margin-bottom: 6px;
}
.label-required { color: #e74c3c; margin-right: 2px; }
.label-hint { font-size: 12px; font-weight: normal; color: #999; }

.form-input-pixel {
  width: 100%; height: 38px;
  border: 3px solid var(--px-black, #000);
  background: var(--px-white, #fff);
  padding: 0 10px;
  font-size: 15px;
  font-family: inherit;
  box-shadow: 3px 3px 0 rgba(0,0,0,.15);
  outline: none;
  transition: box-shadow .15s;
  border-radius: 4px;
}
.form-input-pixel:focus { box-shadow: 4px 4px 0 var(--px-blue, #4A90E2); }

.form-select-pixel {
  width: 100%; height: 38px;
  border: 3px solid var(--px-black, #000);
  background: var(--px-white, #fff);
  padding: 0 10px;
  font-size: 15px;
  font-family: inherit;
  box-shadow: 3px 3px 0 rgba(0,0,0,.15);
  outline: none;
  appearance: auto;
  border-radius: 4px;
  cursor: pointer;
}

.form-textarea-pixel {
  width: 100%; min-height: 60px;
  border: 3px solid var(--px-black, #000);
  background: var(--px-white, #fff);
  padding: 8px 10px;
  font-size: 15px;
  font-family: inherit;
  box-shadow: 3px 3px 0 rgba(0,0,0,.15);
  outline: none;
  resize: vertical;
  border-radius: 4px;
}

.submit-btn-pixel {
  width: 100%; height: 42px;
  margin-top: 16px;
  border: 3px solid var(--px-black, #000);
  background: var(--px-blue, #4A90E2);
  color: var(--px-white, #fff);
  font-size: 17px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 4px 4px 0 var(--px-black, #000);
  border-radius: 4px;
  transition: transform .1s, box-shadow .1s;
}
.submit-btn-pixel:hover:not(:disabled) { transform: translate(2px,2px); box-shadow: 2px 2px 0 var(--px-black, #000); }
.submit-btn-pixel:disabled { opacity: 0.5; cursor: not-allowed; }

.success-state-pixel { margin-top: 16px; }
.success-icon-pixel { font-size: 40px; margin-bottom: 8px; }
.success-state-pixel p { font-size: 18px; font-weight: bold; color: var(--px-green, #4CAF50); margin-bottom: 16px; }

.action-area-pixel { margin-top: 18px; display: flex; gap: 12px; justify-content: center; }
.action-btn-pixel {
  min-width: 100px; height: 38px;
  border: 3px solid var(--px-black, #000);
  background: var(--px-light-gray, #f0f0f0);
  color: var(--px-black, #000);
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--px-black, #000);
  border-radius: 4px;
}
.action-btn-pixel:hover { transform: translate(2px,2px); box-shadow: 1px 1px 0 var(--px-black, #000); }
.action-btn-pixel.primary-pixel { background: var(--px-blue, #4A90E2); color: var(--px-white, #fff); }

/* 黄色成功弹窗 */
.success-toast-yellow {
  position: absolute;
  z-index: 300;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #FFF3B0, #FFE066);
  border: 4px solid #000;
  box-shadow: 12px 12px 0 #000;
  padding: 28px 36px;
  text-align: center;
  border-radius: 8px;
  min-width: 280px;
}
.toast-close {
  position: absolute;
  top: -6px; right: -6px;
  width: 30px; height: 30px;
  border: 3px solid #000;
  background: #FF4444;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 3px 3px 0 #000;
  border-radius: 6px;
}
.toast-close:hover { background: #FF2222; }
.toast-icon { font-size: 40px; margin-bottom: 8px; }
.success-toast-yellow p {
  font-size: 20px;
  font-weight: bold;
  color: #000;
  margin: 0;
}
.toast-sub { font-size: 14px; font-weight: normal; color: #666 !important; margin-top: 6px !important; }

.toast-fade-enter-active { animation: toastIn .35s ease-out both; }
.toast-fade-leave-active { animation: toastOut .25s ease-in both; }
@keyframes toastIn { from { opacity: 0; transform: translate(-50%,-60%) scale(0.6); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
@keyframes toastOut { from { opacity: 1; transform: translate(-50%,-50%) scale(1); } to { opacity: 0; transform: translate(-50%,-45%) scale(0.7); } }
</style>
