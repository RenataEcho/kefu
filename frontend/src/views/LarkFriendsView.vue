<template>
  <div class="lark-friends-page">
    <div class="page-header">
      <div class="header-left">
        <div class="page-title-row">
          <h2 class="page-title">飞书好友管理</h2>
          <PageRuleHelpLink />
        </div>
        <span class="page-desc">按入群优先级处理好友申请，支持 OAuth 授权与人工决策（对齐原型 §2.5）</span>
      </div>
    </div>

    <!-- OAuth 状态条（原型 §2.5） -->
    <n-alert
      v-if="oauthBanner === 'none'"
      type="warning"
      title="飞书授权"
      class="oauth-banner glass"
      :bordered="false"
    >
      <p class="oauth-banner__text">暂无已授权的客服/导师账号，发起申请前请先完成飞书 OAuth。</p>
      <n-button size="small" type="primary" class="oauth-banner__btn" @click="openOAuthPicker = true">
        立即授权
      </n-button>
    </n-alert>
    <n-alert
      v-else-if="oauthBanner === 'expired'"
      type="warning"
      title="飞书授权已过期"
      class="oauth-banner glass oauth-banner--expired"
      :bordered="false"
    >
      <p class="oauth-banner__text">请重新授权后再发起好友申请。</p>
      <n-button size="small" type="primary" class="oauth-banner__btn" @click="openOAuthPicker = true">
        重新授权
      </n-button>
    </n-alert>

    <p v-if="timeoutCount > 0 && !includeTimeout" class="timeout-hint">
      当前有 {{ timeoutCount }} 条申请已超时，
      <button type="button" class="link-like" @click="setIncludeTimeout(true)">查看</button>
    </p>
    <p v-else-if="includeTimeout" class="timeout-hint">
      已展示超时记录。
      <button type="button" class="link-like" @click="setIncludeTimeout(false)">恢复默认视图</button>
    </p>

    <n-spin :show="loading">
      <div class="sections">
        <section v-if="pendingJoin.length" class="section glass">
          <div class="group-divider">待入群（{{ pendingJoin.length }}人）</div>
          <n-data-table
            :columns="columns"
            :data="pendingJoin"
            :bordered="false"
            size="small"
            :row-key="(r: Row) => r.userId"
          />
        </section>

        <section v-if="auditing.length" class="section glass">
          <div class="group-divider">审核中（{{ auditing.length }}人）</div>
          <n-data-table
            :columns="columns"
            :data="auditing"
            :bordered="false"
            size="small"
            :row-key="(r: Row) => r.userId"
          />
        </section>

        <div v-if="!pendingJoin.length && !auditing.length" class="empty-hint glass">
          <n-empty description="当前没有待处理的优先级记录（或已全部为超时/已隐藏状态）" />
        </div>

        <!-- Story 8.5：需人工决策；数量为 0 时整区隐藏（原型 §2.5） -->
        <n-collapse v-if="manualDecision.length" class="manual-collapse glass">
          <n-collapse-item :name="'manual'">
            <template #header>
              <span class="manual-header">需人工决策（{{ manualDecision.length }}）</span>
            </template>
            <p class="manual-desc">以下用户曾拒绝好友申请，可重新发起或标记放弃。</p>
            <n-data-table
              :columns="manualColumns"
              :data="manualDecision"
              :bordered="false"
              size="small"
              :row-key="(r: Row) => r.userId"
            />
          </n-collapse-item>
        </n-collapse>
      </div>
    </n-spin>

    <!-- 账号选择：发起申请 -->
    <n-modal
      v-model:show="operatorModalShow"
      preset="card"
      :title="operatorModalTitle"
      class="operator-modal"
      style="width: 480px"
      :bordered="false"
    >
      <n-radio-group v-model:value="pickedOperatorKey">
        <div v-for="op in operatorChoices" :key="op.key" class="operator-row">
          <n-radio :value="op.key" :disabled="op.expired">
            <span class="operator-name">{{ op.name }}</span>
            <span v-if="op.expired" class="operator-meta operator-meta--bad">未授权</span>
            <span v-else class="operator-meta">本月已发 {{ op.monthlySendCount }} 次</span>
          </n-radio>
        </div>
      </n-radio-group>
      <p v-if="!operatorChoices.length" class="operator-empty">暂无符合身份的已授权账号</p>
      <template #footer>
        <n-button quaternary @click="operatorModalShow = false">取消</n-button>
        <n-button type="primary" :disabled="!canConfirmOperator" @click="confirmSendRequest">确认发起</n-button>
      </template>
    </n-modal>

    <!-- OAuth：选择要授权的账号 -->
    <n-modal
      v-model:show="openOAuthPicker"
      preset="card"
      title="选择要授权的账号"
      style="width: 440px"
      :bordered="false"
    >
      <n-radio-group v-model:value="oauthPickKey">
        <div v-for="op in allOperatorsForOAuth" :key="op.key" class="operator-row">
          <n-radio :value="op.key">
            <span class="operator-name">{{ op.name }}</span>
            <span class="operator-meta">{{ op.type === 'agent' ? '客服' : '导师' }}</span>
          </n-radio>
        </div>
      </n-radio-group>
      <template #footer>
        <n-button quaternary @click="openOAuthPicker = false">取消</n-button>
        <n-button type="primary" @click="confirmOpenOAuth">打开授权页</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import {
  NAlert,
  NButton,
  NCollapse,
  NCollapseItem,
  NDataTable,
  NDropdown,
  NEmpty,
  NModal,
  NRadio,
  NRadioGroup,
  NSpin,
  useDialog,
  useMessage,
} from 'naive-ui'
import { ChevronDownOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import type { LarkAuthorizedOperatorOption, LarkFriendPriorityRow } from '@/types/larkFriends'
import {
  fetchLarkAuthorizedOperators,
  fetchLarkDecisionRequired,
  fetchLarkFriendPriorityList,
  fetchLarkOauthSummary,
  postLarkAbandon,
  postLarkDevSimulateFriendStatus,
  postLarkManualConfirm,
  postLarkReapply,
  postLarkSendFriendRequest,
} from '@/api/larkFriends'
import { formatDate } from '@/utils/date'
import { tableColTitle } from '@/utils/columnTitleHelp'
import PageRuleHelpLink from '@/components/common/PageRuleHelpLink.vue'

type Row = LarkFriendPriorityRow

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const includeTimeout = ref(false)
const pendingJoin = ref<Row[]>([])
const auditing = ref<Row[]>([])
const manualDecision = ref<Row[]>([])
const timeoutCount = ref(0)

const oauthBanner = ref<'ok' | 'none' | 'expired'>('ok')
const openOAuthPicker = ref(false)
const oauthPickKey = ref<string | null>(null)

const operators = ref<LarkAuthorizedOperatorOption[]>([])

const operatorModalShow = ref(false)
const applyUserId = ref<number | null>(null)
const applyKind = ref<'agent' | 'mentor'>('agent')
const pickedOperatorKey = ref<string | null>(null)

let bc: BroadcastChannel | null = null

const operatorModalTitle = computed(() =>
  applyKind.value === 'agent' ? '以客服身份发起申请' : '以导师身份发起申请',
)

const operatorChoices = computed(() => {
  const t = applyKind.value
  return operators.value
    .filter((o) => o.type === t)
    .map((o) => ({
      key: `${o.type}-${o.id}`,
      name: o.name,
      expired: o.expired,
      monthlySendCount: o.monthlySendCount,
      raw: o,
    }))
})

const allOperatorsForOAuth = computed(() =>
  operators.value.map((o) => ({
    key: `${o.type}-${o.id}`,
    name: o.name,
    type: o.type,
    id: o.id,
  })),
)

const canConfirmOperator = computed(() => {
  if (!pickedOperatorKey.value) return false
  const row = operatorChoices.value.find((x) => x.key === pickedOperatorKey.value)
  return !!row && !row.expired
})

function statusBadge(row: Row) {
  const s = row.friendRequestStatus
  if (s === 'PENDING') return { cls: 'badge-orange', text: '待接受' }
  if (s === 'ACCEPTED' || s === 'MANUAL_CONFIRMED') return { cls: 'badge-green', text: '已接受' }
  if (s === 'REJECTED') return { cls: 'badge-red', text: '已拒绝' }
  if (s === 'TIMEOUT') return { cls: 'badge-gray', text: '超时' }
  return { cls: 'badge-gray', text: '未申请' }
}

function renderBadge(row: Row) {
  const b = statusBadge(row)
  return h('span', { class: ['friend-badge', b.cls] }, b.text)
}

const simulateOptions = [
  { label: '模拟：对方已接受', key: 'sim-ok' },
  { label: '模拟：对方已拒绝', key: 'sim-rej' },
  { label: '模拟：7日超时', key: 'sim-to' },
]

function openApplyModal(userId: number, kind: 'agent' | 'mentor') {
  applyUserId.value = userId
  applyKind.value = kind
  pickedOperatorKey.value = null
  const firstOk = operatorChoices.value.find((x) => !x.expired)
  if (firstOk) pickedOperatorKey.value = firstOk.key
  operatorModalShow.value = true
}

async function confirmSendRequest() {
  const uid = applyUserId.value
  if (!uid || !pickedOperatorKey.value) return
  const row = operatorChoices.value.find((x) => x.key === pickedOperatorKey.value)
  if (!row || row.expired) return
  try {
    const res = await postLarkSendFriendRequest({
      userId: uid,
      operatorType: row.raw.type,
      operatorId: row.raw.id,
    })
    message.success(`已以 ${res.operatorName} 的身份发起申请`)
    operatorModalShow.value = false
    await loadAll()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '发起失败')
  }
}

