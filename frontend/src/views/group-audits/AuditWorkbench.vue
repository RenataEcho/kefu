<template>
  <div class="audit-workbench">
    <ApiStatusBar
      :degraded="appStore.larkApiDegraded"
      message="飞书API暂时不可用，请使用手动导入"
    />

    <div v-if="showManualImportCta" class="manual-import-cta glass">
      <span class="manual-import-cta__text">飞书入群接口暂不可用，可使用手动导入继续处理。</span>
      <n-button size="small" type="primary" @click="openManualImportPanel">
        前往手动导入
      </n-button>
    </div>

    <!-- ─── Page Header ───────────────────────────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <div class="page-title-row">
          <h2 class="page-title">入群审核工作台</h2>
          <PageRuleHelpLink />
        </div>
        <span class="page-desc">管理飞书入群申请，按 SLA 紧迫程度优先处理超时记录</span>
      </div>
      <div class="header-actions">
        <n-button
          v-if="isAdmin"
          secondary
          :loading="syncLoading"
          :disabled="syncLoading"
          @click="handleSyncLark"
        >
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          手动同步飞书状态
        </n-button>
        <n-button
          v-if="canExport"
          secondary
          :loading="exporting"
          :disabled="exporting"
          @click="handleExport"
        >
          <template #icon>
            <n-icon :component="DownloadOutline" />
          </template>
          导出
        </n-button>
      </div>
    </div>

    <!-- ─── 手动导入区（降级时展开） ───────────────────────────────────── -->
    <div v-if="manualImportVisible" ref="manualImportEl" class="manual-import-panel glass">
      <div class="manual-import-panel__title">手动导入（Excel）</div>
      <n-upload
        :max="1"
        accept=".xlsx,.xls,.csv"
        :show-file-list="true"
        :custom-request="handleManualImportRequest"
      >
        <n-upload-dragger>
          <div class="upload-hint">点击或拖拽文件到此区域（Mock：任意文件即可触发导入成功）</div>
        </n-upload-dragger>
      </n-upload>
    </div>

    <!-- ─── Status Filter Tabs ───────────────────────────────────────── -->
    <div class="status-tabs glass">
      <button
        v-for="tab in statusTabs"
        :key="tab.value ?? 'all'"
        class="status-tab"
        :class="{ 'status-tab--active': store.query.status === tab.value }"
        @click="handleTabChange(tab.value)"
      >
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.value === 'PENDING'" class="tab-badge tab-badge--orange">
          {{ store.pendingTotal }}
        </span>
      </button>
    </div>

    <!-- ─── 筛选栏（栅格多列 + 右豹编码） ─────── -->
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
        <div v-if="store.query.status === 'PENDING'" class="filter-field">
          <span class="filter-label">SLA 子筛选</span>
          <n-select
            v-model:value="pendingSlaModel"
            class="filter-select filter-control"
            size="small"
            :options="pendingSlaOptions"
            @update:value="onPendingSlaUpdate"
          />
        </div>
        <div class="filter-field">
          <span class="filter-label">处理人</span>
          <n-select
            v-model:value="reviewerModel"
            class="filter-select filter-control filter-select--wide"
            size="small"
            clearable
            placeholder="全部"
            :options="reviewerOptions"
            @update:value="onReviewerUpdate"
          />
        </div>
        <div class="filter-field filter-field--code">
          <span class="filter-label">右豹编码</span>
          <n-input
            v-model:value="codeFilter"
            size="small"
            clearable
            placeholder="精确匹配"
            class="filter-control"
            @keyup.enter="commitCodeFilter"
            @blur="commitCodeFilter"
            @clear="commitCodeFilter"
          />
        </div>
      </div>
    </div>

    <!-- ─── Table Card ───────────────────────────────────────────────── -->
    <div class="table-card glass">
      <div v-if="checkedRowKeys.length > 0 && canApprove" class="batch-action-bar">
        <span class="batch-count">已选 <strong>{{ checkedRowKeys.length }}</strong> 条</span>
        <div class="batch-actions">
          <n-button
            type="primary"
            size="small"
            :loading="batchApproving"
            :disabled="batchApproving || batchRejecting"
            @click="handleBatchApprove"
          >
            <template #icon>
              <n-icon :component="CheckmarkOutline" />
            </template>
            批量通过
          </n-button>
          <n-button
            size="small"
            type="error"
            secondary
            :disabled="batchApproving || batchRejecting"
            @click="openBatchRejectModal"
          >
            <template #icon>
              <n-icon :component="CloseOutline" />
            </template>
            批量拒绝
          </n-button>
          <n-button size="small" quaternary @click="checkedRowKeys = []">取消选择</n-button>
        </div>
      </div>

      <div v-else class="table-header">
        <span class="summary-text">
          共 <strong>{{ store.total }}</strong> 条记录
        </span>
        <div class="legend">
          <span class="legend-item">
            <span class="legend-dot legend-dot--red" />
            已超时
          </span>
          <span class="legend-item">
            <span class="legend-dot legend-dot--orange" />
            待处理
          </span>
        </div>
      </div>

      <n-data-table
        :columns="columns"
        :data="store.items"
        :loading="store.loading"
        :bordered="false"
        :single-line="false"
        :row-key="(row: GroupAuditItem) => row.id"
        :row-class-name="getRowClass"
        :row-props="rowProps"
        v-model:checked-row-keys="checkedRowKeys"
        size="small"
        class="audit-table"
      >
        <template #empty>
          <div class="empty-state">
            <n-empty :description="emptyDescription">
              <template #extra>
                <n-button v-if="showClearFiltersAction" size="small" @click="clearAllFilters">
                  清除筛选
                </n-button>
                <n-button
                  v-else-if="emptyShowPendingCta"
                  size="small"
                  @click="handleTabChange('PENDING')"
                >
                  查看待审核
                </n-button>
              </template>
            </n-empty>
          </div>
        </template>
      </n-data-table>

      <div class="pagination-bar">
        <n-pagination
          v-model:page="store.query.page"
          :item-count="store.total"
          :page-size="store.query.pageSize"
          :page-sizes="[50, 100]"
          show-size-picker
          show-quick-jumper
          :page-slot="7"
          @update:page="onPageChange"
          @update:page-size="onPageSizeChange"
        />
      </div>
    </div>

    <!-- ─── Reject Modal ─────────────────────────────────────────────── -->
    <n-modal
      v-model:show="rejectModal.visible"
      preset="dialog"
      title="确认拒绝入群申请"
      positive-text="确认拒绝"
      negative-text="取消"
      type="warning"
      :loading="rejectModal.submitting"
      @positive-click="handleRejectConfirm"
      @negative-click="rejectModal.visible = false"
    >
      <div class="reject-modal-body">
        <div class="reject-info">
          <span class="reject-info__label">申请人</span>
          <span class="reject-info__value">{{ rejectModal.nickname }}</span>
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

    <!-- ─── Batch Reject Modal ────────────────────────────────────────── -->
    <n-modal
      v-model:show="batchRejectModal.visible"
      preset="dialog"
      title="批量拒绝入群申请"
      :positive-text="`确认拒绝 ${checkedRowKeys.length} 条`"
      negative-text="取消"
      type="warning"
      :loading="batchRejecting"
      @positive-click="handleBatchRejectConfirm"
      @negative-click="batchRejectModal.visible = false"
    >
      <div class="reject-modal-body">
        <div class="batch-reject-hint">
          将拒绝已选的 <strong>{{ checkedRowKeys.length }}</strong> 条待审核申请
        </div>
        <div class="batch-applicant-list">
          <div
            v-for="item in selectedApplicants"
            :key="item.id"
            class="batch-applicant-item"
          >
            <span class="batch-applicant-name">{{ item.larkNickname }}</span>
            <span class="batch-applicant-code">{{ item.rightLeopardCode }}</span>
          </div>
        </div>
        <n-form-item class="reject-reason-item">
          <template #label>
            <FormFieldHelpLabel label="拒绝原因" catalog-key="audit.form.rejectReason" />
          </template>
          <n-input
            v-model:value="batchRejectModal.reason"
            type="textarea"
            :maxlength="200"
            show-count
            placeholder="将使用默认拒绝文案（统一应用于所有选中申请）"
            :rows="3"
          />
        </n-form-item>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, computed, onMounted, reactive, ref, watch } from 'vue'
