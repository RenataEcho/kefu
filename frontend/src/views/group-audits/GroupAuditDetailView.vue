<template>
  <div class="audit-detail-page">
    <div class="audit-detail__toolbar">
      <n-button quaternary size="small" @click="goBack">
        <template #icon>
          <n-icon :component="ChevronBackOutline" />
        </template>
        返回列表
      </n-button>
    </div>

    <n-spin :show="loading && !detail">
      <template v-if="loadError">
        <n-result status="error" title="加载失败" :description="loadError">
          <template #footer>
            <n-button type="primary" @click="goBack">返回入群审核列表</n-button>
          </template>
        </n-result>
      </template>

      <template v-else-if="detail">
        <h1 class="audit-detail__title">入群审核详情</h1>

        <div class="detail-grid">
          <section class="detail-card glass">
            <h2 class="detail-card__title">申请基本信息</h2>
            <dl class="detail-dl">
              <dt>申请人飞书昵称</dt>
              <dd>{{ detail.larkNickname }}</dd>
              <dt>右豹编码</dt>
              <dd class="mono">{{ detail.rightLeopardCode }}</dd>
              <dt>申请时间</dt>
              <dd>
                <span>{{ formatDate(detail.applyTime) }}</span>
                <span :class="sourceTagClass(detail.source)">{{ sourceLabel(detail.source) }}</span>
              </dd>
              <dt>等待时长</dt>
              <dd :class="{ 'text-danger': waitInfo.overdue }">{{ waitInfo.text }}</dd>
            </dl>
          </section>

          <section class="detail-card glass">
            <h2 class="detail-card__title">审核状态</h2>
            <div class="detail-status-row">
              <DetailStatusBadge :detail="detail" />
              <template v-if="detail.reviewerName">
                <span class="meta-label">处理人</span>
                <span class="meta-value">{{ detail.reviewerName }}</span>
              </template>
              <template v-if="detail.reviewedAt">
                <span class="meta-label">处理时间</span>
                <span class="meta-value">{{ formatDate(detail.reviewedAt) }}</span>
              </template>
            </div>
            <p v-if="detail.status === 'REJECTED'" class="reject-block">
              <span class="meta-label">拒绝原因</span>
              <span class="meta-value">{{ rejectDisplay }}</span>
            </p>
          </section>

          <section class="detail-card glass">
            <h2 class="detail-card__title">右豹动作数据</h2>
            <p class="stats-line">
              关键词 <strong>{{ detail.youbaoStats.keywordCount }}</strong>
              · 回填 <strong>{{ detail.youbaoStats.backfillCount }}</strong>
              · 订单 <strong>{{ detail.youbaoStats.orderCount }}</strong>
              · 收益
              <strong>¥{{ detail.youbaoStats.actionRevenueYuan.toLocaleString('zh-CN') }}</strong>
            </p>
            <div class="sync-badge-row">
              <template v-if="detail.dataSyncState.state === 'syncing'">
                <span class="badge-blue">⏳ 同步中</span>
              </template>
              <template v-else-if="detail.dataSyncState.state === 'cached'">
                <span class="badge-blue">缓存，最后同步：{{ formatDate(detail.dataSyncState.lastSyncedAt!) }}</span>
              </template>
              <template v-else>
                <span class="badge-blue">实时</span>
              </template>
            </div>
          </section>

          <section v-if="detail.notification" class="detail-card glass">
            <h2 class="detail-card__title">通知状态</h2>
            <p v-if="detail.notification.status === 'pushed'" class="notif-ok">已推送</p>
            <div v-else class="notif-fail">
              <span class="badge-red">推送失败</span>
              <p class="fail-reason">{{ detail.notification.failureReason }}</p>
              <n-button text type="primary" @click="goNotificationFailure">
                跳转失败记录
              </n-button>
            </div>
          </section>

          <section v-if="detail.archive" class="detail-card glass">
            <h2 class="detail-card__title">归档信息</h2>
            <dl class="detail-dl">
              <dt>归档类型</dt>
              <dd>{{ archiveTypeLabel(detail.archive.type) }}</dd>
              <dt>归档时间</dt>
              <dd>{{ formatDate(detail.archive.archivedAt) }}</dd>
              <dt>归档原因</dt>
              <dd>{{ detail.archive.reason }}</dd>
            </dl>
          </section>

          <section class="detail-card glass detail-card--actions">
            <h2 class="detail-card__title">操作区</h2>
            <div v-if="canApprove && isPendingLike" class="action-row">
              <n-button type="primary" :loading="actionBusy" @click="onApprove">
                <template #icon>
                  <n-icon :component="CheckmarkOutline" />
                </template>
                通过
              </n-button>
              <n-button type="error" secondary :disabled="actionBusy" @click="openReject">
                <template #icon>
                  <n-icon :component="CloseOutline" />
                </template>
                拒绝
              </n-button>
            </div>
            <p v-else-if="!isPendingLike && detail.status !== 'ARCHIVED'" class="result-text">
              {{ processedHint }}
            </p>
            <p v-else-if="detail.status === 'ARCHIVED'" class="result-text muted">记录已归档</p>

            <div v-if="canArchive" class="archive-row">
              <n-button tertiary type="warning" :disabled="!canArchiveNow" @click="archiveModal.visible = true">
                归档此记录
              </n-button>
            </div>
          </section>
        </div>

        <n-collapse class="log-collapse" :default-expanded-names="[]">
          <n-collapse-item title="操作日志" name="logs">
            <n-data-table
              :columns="logColumns"
              :data="logItems"
              :bordered="false"
              size="small"
              :loading="logsLoading"
            />
            <div v-if="logHasMore" class="log-more">
              <n-button quaternary size="small" :loading="logsLoading" @click="loadMoreLogs">
                加载更多
              </n-button>
            </div>
          </n-collapse-item>
        </n-collapse>
      </template>
    </n-spin>

    <n-modal
      v-model:show="rejectModal.visible"
      preset="dialog"
      title="确认拒绝入群申请"
      positive-text="确认拒绝"
      negative-text="取消"
      type="warning"
      :loading="rejectModal.submitting"
      @positive-click="confirmReject"
      @negative-click="rejectModal.visible = false"
    >
      <div class="reject-modal-body">
        <div class="reject-info">
          <span class="reject-info__label">申请人</span>
          <span class="reject-info__value">{{ detail?.larkNickname }}</span>
          <span class="reject-info__label">右豹编码</span>
          <span class="reject-info__value code-text">{{ detail?.rightLeopardCode }}</span>
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

    <n-modal
      v-model:show="archiveModal.visible"
      preset="dialog"
      title="归档此记录"
      positive-text="确认归档"
      negative-text="取消"
      :loading="archiveModal.submitting"
      @positive-click="confirmArchive"
      @negative-click="archiveModal.visible = false"
    >
      <div class="archive-modal-body">
        <span class="meta-label">归档原因（必填）</span>
        <n-input
          v-model:value="archiveModal.reason"
          type="textarea"
          :rows="3"
          placeholder="请填写归档原因"
        />
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, defineComponent, h } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NIcon, useMessage } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { ChevronBackOutline, CheckmarkOutline, CloseOutline } from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useGroupAuditStore } from '@/stores/groupAudit'
import { usePermission } from '@/composables/usePermission'
import type { GroupAuditDetail, GroupAuditLogItem } from '@/types/groupAudit'
import {
  archiveGroupAudit,
  fetchGroupAuditDetail,
  fetchGroupAuditLogs,
} from '@/api/groupAudits'
import { formatDate } from '@/utils/date'
import { tableColTitle } from '@/utils/columnTitleHelp'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'

