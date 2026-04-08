<template>
  <div class="oauth-mock">
    <n-spin :show="busy">
      <div class="oauth-mock__inner glass">
        <h1 class="oauth-mock__title">飞书授权（Mock）</h1>
        <p class="oauth-mock__text">
          {{ statusText }}
        </p>
        <n-button v-if="showCloseHint" type="primary" quaternary @click="tryClose">关闭窗口</n-button>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { NButton, NSpin } from 'naive-ui'
import { postLarkOAuthMockComplete } from '@/api/larkFriends'

const route = useRoute()
const busy = ref(true)
const statusText = ref('正在模拟飞书授权回调…')
const showCloseHint = ref(false)

function tryClose() {
  window.close()
  showCloseHint.value = true
}

onMounted(async () => {
  const type = route.query.type === 'mentor' ? 'mentor' : 'agent'
  const id = parseInt(String(route.query.id || ''), 10)
  if (!id || Number.isNaN(id)) {
    statusText.value = '缺少有效的账号参数'
    busy.value = false
    showCloseHint.value = true
    return
  }
  try {
    const res = await postLarkOAuthMockComplete({
      type,
      id,
      displayName:
        type === 'agent' ? `客服账号 #${id}` : `导师账号 #${id}`,
    })
    statusText.value = `授权成功：${res.displayName}。正在同步到原页面…`
    const ch = new BroadcastChannel('lark-oauth')
    ch.postMessage({
      status: 'success',
      type: res.type,
      id: res.id,
      larkName: res.displayName,
    })
    ch.close()
    busy.value = false
    setTimeout(() => {
      window.close()
      showCloseHint.value = true
    }, 400)
  } catch (e) {
    statusText.value = e instanceof Error ? e.message : '授权失败'
    busy.value = false
    const ch = new BroadcastChannel('lark-oauth')
    ch.postMessage({ status: 'error' })
    ch.close()
    showCloseHint.value = true
  }
})
</script>

<style scoped>
.oauth-mock {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--app-bg, #0f172a);
}

.oauth-mock__inner {
  max-width: 420px;
  padding: 28px 24px;
  border-radius: var(--radius-lg);
  text-align: center;
}

.oauth-mock__title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.oauth-mock__text {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
