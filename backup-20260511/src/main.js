import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import './style.css'

// 生产环境使用后端 API 地址（GitHub Pages 部署时需要）
if (typeof __API_URL__ !== 'undefined' && __API_URL__) {
  axios.defaults.baseURL = __API_URL__
}

const app = createApp(App)
app.use(router)
app.mount('#app')
