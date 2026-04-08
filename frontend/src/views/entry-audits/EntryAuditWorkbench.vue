<template>
  <div class="audit-workbench entry-audit-workbench">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">录入审核工作台</h2>
        <span class="page-desc">用户主档录入来源：后台导入与用户扫码；处理规则与入群审核对齐（Mock）</span>
      </div>
    </div>

    <div class="status-tabs glass">
      <button
        v-for="tab in statusTabs"
        :key="tab.value ?? 'all'"
        class="status-tab"
        :class="{ 'status-tab--active': activeStatus === tab.value }"
        @click="onTabChange(tab.value)"
      >
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.value === 'PENDING'" class="tab-badge tab-badge--orange">
          {{ pendingTotal }}
        </span>
      </button>
    </div>

    <div class="filter-bar glass">
      <div class="filter-bar__grid">
        <div class="filter-field">
          <span class="filter-label">申请时间</span>
          <n-date-picker
            v-model:value="dateRangeValue"
            type="daterange"
            clearable
            size="small"
            class="filter-control"
            :is-date-disabled="() => false"
            @update:value="onDateRangeUpdate"
          />
        </div>
        <div class="filter-field">
          <span class="filter-label">所属客服</span>
          <n-input
            v-model:value="agentNameInput"
            size="small"
            clearable
            placeholder="模糊匹配"
            class="filter-control"
            @keyup.enter="commitFilters"
            @clear="commitFilters"
          />
        </div>
        <div class="filter-field">
          <span class="filter-label">右豹编码</span>
          <n-input
            v-model:value="codeInput"
            size="small"
            clearable
            placeholder="模糊匹配"
            class="filter-control"
            @keyup.enter="commitFilters"
            @clear="commitFilters"
          />
        </div>
        <div class="filter-field">
          <span class="filter-label">右豹 ID</span>
          <n-input
            v-model:value="userIdInput"
            size="small"
            clearable
            placeholder="模糊匹配"
            class="filter-control"
            @keyup.enter="commitFilters"
            @clear="commitFilters"
          />
        </div>
        <div class="filter-field">
          <span class="filter-label">录入来源</span>
          <n-select
            v-model:value="sourceFilter"
            class="filter-select filter-control"
            size="small"
            :options="sourceOptions"
            @update:value="onSourceChange"
          />
        </div>
      </div>
    </div>

    <div class="table-card glass">
      <div class="table-header">
        <span class="summary-text">
          共 <strong>{{ total }}</strong> 条记录
        </span>
      </div>

      <n-data-table
        :columns="columns"
        :data="items"
        :loading="loading"
        :bordered="false"
        :single-line="false"
        :row-key="(row: EntryAuditItem) => row.id"
        :row-class-name="getRowClass"
        :row-props="rowProps"
        size="small"
        class="audit-table"
      >
        <template #empty>
          <div class="empty-state">
            <n-empty :description="emptyDescription" />
          </div>
        </template>
      </n-data-table>

      <div class="pagination-bar">
        <n-pagination
          v-model:page="query.page"
          :item-count="total"
          :page-size="query.pageSize"
          :page-sizes="[20, 50]"
          show-size-picker
          show-quick-jumper
          :page-slot="7"
          @update:page="onPageChange"
          @update:page-size="onPageSizeChange"
        />
      </div>
    </div>

    <n-modal
      v-model:show="preview.visible"
      preset="card"
      :title="preview.title"
      style="width: min(520px, 92vw)"
      :bordered="false"
    >
      <img v-if="preview.url" :src="preview.url" alt="" class="preview-full" />
    </n-modal>

    <n-modal
      v-model:show="rejectModal.visible"
      preset="dialog"
      title="确认拒绝录入申请"
      positive-text="确认拒绝"
      negative-text="取消"
      type="warning"
      :loading="rejectModal.submitting"
      @positive-click="handleRejectConfirm"
      @negative-click="rejectModal.visible = false"
    >
      <div class="reject-modal-body">
        <div class="reject-info">
          <span class="reject-info__label">所属客服</span>
          <span class="reject-info__value">{{ rejectModal.agentName }}</span>
          <span class="reject-info__label">右豹编码</span>
          <span class="reject-info__value code-text">{{ rejectModal.code }}</span>
        </div>
        <n-form-item class="reject-reason-item">
          <template #label>
            <FormFieldHelpLabel label="拒绝原因" catalog-key="audit.form.rejectReason" />
          </template>
          <n-input
            v-model:value="rejectModal.reason"
            type="textarea"
            :maxlength="200"
            show-count
            placeholder="将使用默认拒绝文案"
            :rows="3"
          />
        </n-form-item>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, computed, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NIcon, useMessage } from 'naive-ui'
