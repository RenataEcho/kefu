import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type {
  GroupAuditItem,
  GroupAuditQuery,
  GroupAuditStatus,
  PaginatedGroupAudits,
  PendingSlaFilter,
} from '@/types/groupAudit'
import {
  fetchGroupAudits,
  approveGroupAudit,
  rejectGroupAudit,
  batchApproveGroupAudits,
  batchRejectGroupAudits,
} from '@/api/groupAudits'

export const useGroupAuditStore = defineStore('groupAudit', () => {
  const loading = ref(false)
  const actionLoading = ref<Record<number, boolean>>({})
  const error = ref<string | null>(null)

  const items = ref<GroupAuditItem[]>([])
  const total = ref(0)
  const pendingTotal = ref(0)

  const query = reactive<GroupAuditQuery>({
    page: 1,
    pageSize: 50,
    status: 'PENDING',
    applyTimeFrom: null,
    applyTimeTo: null,
    reviewerName: null,
    pendingSla: 'all',
    rightLeopardCode: null,
  })

  async function loadList() {
    loading.value = true
    error.value = null
    try {
      const res: PaginatedGroupAudits = await fetchGroupAudits({ ...query })
      items.value = res.items
      total.value = res.total
      if (typeof res.pendingTotal === 'number') pendingTotal.value = res.pendingTotal
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function approve(id: number): Promise<boolean> {
    actionLoading.value = { ...actionLoading.value, [id]: true }
    try {
      await approveGroupAudit(id)
      const item = items.value.find((r) => r.id === id)
      if (item) item.status = 'PROCESSING'
      return true
    } catch {
      return false
    } finally {
      const copy = { ...actionLoading.value }
      delete copy[id]
      actionLoading.value = copy
    }
  }

  async function reject(id: number, reason: string): Promise<boolean> {
    actionLoading.value = { ...actionLoading.value, [id]: true }
    try {
      await rejectGroupAudit(id, reason)
      const item = items.value.find((r) => r.id === id)
      if (item) {
        item.status = 'REJECTED'
        item.rejectReason = reason
      }
      return true
    } catch {
      return false
    } finally {
      const copy = { ...actionLoading.value }
      delete copy[id]
      actionLoading.value = copy
    }
  }

  async function batchApprove(ids: number[]): Promise<boolean> {
    try {
      await batchApproveGroupAudits(ids)
      ids.forEach((id) => {
        const item = items.value.find((r) => r.id === id)
        if (item && item.status === 'PENDING') item.status = 'PROCESSING'
      })
      return true
    } catch {
      return false
    }
  }

  async function batchReject(ids: number[], reason: string): Promise<boolean> {
    try {
      await batchRejectGroupAudits(ids, reason)
      ids.forEach((id) => {
        const item = items.value.find((r) => r.id === id)
        if (item && item.status === 'PENDING') {
          item.status = 'REJECTED'
          item.rejectReason = reason
        }
      })
      return true
    } catch {
      return false
    }
  }

  function setStatus(status: GroupAuditStatus | null) {
    query.status = status
    query.page = 1
  }

  function setPendingSla(v: PendingSlaFilter) {
    query.pendingSla = v
    query.page = 1
  }

  function resetQuery() {
    query.page = 1
    query.pageSize = 50
    query.status = 'PENDING'
    query.applyTimeFrom = null
    query.applyTimeTo = null
    query.reviewerName = null
    query.pendingSla = 'all'
    query.rightLeopardCode = null
  }

  return {
    loading,
    actionLoading,
    error,
    items,
    total,
    pendingTotal,
    query,
    loadList,
    approve,
    reject,
    batchApprove,
    batchReject,
    setStatus,
    setPendingSla,
    resetQuery,
  }
})
