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
            <n-button type="primary" @click="goBack">返回录入审核列表</n-button>
          </template>
        </n-result>
      </template>

      <template v-else-if="detail">
        <h1 class="audit-detail__title">录入审核详情</h1>

        <div class="detail-grid">
          <section class="detail-card glass">
            <h2 class="detail-card__title">申请信息</h2>
            <dl class="detail-dl">
              <dt>所属客服</dt>
              <dd>{{ detail.assignedAgentName }}</dd>
              <dt>右豹编码</dt>
              <dd class="mono">{{ detail.rightLeopardCode }}</dd>
              <dt>右豹 ID</dt>
              <dd class="mono">{{ detail.rightLeopardUserId }}</dd>
              <dt>申请时间</dt>
              <dd>
                <span>{{ formatDate(detail.applyTime) }}</span>
                <span :class="sourceTagClass(detail.source)">{{ sourceLabel(detail.source) }}</span>
              </dd>
              <dt>等待时长</dt>
              <dd :class="{ 'text-danger': waitInfo.overdue }">{{ waitInfo.text }}</dd>
            </dl>
            <div class="shots-row">
              <div class="shot-block">
                <span class="shot-label">右豹编码截图</span>
                <img
                  :src="detail.codeScreenshotUrl"
                  alt="编码截图"
                  class="shot-img"
                  @click="openShot(detail.codeScreenshotUrl)"
                />
              </div>
              <div class="shot-block">
                <span class="shot-label">右豹 ID 截图</span>
                <img
                  :src="detail.idScreenshotUrl"
                  alt="ID 截图"
                  class="shot-img"
                  @click="openShot(detail.idScreenshotUrl)"
                />
              </div>
            </div>
          </section>

          <section class="detail-card glass">
            <h2 class="detail-card__title">审核状态</h2>
            <div class="detail-status-row">
              <span v-if="detail.status === 'APPROVED'" class="badge-green">已通过</span>
              <span v-else-if="detail.status === 'REJECTED'" class="badge-red">已拒绝</span>
              <span v-else-if="detail.status === 'ARCHIVED'" class="badge-gray">已归档</span>
              <span v-else-if="detail.status === 'PROCESSING'" class="badge-gray">处理中</span>
              <span v-else-if="detailSlaOverdue" class="badge-red">已超时</span>
              <span v-else-if="detailSlaWarning" class="badge-orange">⏰ 即将超时</span>
              <span v-else class="badge-orange">待审核</span>
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

          <section class="detail-card glass detail-card--actions">
            <h2 class="detail-card__title">操作区</h2>
            <div v-if="canApprove && detail.status === 'PENDING'" class="action-row">
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
            <p v-else-if="detail.status !== 'PENDING'" class="result-text muted">
              {{ processedHint }}
            </p>
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
      v-model:show="shotModal.visible"
      preset="card"
      title="图片预览"
      style="width: min(560px, 92vw)"
      :bordered="false"
    >
      <img v-if="shotModal.url" :src="shotModal.url" alt="" class="shot-modal-img" />
    </n-modal>

    <n-modal
      v-model:show="rejectModal.visible"
      preset="dialog"
      title="确认拒绝录入申请"
      positive-text="确认拒绝"
      negative-text="取消"
      type="warning"
      :loading="rejectModal.submitting"
      @positive-click="confirmReject"
      @negative-click="rejectModal.visible = false"
    >
      <div class="reject-modal-body">
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NIcon, useMessage } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { ChevronBackOutline, CheckmarkOutline, CloseOutline } from '@vicons/ionicons5'
import { usePermission } from '@/composables/usePermission'
import type { EntryAuditDetail, EntryAuditLogItem, EntryAuditSource } from '@/types/entryAudit'
import {
  approveEntryAudit,
  fetchEntryAuditDetail,
  fetchEntryAuditLogs,
  rejectEntryAudit,
} from '@/api/entryAudits'
import { formatDate } from '@/utils/date'
import { tableColTitle } from '@/utils/columnTitleHelp'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'

dayjs.extend(utc)
dayjs.extend(timezone)

const DEFAULT_ENTRY_REJECT_REASON = '您的录入申请未符合要求，请按要求修改后重新提交'
const SLA_DAYS = 3