import type { DataTableColumns, DataTableRowKey, UploadCustomRequestOptions } from 'naive-ui'
import { NButton, NIcon, useMessage } from 'naive-ui'
import {
  DownloadOutline,
  CheckmarkOutline,
  CloseOutline,
  RefreshOutline,
} from '@vicons/ionicons5'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useGroupAuditStore } from '@/stores/groupAudit'
import { usePermission } from '@/composables/usePermission'
import { runExportWithPolling } from '@/composables/useAsyncDataExport'
import type { GroupAuditArchiveType, GroupAuditItem, GroupAuditStatus, PendingSlaFilter } from '@/types/groupAudit'
import {
  fetchGroupAudits,
  startGroupAuditsExport,
  manualImportGroupAuditFallback,
} from '@/api/groupAudits'
import { triggerLarkSyncNow, fetchLarkApiStatus } from '@/api/lark'
import { formatDate } from '@/utils/date'
import { tableColTitle } from '@/utils/columnTitleHelp'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import PageRuleHelpLink from '@/components/common/PageRuleHelpLink.vue'
import SlaStatusBadge from '@/components/business/SlaStatusBadge.vue'
import ApiStatusBar from '@/components/business/ApiStatusBar.vue'

dayjs.extend(utc)
dayjs.extend(timezone)

