<template>
  <div class="import-records-tab">
    <div class="import-toolbar">
      <span v-if="lastRefreshAt" class="last-refresh">
        最后刷新：{{ formatRefreshTime(lastRefreshAt) }}
      </span>
      <n-button quaternary size="small" :loading="listLoading" @click="refreshList">
        刷新列表
      </n-button>
    </div>

    <n-data-table
      v-model:expanded-row-keys="expandedRowKeys"
      :columns="columns"
      :data="batches"
      :loading="listLoading"
      :bordered="false"
      :row-key="(r) => r.id"
      :scroll-x="1180"
      :single-line="false"
    />
  </div>
</template>

<script setup lang="ts">
import { h, ref, watch, onMounted, onUnmounted, computed } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NDataTable, NSpin, NTag } from 'naive-ui'
import type { PaymentImportBatch, PaymentImportFailedRow } from '@/types/payment'
import { formatDate } from '@/utils/date'
import { downloadPaymentImportFailures } from '@/utils/paymentImportExcel'
import {
  fetchMigrationPaymentImportBatch,
  fetchMigrationPaymentImportBatches,
} from '@/api/migrationPayments'
import { tableColTitle } from '@/utils/columnTitleHelp'

const props = defineProps<{ active: boolean }>()

const batches = ref<PaymentImportBatch[]>([])
const listLoading = ref(false)
const lastRefreshAt = ref<number | null>(null)
const expandedRowKeys = ref<string[]>([])
const detailById = ref<Record<string, PaymentImportBatch>>({})
const detailLoading = ref<Record<string, boolean>>({})

let pollTimer: ReturnType<typeof setInterval> | null = null

async function refreshList() {
  listLoading.value = true
  try {
    batches.value = await fetchMigrationPaymentImportBatches()
    lastRefreshAt.value = Date.now()
  } finally {
    listLoading.value = false
  }
}

function formatRefreshTime(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function statusTagType(
  s: PaymentImportBatch['status'],
): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (s === 'PROCESSING') return 'info'
  if (s === 'COMPLETED') return 'success'
  return 'warning'
}

function statusLabel(s: PaymentImportBatch['status']) {
  if (s === 'PROCESSING') return '处理中'
  if (s === 'COMPLETED') return '已完成'
  return '部分失败'
}

const failDetailColumns = computed<DataTableColumns<PaymentImportFailedRow>>(() => [
  { title: tableColTitle('行号', 'import.row.rowNumber'), key: 'rowNumber', width: 70, resizable: true, minWidth: 56 },
  {
    title: tableColTitle('右豹编码', 'import.row.rightLeopardCode'),
    key: 'rightLeopardCode',
    width: 120,
    resizable: true,
    minWidth: 100,
    render(r) {
      return h('span', { class: 'mono-cell' }, r.rightLeopardCode || '—')
    },
  },
  {
    title: tableColTitle('付费金额', 'import.row.amount'),
    key: 'amount',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(r) {
      return String(r.amount)
    },
  },
  {
    title: tableColTitle('付费时间', 'import.row.paymentTime'),
    key: 'paymentTime',
    width: 140,
    resizable: true,
    minWidth: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: tableColTitle('对接人', 'import.row.contact'),
    key: 'contactPerson',
    width: 100,
    resizable: true,
    minWidth: 88,
    ellipsis: { tooltip: true },
  },
  {
    title: tableColTitle('失败原因', 'import.row.failReason'),
    key: 'reason',
    width: 220,
    resizable: true,
    minWidth: 200,
    ellipsis: { tooltip: true },
    render(r) {
      return h('span', { style: { color: 'var(--text-secondary)' } }, r.reason)
    },
  },
])

