import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type {
  PaymentListQuery,
  PaymentListMeta,
  PaymentRecordItem,
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentImportBatch,
  PaymentImportRequestBody,
} from '@/types/payment'
import {
  fetchPayments,
  createPayment as apiCreatePayment,
  updatePayment as apiUpdatePayment,
  deletePayment as apiDeletePayment,
  fetchImportBatches,
  fetchImportBatch,
  submitPaymentImport,
} from '@/api/payments'
import { useUserStore } from '@/stores/user'

export const usePaymentStore = defineStore('payment', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const items = ref<PaymentRecordItem[]>([])
  const total = ref(0)
  const listMeta = ref<PaymentListMeta>({ contactPersons: [], creators: [] })

  const importBatches = ref<PaymentImportBatch[]>([])
  const importListLoading = ref(false)
  const importDetailLoading = ref<Record<string, boolean>>({})

  const query = reactive<PaymentListQuery>({
    page: 1,
    pageSize: 20,
    keyword: '',
    rightLeopardCode: '',
    startDate: null,
    endDate: null,
    userId: null,
    contactPerson: null,
    createdBy: null,
  })

  async function loadPayments() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchPayments({ ...query })
      items.value = res.items
      total.value = res.total
      query.page = res.page
      query.pageSize = res.pageSize
      listMeta.value = res.meta
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function refreshUserListIfPossible() {
    try {
      const userStore = useUserStore()
      await userStore.loadUsers()
    } catch {
      /* 未挂载用户 store 时忽略 */
    }
  }

  async function createPaymentRecord(dto: CreatePaymentDto): Promise<PaymentRecordItem> {
    const row = await apiCreatePayment(dto)
    await loadPayments()
    await refreshUserListIfPossible()
    return row
  }

  async function updatePaymentRecord(
    id: number,
    dto: UpdatePaymentDto,
  ): Promise<PaymentRecordItem> {
    const row = await apiUpdatePayment(id, dto)
    await loadPayments()
    await refreshUserListIfPossible()
    return row
  }

  async function deletePaymentRecord(id: number): Promise<void> {
    await apiDeletePayment(id)
    await loadPayments()
    await refreshUserListIfPossible()
  }

  function resetQuery() {
    query.page = 1
    query.keyword = ''
    query.rightLeopardCode = ''
    query.startDate = null
    query.endDate = null
    query.userId = null
    query.contactPerson = null
    query.createdBy = null
  }

  async function loadImportBatches() {
    importListLoading.value = true
    error.value = null
    try {
      importBatches.value = await fetchImportBatches()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载导入记录失败'
    } finally {
      importListLoading.value = false
    }
  }

  async function loadImportBatchDetail(batchId: string): Promise<PaymentImportBatch> {
    importDetailLoading.value = { ...importDetailLoading.value, [batchId]: true }
    try {
      return await fetchImportBatch(batchId)
    } finally {
      const next = { ...importDetailLoading.value }
      delete next[batchId]
      importDetailLoading.value = next
    }
  }

  async function submitImport(body: PaymentImportRequestBody) {
    const res = await submitPaymentImport(body)
    await loadPayments()
    await refreshUserListIfPossible()
    await loadImportBatches()
    return res
  }

  return {
    loading,
    error,
    items,
    total,
    listMeta,
    importBatches,
    importListLoading,
    importDetailLoading,
    query,
    loadPayments,
    loadImportBatches,
    loadImportBatchDetail,
    submitImport,
    createPaymentRecord,
    updatePaymentRecord,
    deletePaymentRecord,
    resetQuery,
  }
})