async function onManualConfirm(userId: number) {
  try {
    await postLarkManualConfirm(userId)
    message.success('已标记为手动确认已添加')
    await loadAll()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '操作失败')
  }
}

function onSimulateSelect(userId: number, key: string) {
  const map = {
    'sim-ok': 'ACCEPTED' as const,
    'sim-rej': 'REJECTED' as const,
    'sim-to': 'TIMEOUT' as const,
  }
  const st = map[key as keyof typeof map]
  if (!st) return
  void postLarkDevSimulateFriendStatus(userId, st)
    .then(() => {
      message.success('已模拟飞书回调状态')
      return loadAll()
    })
    .catch((e) => message.error(e instanceof Error ? e.message : '模拟失败'))
}

function promptReapply(userId: number) {
  reapplyUserId.value = userId
  dialog.warning({
    title: '确认重新发起好友申请',
    content: '该用户曾拒绝好友申请，确认重新向对方发起？',
    positiveText: '确认发起',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await postLarkReapply(userId)
        message.success('已重置为未申请，请选择身份发起')
        await loadAll()
        openApplyModal(userId, 'agent')
      } catch (e) {
        message.error(e instanceof Error ? e.message : '操作失败')
        return false
      }
    },
  })
}

async function onAbandon(userId: number) {
  try {
    await postLarkAbandon(userId)
    message.success('已标记放弃')
    await loadAll()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '操作失败')
  }
}