const columns = computed<DataTableColumns<PaymentImportBatch>>(() => [
  {
    type: 'expand',
    expandable: (row) => row.status !== 'PROCESSING' && row.failCount > 0,
    renderExpand: (row) => {
      const loading = detailLoading.value[row.id] === true
      const det = detailById.value[row.id]
      const failed = det?.failedRows ?? []

      if (loading) {
        return h('div', { class: 'expand-inner' }, [h(NSpin, { size: 'small' })])
      }

      return h('div', { class: 'expand-inner' }, [
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            secondary: true,
            disabled: failed.length === 0,
            style: { marginBottom: '10px' },
            onClick: () => downloadPaymentImportFailures(failed, row.batchNo),
          },
          { default: () => '导出失败明细' },
        ),
        h(NDataTable, {
          size: 'small',
          bordered: false,
          columns: failDetailColumns.value,
          data: failed,
          rowKey: (r: PaymentImportFailedRow) => `${row.id}-${r.rowNumber}`,
          scrollX: 900,
        }),
      ])
    },
  },
  {
    title: tableColTitle('批次号', 'import.batch.batchNo'),
    key: 'batchNo',
    width: 120,
    resizable: true,
    minWidth: 100,
    ellipsis: { tooltip: true },
    render(r) {
      return h('span', { class: 'mono-cell' }, r.batchNo)
    },
  },
  {
    title: tableColTitle('导入时间', 'import.batch.importedAt'),
    key: 'createdAt',
    width: 168,
    resizable: true,
    minWidth: 140,
    render(r) {
      return h('span', { style: { color: 'var(--text-secondary)', fontSize: '13px' } }, formatDate(r.createdAt))
    },
  },
  {
    title: tableColTitle('操作人', 'import.batch.operator'),
    key: 'operatorName',
    width: 100,
    resizable: true,
    minWidth: 88,
    ellipsis: { tooltip: true },
  },
  {
    title: tableColTitle('文件名', 'import.batch.fileName'),
    key: 'fileName',
    width: 200,
    resizable: true,
    minWidth: 140,
    ellipsis: { tooltip: true },
  },
  { title: tableColTitle('总行数', 'import.batch.totalCount'), key: 'totalCount', width: 80, resizable: true, minWidth: 72 },
  { title: tableColTitle('本地预检通过', 'import.batch.localPassCount'), key: 'localPassCount', width: 112, resizable: true, minWidth: 96 },
  { title: tableColTitle('落库成功', 'import.batch.apiPassCount'), key: 'apiPassCount', width: 88, resizable: true, minWidth: 72 },
  { title: tableColTitle('失败行数', 'import.batch.failCount'), key: 'failCount', width: 88, resizable: true, minWidth: 72 },
  {
    title: tableColTitle('状态', 'import.batch.status'),
    key: 'status',
    width: 96,
    resizable: true,
    minWidth: 80,
    render(r) {
      return h(NTag, { type: statusTagType(r.status), size: 'small' }, { default: () => statusLabel(r.status) })
    },
  },
])

watch(
  expandedRowKeys,
  async (keys) => {
    for (const id of keys) {
      const row = batches.value.find((b) => b.id === id)
      if (!row || row.status === 'PROCESSING' || row.failCount === 0) continue
      if (detailById.value[id] !== undefined) continue
      detailLoading.value = { ...detailLoading.value, [id]: true }
      try {
        const d = await fetchMigrationPaymentImportBatch(id)
        detailById.value = { ...detailById.value, [id]: d }
      } catch {
        /* 可再次展开重试 */
      } finally {
        const next = { ...detailLoading.value }
        delete next[id]
        detailLoading.value = next
      }
    }
  },
  { deep: true },
)

watch(
  () => props.active,
  (v) => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    if (v) {
      void refreshList()
      pollTimer = setInterval(() => {
        if (!props.active) return
        if (batches.value.some((b) => b.status === 'PROCESSING')) {
          void refreshList()
        }
      }, 5000)
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (props.active) void refreshList()
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.import-records-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.import-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.last-refresh {
  font-size: 12px;
  color: var(--text-muted);
}

.expand-inner {
  padding: 12px 16px 16px 48px;
  background: rgba(99, 102, 241, 0.04);
  border-radius: var(--radius-md);
}

:deep(.mono-cell) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}
</style>
