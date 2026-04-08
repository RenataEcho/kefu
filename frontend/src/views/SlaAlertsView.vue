<template>
  <div class="sla-alerts">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">SLA 预警记录</h2>
        <span class="page-desc">入群审核与录入审核 SLA 预警发送历史（Mock）</span>
      </div>
    </div>

    <div class="filter-bar glass">
      <div class="filter-grid">
        <div class="filter-field">
          <FilterFieldLabel label="审核类型" catalog-key="sla.filter.auditType" />
          <n-select
            v-model:value="auditTypeFilter"
            size="small"
            class="filter-select"
            :options="auditTypeOptions"
            @update:value="onFilterChange"
          />
        </div>
        <div class="filter-field">
          <FilterFieldLabel label="所属客服" catalog-key="sla.filter.assignedAgentName" />
          <n-input
            v-model:value="assignedAgentFilter"
            size="small"
            clearable
            placeholder="客服名称"
            class="filter-input"
            @keyup.enter="onFilterChange"
            @clear="onFilterChange"
          />
        </div>
        <div class="filter-field">
          <FilterFieldLabel label="右豹编码" catalog-key="sla.filter.rightLeopardCode" />
          <n-input
            v-model:value="rightLeopardCodeFilter"
            size="small"
            clearable
            placeholder="精确匹配"
            class="filter-input filter-input--mono"
            @keyup.enter="onFilterChange"
            @clear="onFilterChange"
          />
        </div>
      </div>
    </div>

    <div class="table-card glass">
      <n-data-table
        :columns="columns"
        :data="items"
        :loading="loading"
        :bordered="false"
        size="small"
        :scroll-x="1180"
        :row-key="(row: SlaAlertRow) => row.id"
        class="sla-table"
      >
        <template #empty>
          <n-empty description="暂无 SLA 预警记录" />
        </template>
      </n-data-table>

      <div class="pagination-bar">
        <n-pagination
          v-model:page="page"
          :item-count="total"
          :page-size="pageSize"
          :page-sizes="[20]"
          show-size-picker
          @update:page="load"
          @update:page-size="onPageSize"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NInput } from 'naive-ui'
import { useRouter } from 'vue-router'
import { fetchSlaAlerts } from '@/api/groupAudits'
import type { SlaAlertRow, SlaRelatedAuditType } from '@/types/groupAudit'
import { formatDate } from '@/utils/date'
import FilterFieldLabel from '@/components/common/FilterFieldLabel.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const router = useRouter()

const loading = ref(false)
const items = ref<SlaAlertRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const auditTypeFilter = ref<SlaRelatedAuditType | 'all'>('all')
const assignedAgentFilter = ref('')
const rightLeopardCodeFilter = ref('')

const auditTypeOptions = [
  { label: '全部', value: 'all' as const },
  { label: '入群审核', value: 'group_audit' as const },
  { label: '录入审核', value: 'entry_audit' as const },
]

function auditTypeLabel(t: SlaRelatedAuditType) {
  return t === 'group_audit' ? '入群审核' : '录入审核'
}

function goRecord(row: SlaAlertRow) {
  if (row.auditType === 'entry_audit' && row.entryAuditId != null) {
    router.push({ name: 'EntryAuditDetail', params: { id: String(row.entryAuditId) } })
    return
  }
  router.push({ name: 'GroupAuditDetail', params: { id: String(row.groupAuditId) } })
}

const columns: DataTableColumns<SlaAlertRow> = [
  {
    title: tableColTitle('预警时间', 'sla.col.alertAt'),
    key: 'alertAt',
    width: 190,
    resizable: true,
    minWidth: 160,
    render(r) {
      return formatDate(r.alertAt)
    },
  },
  {
    title: tableColTitle('审核类型', 'sla.col.auditType'),
    key: 'auditType',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(r) {
      return h('span', { class: 'type-label' }, auditTypeLabel(r.auditType))
    },
  },
  {
    title: tableColTitle('关联记录 ID', 'sla.col.recordId'),
    key: 'recordId',
    width: 130,
    resizable: true,
    minWidth: 110,
    render(r) {
      const id =
        r.auditType === 'entry_audit' && r.entryAuditId != null
          ? r.entryAuditId
          : r.groupAuditId
      return h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => goRecord(r),
        },
        { default: () => String(id) },
      )
    },
  },
  {
    title: tableColTitle('申请人/所属客服', 'sla.col.applicantOrAgent'),
    key: 'larkNickname',
    width: 140,
    resizable: true,
    minWidth: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: tableColTitle('右豹编码', 'sla.col.youbaoCode'),
    key: 'rightLeopardCode',
    width: 130,
    resizable: true,
    minWidth: 110,
    render(r) {
      return h('span', { class: 'mono' }, r.rightLeopardCode)
    },
  },
  {
    title: tableColTitle('近10天动作数', 'sla.col.actionStats'),
    key: 'actionStats',
    width: 168,
    resizable: true,
    minWidth: 140,
    render(r) {
      return h('div', { class: 'action-stats-cell' }, [
        h('div', {}, `关键词 ${r.keywordCount}`),
        h('div', {}, `回填 ${r.backfillCount}`),
        h('div', {}, `订单 ${r.orderCount}`),
        h('div', {}, `收益 ¥${r.actionRevenueYuan.toLocaleString('zh-CN')}`),
      ])
    },
  },
  {
    title: tableColTitle('预警类型', 'sla.col.alertType'),
    key: 'alertType',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(r) {
      return r.alertType === 'first' ? '首次' : '二次'
    },
  },
  {
    title: tableColTitle('发送状态', 'sla.col.sendStatus'),
    key: 'sendStatus',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(r) {
      if (r.sendStatus === 'success') {
        return h('span', { class: 'send-ok' }, '成功')
      }
      return h('span', { class: 'send-fail' }, '失败')
    },
  },
]

async function load() {
  loading.value = true
  try {
    const at =
      auditTypeFilter.value === 'all' ? null : auditTypeFilter.value
    const res = await fetchSlaAlerts(
      page.value,
      pageSize.value,
      at,
      assignedAgentFilter.value.trim() || null,
      rightLeopardCodeFilter.value.trim() || null,
    )
    items.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function onPageSize(n: number) {
  pageSize.value = n
  page.value = 1
  void load()
}

function onFilterChange() {
  page.value = 1
  void load()
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.sla-alerts {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.page-desc {
  font-size: 13px;
  color: var(--text-muted);
}

.filter-bar {
  border-radius: var(--radius-lg);
  padding: 14px 20px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px 20px;
  align-items: end;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.filter-select,
.filter-input {
  width: 100%;
}

.filter-input--mono :deep(.n-input__input-el) {
  font-family: 'JetBrains Mono', monospace;
}

.type-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.table-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
}

.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
}

.send-ok {
  font-size: 13px;
  font-weight: 500;
  color: var(--badge-green);
}

.send-fail {
  font-size: 13px;
  font-weight: 500;
  color: var(--badge-red);
}

.action-stats-cell {
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-secondary);
}
</style>