const columns = computed<DataTableColumns<Row>>(() => [
  {
    title: tableColTitle('右豹编码', 'lark.col.youbaoCode'),
    key: 'rightLeopardCode',
    width: 120,
    resizable: true,
    minWidth: 100,
    ellipsis: { tooltip: true },
  },
  {
    title: tableColTitle('飞书昵称', 'lark.col.larkNickname'),
    key: 'larkNickname',
    width: 120,
    resizable: true,
    minWidth: 100,
    ellipsis: { tooltip: true },
  },
  { title: tableColTitle('入群状态', 'lark.col.groupAudit'), key: 'groupAuditLabel', width: 96, resizable: true, minWidth: 80 },
  {
    title: tableColTitle('近10天动作', 'lark.col.actionStats'),
    key: 'keywordCount',
    width: 100,
    resizable: true,
    minWidth: 88,
    render: (r) => String(r.keywordCount),
  },
  {
    title: tableColTitle('好友申请', 'lark.col.friendRequest'),
    key: 'friendRequestStatus',
    width: 108,
    resizable: true,
    minWidth: 96,
    render: (r) => renderBadge(r),
  },
  {
    title: tableColTitle('申请时间', 'lark.col.applyTime'),
    key: 'applyTime',
    width: 148,
    resizable: true,
    minWidth: 130,
    render: (r) => (r.applyTime ? formatDate(r.applyTime) : '—'),
  },
  {
    title: tableColTitle('操作', 'lark.col.actions'),
    key: 'actions',
    width: 280,
    resizable: true,
    minWidth: 220,
    render: (r) => {
      const kids: ReturnType<typeof h>[] = []
      if (r.friendRequestStatus === 'NONE') {
        kids.push(
          h(
            NButton,
            { size: 'tiny', quaternary: true, type: 'primary', onClick: () => openApplyModal(r.userId, 'agent') },
            { default: () => '以客服身份申请' },
          ),
          h(
            NButton,
            { size: 'tiny', quaternary: true, type: 'primary', onClick: () => openApplyModal(r.userId, 'mentor') },
            { default: () => '以导师身份申请' },
          ),
        )
      }
      if (r.friendRequestStatus === 'PENDING') {
        kids.push(
          h(
            NButton,
            { size: 'tiny', quaternary: true, onClick: () => void onManualConfirm(r.userId) },
            { default: () => '手动标记已添加' },
          ),
          h(
            NDropdown,
            {
              options: simulateOptions,
              onSelect: (key: string) => onSimulateSelect(r.userId, key),
            },
            {
              default: () =>
                h(
                  NButton,
                  { size: 'tiny', quaternary: true },
                  {
                    default: () => [
                      '模拟回调 ',
                      h(NIcon, { component: ChevronDownOutline, size: 14 }),
                    ],
                  },
                ),
            },
          ),
        )
      }
      if (r.friendRequestStatus === 'TIMEOUT' && includeTimeout.value) {
        kids.push(
          h(
            NButton,
            { size: 'tiny', quaternary: true, type: 'primary', onClick: () => openApplyModal(r.userId, 'agent') },
            { default: () => '重新发起' },
          ),
        )
      }
      return h('div', { class: 'action-cell' }, kids)
    },
  },
])