/** 与 Mock FR17 默认拒绝文案一致 */
const DEFAULT_REJECT_REASON =
  '您的入群申请未符合要求，请按要求修改后重新申请'

dayjs.extend(utc)
dayjs.extend(timezone)

const SLA_DAYS = 3
const WARNING_THRESHOLD_HOURS = 2.5 * 24

const route = useRoute()
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const store = useGroupAuditStore()
const { hasOperationPermission } = usePermission()

const auditId = computed(() => parseInt(String(route.params.id), 10))

const loading = ref(true)
const loadError = ref('')
const detail = ref<GroupAuditDetail | null>(null)
const actionBusy = ref(false)

const logItems = ref<GroupAuditLogItem[]>([])
const logCursor = ref<string | null>('0')
const logHasMore = ref(false)
const logsLoading = ref(false)

const canApprove = computed(() => hasOperationPermission('audit:approve'))
const isAdmin = computed(() => authStore.user?.role === 'admin')
const canArchive = computed(() => isAdmin.value)

const isPendingLike = computed(() => {
  const s = detail.value?.status
  return s === 'PENDING' || s === 'PROCESSING'
})

const canArchiveNow = computed(() => {
  const d = detail.value
  if (!d || d.status === 'ARCHIVED') return false
  return true
})

const rejectDisplay = computed(() => {
  const r = detail.value?.rejectReason?.trim()
  return r || DEFAULT_REJECT_REASON
})

