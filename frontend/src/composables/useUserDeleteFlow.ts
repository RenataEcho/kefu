import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import type { UserListItem, UserDetail } from '@/types/user'

export function useUserDeleteFlow(options?: { afterDelete?: () => void }) {
  const userStore = useUserStore()
  const message = useMessage()

  const deletingUserId = ref<number | null>(null)
  const deleteTargetUser = ref<UserListItem | null>(null)
  const deleteTargetDetail = ref<UserDetail | null>(null)
  const showBlockedModal = ref(false)
  const showConfirmModal = ref(false)
  const deleting = ref(false)

  async function startDeleteFlow(row: UserListItem) {
    deleteTargetUser.value = row
    deletingUserId.value = row.id
    try {
      const detail = await userStore.fetchUserDetail(row.id)
      deleteTargetDetail.value = detail
      const hasAssociations = detail.groupAuditsCount > 0 || detail.paymentRecordsCount > 0
      if (hasAssociations) {
        showBlockedModal.value = true
      } else {
        showConfirmModal.value = true
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '获取用户信息失败')
    } finally {
      deletingUserId.value = null
    }
  }

  async function confirmDelete() {
    if (!deleteTargetUser.value) return
    deleting.value = true
    try {
      await userStore.deleteUserRecord(deleteTargetUser.value.id)
      showConfirmModal.value = false
      message.success('删除成功')
      deleteTargetUser.value = null
      deleteTargetDetail.value = null
      options?.afterDelete?.()
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '删除失败'
      if (errMsg.includes('10003') || errMsg.includes('请先删除关联记录')) {
        showConfirmModal.value = false
        message.error('请先删除关联记录')
      } else {
        message.error(errMsg)
      }
    } finally {
      deleting.value = false
    }
  }

  return {
    deletingUserId,
    deleteTargetUser,
    deleteTargetDetail,
    showBlockedModal,
    showConfirmModal,
    deleting,
    startDeleteFlow,
    confirmDelete,
  }
}