import { CheckmarkOutline, CloseOutline } from '@vicons/ionicons5'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { useRouter } from 'vue-router'
import { usePermission } from '@/composables/usePermission'
import type { EntryAuditItem, EntryAuditStatus } from '@/types/entryAudit'
import {
  approveEntryAudit,
  fetchEntryAudits,
  rejectEntryAudit,
} from '@/api/entryAudits'
import { formatDate } from '@/utils/date'
import { tableColTitle } from '@/utils/columnTitleHelp'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import SlaStatusBadge from '@/components/business/SlaStatusBadge.vue'

dayjs.extend(utc)
dayjs.extend(timezone)

const DEFAULT_ENTRY_REJECT_REASON = '您的录入申请未符合要求，请按要求修改后重新提交'

const SLA_DAYS = 3

const message = useMessage()
const router = useRouter()
const { hasOperationPermission } = usePermission()

const canApprove = computed(() => hasOperationPermission('audit:approve'))

const loading = ref(false)
const items = ref<EntryAuditItem[]>([])
const total = ref(0)
const pendingTotal = ref(0)

const query = reactive({
  page: 1,
  pageSize: 20,
  status: 'PENDING' as EntryAuditStatus | null,
  assignedAgentName: null as string | null,
  rightLeopardCode: null as string | null,
  rightLeopardUserId: null as string | null,
  source: 'all' as 'admin_import' | 'qr_entry' | 'all',
  applyTimeFrom: null as string | null,
  applyTimeTo: null as string | null,
})

const activeStatus = ref<EntryAuditStatus | null>('PENDING')

const statusTabs = [
  { label: '待审核', value: 'PENDING' as const },
  { label: '已通过', value: 'APPROVED' as const },
  { label: '已拒绝', value: 'REJECTED' as const },
  { label: '已归档', value: 'ARCHIVED' as const },
  { label: '全部', value: null },
]

const dateRangeValue = ref<[number, number] | null>(null)
const agentNameInput = ref('')
const codeInput = ref('')
const userIdInput = ref('')
const sourceFilter = ref<'admin_import' | 'qr_entry' | 'all'>('all')

const sourceOptions = [
  { label: '全部', value: 'all' as const },
  { label: '后台导入', value: 'admin_import' as const },
  { label: '二维码录入', value: 'qr_entry' as const },
]

const preview = reactive({ visible: false, url: '', title: '' })

const rejectModal = reactive({
  visible: false,
  submitting: false,
  id: 0,
  agentName: '',
  code: '',
  reason: '',
})

const actionBusyId = ref<number | null>(null)

function getSlaDeadline(applyTime: string): dayjs.Dayjs {
  return dayjs(applyTime).tz('Asia/Shanghai').add(SLA_DAYS, 'day').endOf('day')
}

function isSlaOverdue(applyTime: string): boolean {
  return dayjs().isAfter(getSlaDeadline(applyTime))
}

function getRowClass(row: EntryAuditItem): string {
  if (row.status !== 'PENDING') return ''
  return isSlaOverdue(row.applyTime) ? 'row-overdue' : 'row-pending'
}

function onTabChange(v: EntryAuditStatus | null) {
  activeStatus.value = v
  query.status = v
  query.page = 1
  void load()
}

function onDateRangeUpdate(v: [number, number] | null) {
  if (!v) {
    query.applyTimeFrom = null
    query.applyTimeTo = null
  } else {
    query.applyTimeFrom = dayjs(v[0]).format('YYYY-MM-DD')
    query.applyTimeTo = dayjs(v[1]).format('YYYY-MM-DD')
  }
  query.page = 1
  void load()
}

