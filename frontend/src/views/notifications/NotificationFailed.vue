<template>
  <div class="notification-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">消息通知记录</h2>
        <span class="page-desc">支持筛选与待推送/失败重推（Mock）</span>
      </div>
    </div>

    <div class="filter-bar glass">
      <div class="filter-grid">
        <div class="filter-field">
          <FilterFieldLabel label="右豹编码" catalog-key="notify.filter.rightLeopardCode" />
          <n-input
            v-model:value="filters.rightLeopardCode"
            size="small"
            clearable
            placeholder="精确匹配"
            @keyup.enter="applyFilters"
            @clear="applyFilters"
          />
        </div>
        <div class="filter-field">
          <FilterFieldLabel label="通知场景" catalog-key="notify.filter.scene" />
          <n-select
            v-model:value="filters.scenario"
            size="small"
            :options="scenarioFilterOptions"
            @update:value="applyFilters"
          />
        </div>
        <div class="filter-field">
          <FilterFieldLabel label="渠道" catalog-key="notify.filter.channel" />
          <n-select
            v-model:value="filters.channel"
            size="small"
            :options="channelFilterOptions"
            @update:value="applyFilters"
          />
        </div>
        <div class="filter-field">
          <FilterFieldLabel label="推送状态" catalog-key="notify.filter.pushStatus" />
          <n-select
            v-model:value="filters.status"
            size="small"
            :options="statusOptions"
            @update:value="applyFilters"
          />
        </div>
        <div class="filter-field">
          <FilterFieldLabel label="审核类型" catalog-key="notify.filter.auditType" />
          <n-select
            v-model:value="filters.auditType"
            size="small"
            :options="auditTypeFilterOptions"
            @update:value="applyFilters"
          />
        </div>
      </div>
    </div>

    <div class="table-card glass">
      <div class="table-summary">
        <span class="summary-text">共 <strong>{{ total }}</strong> 条记录</span>
      </div>

      <n-data-table
        :columns="columns"
        :data="items"
        :loading="loading"
        :bordered="false"
        :single-line="false"
        :row-key="(row: NotificationRow) => row.id"
        size="small"
      >
        <template #empty>
          <div class="empty-state">
            <n-empty description="暂无通知记录" />
          </div>
        </template>
      </n-data-table>

      <div class="pagination-bar">
        <n-pagination
          v-model:page="query.page"
          v-model:page-size="query.pageSize"
          :item-count="total"
          :page-sizes="[20, 50, 100]"
          show-size-picker
          show-quick-jumper
          :page-slot="7"
          @update:page="load"
          @update:page-size="onPageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, computed, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NButton, useMessage } from 'naive-ui'
import type {
  NotificationAuditType,
  NotificationChannel,
  NotificationRow,
  NotificationScenario,
  NotificationStatus,
} from '@/types/notification'
import {
  fetchNotifications,
  postNotificationPushNow,
  postNotificationRetryPush,
} from '@/api/notifications'
import { formatDate } from '@/utils/date'
import { channelLabel, scenarioLabel } from '@/utils/notification-scenario'
import FilterFieldLabel from '@/components/common/FilterFieldLabel.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const message = useMessage()
const loading = ref(false)
const items = ref<NotificationRow[]>([])
const total = ref(0)
const pushingId = ref<string | null>(null)

const query = reactive({
  page: 1,
  pageSize: 20,
})

const filters = reactive({
  rightLeopardCode: '',
  scenario: 'all' as NotificationScenario | 'all',
  channel: 'all' as NotificationChannel | 'all',
  status: 'all' as NotificationStatus | 'all',
  auditType: 'all' as NotificationAuditType | 'all',
})

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '已推送', value: 'SENT' },
  { label: '推送失败', value: 'FAILED' },
  { label: '待发送', value: 'PENDING' },
]

const scenarioFilterOptions = [
  { label: '全部', value: 'all' },
  { label: '审核通过', value: 'AUDIT_APPROVED' },
  { label: '审核拒绝', value: 'AUDIT_REJECTED' },
  { label: 'SLA首次预警', value: 'SLA_ALERT_FIRST' },
  { label: 'SLA二次催促', value: 'SLA_ALERT_SECOND' },
]

const channelFilterOptions = [
  { label: '全部', value: 'all' },
  { label: '微信服务号', value: 'WECHAT' },
  { label: '飞书', value: 'LARK' },
]

const auditTypeFilterOptions = [
  { label: '全部', value: 'all' as const },
  { label: '入群审核', value: 'group_audit' as const },
  { label: '录入审核', value: 'entry_audit' as const },
]

function notificationAuditTypeLabel(t: NotificationAuditType) {
  return t === 'group_audit' ? '入群审核' : '录入审核'
}