const manualColumns = computed<DataTableColumns<Row>>(() => [
  {
    title: tableColTitle('右豹编码', 'lark.col.youbaoCode'),
    key: 'rightLeopardCode',
    width: 120,
    resizable: true,
    minWidth: 100,
    ellipsis: { tooltip: true },
  },
  {
    title: tableColTitle('飞书昵称', 'lark.col.larkNickname'),
    key: 'larkNickname',
    width: 120,
    resizable: true,
    minWidth: 100,
    ellipsis: { tooltip: true },
  },
  { title: tableColTitle('入群状态', 'lark.col.groupAudit'), key: 'groupAuditLabel', width: 96, resizable: true, minWidth: 80 },
  {
    title: tableColTitle('好友申请', 'lark.col.friendRequest'),
    key: 'friendRequestStatus',
    width: 108,
    resizable: true,
    minWidth: 96,
    render: (r) => renderBadge(r),
  },
  {
    title: tableColTitle('原申请时间', 'lark.col.originalApplyTime'),
    key: 'applyTime',
    width: 148,
    resizable: true,
    minWidth: 130,
    render: (r) => (r.applyTime ? formatDate(r.applyTime) : '—'),
  },
  {
    title: tableColTitle('被拒绝时间', 'lark.col.rejectedAt'),
    key: 'rejectedAt',
    width: 148,
    resizable: true,
    minWidth: 130,
    render: (r) => (r.rejectedAt ? formatDate(r.rejectedAt) : '—'),
  },
  {
    title: tableColTitle('次数', 'lark.col.rejectCount'),
    key: 'rejectedCount',
    width: 64,
    resizable: true,
    minWidth: 56,
    render: (r) => String(r.rejectedCount ?? 0),
  },
  {
    title: tableColTitle('操作', 'lark.col.actions'),
    key: 'mactions',
    width: 200,
    resizable: true,
    minWidth: 160,
    render: (r) =>
      h('div', { class: 'action-cell' }, [
        h(
          NButton,
          { size: 'tiny', type: 'primary', quaternary: true, onClick: () => promptReapply(r.userId) },
          { default: () => '重新申请' },
        ),
        h(
          NButton,
          { size: 'tiny', quaternary: true, onClick: () => void onAbandon(r.userId) },
          { default: () => '标记放弃' },
        ),
      ]),
  },
])