const route = useRoute()
const router = useRouter()
const message = useMessage()
const { hasOperationPermission } = usePermission()

const auditId = computed(() => parseInt(String(route.params.id), 10))

const loading = ref(true)
const loadError = ref('')
const detail = ref<EntryAuditDetail | null>(null)
const actionBusy = ref(false)

const logItems = ref<EntryAuditLogItem[]>([])
const logCursor = ref<string | null>('0')
const logHasMore = ref(false)
const logsLoading = ref(false)

const canApprove = computed(() => hasOperationPermission('audit:approve'))

const shotModal = reactive({ visible: false, url: '' })

const rejectModal = reactive({
  visible: false,
  submitting: false,
  reason: '',
})

const rejectDisplay = computed(() => {
  const r = detail.value?.rejectReason?.trim()
  return r || DEFAULT_ENTRY_REJECT_REASON
})

const processedHint = computed(() => {
  const s = detail.value?.status
  if (s === 'APPROVED') return '已通过审核'
  if (s === 'REJECTED') return '已拒绝'
  if (s === 'PROCESSING') return '处理中'
  if (s === 'ARCHIVED') return '已归档'
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

function sourceLabel(source: EntryAuditSource) {
  return source === 'qr_entry' ? '二维码录入' : '后台导入'
}

function sourceTagClass(source: EntryAuditSource) {
  return source === 'qr_entry' ? 'source-tag source-tag--lark' : 'source-tag source-tag--manual'
}

function getSlaDeadline(applyTime: string): dayjs.Dayjs {
  return dayjs(applyTime).tz('Asia/Shanghai').add(SLA_DAYS, 'day').endOf('day')
}

const detailSlaOverdue = computed(() => {
  const d = detail.value
  if (!d || d.status !== 'PENDING') return false
  return dayjs().isAfter(getSlaDeadline(d.applyTime))
})

const detailSlaWarning = computed(() => {
  const d = detail.value
  if (!d || d.status !== 'PENDING' || detailSlaOverdue.value) return false
  const hoursElapsed = dayjs().diff(dayjs(d.applyTime), 'hour', true)
  return hoursElapsed >= 2.5 * 24
})

const logColumns: DataTableColumns<EntryAuditLogItem> = [
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

function openShot(url: string) {
  shotModal.url = url
  shotModal.visible = true
}

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
    detail.value = await fetchEntryAuditDetail(id)
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
    const page = await fetchEntryAuditLogs(id, cursor)
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
  router.push({ name: 'EntryAudits' })
}

async function onApprove() {
  const id = auditId.value
  actionBusy.value = true
  try {
    await approveEntryAudit(id)
    message.success('审核通过')
    await loadDetail()
  } catch {
    message.error('操作失败，请重试')
  } finally {
    actionBusy.value = false
  }
}

function openReject() {
  rejectModal.reason = ''
  rejectModal.visible = true
}

async function confirmReject() {
  rejectModal.submitting = true
  try {
    const reason = rejectModal.reason.trim() || DEFAULT_ENTRY_REJECT_REASON
    await rejectEntryAudit(auditId.value, reason)
    message.success('已拒绝')
    rejectModal.visible = false
    await loadDetail()
  } catch {
    message.error('操作失败，请重试')
  } finally {
    rejectModal.submitting = false
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
}

.detail-dl {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px 16px;
  margin: 0 0 16px;
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

.shots-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.shot-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shot-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.shot-img {
  max-width: 220px;
  max-height: 140px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  cursor: zoom-in;
  object-fit: contain;
  background: var(--bg-elevated);
}

.shot-modal-img {
  width: 100%;
  border-radius: var(--radius-md);
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

.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.result-text {
  margin: 0;
  font-size: 14px;
}

.result-text.muted {
  color: var(--text-muted);
}

.log-collapse {
  margin-top: 8px;
}

.log-more {
  margin-top: 10px;
  text-align: center;
}

.reject-modal-body {
  padding-top: 4px;
}

.reject-reason-item {
  margin-bottom: 0;
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

.badge-green {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(34, 197, 94, 0.12);
  color: var(--badge-green);
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.badge-orange {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(249, 115, 22, 0.12);
  color: var(--badge-orange);
  border: 1px solid rgba(249, 115, 22, 0.25);
}

.badge-gray {
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