function commitFilters() {
  query.assignedAgentName = agentNameInput.value.trim() || null
  query.rightLeopardCode = codeInput.value.trim() || null
  query.rightLeopardUserId = userIdInput.value.trim() || null
  query.source = sourceFilter.value
  query.page = 1
  void load()
}

function onSourceChange() {
  commitFilters()
}

async function load() {
  loading.value = true
  try {
    const src = query.source === 'all' ? null : query.source
    const res = await fetchEntryAudits({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      assignedAgentName: query.assignedAgentName,
      rightLeopardCode: query.rightLeopardCode,
      rightLeopardUserId: query.rightLeopardUserId,
      source: src,
      applyTimeFrom: query.applyTimeFrom,
      applyTimeTo: query.applyTimeTo,
    })
    items.value = res.items
    total.value = res.total
    pendingTotal.value = res.pendingTotal ?? pendingTotal.value
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

const emptyDescription = computed(() => {
  if (query.status === 'PENDING') return '暂无待审核录入'
  if (query.status === 'APPROVED') return '暂无已通过记录'
  if (query.status === 'REJECTED') return '暂无已拒绝记录'
  if (query.status === 'ARCHIVED') return '暂无已归档记录'
  return '暂无记录'
})

function openPreview(url: string, title: string) {
  preview.url = url
  preview.title = title
  preview.visible = true
}

function thumb(url: string, title: string) {
  return h('img', {
    src: url,
    class: 'shot-thumb',
    alt: title,
    onClick: (e: MouseEvent) => {
      e.stopPropagation()
      openPreview(url, title)
    },
  })
}

function sourceTag(row: EntryAuditItem) {
  const isQr = row.source === 'qr_entry'
  return h(
    'span',
    {
      class: isQr ? 'source-tag source-tag--lark' : 'source-tag source-tag--manual',
    },
    isQr ? '二维码录入' : '后台导入',
  )
}

function formatWaitDuration(applyTime: string): { text: string; overdue: boolean } {
  const start = dayjs(applyTime)
  const now = dayjs()
  const days = now.diff(start, 'day')
  const hours = now.diff(start.add(days, 'day'), 'hour')
  const overdue = isSlaOverdue(applyTime)
  return { text: `已等待 ${days} 天 ${hours} 小时`, overdue }
}

function renderAuditStatus(row: EntryAuditItem) {
  if (row.status === 'APPROVED') return h('span', { class: 'badge-green' }, '已通过')
  if (row.status === 'REJECTED') return h('span', { class: 'badge-red' }, '已拒绝')
  if (row.status === 'ARCHIVED') return h('span', { class: 'badge-gray' }, '已归档')
  if (row.status === 'PROCESSING') return h('span', { class: 'badge-gray' }, '处理中')
  return h('span', { class: 'badge-orange' }, '待审核')
}

function renderTimeoutCell(row: EntryAuditItem) {
  if (row.status !== 'PENDING') {
    return h('span', { class: 'text-muted' }, '—')
  }
  const overdue = isSlaOverdue(row.applyTime)
  return h(
    'span',
    { class: overdue ? 'wait-text wait-text--overdue' : 'wait-text' },
    overdue ? '已超时' : '未超时',
  )
}

function openRejectModal(row: EntryAuditItem) {
  rejectModal.id = row.id
  rejectModal.agentName = row.assignedAgentName
  rejectModal.code = row.rightLeopardCode
  rejectModal.reason = ''
  rejectModal.visible = true
}

async function handleRejectConfirm() {
  rejectModal.submitting = true
  try {
    const reason = rejectModal.reason.trim() || DEFAULT_ENTRY_REJECT_REASON
    await rejectEntryAudit(rejectModal.id, reason)
    message.success('已拒绝')
    rejectModal.visible = false
    await load()
  } catch {
    message.error('操作失败，请重试')
  } finally {
    rejectModal.submitting = false
  }
  return false
}

async function handleApprove(row: EntryAuditItem) {
  actionBusyId.value = row.id
  try {
    await approveEntryAudit(row.id)
    message.success('审核通过')
    await load()
  } catch {
    message.error('操作失败，请重试')
  } finally {
    actionBusyId.value = null
  }
}

const columns = computed<DataTableColumns<EntryAuditItem>>(() => {
  void actionBusyId.value
  void canApprove.value
  return [
  {
    title: tableColTitle('所属客服', 'entry.col.agent'),
    key: 'assignedAgentName',
    width: 120,
    resizable: true,
    minWidth: 100,
    ellipsis: { tooltip: true },
    render(row) {
      return h('span', { class: 'nickname-cell' }, row.assignedAgentName)
    },
  },
  {
    title: tableColTitle('右豹编码', 'audit.col.youbaoCode'),
    key: 'rightLeopardCode',
    width: 120,
    resizable: true,
    minWidth: 100,
    render(row) {
      return h('span', { class: 'code-cell' }, row.rightLeopardCode)
    },
  },
  {
    title: tableColTitle('右豹 ID', 'entry.col.youbaoId'),
    key: 'rightLeopardUserId',
    width: 120,
    resizable: true,
    minWidth: 100,
    render(row) {
      return h('span', { class: 'code-cell' }, row.rightLeopardUserId)
    },
  },
  {
    title: tableColTitle('编码截图', 'entry.col.codeScreenshot'),
    key: 'codeScreenshotUrl',
    width: 72,
    resizable: true,
    minWidth: 64,
    align: 'center',
    render(row) {
      return thumb(row.codeScreenshotUrl, '右豹编码截图')
    },
  },
  {
    title: tableColTitle('ID 截图', 'entry.col.idScreenshot'),
    key: 'idScreenshotUrl',
    width: 72,
    resizable: true,
    minWidth: 64,
    align: 'center',
    render(row) {
      return thumb(row.idScreenshotUrl, '右豹 ID 截图')
    },
  },
  {
    title: tableColTitle('申请时间', 'entry.col.applyTime'),
    key: 'applyTime',
    width: 188,
    resizable: true,
    minWidth: 160,
    render(row) {
      return h('div', { class: 'apply-time-cell' }, [
        h('span', { class: 'apply-time-text' }, formatDate(row.applyTime)),
        sourceTag(row),
      ])
    },
  },
  {
    title: tableColTitle('等待时长', 'entry.col.waitDuration'),
    key: 'wait',
    width: 132,
    resizable: true,
    minWidth: 110,
    render(row) {
      const { text, overdue } = formatWaitDuration(row.applyTime)
      return h(
        'span',
        { class: overdue ? 'wait-text wait-text--overdue' : 'wait-text' },
        text,
      )
    },
  },
  {
    title: tableColTitle('SLA 状态', 'audit.col.sla'),
    key: 'sla',
    width: 168,
    resizable: true,
    minWidth: 140,
    render(row) {
      if (row.status !== 'PENDING' && row.status !== 'PROCESSING') {
        return h('span', { class: 'text-muted' }, '—')
      }
      return h(SlaStatusBadge, { applyTime: row.applyTime })
    },
  },
  {
    title: tableColTitle('超时状态', 'entry.col.timeout'),
    key: 'timeout',
    width: 88,
    resizable: true,
    minWidth: 80,
    render(row) {
      return renderTimeoutCell(row)
    },
  },
  {
    title: tableColTitle('审核状态', 'entry.col.auditStatus'),
    key: 'auditStatus',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(row) {
      return renderAuditStatus(row)
    },
  },
  {
    title: tableColTitle('处理人', 'audit.col.reviewer'),
    key: 'reviewerName',
    width: 92,
    resizable: true,
    minWidth: 80,
    render(row) {
      return h('span', { class: 'text-muted' }, row.reviewerName || '—')
    },
  },
  {
    title: tableColTitle('操作', 'entry.col.actions'),
    key: 'actions',
    width: 168,
    resizable: true,
    minWidth: 140,
    fixed: 'right',
    render(row) {
      const busy = actionBusyId.value === row.id
      const btns: ReturnType<typeof h>[] = [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'primary',
            onClick: (e: MouseEvent) => {
              e.stopPropagation()
              router.push({ name: 'EntryAuditDetail', params: { id: String(row.id) } })
            },
          },
          { default: () => '详情' },
        ),
      ]
      if (canApprove.value && row.status === 'PENDING') {
        btns.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              loading: busy,
              disabled: busy,
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                void handleApprove(row)
              },
            },
            { default: () => '通过', icon: () => h(NIcon, { component: CheckmarkOutline }) },
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              secondary: true,
              disabled: busy,
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                openRejectModal(row)
              },
            },
            { default: () => '拒绝', icon: () => h(NIcon, { component: CloseOutline }) },
          ),
        )
      }
      return h('div', { class: 'action-btns' }, btns)
    },
  },
  ]
})