async function loadAll() {
  loading.value = true
  try {
    const [prio, oauth, ops, dec] = await Promise.all([
      fetchLarkFriendPriorityList(includeTimeout.value),
      fetchLarkOauthSummary(),
      fetchLarkAuthorizedOperators(),
      fetchLarkDecisionRequired(),
    ])
    pendingJoin.value = prio.pendingJoin
    auditing.value = prio.auditing
    manualDecision.value = dec
    timeoutCount.value = prio.timeoutCount
    operators.value = ops
    if (!oauth.hasAnyAuthorized) {
      oauthBanner.value = oauth.operatorHint === 'expired' ? 'expired' : 'none'
    } else {
      oauthBanner.value = 'ok'
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function setIncludeTimeout(v: boolean) {
  includeTimeout.value = v
}

watch(includeTimeout, () => {
  void loadAll()
})

watch(openOAuthPicker, (show) => {
  if (show && allOperatorsForOAuth.value.length && !oauthPickKey.value) {
    oauthPickKey.value = allOperatorsForOAuth.value[0]!.key
  }
})

function confirmOpenOAuth() {
  if (!oauthPickKey.value) {
    message.warning('请选择账号')
    return
  }
  const m = oauthPickKey.value.match(/^(agent|mentor)-(\d+)$/)
  if (!m) return
  const type = m[1] as 'agent' | 'mentor'
  const id = m[2]
  const url = `${window.location.origin}/oauth/lark-mock?type=${type}&id=${id}`
  window.open(url, '_blank', 'noopener,noreferrer')
  openOAuthPicker.value = false
  message.info('完成授权后，本页将自动刷新状态')
}

onMounted(() => {
  void loadAll()
  bc = new BroadcastChannel('lark-oauth')
  bc.onmessage = () => {
    void loadAll()
  }
})

onUnmounted(() => {
  bc?.close()
  bc = null
})
</script>

<style scoped>
.lark-friends-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

.oauth-banner {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
}

.oauth-banner--expired {
  border-color: rgba(251, 146, 60, 0.35);
}

.oauth-banner__text {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.oauth-banner__btn {
  margin-top: 4px;
}

.timeout-hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.link-like {
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  cursor: pointer;
  font-size: inherit;
  text-decoration: underline;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section,
.manual-collapse,
.empty-hint {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  padding: 16px 20px;
  background: var(--glass-card-bg);
  backdrop-filter: blur(20px);
}

.group-divider {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.manual-header {
  font-weight: 600;
  color: var(--text-primary);
}

.manual-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0 0 12px;
}

.action-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.operator-row {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.operator-row:last-child {
  border-bottom: none;
}

.operator-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-right: 8px;
}

.operator-meta {
  font-size: 12px;
  color: var(--text-muted);
}

.operator-meta--bad {
  color: var(--badge-orange);
}

.operator-empty {
  font-size: 13px;
  color: var(--text-muted);
}

.friend-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
}

.friend-badge.badge-green {
  color: var(--badge-green);
  background: color-mix(in srgb, var(--badge-green) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--badge-green) 28%, transparent);
}

.friend-badge.badge-orange {
  color: var(--badge-orange);
  background: color-mix(in srgb, var(--badge-orange) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--badge-orange) 28%, transparent);
}

.friend-badge.badge-red {
  color: var(--badge-red);
  background: color-mix(in srgb, var(--badge-red) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--badge-red) 28%, transparent);
}

.friend-badge.badge-gray {
  color: var(--badge-gray);
  background: color-mix(in srgb, var(--badge-gray) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--badge-gray) 22%, transparent);
}

:deep(.n-data-table-th) {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-muted) !important;
}
</style>
