import type { DialogApi } from 'naive-ui/es/dialog'
import type { MessageApi } from 'naive-ui/es/message'
import { useAuthStore } from '@/stores/auth'

let dialogApi: DialogApi | null = null
let messageApi: MessageApi | null = null

let sessionExpiredModalOpen = false

/** 在 App 内挂到 n-dialog-provider / n-message-provider 之下后调用一次 */
export function registerHttpFeedback(dialog: DialogApi, message: MessageApi): void {
  dialogApi = dialog
  messageApi = message
}

/** prototype-spec §1.3：403 → Toast 右上角 3s */
export function notifyPermissionUpdated(): void {
  if (messageApi) {
    messageApi.warning('您的权限已更新，请刷新页面重试', { duration: 3000 })
    return
  }
  // 极早请求（Provider 未就绪）：降级为原生提示
  window.alert('您的权限已更新，请刷新页面重试')
}

/**
 * prototype-spec §1.3：401 → 全屏遮罩 Modal +「去登录」
 * 文案：「登录已过期，请重新登录」+ 按钮「去登录」
 */
export function notifySessionExpired(): void {
  const authStore = useAuthStore()
  authStore.clearAuth()

  if (!dialogApi) {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    return
  }

  if (sessionExpiredModalOpen) return
  sessionExpiredModalOpen = true

  dialogApi.warning({
    title: '提示',
    content: '登录已过期，请重新登录',
    positiveText: '去登录',
    maskClosable: false,
    closable: false,
    autoFocus: false,
    style: {
      width: 'min(400px, calc(100vw - 48px))',
    },
    onPositiveClick: () => {
      sessionExpiredModalOpen = false
      window.location.href = '/login'
    },
    onClose: () => {
      sessionExpiredModalOpen = false
    },
  })
}