const SLA_DAYS = 3
const WARNING_THRESHOLD_HOURS = 2.5 * 24

const store = useGroupAuditStore()
const authStore = useAuthStore()
const appStore = useAppStore()
const message = useMessage()
const router = useRouter()
const { hasOperationPermission } = usePermission()

const canApprove = computed(() => hasOperationPermission('audit:approve'))
const canExport = computed(() => hasOperationPermission('audit:export'))
const isAdmin = computed(() => authStore.user?.role === 'admin')

const manualImportOpen = ref(false)
const manualImportEl = ref<HTMLElement | null>(null)
const syncLoading = ref(false)
const exporting = ref(false)
const dateRangeValue = ref<[number, number] | null>(null)

const showManualImportCta = computed(() => appStore.larkApiDegraded)
const manualImportVisible = computed(() => showManualImportCta.value && manualImportOpen.value)

function openManualImportPanel() {
  manualImportOpen.value = true
  requestAnimationFrame(() => {
    manualImportEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

async function handleManualImportRequest(options: UploadCustomRequestOptions) {
  try {
    await manualImportGroupAuditFallback()
    await fetchLarkApiStatus().then((s) => appStore.setLarkApiDegraded(!!s.degraded))
    message.success('导入完成')
    manualImportOpen.value = false
    options.onFinish()
    await store.loadList()
  } catch {
    message.error('导入失败，请重试')
    options.onError()
  }
}

async function handleSyncLark() {
  syncLoading.value = true
  message.info('正在同步飞书入群状态，请稍候')
  try {
    const res = await triggerLarkSyncNow()
    message.success(`同步完成，已更新 ${res.updated} 条记录状态`)
    await store.loadList()
    await fetchLarkApiStatus().then((s) => appStore.setLarkApiDegraded(!!s.degraded))
  } catch {
    message.error('同步失败，请稍后重试')
  } finally {
    syncLoading.value = false
  }
}

async function handleExport() {
  if (!canExport.value) return
  exporting.value = true
  try {
    const { page: _p, pageSize: _ps, ...filterOnly } = store.query
    await runExportWithPolling({
      start: () => startGroupAuditsExport(filterOnly),
      message,
      rowEstimate: store.total,
    })
  } catch {
    message.error('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}

const REVIEWERS = ['王小明', '李晓红', '张大伟', '刘芳芳']

const pendingSlaOptions = [
  { label: '全部', value: 'all' as PendingSlaFilter },
  { label: '仅超时', value: 'overdue' as PendingSlaFilter },
  { label: '常规待审核', value: 'normal' as PendingSlaFilter },
]

const reviewerOptions = [
  { label: '全部', value: null as string | null },
  ...REVIEWERS.map((n) => ({ label: n, value: n })),
]

const pendingSlaModel = ref<PendingSlaFilter>('all')

const reviewerModel = ref<string | null>(null)
const codeFilter = ref('')

watch(
  () => store.query.rightLeopardCode,
  (v) => {
    codeFilter.value = v ?? ''
  },
  { immediate: true },
)

function commitCodeFilter() {
  store.query.rightLeopardCode = codeFilter.value.trim() || null
  store.query.page = 1
  store.loadList()
}

watch(
  () => store.query.pendingSla,
  (v) => {
    pendingSlaModel.value = (v ?? 'all') as PendingSlaFilter
  },
  { immediate: true },
)

watch(
  () => store.query.reviewerName,
  (v) => {
    reviewerModel.value = v ?? null
  },
  { immediate: true },
)

watch(
  () => [store.query.applyTimeFrom, store.query.applyTimeTo] as const,
  ([from, to]) => {
    if (from && to) {
      dateRangeValue.value = [
        dayjs(`${from}T00:00:00+08:00`).valueOf(),
        dayjs(`${to}T23:59:59+08:00`).valueOf(),
      ]
    } else {
      dateRangeValue.value = null
    }
  },
  { immediate: true },
)

function onDateRangeUpdate(v: [number, number] | null) {
  dateRangeValue.value = v
  if (!v) {
    store.query.applyTimeFrom = null
    store.query.applyTimeTo = null
  } else {
    store.query.applyTimeFrom = dayjs(v[0]).tz('Asia/Shanghai').format('YYYY-MM-DD')
    store.query.applyTimeTo = dayjs(v[1]).tz('Asia/Shanghai').format('YYYY-MM-DD')
  }
  store.query.page = 1
  store.loadList()
}

function onPendingSlaUpdate(v: PendingSlaFilter) {
  store.setPendingSla(v)
  store.loadList()
}

function onReviewerUpdate(v: string | null) {
  store.query.reviewerName = v
  store.query.page = 1
  store.loadList()
}

interface StatusTab {
  label: string
  value: GroupAuditStatus | null
}

const statusTabs: StatusTab[] = [
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '已归档', value: 'ARCHIVED' },
]

function handleTabChange(status: GroupAuditStatus | null) {
  store.setStatus(status)
  if (status !== 'PENDING') {
    store.query.pendingSla = 'all'
    pendingSlaModel.value = 'all'
  }
  store.loadList()
  checkedRowKeys.value = []
}

function getSlaDeadline(applyTime: string): dayjs.Dayjs {
  return dayjs(applyTime).tz('Asia/Shanghai').add(SLA_DAYS, 'day').endOf('day')
}

function getRowClass(row: GroupAuditItem): string {
  if (row.status !== 'PENDING') return ''
  const deadline = getSlaDeadline(row.applyTime)
  return dayjs().isAfter(deadline) ? 'row-overdue' : 'row-pending'
}

const hasActiveFilters = computed(() => {
  const q = store.query
  return !!(
    q.applyTimeFrom ||
    q.applyTimeTo ||
    q.reviewerName ||
    (q.rightLeopardCode && q.rightLeopardCode.trim()) ||
    (q.pendingSla && q.pendingSla !== 'all') ||
    (q.status && q.status !== 'PENDING')
  )
})

const showClearFiltersAction = computed(
  () => store.total === 0 && store.items.length === 0 && hasActiveFilters.value,
)

const emptyShowPendingCta = computed(
  () =>
    store.total === 0 &&
    store.items.length === 0 &&
    !hasActiveFilters.value &&
    store.query.status !== 'PENDING',
)

const emptyDescription = computed(() => {
  if (showClearFiltersAction.value) return '未找到符合条件的申请记录'
  if (store.query.status === 'PENDING') return '暂无待审核申请'
  if (store.query.status === 'APPROVED') return '暂无已通过记录'
  if (store.query.status === 'REJECTED') return '暂无已拒绝记录'
  if (store.query.status === 'ARCHIVED') return '暂无已归档记录'
  return '暂无记录'
})

function clearAllFilters() {
  store.resetQuery()
  pendingSlaModel.value = 'all'
  reviewerModel.value = null
  codeFilter.value = ''
  dateRangeValue.value = null
  store.loadList()
  checkedRowKeys.value = []
}

const rejectModal = reactive({
  visible: false,
  submitting: false,
  id: 0,
  nickname: '',
  code: '',
  reason: '',
})

function openRejectModal(row: GroupAuditItem) {
  rejectModal.id = row.id
  rejectModal.nickname = row.larkNickname
  rejectModal.code = row.rightLeopardCode
  rejectModal.reason = ''
  rejectModal.visible = true
}

async function handleRejectConfirm() {
  rejectModal.submitting = true
  const ok = await store.reject(rejectModal.id, rejectModal.reason)
  rejectModal.submitting = false
  rejectModal.visible = false
  if (ok) {
    message.success('操作成功')
  } else {
    message.error('操作失败，请重试')
  }
  return false
}

const checkedRowKeys = ref<DataTableRowKey[]>([])

const BATCH_LIMIT = 1000

const selectedApplicants = computed(() => {
  const ids = new Set(checkedRowKeys.value)
  return store.items.filter((r) => ids.has(r.id))
})

async function handleApprove(row: GroupAuditItem) {
  const ok = await store.approve(row.id)
  if (ok) {
    message.success('已提交通过操作，处理结果将逐步更新')
  } else {
    message.error('飞书入群操作失败，请稍后重试或手动处理')
  }
}

const batchApproving = ref(false)

async function handleBatchApprove() {
  if (checkedRowKeys.value.length === 0) return
  if (checkedRowKeys.value.length > BATCH_LIMIT) {
    message.warning(`已达单次操作上限（${BATCH_LIMIT} 条），请分批处理`)
    return
  }
  const ids = checkedRowKeys.value as number[]
  const count = ids.length
  batchApproving.value = true
  try {
    const ok = await store.batchApprove(ids)
    if (ok) {
      message.success(`已提交 ${count} 条通过操作，处理结果将逐步更新`)
      checkedRowKeys.value = []
    } else {
      message.error('批量通过操作失败，请稍后重试')
    }
  } finally {
    batchApproving.value = false
  }
}

const batchRejecting = ref(false)
const batchRejectModal = reactive({
  visible: false,
  reason: '',
})

function openBatchRejectModal() {
  if (checkedRowKeys.value.length > BATCH_LIMIT) {
    message.warning(`已达单次操作上限（${BATCH_LIMIT} 条），请分批处理`)
    return
  }
  batchRejectModal.reason = ''
  batchRejectModal.visible = true
}

async function handleBatchRejectConfirm() {
  const ids = checkedRowKeys.value as number[]
  const count = ids.length
  batchRejecting.value = true
  try {
    const ok = await store.batchReject(ids, batchRejectModal.reason)
    batchRejecting.value = false
    batchRejectModal.visible = false
    if (ok) {
      message.success(`已拒绝 ${count} 条申请`)
      checkedRowKeys.value = []
    } else {
      message.error('批量拒绝操作失败，请稍后重试')
    }
  } catch {
    batchRejecting.value = false
    batchRejectModal.visible = false
    message.error('批量拒绝操作失败，请稍后重试')
  }
  return false
}

function renderStatusBadge(row: GroupAuditItem) {
  if (row.status === 'APPROVED') {
    return h('span', { class: 'badge-green' }, '已通过')
  }
  if (row.status === 'REJECTED') {
    return h('span', { class: 'badge-red' }, '已拒绝')
  }
  if (row.status === 'ARCHIVED') {
    return h('span', { class: 'badge-gray' }, '已归档')
  }
  if (row.status === 'PROCESSING') {
    const label = appStore.larkApiDegraded
      ? '处理中（飞书服务异常，请稍后手动同步）'
      : '处理中（预计1分钟内完成）'
    return h('span', { class: 'badge-gray' }, label)
  }
  const deadline = getSlaDeadline(row.applyTime)
  if (dayjs().isAfter(deadline)) {
    return h('span', { class: 'badge-red' }, '已超时')
  }
  const hoursElapsed = dayjs().diff(dayjs(row.applyTime), 'hour', true)
  if (hoursElapsed >= WARNING_THRESHOLD_HOURS) {
    return h('span', { class: 'badge-orange' }, '⏰ 即将超时')
  }
  return h('span', { class: 'badge-orange' }, '待审核')
}

function renderSourceTag(source: GroupAuditItem['source']) {
  return h(
    'span',
    {
      class: source === 'lark_sync' ? 'source-tag source-tag--lark' : 'source-tag source-tag--manual',
    },
    source === 'lark_sync' ? '飞书同步' : '手动导入',
  )
}

function formatWaitDuration(applyTime: string): { text: string; overdue: boolean } {
  const start = dayjs(applyTime)
  const now = dayjs()
  const days = now.diff(start, 'day')
  const hours = now.diff(start.add(days, 'day'), 'hour')
  const overdue = dayjs().isAfter(getSlaDeadline(applyTime))
  return { text: `已等待 ${days} 天 ${hours} 小时`, overdue }
}

const columns = computed<DataTableColumns<GroupAuditItem>>(() => {
  const cols: DataTableColumns<GroupAuditItem> = []

  if (canApprove.value) {
    cols.push({
      type: 'selection',
      disabled: (row: GroupAuditItem) => row.status !== 'PENDING',
    })
  }

  cols.push(
    {
      title: tableColTitle('状态', 'audit.col.status'),
      key: 'status',
      width: 120,
      resizable: true,
      minWidth: 108,
      render(row) {
        return renderStatusBadge(row)
      },
    },
    {
      title: tableColTitle('申请人飞书昵称', 'audit.col.nickname'),
      key: 'larkNickname',
      width: 140,
      resizable: true,
      minWidth: 120,
      ellipsis: { tooltip: true },
      render(row) {
        return h('span', { class: 'nickname-cell' }, row.larkNickname)
      },
    },
    {
      title: tableColTitle('近10天动作数', 'audit.col.actionStats'),
      key: 'actionStats',
      width: 168,
      resizable: true,
      minWidth: 140,
      render(row) {
        return h('div', { class: 'action-stats-cell' }, [
          h('div', {}, `关键词 ${row.keywordCount}`),
          h('div', {}, `回填 ${row.backfillCount}`),
          h('div', {}, `订单 ${row.orderCount}`),
          h('div', {}, `收益 ¥${row.actionRevenueYuan.toLocaleString('zh-CN')}`),
        ])
      },
    },
    {
      title: tableColTitle('右豹编码', 'audit.col.youbaoCode'),
      key: 'rightLeopardCode',
      width: 130,
      resizable: true,
      minWidth: 110,
      render(row) {
        return h('span', { class: 'code-cell' }, row.rightLeopardCode)
      },
    },
    {
      title: tableColTitle('申请时间', 'audit.col.applyTime'),
      key: 'applyTime',
      width: 180,
      resizable: true,
      minWidth: 160,
      render(row) {
        return h('div', { class: 'apply-time-cell' }, [
          h('span', { class: 'apply-time-text' }, formatDate(row.applyTime)),
          renderSourceTag(row.source),
        ])
      },
    },
    {
      title: tableColTitle('等待时长', 'audit.col.wait'),
      key: 'wait',
      width: 140,
      resizable: true,
      minWidth: 120,
      render(row) {
        const { text, overdue } = formatWaitDuration(row.applyTime)
        return h(
          'span',
          { class: overdue ? 'wait-text wait-text--overdue' : 'wait-text' },
          text,
        )
      },
    },
    ...(store.query.status === 'ARCHIVED'
      ? ([
          {
            title: tableColTitle('归档类型', 'audit.col.archiveType'),
            key: 'archiveType',
            width: 120,
            resizable: true,
            minWidth: 100,
            render(row: GroupAuditItem) {
              return h('span', { class: 'text-muted' }, archiveTypeCell(row.archiveType))
            },
          },
        ] as DataTableColumns<GroupAuditItem>)
      : []),
    {
      title: tableColTitle('SLA 状态', 'audit.col.sla'),
      key: 'sla',
      width: 190,
      resizable: true,
      minWidth: 160,
      render(row) {
        if (row.status !== 'PENDING' && row.status !== 'PROCESSING') {
          return h('span', { class: 'text-muted' }, '—')
        }
        return h(SlaStatusBadge, { applyTime: row.applyTime })
      },
    },
    {
      title: tableColTitle('处理人', 'audit.col.reviewer'),
      key: 'reviewerName',
      width: 100,
      resizable: true,
      minWidth: 88,
      render(row) {
        return h('span', { class: 'text-muted' }, row.reviewerName || '—')
      },
    },
    {
      title: tableColTitle('操作', 'audit.col.actions'),
      key: 'actions',
      width: 160,
      resizable: true,
      minWidth: 140,
      fixed: 'right',
      render(row) {
        if (!canApprove.value || row.status !== 'PENDING') {
          return h('span', { class: 'text-muted' }, '—')
        }
        const id = row.id
        const isLoading = !!store.actionLoading[id]
        return h('div', { class: 'action-btns' }, [
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              loading: isLoading,
              disabled: isLoading,
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                handleApprove(row)
              },
            },
            {
              default: () => '通过',
              icon: () => h(NIcon, { component: CheckmarkOutline }),
            },
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              secondary: true,
              disabled: isLoading,
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                openRejectModal(row)
              },
            },
            {
              default: () => '拒绝',
              icon: () => h(NIcon, { component: CloseOutline }),
            },
          ),
        ])
      },
    },
  )

  return cols
})

