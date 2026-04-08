<template>
  <div class="audit-logs-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">操作日志</h2>
        <span class="page-desc">只读审计追溯，不可删除或修改（NFR10）</span>
      </div>
    </div>

    <div class="filter-bar glass">
      <div class="filter-row filter-row--labeled">
        <div class="filter-cell">
          <FilterFieldLabel label="业务表" catalog-key="auditlog.filter.table" />
          <n-select
            v-model:value="filterTable"
            :options="tableOptions"
            placeholder="业务表"
            style="width: 160px"
            @update:value="onFilterChange"
          />
        </div>
        <div class="filter-cell">
          <FilterFieldLabel label="操作类型" catalog-key="auditlog.filter.action" />
          <n-select
            v-model:value="filterAction"
            :options="actionOptions"
            placeholder="操作类型"
            style="width: 140px"
            @update:value="onFilterChange"
          />
        </div>
        <div class="filter-cell">
          <FilterFieldLabel label="日期范围" catalog-key="auditlog.filter.dateRange" />
          <n-date-picker
            v-model:value="dateRange"
            type="daterange"
            clearable
            style="width: 280px"
            @update:value="onFilterChange"
          />
        </div>
      </div>
    </div>

    <div class="table-card glass">
      <n-data-table
        :columns="columns"
        :data="list"
        :loading="loading"
        :bordered="false"
        :single-line="false"
        :row-key="(r) => r.id"
        :scroll-x="1080"
      />
      <div class="pagination-wrap">
        <n-pagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="loadList"
          @update:page-size="onPageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h, onMounted, computed } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import {
  NCode,
  NDataTable,
  NDatePicker,
  NPagination,
  NSelect,
  NTag,
  useMessage,
} from 'naive-ui'
import type { AuditLogItem } from '@/types/auditLog'
import { fetchAuditLogs } from '@/api/auditLogs'
import {
  ACTION_FILTER_OPTIONS,
  TABLE_NAME_OPTIONS,
  actionTypeLabel,
  actionTypeTagType,
  tableLabel,
} from '@/utils/auditLogLabels'
import FilterFieldLabel from '@/components/common/FilterFieldLabel.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const message = useMessage()

const list = ref<AuditLogItem[]>([])
const loading = ref(false)
const filterTable = ref<string>('')
const filterAction = ref<string>('')
const dateRange = ref<[number, number] | null>(null)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
})

const tableOptions = computed(() =>
  TABLE_NAME_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
)
const actionOptions = computed(() =>
  ACTION_FILTER_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
)

function rangeToQuery(): { startDate?: string; endDate?: string } {
  if (!dateRange.value) return {}
  const [a, b] = dateRange.value
  const start = new Date(a)
  start.setHours(0, 0, 0, 0)
  const end = new Date(b)
  end.setHours(23, 59, 59, 999)
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

async function loadList() {
  loading.value = true
  try {
    const range = rangeToQuery()
    const data = await fetchAuditLogs({
      page: pagination.page,
      pageSize: pagination.pageSize,
      tableName: filterTable.value || undefined,
      actionType: filterAction.value || undefined,
      ...range,
    })
    list.value = data.list
    pagination.itemCount = data.total
  } catch {
    message.error('加载操作日志失败')
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  pagination.page = 1
  loadList()
}

function onPageSizeChange() {
  pagination.page = 1
  loadList()
}

onMounted(loadList)

const columns = computed<DataTableColumns<AuditLogItem>>(() => [
  {
    type: 'expand',
    expandable: (row) => !!(row.beforeData || row.afterData),
    renderExpand: (row) =>
      h('div', { class: 'expand-json' }, [
        row.beforeData &&
          h('div', { class: 'json-section' }, [
            h('div', { class: 'json-title' }, 'before_data'),
            h(NCode, {
              code: JSON.stringify(row.beforeData, null, 2),
              language: 'json',
              wordWrap: true,
            }),
          ]),
        row.afterData &&
          h('div', { class: 'json-section' }, [
            h('div', { class: 'json-title' }, 'after_data'),
            h(NCode, {
              code: JSON.stringify(row.afterData, null, 2),
              language: 'json',
              wordWrap: true,
            }),
          ]),
      ]),
  },
  {
    title: tableColTitle('操作时间', 'auditlog.col.time'),
    key: 'operatedAt',
    width: 172,
    resizable: true,
    minWidth: 150,
    render: (row) =>
      h(
        'span',
        { class: 'mono', style: { color: 'var(--text-muted)', fontSize: '13px' } },
        new Date(row.operatedAt).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      ),
  },
  {
    title: tableColTitle('操作人', 'auditlog.col.operator'),
    key: 'operatorName',
    width: 100,
    resizable: true,
    minWidth: 88,
    ellipsis: { tooltip: true },
  },
  {
    title: tableColTitle('操作表', 'auditlog.col.table'),
    key: 'tableName',
    width: 120,
    resizable: true,
    minWidth: 100,
    render: (row) => tableLabel(row.tableName),
  },
  {
    title: tableColTitle('操作类型', 'auditlog.col.action'),
    key: 'actionType',
    width: 110,
    resizable: true,
    minWidth: 96,
    render: (row) =>
      h(
        NTag,
        { size: 'small', type: actionTypeTagType(row.actionType), bordered: false },
        () => actionTypeLabel(row.actionType),
      ),
  },
  {
    title: tableColTitle('记录 ID', 'auditlog.col.recordId'),
    key: 'recordId',
    width: 88,
    resizable: true,
    minWidth: 72,
    render: (row) => h('span', { class: 'mono' }, row.recordId),
  },
])
</script>

<style scoped>
.audit-logs-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.filter-bar {
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.table-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-subtle);
}

.expand-json {
  padding: 12px 16px 16px;
  background: var(--card-inner-bg);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.json-section :deep(.n-code) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.json-section :deep(pre) {
  max-height: 280px;
  overflow: auto;
  margin: 0;
}

.json-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
}
</style>
