import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import router from './router'
import App from './App.vue'
import '@/assets/styles/main.css'
import { useAuthStore } from '@/stores/auth'
import { fetchSessionUser } from '@/api/session'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  const authStore = useAuthStore()
  if (authStore.token && authStore.user) {
    try {
      const fresh = await fetchSessionUser()
      authStore.setUser(fresh)
    } catch {
      /* Token 无效或 Mock 未就绪时保留本地态；无 permissions 的旧缓存需用户重新登录 */
    }
  }

  app.use(router)
  app.use(naive)
  app.mount('#app')
}

void bootstrap()
