<template>
  <div class="user-detail-page">
    <UserEditDrawer
      v-model:show="showEditDrawer"
      :user-id="editingUserId"
      @updated="reloadDetail"
    />
    <UserDeleteModals
      v-model:show-blocked="showBlockedModal"
      v-model:show-confirm="showConfirmModal"
      :deleting="deleting"
      :delete-target-user="deleteTargetUser"
      :delete-target-detail="deleteTargetDetail"
      @confirm-delete="confirmDelete"
    />

    <div class="page-header">
      <div class="header-left">
        <n-button quaternary size="small" class="back-btn" @click="goList">
          <template #icon>
            <n-icon :component="ChevronBackOutline" />
          </template>
          返回列表
        </n-button>
        <div class="page-title-row">
          <h2 class="page-title">用户详情</h2>
          <PageRuleHelpLink />
        </div>
        <span v-if="detail" class="page-desc mono">{{ detail.rightLeopardCode }}</span>
        <span v-else-if="!loadError" class="page-desc">加载中…</span>
      </div>
      <div v-if="detail" class="header-actions">
        <n-button
          v-if="hasOperationPermission('users:update')"
          type="primary"
          @click="openEdit"
        >
          编辑
        </n-button>
        <n-button
          v-if="hasOperationPermission('users:delete')"
          type="error"
          secondary
          :loading="deleteBusy"
          :disabled="deleteBusy"
          @click="onDeleteClick"
        >
          删除
        </n-button>
      </div>
    </div>

    <ApiStatusBar
      :degraded="appStore.youbaoApiDegraded"
      message="右豹 APP API 暂不可用，当前展示缓存的动作数据。"
    />

    <n-spin :show="loading && !detail && !loadError">
      <n-result
        v-if="loadError"
        status="error"
        :title="loadError"
        description="请返回列表重试或检查链接是否正确。"
      >
        <template #footer>
          <n-button type="primary" @click="goList">返回用户主档</n-button>
        </template>
      </n-result>

      <div v-else-if="detail" class="detail-body">
        <n-tabs v-model:value="detailTab" type="line" animated class="detail-tabs">
          <n-tab-pane name="basic" tab="基础信息">
            <section class="detail-section glass">
              <h3 class="section-title">基础信息</h3>
              <dl class="detail-grid">
                <dt class="dt-with-tip">
                  <span>右豹编码</span>
                  <InfoTooltip title="右豹编码">
                    与右豹平台一致的业务标识，用于入群审核、动作数据与付费记录关联。
                  </InfoTooltip>
                </dt>
                <dd class="mono">
                  {{ detail.rightLeopardCode }}
                  <span
                    v-if="detail.codeVerifyStatus === 'VERIFIED'"
                    class="badge-green verify-badge"
                  >已验证</span>
                  <span v-else-if="detail.codeVerifyStatus === 'PENDING_VERIFY'" class="badge-orange verify-badge">
                    编码待验证
                  </span>
                  <span v-else-if="detail.codeVerifyStatus === 'INVALID'" class="badge-red verify-badge">
                    编码无效
                  </span>
                  <span v-else-if="detail.codeVerifyStatus === 'FAILED'" class="badge-gray verify-badge">
                    校验未响应
                  </span>
                </dd>
                <dt>右豹 ID</dt>
                <dd class="mono">{{ detail.rightLeopardId || '—' }}</dd>
                <dt>飞书 ID</dt>
                <dd class="mono">{{ detail.larkId || '—' }}</dd>
                <dt>飞书手机号</dt>
                <dd>{{ detail.larkPhone || '—' }}</dd>
                <dt>飞书昵称</dt>
                <dd>{{ detail.larkNickname || '—' }}</dd>
              </dl>
            </section>

            <section class="detail-section glass">
              <h3 class="section-title">归属信息</h3>
              <dl class="detail-grid">
                <dt>所属客服</dt>
                <dd>
                  <n-button
                    v-if="detail.agent?.name"
                    text
                    type="primary"
                    @click="goAgent(detail.agentId)"
                  >
                    {{ detail.agent.name }}
                  </n-button>
                  <span v-else>—</span>
                </dd>
                <dt>所属导师</dt>
                <dd>
                  <n-button
                    v-if="detail.mentor?.name"
                    text
                    type="primary"
                    @click="goMentor"
                  >
                    {{ detail.mentor.name }}
                  </n-button>
                  <span v-else>—</span>
                </dd>
                <dt>所属门派</dt>
                <dd>
                  <n-button
                    v-if="detail.school?.name"
                    text
                    type="primary"
                    @click="goSect"
                  >
                    {{ detail.school.name }}
                  </n-button>
                  <span v-else>—</span>
                </dd>
              </dl>
            </section>

            <section v-if="canViewPaymentSection" class="detail-section glass">
              <h3 class="section-title">付费信息</h3>
              <dl class="detail-grid">
                <dt>学员类型</dt>
                <dd>
                  <span v-if="detail.isPaid" class="badge-green">付费学员</span>
                  <span v-else class="badge-gray">普通用户</span>
                </dd>
                <template v-if="hasFieldPermission('paymentAmount')">
                  <dt>项目收益</dt>
                  <dd>
                    <template v-if="detail.paymentAmount != null">
                      ¥{{ detail.paymentAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </template>
                    <span v-else class="muted">—</span>
                  </dd>
                  <dt>付费时间</dt>
                  <dd>{{ detail.paidAt ? formatDate(detail.paidAt) : '—' }}</dd>
                </template>
                <template v-if="hasFieldPermission('paymentContact')">
                  <dt>付费对接人</dt>
                  <dd>{{ detail.paymentContact || '—' }}</dd>
                </template>
              </dl>
            </section>
          </n-tab-pane>

          <n-tab-pane name="projects" tab="项目信息">
            <section class="detail-section glass">
              <h3 class="section-title">右豹动作数据</h3>
              <dl class="detail-grid youbao-grid">
                <dt>总关键词数</dt>
                <dd>
                  <n-spin v-if="detail.youbao.state === 'syncing'" size="small" />
                  <span v-else>{{ detail.youbao.keywordCount }}</span>
                </dd>
                <dt>总订单数</dt>
                <dd>
                  <n-spin v-if="detail.youbao.state === 'syncing'" size="small" />
                  <span v-else>{{ detail.youbao.orderCount }}</span>
                </dd>
                <dt>项目收益</dt>
                <dd>
                  <n-spin v-if="detail.youbao.state === 'syncing'" size="small" />
                  <span v-else>¥{{ detail.youbao.projectRevenue.toLocaleString('zh-CN') }}</span>
                </dd>
                <dt>最后同步时间</dt>
                <dd>
                  <template v-if="detail.youbao.lastSyncedAt">
                    {{ formatDate(detail.youbao.lastSyncedAt) }}
                    <span class="sync-ago muted">（{{ fromNow(detail.youbao.lastSyncedAt) }}）</span>
                  </template>
                  <span v-else class="muted">—</span>
                </dd>
                <dt>数据状态</dt>
                <dd class="youbao-status">
                  <template v-if="syncingYoubao">
                    <span class="badge-blue">同步中</span>
                  </template>
                  <template v-else-if="detail.youbao.state === 'syncing'">
                    <span class="badge-blue">同步中</span>
                    <span class="sync-hint muted">后台任务拉取中…（Mock）</span>
                  </template>
                  <template v-else-if="detail.youbao.state === 'live'">
                    <span class="badge-blue">实时</span>
                  </template>
                  <template v-else-if="detail.youbao.state === 'cached'">
                    <span class="badge-blue">缓存数据</span>
                    <span v-if="detail.youbao.lastSyncedAt" class="sync-hint">
                      ，来源上次成功同步（{{ fromNow(detail.youbao.lastSyncedAt) }}）
                    </span>
                  </template>
                  <template v-else>
                    <span class="badge-blue">同步中</span>
                  </template>
                </dd>
              </dl>
              <div v-if="hasOperationPermission('users:update')" class="section-actions">
                <n-button
                  type="primary"
                  :loading="syncingYoubao"
                  :disabled="syncingYoubao || detail.codeVerifyStatus !== 'VERIFIED'"
                  @click="handleSyncYoubao"
                >
                  手动触发同步
                </n-button>
                <p v-if="detail.codeVerifyStatus === 'PENDING_VERIFY'" class="sync-hint muted sync-hint--block">
                  编码待验证通过后方可手动同步
                </p>
                <p
                  v-else-if="detail.codeVerifyStatus === 'INVALID' || detail.codeVerifyStatus === 'FAILED'"
                  class="sync-hint muted sync-hint--block"
                >
                  {{
                    detail.codeVerifyStatus === 'INVALID'
                      ? '编码无效，请在「数据迁移 → 验证报告」处理后再同步'
                      : '补校验未收到有效响应，请修正编码或稍后重试'
                  }}
                </p>
              </div>
            </section>

            <section class="detail-section glass">
              <h3 class="section-title">项目明细</h3>
              <n-data-table
                :columns="projectDetailColumns"
                :data="detail.projectDetails ?? []"
                :bordered="false"
                size="small"
                :scroll-x="1020"
              />
            </section>
          </n-tab-pane>

          <n-tab-pane name="audit" tab="操作日志">
            <section class="detail-section glass log-section">
              <n-spin :show="auditLoading && auditRows.length === 0">
                <n-data-table
                  :columns="auditColumns"
                  :data="auditRows"
                  :bordered="false"
                  size="small"
                  :scroll-x="1020"
                  table-layout="fixed"
                />
                <div v-if="auditNextCursor != null || auditRows.length > 0" class="load-more-wrap">
                  <n-button
                    quaternary
                    type="primary"
                    :disabled="auditNextCursor == null || auditLoadingMore"
                    :loading="auditLoadingMore"
                    @click="loadMoreAudit"
                  >
                    {{ auditNextCursor == null ? '已加载全部' : '加载更多' }}
                  </n-button>
                </div>
              </n-spin>
            </section>
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NDataTable,
  NIcon,
  NResult,
  NSpin,
  NTabs,
  NTabPane,
  useMessage,
} from 'naive-ui'
import { ChevronBackOutline } from '@vicons/ionicons5'
import { usePermission } from '@/composables/usePermission'
import { useUserDeleteFlow } from '@/composables/useUserDeleteFlow'
import { useAppStore } from '@/stores/app'
import ApiStatusBar from '@/components/business/ApiStatusBar.vue'
import { FIELD_PERMS } from '@/utils/permission'
import { fetchUser, fetchUserAuditLogs, syncUserYoubao } from '@/api/users'
import type { UserDetail, UserListItem, UserAuditLogRow, UserProjectDetailRow } from '@/types/user'
import { formatDate, fromNow } from '@/utils/date'
import UserEditDrawer from './UserEditDrawer.vue'
import UserDeleteModals from './UserDeleteModals.vue'
import InfoTooltip from '@/components/common/InfoTooltip.vue'
import PageRuleHelpLink from '@/components/common/PageRuleHelpLink.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const appStore = useAppStore()
const { hasOperationPermission, hasFieldPermission } = usePermission()

const {
  deletingUserId,
  deleteTargetUser,
  deleteTargetDetail,
  showBlockedModal,
  showConfirmModal,
  deleting,
  startDeleteFlow,
  confirmDelete,
} = useUserDeleteFlow({
  afterDelete: () => {
    router.push({ name: 'Users' })
  },
})

const userId = computed(() => {
  const n = Number(route.params.id)
  return Number.isFinite(n) && n > 0 ? n : NaN
})

const detail = ref<UserDetail | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const showEditDrawer = ref(false)
const editingUserId = ref<number | null>(null)

const syncingYoubao = ref(false)

const detailTab = ref<'basic' | 'projects' | 'audit'>('basic')
const auditRows = ref<UserAuditLogRow[]>([])
const auditNextCursor = ref<string | null>(null)
const auditLoading = ref(false)
const auditLoadingMore = ref(false)
const auditBootstrapped = ref(false)

const canViewPaymentSection = computed(
  () =>
    hasFieldPermission(FIELD_PERMS.PAYMENT_AMOUNT) ||
    hasFieldPermission(FIELD_PERMS.PAYMENT_CONTACT),
)

const deleteBusy = computed(
  () =>
    (deletingUserId.value != null && deletingUserId.value === userId.value) ||
    deleting.value,
)

const projectDetailColumns: DataTableColumns<UserProjectDetailRow> = [
  {
    title: tableColTitle('项目名称', 'stats.col.projectName'),
    key: 'projectName',
    width: 160,
    resizable: true,
    minWidth: 140,
    ellipsis: { tooltip: true },
  },
  { title: tableColTitle('业务大类', 'stats.col.businessCategory'), key: 'businessCategory', width: 100, resizable: true, minWidth: 88 },
  { title: tableColTitle('题词数量', 'stats.col.inscriptionCount'), key: 'inscriptionCount', width: 88, resizable: true, minWidth: 72 },
  { title: tableColTitle('回填数量', 'stats.col.backfillCount'), key: 'backfillCount', width: 88, resizable: true, minWidth: 72 },
  { title: tableColTitle('订单数量', 'stats.col.orderCount'), key: 'orderCount', width: 88, resizable: true, minWidth: 72 },
  {
    title: tableColTitle('已结算收益', 'stats.col.settledRevenue'),
    key: 'settledRevenueYuan',
    width: 112,
    resizable: true,
    minWidth: 96,
    render(row) {
      return `¥${row.settledRevenueYuan.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    },
  },
  {
    title: tableColTitle('待结算收益', 'stats.col.pendingRevenue'),
    key: 'pendingRevenueYuan',
    width: 112,
    resizable: true,
    minWidth: 96,
    render(row) {
      return h('span', { class: 'muted' }, `¥${row.pendingRevenueYuan.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`)
    },
  },
]

const auditColumns: DataTableColumns<UserAuditLogRow> = [
  {
    title: tableColTitle('操作时间', 'user.detail.audit.time'),
    key: 'operatedAt',
    width: 170,
    resizable: true,
    minWidth: 150,
    render(row) {
      return formatDate(row.operatedAt)
    },
  },
  {
    title: tableColTitle('操作人', 'user.detail.audit.operator'),
    key: 'operatorName',
    width: 100,
    resizable: true,
    minWidth: 88,
    ellipsis: { tooltip: true },
  },
  {
    title: tableColTitle('操作类型', 'user.detail.audit.type'),
    key: 'operationType',
    width: 88,
    resizable: true,
    minWidth: 76,
  },
  {
    title: tableColTitle('变更字段', 'user.detail.audit.field'),
    key: 'fieldName',
    width: 120,
    resizable: true,
    minWidth: 100,
    ellipsis: { tooltip: true },
  },
  {
    title: tableColTitle('变更前值', 'user.detail.audit.old'),
    key: 'beforeValue',
    width: 220,
    resizable: true,
    minWidth: 160,
    ellipsis: { tooltip: true },
  },
  {
    title: tableColTitle('变更后值', 'user.detail.audit.new'),
    key: 'afterValue',
    width: 220,
    resizable: true,
    minWidth: 160,
    ellipsis: { tooltip: true },
  },
]

function listRowFromDetail(d: UserDetail): UserListItem {
  return {
    id: d.id,
    rightLeopardCode: d.rightLeopardCode,
    rightLeopardId: d.rightLeopardId,
    larkNickname: d.larkNickname,
    larkPhone: d.larkPhone,
    codeVerifyStatus: d.codeVerifyStatus,
    agentId: d.agentId,
    agent: d.agent,
    mentorId: d.mentorId,
    mentor: d.mentor,
    schoolId: d.schoolId,
    school: d.school,
    isPaid: d.isPaid,
    paymentAmount: d.paymentAmount,
    projectRevenue: d.projectRevenue,
    createdAt: d.createdAt,
  }
}

function goList() {
  router.push({ name: 'Users' })
}

function goAgent(agentId: number) {
  if (!agentId) return
  router.push({ name: 'CsAgentDetail', params: { id: String(agentId) } })
}

function goMentor() {
  if (!detail.value?.mentorId) return
  router.push({ name: 'MentorDetail', params: { id: String(detail.value.mentorId) } })
}

function goSect() {
  if (!detail.value?.schoolId) return
  router.push({ name: 'SchoolDetail', params: { id: String(detail.value.schoolId) } })
}

function openEdit() {
  if (!detail.value) return
  editingUserId.value = detail.value.id
  showEditDrawer.value = true
}

function onDeleteClick() {
  if (!detail.value) return
  startDeleteFlow(listRowFromDetail(detail.value))
}

async function loadDetail() {
  loadError.value = null
  if (Number.isNaN(userId.value)) {
    loadError.value = '无效的用户 ID'
    detail.value = null
    return
  }
  loading.value = true
  try {
    detail.value = await fetchUser(userId.value)
    if (detail.value) {
      appStore.setYoubaoApiDegraded(detail.value.youbaoDegraded ?? false)
    }
  } catch (e) {
    detail.value = null
    appStore.setYoubaoApiDegraded(false)
    loadError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function resetAuditState() {
  auditBootstrapped.value = false
  auditRows.value = []
  auditNextCursor.value = null
  detailTab.value = 'basic'
}

async function reloadDetail() {
  resetAuditState()
  await loadDetail()
}

async function handleSyncYoubao() {
  if (!detail.value || syncingYoubao.value) return
  if (detail.value.codeVerifyStatus === 'PENDING_VERIFY') {
    message.warning('请先完成右豹编码校验')
    return
  }
  syncingYoubao.value = true
  const id = detail.value.id
  try {
    const res = await syncUserYoubao(id)
    if (res.status === 'queued') {
      message.success('同步任务已入队（Mock），正在刷新…')
      await new Promise((r) => setTimeout(r, 400))
      const next = await fetchUser(id)
      detail.value = next
      appStore.setYoubaoApiDegraded(next.youbaoDegraded ?? false)
      message.success('右豹动作数据已更新')
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : '同步失败')
  } finally {
    syncingYoubao.value = false
  }
}

watch(detailTab, (tab) => {
  if (tab === 'audit' && !auditBootstrapped.value) {
    auditBootstrapped.value = true
    void fetchAuditFirstPage()
  }
})

async function fetchAuditFirstPage() {
  if (Number.isNaN(userId.value)) return
  auditLoading.value = true
  try {
    const page = await fetchUserAuditLogs(userId.value)
    auditRows.value = page.list
    auditNextCursor.value = page.nextCursor
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载操作日志失败')
  } finally {
    auditLoading.value = false
  }
}

async function loadMoreAudit() {
  if (Number.isNaN(userId.value) || auditNextCursor.value == null) return
  auditLoadingMore.value = true
  try {
    const page = await fetchUserAuditLogs(userId.value, auditNextCursor.value)
    auditRows.value = [...auditRows.value, ...page.list]
    auditNextCursor.value = page.nextCursor
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载更多失败')
  } finally {
    auditLoadingMore.value = false
  }
}

watch(
  () => route.params.id,
  () => {
    resetAuditState()
    void loadDetail()
  },
  { immediate: true },
)
</script>

<style scoped>
.user-detail-page {
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
  gap: 6px;
}

.back-btn {
  align-self: flex-start;
  margin-bottom: 4px;
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

.page-desc.mono {
  font-family: 'JetBrains Mono', monospace;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-section {
  border-radius: var(--radius-lg);
  padding: 20px 22px;
}

.section-title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px 20px;
  margin: 0;
  font-size: 14px;
}

.detail-grid dt {
  margin: 0;
  color: var(--text-muted);
  font-weight: 500;
}

.detail-grid dd {
  margin: 0;
  color: var(--text-primary);
}

.detail-grid .mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.verify-badge {
  margin-left: 8px;
  vertical-align: middle;
}

.dt-with-tip {
  display: flex;
  align-items: center;
  gap: 2px;
}

.muted {
  color: var(--text-muted);
}

.youbao-grid {
  margin-bottom: 12px;
}

.youbao-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.sync-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

.section-actions {
  padding-top: 4px;
}

.detail-tabs :deep(.n-tabs-nav) {
  margin-bottom: 8px;
}

.log-section {
  padding-top: 4px;
}

.load-more-wrap {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}

.sync-ago {
  font-size: 12px;
  margin-left: 4px;
}

.sync-hint--block {
  margin: 8px 0 0;
  line-height: 1.4;
}
</style>