const processedHint = computed(() => {
  const s = detail.value?.status
  if (s === 'APPROVED') return '已通过审核'
  if (s === 'REJECTED') return '已拒绝'
  if (s === 'PROCESSING') return '处理中，请稍后在列表查看结果'
  return ''
})

const waitInfo = computed(() => {
  if (!detail.value) return { text: '—', overdue: false }
  const start = dayjs(detail.value.applyTime)
  const now = dayjs()
  const days = now.diff(start, 'day')
  const hours = now.diff(start.add(days, 'day'), 'hour')
  const deadline = dayjs(detail.value.applyTime).tz('Asia/Shanghai').add(SLA_DAYS, 'day').endOf('day')
  const overdue = dayjs().isAfter(deadline)
  return { text: `已等待 ${days} 天 ${hours} 小时`, overdue }
})

function sourceLabel(source: GroupAuditDetail['source']) {
  return source === 'lark_sync' ? '飞书同步' : '手动导入'
}

function sourceTagClass(source: GroupAuditDetail['source']) {
  return source === 'lark_sync' ? 'source-tag source-tag--lark' : 'source-tag source-tag--manual'
}

function archiveTypeLabel(t: NonNullable<GroupAuditDetail['archive']>['type']) {
  if (t === 'AUTO_EXPIRE') return '超期自动归档'
  if (t === 'RE_SUBMIT') return '重新申请归档'
  return '手动归档'
}

function getSlaDeadline(applyTime: string): dayjs.Dayjs {
  return dayjs(applyTime).tz('Asia/Shanghai').add(SLA_DAYS, 'day').endOf('day')
}

const DetailStatusBadge = defineComponent({
  name: 'DetailStatusBadge',
  props: { detail: { type: Object as () => GroupAuditDetail, required: true } },
  setup(props) {
    const appStore = useAppStore()
    return () => {
      const d = props.detail
      if (d.status === 'APPROVED') return h('span', { class: 'badge-green' }, '已通过')
      if (d.status === 'REJECTED') return h('span', { class: 'badge-red' }, '已拒绝')
      if (d.status === 'ARCHIVED') return h('span', { class: 'badge-gray' }, '已归档')
      if (d.status === 'PROCESSING') {
        const label = appStore.larkApiDegraded
          ? '处理中（飞书服务异常，请稍后手动同步）'
          : '处理中（预计1分钟内完成）'
        return h('span', { class: 'badge-gray' }, label)
      }
      const deadline = getSlaDeadline(d.applyTime)
      if (dayjs().isAfter(deadline)) {
        return h('span', { class: 'badge-red' }, '已超时')
      }
      const hoursElapsed = dayjs().diff(dayjs(d.applyTime), 'hour', true)
      if (hoursElapsed >= WARNING_THRESHOLD_HOURS) {
        return h('span', { class: 'badge-orange' }, '⏰ 即将超时')
      }
      return h('span', { class: 'badge-orange' }, '待审核')
    }
  },
})

const rejectModal = reactive({
  visible: false,
  submitting: false,
  reason: '',
})

const archiveModal = reactive({
  visible: false,
  submitting: false,
  reason: '',
})

const logColumns: DataTableColumns<GroupAuditLogItem> = [
  {
    title: tableColTitle('操作时间', 'audit.detail.col.time'),
    key: 'operatedAt',
    width: 180,
    resizable: true,
    minWidth: 160,
    render: (r) => formatDate(r.operatedAt),
  },
  { title: tableColTitle('操作人', 'audit.detail.col.operator'), key: 'operatorName', width: 100, resizable: true, minWidth: 88 },
  { title: tableColTitle('操作类型', 'audit.detail.col.actionType'), key: 'actionType', width: 100, resizable: true, minWidth: 88 },
  {
    title: tableColTitle('操作内容', 'audit.detail.col.content'),
    key: 'content',
    ellipsis: { tooltip: true },
    minWidth: 160,
    resizable: true,
  },
]

async function loadDetail() {
  loadError.value = ''
  loading.value = true
  try {
    const id = auditId.value
    if (Number.isNaN(id)) {
      loadError.value = '无效的记录 ID'
      detail.value = null
      return
    }
    const d = await fetchGroupAuditDetail(id)
    detail.value = d
    logItems.value = []
    logCursor.value = '0'
    await fetchLogsPage(true)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '无法加载详情'
    detail.value = null
  } finally {
    loading.value = false
  }
}