function rowProps(row: GroupAuditItem) {
  return {
    style: { cursor: 'pointer' },
    onClick: (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('button') || el.closest('.n-checkbox') || el.closest('.n-radio')) return
      router.push({ name: 'GroupAuditDetail', params: { id: String(row.id) } })
    },
  }
}

function onPageChange(page: number) {
  store.query.page = page
  store.loadList()
}

function onPageSizeChange(size: number) {
  store.query.pageSize = size
  store.query.page = 1
  store.loadList()
}

function archiveTypeCell(t?: GroupAuditArchiveType): string {
  if (!t) return '—'
  if (t === 'AUTO_EXPIRE') return '超期自动'
  if (t === 'RE_SUBMIT') return '重新申请'
  return '手动归档'
}

onMounted(() => {
  void fetchLarkApiStatus().then((s) => appStore.setLarkApiDegraded(!!s.degraded))
  store.loadList()
})
</script>

<style scoped>
.audit-workbench {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.manual-import-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
}

.manual-import-cta__text {
  font-size: 13px;
  color: var(--text-secondary);
}

.manual-import-panel {
  padding: 16px 20px;
  border-radius: var(--radius-lg);
}

.manual-import-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.upload-hint {
  font-size: 13px;
  color: var(--text-muted);
}

.filter-bar {
  padding: 12px 16px;
  border-radius: var(--radius-lg);
}