function statusTag(status: NotificationStatus) {
  if (status === 'SENT') return h('span', { class: 'badge-green' }, '已推送')
  if (status === 'FAILED') return h('span', { class: 'badge-red' }, '推送失败')
  return h('span', { class: 'badge-gray' }, '待发送')
}

async function doPush(row: NotificationRow, mode: 'now' | 'retry') {
  pushingId.value = row.id
  try {
    if (mode === 'now') {
      await postNotificationPushNow(row.id)
      message.success('已触发立即推送（Mock）')
    } else {
      await postNotificationRetryPush(row.id)
      message.success('已重新推送（Mock）')
    }
    await load()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '操作失败')
  } finally {
    pushingId.value = null
  }
}

const columns = computed<DataTableColumns<NotificationRow>>(() => [
  {
    title: tableColTitle('通知时间', 'notify.col.time'),
    key: 'createdAt',
    width: 172,
    resizable: true,
    minWidth: 150,
    render(row) {
      return h(
        'span',
        { style: { color: 'var(--text-secondary)', fontSize: '13px' } },
        formatDate(row.createdAt),
      )
    },
  },
  {
    title: tableColTitle('右豹编码', 'notify.col.youbaoCode'),
    key: 'rightLeopardCode',
    width: 130,
    resizable: true,
    minWidth: 120,
    ellipsis: { tooltip: true },
    render(row) {
      return h('span', { style: { color: 'var(--text-primary)', fontWeight: 500 } }, row.rightLeopardCode)
    },
  },
  {
    title: tableColTitle('审核类型', 'notify.col.auditType'),
    key: 'auditType',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(row) {
      return h(
        'span',
        { style: { color: 'var(--text-secondary)', fontSize: '13px' } },
        notificationAuditTypeLabel(row.auditType),
      )
    },
  },
  {
    title: tableColTitle('通知场景', 'notify.col.scene'),
    key: 'scenario',
    width: 140,
    resizable: true,
    minWidth: 120,
    ellipsis: { tooltip: true },
    render(row) {
      return h('span', { style: { color: 'var(--text-secondary)' } }, scenarioLabel(row.scenario))
    },
  },
  {
    title: tableColTitle('渠道', 'notify.col.channel'),
    key: 'channel',
    width: 120,
    resizable: true,
    minWidth: 100,
    render(row) {
      return h('span', { style: { color: 'var(--text-secondary)' } }, channelLabel(row.channel))
    },
  },
  {
    title: tableColTitle('推送状态', 'notify.col.pushStatus'),
    key: 'status',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(row) {
      return statusTag(row.status)
    },
  },
  {
    title: tableColTitle('失败原因', 'notify.col.failReason'),
    key: 'failureReason',
    width: 200,
    resizable: true,
    minWidth: 120,
    ellipsis: { tooltip: true },
    render(row) {
      const t = row.failureReason ?? '—'
      return h(
        'span',
        { style: { color: row.failureReason ? 'var(--status-error)' : 'var(--text-muted)' } },
        t,
      )
    },
  },
  {
    title: tableColTitle('操作', 'notify.col.actions'),
    key: 'actions',
    width: 200,
    resizable: true,
    minWidth: 160,
    fixed: 'right',
    render(row) {
      const busy = pushingId.value === row.id
      const btns: ReturnType<typeof h>[] = []
      if (row.status === 'PENDING') {
        btns.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              loading: busy,
              disabled: busy,
              onClick: () => void doPush(row, 'now'),
            },
            { default: () => '立即推送' },
          ),
        )
      }
      if (row.status === 'FAILED' || row.status === 'PENDING') {
        btns.push(
          h(
            NButton,
            {
              size: 'small',
              secondary: true,
              loading: busy,
              disabled: busy,
              onClick: () => void doPush(row, 'retry'),
            },
            { default: () => '重新推送' },
          ),
        )
      }
      if (!btns.length) {
        return h('span', { class: 'muted' }, '—')
      }
      return h('div', { class: 'action-cell' }, btns)
    },
  },
])

function listParams() {
  return {
    page: query.page,
    pageSize: query.pageSize,
    status: filters.status,
    rightLeopardCode: filters.rightLeopardCode.trim() || null,
    scenario: filters.scenario,
    channel: filters.channel,
    auditType: filters.auditType,
  }
}

async function load() {
  loading.value = true
  try {
    const res = await fetchNotifications(listParams())
    items.value = res.items
    total.value = res.total
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  query.page = 1
  void load()
}

function onPageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  void load()
}

onMounted(() => load())
</script>

<style scoped>
.notification-page {
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
  gap: 16px;
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
  padding: 16px 20px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px 16px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.table-card {
  border-radius: var(--radius-lg);
  padding: 0 0 16px;
  overflow: hidden;
}

.table-summary {
  padding: 14px 20px 8px;
}

.summary-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.summary-text strong {
  color: var(--text-primary);
  font-weight: 600;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px 0;
}

.empty-state {
  padding: 32px 0;
}

.action-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.muted {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