async function fetchLogsPage(reset: boolean) {
  const id = auditId.value
  if (Number.isNaN(id)) return
  logsLoading.value = true
  try {
    const cursor = reset ? '0' : logCursor.value || '0'
    const page = await fetchGroupAuditLogs(id, cursor)
    if (reset) {
      logItems.value = page.items
    } else {
      logItems.value = [...logItems.value, ...page.items]
    }
    logHasMore.value = page.hasMore
    logCursor.value = page.nextCursor
  } catch {
    message.error('操作日志加载失败')
  } finally {
    logsLoading.value = false
  }
}

async function loadMoreLogs() {
  if (!logHasMore.value) return
  await fetchLogsPage(false)
}

function goBack() {
  router.push({ name: 'GroupAudits' })
}

function goNotificationFailure() {
  const q = detail.value?.notification?.failureRecordId
    ? { relatedId: detail.value.notification.failureRecordId }
    : { groupAuditId: String(auditId.value) }
  router.push({ path: '/notifications', query: q })
}

async function onApprove() {
  const id = auditId.value
  actionBusy.value = true
  const ok = await store.approve(id)
  actionBusy.value = false
  if (ok) {
    message.success('操作成功')
    await loadDetail()
  } else {
    message.error('操作失败，请重试')
  }
}

function openReject() {
  rejectModal.reason = ''
  rejectModal.visible = true
}

async function confirmReject() {
  rejectModal.submitting = true
  const ok = await store.reject(auditId.value, rejectModal.reason)
  rejectModal.submitting = false
  rejectModal.visible = false
  if (ok) {
    message.success('操作成功')
    await loadDetail()
  } else {
    message.error('操作失败，请重试')
  }
  return false
}

async function confirmArchive() {
  const reason = archiveModal.reason.trim()
  if (!reason) {
    message.warning('请填写归档原因')
    return false
  }
  archiveModal.submitting = true
  try {
    await archiveGroupAudit(auditId.value, reason)
    message.success('已归档')
    archiveModal.visible = false
    archiveModal.reason = ''
    await loadDetail()
  } catch {
    message.error('归档失败')
  } finally {
    archiveModal.submitting = false
  }
  return false
}

watch(
  () => route.params.id,
  () => {
    void loadDetail()
  },
)

onMounted(() => {
  void loadDetail()
})
</script>

<style scoped>
.audit-detail-page {
  padding: 24px;
  max-width: 960px;
}

.audit-detail__toolbar {
  margin-bottom: 16px;
}

.audit-detail__title {
  margin: 0 0 20px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.detail-card {
  padding: 18px 20px;
  border-radius: var(--radius-lg);
}

.detail-card__title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.detail-dl {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px 16px;
  margin: 0;
  font-size: 13px;
}

.detail-dl dt {
  color: var(--text-muted);
  font-weight: 500;
}

.detail-dl dd {
  margin: 0;
  color: var(--text-primary);
}

.mono {
  font-family: 'JetBrains Mono', monospace;
}

.source-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  vertical-align: middle;
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

.text-danger {
  color: var(--badge-red);
  font-weight: 600;
}

.detail-status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  font-size: 13px;
}

.meta-label {
  color: var(--text-muted);
  margin-right: 6px;
}

.meta-value {
  color: var(--text-primary);
  font-weight: 500;
}

.reject-block {
  margin: 12px 0 0;
  font-size: 13px;
}

.stats-line {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--text-secondary);
}

.stats-line strong {
  color: var(--text-primary);
  font-weight: 600;
}

.sync-badge-row {
  font-size: 13px;
}

.badge-blue {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(56, 189, 248, 0.12);
  color: var(--badge-blue);
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.notif-ok {
  margin: 0;
  font-size: 14px;
  color: var(--badge-green);
}

.notif-fail {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.badge-red {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(248, 113, 113, 0.12);
  color: var(--badge-red);
  border: 1px solid rgba(248, 113, 113, 0.25);
}

.fail-reason {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.result-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
}

.result-text.muted {
  color: var(--text-muted);
}

.archive-row {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-subtle);
}

.log-collapse {
  margin-top: 8px;
}

.log-more {
  margin-top: 10px;
  text-align: center;
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

.reject-reason-item {
  margin-bottom: 0;
}

.code-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.archive-modal-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