function rowProps(row: EntryAuditItem) {
  return {
    style: { cursor: 'pointer' },
    onClick: (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('button') || el.closest('img.shot-thumb')) return
      router.push({ name: 'EntryAuditDetail', params: { id: String(row.id) } })
    },
  }
}

function onPageChange(p: number) {
  query.page = p
  void load()
}

function onPageSizeChange(s: number) {
  query.pageSize = s
  query.page = 1
  void load()
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.entry-audit-workbench {
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

.status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-lg);
}

.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-tab:hover {
  background: var(--accent-muted);
  color: var(--text-primary);
}

.status-tab--active {
  background: var(--accent-muted);
  color: var(--accent);
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
}

.tab-badge--orange {
  background: rgba(249, 115, 22, 0.15);
  color: var(--badge-orange);
}

.filter-bar {
  border-radius: var(--radius-lg);
  padding: 16px 20px;
}

.filter-bar__grid {
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

.filter-control {
  width: 100%;
}

.table-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table-header {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-subtle);
}

.summary-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.summary-text strong {
  color: var(--text-primary);
  font-weight: 600;
}

.shot-thumb {
  width: 40px;
  height: 28px;
  object-fit: cover;
  border-radius: 4px;
  cursor: zoom-in;
  border: 1px solid var(--border-subtle);
}