.filter-bar__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px 16px;
  align-items: end;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.filter-field--code {
  grid-column: span 1;
}

.filter-control {
  width: 100%;
  min-width: 0;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.filter-select {
  min-width: 0;
}

.filter-select--wide {
  min-width: 0;
}

.action-stats-cell {
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-secondary);
}

.status-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
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
  white-space: nowrap;
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
  line-height: 1;
}

.tab-badge--orange {
  background: rgba(249, 115, 22, 0.15);
  color: var(--badge-orange);
}

.table-card {
  border-radius: var(--radius-lg);
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.legend {
  display: flex;
  align-items: center;
  gap: 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-muted);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-dot--red {
  background: rgba(239, 68, 68, 0.6);
}

.legend-dot--orange {
  background: rgba(249, 115, 22, 0.5);
}

:deep(.row-overdue .n-data-table-td) {
  background: rgba(239, 68, 68, 0.08) !important;
}

:deep(.row-pending .n-data-table-td) {
  background: rgba(249, 115, 22, 0.06) !important;
}

:deep(.row-overdue:hover .n-data-table-td) {
  background: rgba(239, 68, 68, 0.14) !important;
}

:deep(.row-pending:hover .n-data-table-td) {
  background: rgba(249, 115, 22, 0.11) !important;
}

:deep(.n-data-table-tr:not(.row-overdue):not(.row-pending):hover .n-data-table-td) {
  background: rgba(99, 102, 241, 0.06) !important;
}

:deep(.n-data-table-th) {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted) !important;
}

.nickname-cell {
  color: var(--text-primary);
  font-weight: 500;
}

.code-cell {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
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

.action-mix {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.text-muted {
  color: var(--text-muted);
}

.action-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
}

.empty-state {
  padding: 48px 0;
}

.batch-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: var(--accent-muted);
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
}

.batch-count {
  font-size: 13px;
  color: var(--accent);
  font-weight: 500;
}

.batch-count strong {
  font-weight: 700;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reject-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.batch-reject-hint {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 10px 14px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--badge-orange);
}

.batch-reject-hint strong {
  color: var(--text-primary);
  font-weight: 600;
}

.batch-applicant-list {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
}

.batch-applicant-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  font-size: 13px;
  border-bottom: 1px solid var(--border-subtle);
}

.batch-applicant-item:last-child {
  border-bottom: none;
}

.batch-applicant-name {
  color: var(--text-primary);
  font-weight: 500;
}

.batch-applicant-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.reject-info {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 6px 12px;
  align-items: center;
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

.reject-reason-item {
  margin-bottom: 0;
}

.code-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
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
</style>
