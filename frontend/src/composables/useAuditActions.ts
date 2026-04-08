import { ref } from 'vue'
import { useMessage } from 'naive-ui'

export function useAuditActions() {
  const processing = ref(false)
  const message = useMessage()

  async function approve(_id: number, onSuccess?: () => void) {
    processing.value = true
    try {
      // API call handled by caller
      message.success('审核通过')
      onSuccess?.()
    } catch {
      message.error('操作失败，请重试')
    } finally {
      processing.value = false
    }
  }

  async function reject(_id: number, _reason: string, onSuccess?: () => void) {
    processing.value = true
    try {
      // API call handled by caller
      message.success('已拒绝')
      onSuccess?.()
    } catch {
      message.error('操作失败，请重试')
    } finally {
      processing.value = false
    }
  }

  return { processing, approve, reject }
}