.preview-full {
  width: 100%;
  border-radius: var(--radius-md);
  display: block;
}

.nickname-cell {
  color: var(--text-primary);
  font-weight: 500;
}

.code-cell {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.apply-time-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.apply-time-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.source-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  width: fit-content;
}

.source-tag--lark {
  background: rgba(56, 189, 248, 0.12);
  color: var(--badge-blue);
  border: 1px solid rgba(56, 189, 248, 0.2);
}

.source-tag--manual {
  background: rgba(148, 163, 184, 0.1);
  color: var(--badge-gray);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.wait-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.wait-text--overdue {
  color: var(--badge-red);
  font-weight: 600;
}

.text-muted {
  color: var(--text-muted);
}

.action-btns {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
}

.empty-state {
  padding: 28px 0;
}

.reject-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reject-info {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 6px 12px;
  padding: 12px 16px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
}

.reject-info__label {
  font-size: 12px;
  color: var(--text-muted);
}

.reject-info__value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.code-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.reject-reason-item {
  margin-bottom: 0;
}

:deep(.row-overdue .n-data-table-td) {
  background: rgba(239, 68, 68, 0.08) !important;
}

:deep(.row-pending .n-data-table-td) {
  background: rgba(249, 115, 22, 0.06) !important;
}

:deep(.n-data-table-th) {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-muted) !important;
}

:deep(.badge-green) {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(34, 197, 94, 0.12);
  color: var(--badge-green);
  border: 1px solid rgba(34, 197, 94, 0.25);
}

:deep(.badge-red) {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(248, 113, 113, 0.12);
  color: var(--badge-red);
  border: 1px solid rgba(248, 113, 113, 0.25);
}

:deep(.badge-orange) {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(249, 115, 22, 0.12);
  color: var(--badge-orange);
  border: 1px solid rgba(249, 115, 22, 0.25);
}

:deep(.badge-gray) {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(148, 163, 184, 0.12);
  color: var(--badge-gray);
  border: 1px solid rgba(148, 163, 184, 0.22);
}
</style>
