<template>
  <div class="prize-card-pixel">
    <!-- 像素风格奖品展示卡片 -->
    <div class="card-inner">
      <div class="card-header-pixel">
        <h2 class="card-title-pixel">🎉 恭喜获得 🎉</h2>
        <button class="close-btn-pixel" @click="$emit('close')">✕</button>
      </div>

      <div class="prize-img-wrapper-pixel" v-if="prize.image_url">
        <img :src="prize.image_url" :alt="prize.name" class="prize-img-pixel" />
      </div>

      <div class="prize-info-pixel">
        <h3 class="prize-name-pixel">{{ prize.name }}</h3>
        <p class="prize-desc-pixel" v-if="prize.description">{{ prize.description }}</p>

        <!-- 填写信息表单 -->
        <form @submit.prevent="handleSubmit" class="claim-form-pixel" v-if="showForm">
          <div v-for="(field, index) in claimOptions.fields" :key="index" class="form-group-pixel">
            <label class="form-label-pixel">{{ field.label }}</label>
            <input
              :type="field.type || 'text'"
              v-model="formData[field.name]"
              class="form-input-pixel"
              :placeholder="`请输入${field.label}`"
              required
            />
          </div>
          <button type="submit" class="submit-btn-pixel" :disabled="submitting">
            {{ submitting ? '提交中...' : (claimOptions.submit_text || '确认领取') }}
          </button>
        </form>

        <!-- 已领取状态 -->
        <div v-else-if="submitted" class="success-state-pixel">
          <div class="success-icon-pixel">★</div>
          <p>{{ claimOptions.success_message || '领取成功！' }}</p>
          <button class="action-btn-pixel" @click="$emit('close')">完成</button>
        </div>

        <!-- 未填写状态 -->
        <div v-else class="action-area-pixel">
          <button class="action-btn-pixel primary-pixel" @click="showForm = true">
            {{ claimOptions.action_text || '立即领取' }}
          </button>
          <button class="action-btn-pixel" @click="$emit('close')">稍后再说</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'

const props = defineProps({
  prize: { type: Object, required: true },
  claimOptions: {
    type: Object,
    default: () => ({
      fields: [{ name: 'name', label: '姓名', type: 'text' }],
      submit_text: '确认领取',
      success_message: '领取成功！',
      action_text: '立即领取'
    })
  }
})

const emit = defineEmits(['submit', 'close'])

const showForm = ref(false)
const submitting = ref(false)
const submitted = ref(false)

// 初始化表单默认值
const formData = reactive({})
props.claimOptions.fields?.forEach(field => {
  formData[field.name] = ''
})

const handleSubmit = async () => {
  submitting.value = true
  try {
    await emit('submit', { ...formData, prize_id: props.prize.id })
    submitted.value = true
    showForm.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.prize-card-pixel {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 2vh;
  background: rgba(0,0,20,0.85);
}

.card-inner {
  background: var(--px-white, #fff);
  border: 8px solid var(--px-black, #000);
  box-shadow: 24px 24px 0 var(--px-black, #000);
  width: 1000px !important;
  max-width: none !important;
  padding: 60px 50px;
  text-align: center;
  animation: modalIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0) rotate(-10deg) translateY(-50px);
  }
  to {
    opacity: 1;
    transform: scale(2) rotate(0) translateY(80px);
  }
}

.card-header-pixel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.card-title-pixel {
  font-size: 28px;
  font-weight: bold;
  color: var(--px-black, #000);
  letter-spacing: 4px;
  text-shadow: 3px 3px 0 var(--px-yellow, #FFD700);
  -webkit-text-stroke: 2px var(--px-black, #000);
}

.close-btn-pixel {
  width: 48px;
  height: 48px;
  border: 4px solid var(--px-black, #000);
  background: var(--px-red, #FF4444);
  color: var(--px-white, #fff);
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 4px 4px 0 var(--px-black, #000);
  transition: transform 0.1s;
}

.close-btn-pixel:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--px-black, #000);
}

.prize-img-wrapper-pixel {
  margin-bottom: 30px;
  display: flex;
  justify-content: center;
}

.prize-img-pixel {
  max-width: 280px;
  max-height: 280px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(6px 6px 0 var(--px-black, #000));
}

.prize-info-pixel { }

.prize-name-pixel {
  font-size: 22px;
  font-weight: bold;
  color: var(--px-black, #000);
  margin-bottom: 12px;
}

.prize-desc-pixel {
  font-size: 15px;
  color: var(--px-dark-gray, #555);
  line-height: 1.8;
  margin-bottom: 30px;
}

.claim-form-pixel { margin-top: 30px; }

.form-group-pixel {
  margin-bottom: 20px;
  text-align: left;
}

.form-label-pixel {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: var(--px-black, #000);
  margin-bottom: 10px;
}

.form-input-pixel {
  width: 100%;
  height: 52px;
  border: 4px solid var(--px-black, #000);
  background: var(--px-white, #fff);
  padding: 0 18px;
  font-size: 17px;
  font-family: inherit;
  box-shadow: 6px 6px 0 var(--px-black, #000);
  outline: none;
  transition: box-shadow 0.15s;
}

.form-input-pixel:focus {
  box-shadow: 8px 8px 0 var(--px-blue, #4A90E2);
}

.submit-btn-pixel {
  width: 100%;
  height: 60px;
  margin-top: 25px;
  border: 4px solid var(--px-black, #000);
  background: var(--px-blue, #4A90E2);
  color: var(--px-white, #fff);
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 8px 8px 0 var(--px-black, #000);
  transition: transform 0.1s, box-shadow 0.1s;
}

.submit-btn-pixel:hover:not(:disabled) {
  transform: translate(3px, 3px);
  box-shadow: 5px 5px 0 var(--px-black, #000);
}

.submit-btn-pixel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-state-pixel { margin-top: 30px; }

.success-icon-pixel {
  font-size: 64px;
  margin-bottom: 16px;
}

.success-state-pixel p {
  font-size: 19px;
  font-weight: bold;
  color: var(--px-green, #4CAF50);
  margin-bottom: 25px;
}

.action-area-pixel {
  margin-top: 35px;
  display: flex;
  gap: 20px;
  justify-content: center;
}

.action-btn-pixel {
  min-width: 160px;
  height: 54px;
  border: 4px solid var(--px-black, #000);
  background: var(--px-light-gray, #f0f0f0);
  color: var(--px-black, #000);
  font-size: 17px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 6px 6px 0 var(--px-black, #000);
  transition: transform 0.1s, box-shadow 0.1s;
}

.action-btn-pixel:hover {
  transform: translate(2px, 2px);
  box-shadow: 4px 4px 0 var(--px-black, #000);
}

.action-btn-pixel.primary-pixel {
  background: var(--px-blue, #4A90E2);
  color: var(--px-white, #fff);
}
</style>
