<template>
  <div class="user-list-page">
    <!-- ─── Create Drawer ────────────────────────────────────────── -->
    <UserCreateDrawer
      v-model:show="showCreateDrawer"
      @created="onUserCreated"
    />

    <!-- ─── Edit Drawer ──────────────────────────────────────────── -->
    <UserEditDrawer
      v-model:show="showEditDrawer"
      :user-id="editingUserId"
      @updated="onUserUpdated"
    />

    <UserDeleteModals
      v-model:show-blocked="showBlockedModal"
      v-model:show-confirm="showConfirmModal"
      :deleting="deleting"
      :delete-target-user="deleteTargetUser"
      :delete-target-detail="deleteTargetDetail"
      @confirm-delete="confirmDelete"
    />

    <n-tabs
      v-model:value="userListTab"
      type="line"
      class="user-main-tabs"
      pane-class="user-main-tabs-pane"
    >
      <n-tab-pane name="list" tab="用户列表">
    <!-- ─── Page Header ─────────────────────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <div class="page-title-row">
          <h2 class="page-title">用户主档</h2>
          <PageRuleHelpLink />
        </div>
        <span class="page-desc">管理所有已录入用户的基础信息与归属关系</span>
      </div>
      <div class="header-actions">
        <n-button
          v-if="hasOperationPermission('users:export')"
          secondary
          :loading="exporting"
          @click="handleExport"
        >
          <template #icon>
            <n-icon :component="DownloadOutline" />
          </template>
          导出
        </n-button>
        <n-button
          v-if="hasOperationPermission('users:create')"
          type="primary"
          @click="handleCreate"
        >
          <template #icon>
            <n-icon :component="AddOutline" />
          </template>
          新增用户
        </n-button>
      </div>
    </div>

    <!-- ─── Filter Bar ──────────────────────────────────────────── -->
    <div class="filter-bar glass">
      <div class="filter-row filter-row--labeled">
        <div class="filter-cell">
          <FilterFieldLabel label="关键词" catalog-key="user.filter.keyword" />
          <n-input
            v-model:value="userStore.query.keyword"
            placeholder="飞书昵称 / 手机 / 客服或导师名"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <n-icon :component="SearchOutline" />
            </template>
          </n-input>
        </div>

        <div class="filter-cell">
          <FilterFieldLabel label="右豹编码" catalog-key="user.filter.rightLeopardCode" />
          <n-input
            v-model:value="userStore.query.rightLeopardCode"
            placeholder="精确匹配"
            clearable
            class="mono-filter"
            style="width: 160px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </div>

        <div class="filter-cell">
          <FilterFieldLabel label="付费状态" catalog-key="user.filter.isPaid" />
          <n-select
            v-model:value="isPaidFilter"
            :options="paidOptions"
            placeholder="全部"
            clearable
            style="width: 140px"
            @update:value="handleSearch"
          />
        </div>

        <div class="filter-cell">
          <FilterFieldLabel label="所属客服" catalog-key="user.filter.agent" />
          <n-select
            v-model:value="userStore.query.agentId"
            :options="agentOptions"
            :loading="userStore.optionsLoading"
            placeholder="全部"
            clearable
            filterable
            style="width: 160px"
            @update:value="handleSearch"
          />
        </div>

        <div class="filter-cell">
          <FilterFieldLabel label="所属门派" catalog-key="user.filter.school" />
          <n-select
            v-model:value="userStore.query.schoolId"
            :options="schoolOptions"
            :loading="userStore.optionsLoading"
            placeholder="全部"
            clearable
            filterable
            style="width: 160px"
            @update:value="handleSearch"
          />
        </div>

        <div class="filter-cell">
          <FilterFieldLabel label="编码校验" catalog-key="user.filter.codeVerify" />
          <n-select
            v-model:value="userStore.query.codeVerifyStatus"
            :options="codeVerifyOptions"
            placeholder="全部"
            clearable
            style="width: 160px"
            @update:value="handleSearch"
          />
        </div>

        <div class="filter-actions">
          <n-button @click="handleReset">重置</n-button>
          <n-button type="primary" @click="handleSearch">查询</n-button>
        </div>
      </div>
    </div>

    <!-- ─── Table Card ───────────────────────────────────────────── -->
    <div class="table-card glass">
      <!-- Summary bar -->
      <div class="table-summary">
        <span class="summary-text">共 <strong>{{ userStore.total }}</strong> 条记录</span>
      </div>

      <n-data-table
        :columns="columns"
        :data="userStore.users"
        :loading="userStore.loading"
        :bordered="false"
        :single-line="false"
        :scroll-x="2000"
        :row-key="(row: UserListItem) => row.id"
        :row-props="rowProps"
        :row-class-name="rowClassName"
        size="small"
      >
        <template #empty>
          <div class="empty-state">
            <n-empty
              :description="hasActiveFilters ? '未找到符合条件的记录' : '暂无用户数据'"
            >
              <template v-if="hasActiveFilters" #extra>
                <n-button size="small" @click="handleReset">清除筛选</n-button>
              </template>
            </n-empty>
          </div>
        </template>
      </n-data-table>

      <!-- ─── Pagination ─────────────────────────────────────────── -->
      <div class="pagination-bar">
        <n-pagination
          v-model:page="userStore.query.page"
          v-model:page-size="userStore.query.pageSize"
          :item-count="userStore.total"
          :page-sizes="[20, 50, 100]"
          show-size-picker
          show-quick-jumper
          :page-slot="7"
          @update:page="onPageChange"
          @update:page-size="onPageSizeChange"
        />
      </div>
    </div>
      </n-tab-pane>

      <n-tab-pane
        v-if="hasOperationPermission('users:migration:import')"
        name="migration"
        tab="历史迁移导入"
        display-directive="show:lazy"
      >
        <UserMigrationImportTab />
      </n-tab-pane>
    </n-tabs>

  </div>
</template>

<script setup lang="ts">
import { h, computed, onMounted, ref, watch } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NIcon, NTabs, NTabPane, useMessage } from 'naive-ui'
import {
  AddOutline,
  DownloadOutline,
  SearchOutline,
  CreateOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePermission } from '@/composables/usePermission'
import { useUserDeleteFlow } from '@/composables/useUserDeleteFlow'
import type { UserListItem } from '@/types/user'
import { formatDate } from '@/utils/date'
import UserCreateDrawer from './UserCreateDrawer.vue'
import UserEditDrawer from './UserEditDrawer.vue'
import UserDeleteModals from './UserDeleteModals.vue'
import UserMigrationImportTab from './UserMigrationImportTab.vue'
import FilterFieldLabel from '@/components/common/FilterFieldLabel.vue'
import PageRuleHelpLink from '@/components/common/PageRuleHelpLink.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'
import { startUsersExport } from '@/api/dataExport'
import { runExportWithPolling } from '@/composables/useAsyncDataExport'

const router = useRouter()
const userStore = useUserStore()
const { hasOperationPermission, hasFieldPermission } = usePermission()
const message = useMessage()

const userListTab = ref<'list' | 'migration'>('list')

// ─── Local state ────────────────────────────────────────────────
const exporting = ref(false)
const showCreateDrawer = ref(false)

// Edit drawer state
const showEditDrawer = ref(false)
const editingUserId = ref<number | null>(null)

const {
  deletingUserId,
  deleteTargetUser,
  deleteTargetDetail,
  showBlockedModal,
  showConfirmModal,
  deleting,
  startDeleteFlow,
  confirmDelete,
} = useUserDeleteFlow()

// isPaid is tri-state: null=all, true=paid, false=free
const isPaidFilter = ref<boolean | null>(null)

// ─── Filter options ─────────────────────────────────────────────
const paidOptions = [
  { label: '付费学员', value: true },
  { label: '普通用户', value: false },
]

const codeVerifyOptions = [
  { label: '已验证', value: 'VERIFIED' },
  { label: '待验证', value: 'PENDING_VERIFY' },
  { label: '编码无效', value: 'INVALID' },
  { label: '校验未响应', value: 'FAILED' },
]

const agentOptions = computed(() =>
  userStore.options.agents.map((a) => ({ label: a.name, value: a.id })),
)

const schoolOptions = computed(() =>
  userStore.options.schools.map((s) => ({ label: s.name, value: s.id })),
)

// ─── Active filter detection ─────────────────────────────────────
const hasActiveFilters = computed(
  () =>
    !!userStore.query.keyword ||
    !!String(userStore.query.rightLeopardCode ?? '').trim() ||
    userStore.query.agentId != null ||
    userStore.query.schoolId != null ||
    userStore.query.codeVerifyStatus != null ||
    userStore.query.isPaid != null,
)

// ─── Table columns ───────────────────────────────────────────────
const columns = computed<DataTableColumns<UserListItem>>(() => {
  const cols: DataTableColumns<UserListItem> = [
    {
      title: tableColTitle('右豹编码', 'user.col.rightLeopardCode'),
      key: 'rightLeopardCode',
      width: 150,
      resizable: true,
      minWidth: 120,
      render(row) {
        return h('span', { style: { fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', color: 'var(--text-primary)' } }, row.rightLeopardCode)
      },
    },
    {
      title: tableColTitle('飞书昵称', 'user.col.larkNickname'),
      key: 'larkNickname',
      width: 140,
      resizable: true,
      minWidth: 120,
      ellipsis: { tooltip: true },
      render(row) {
        return h('span', { style: { color: 'var(--text-primary)', fontWeight: '500' } }, row.larkNickname)
      },
    },
    {
      title: tableColTitle('近10天动作数', 'user.col.actionStats10d'),
      key: 'actionStats10d',
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
      title: tableColTitle('所属客服', 'user.col.agent'),
      key: 'agent',
      width: 110,
      resizable: true,
      minWidth: 96,
      render(row) {
        return h('span', { style: { color: 'var(--text-secondary)' } }, row.agent?.name ?? '—')
      },
    },
    {
      title: tableColTitle('所属导师', 'user.col.mentor'),
      key: 'mentor',
      width: 110,
      resizable: true,
      minWidth: 96,
      render(row) {
        return h('span', { style: { color: 'var(--text-secondary)' } }, row.mentor?.name ?? '—')
      },
    },
    {
      title: tableColTitle('所属门派', 'user.col.school'),
      key: 'school',
      width: 110,
      resizable: true,
      minWidth: 96,
      render(row) {
        return h('span', { style: { color: 'var(--text-secondary)' } }, row.school?.name ?? '—')
      },
    },
    {
      title: tableColTitle('付费状态', 'user.col.isPaid'),
      key: 'isPaid',
      width: 110,
      resizable: true,
      minWidth: 96,
      render(row) {
        return row.isPaid
          ? h('span', { class: 'badge-green' }, '付费学员')
          : h('span', { class: 'badge-gray' }, '普通用户')
      },
    },
    {
      title: tableColTitle('编码校验状态', 'user.col.codeVerifyStatus'),
      key: 'codeVerifyStatus',
      width: 130,
      resizable: true,
      minWidth: 110,
      render(row) {
        if (row.codeVerifyStatus === 'VERIFIED') {
          return h('span', { class: 'badge-green' }, '已验证')
        }
        if (row.codeVerifyStatus === 'PENDING_VERIFY') {
          return h('span', { class: 'badge-orange' }, '待验证')
        }
        if (row.codeVerifyStatus === 'INVALID') {
          return h('span', { class: 'badge-red' }, '编码无效')
        }
        if (row.codeVerifyStatus === 'FAILED') {
          return h('span', { class: 'badge-gray' }, '校验未响应')
        }
        return h('span', { class: 'badge-gray' }, '—')
      },
    },
    {
      title: tableColTitle('录入时间', 'user.col.createdAt'),
      key: 'createdAt',
      width: 160,
      resizable: true,
      minWidth: 140,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render(row) {
        return h('span', { style: { color: 'var(--text-secondary)', fontSize: '13px' } }, formatDate(row.createdAt))
      },
    },
  ]

  // ─── Field-permission-gated column: 项目收益（与 paymentAmount 权限同源） ─────────────────
  if (hasFieldPermission('paymentAmount')) {
    cols.splice(6, 0, {
      title: tableColTitle('项目收益', 'user.col.projectRevenue'),
      key: 'projectRevenue',
      width: 110,
      resizable: true,
      minWidth: 96,
      render(row) {
        const v = row.projectRevenue ?? row.paymentAmount
        if (v == null) {
          return h('span', { style: { color: 'var(--text-muted)' } }, '—')
        }
        return h('span', { style: { color: 'var(--badge-green)', fontWeight: '500' } }, `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      },
    })
  }

  // ─── Operations column ───────────────────────────────────────
  const canUpdate = hasOperationPermission('users:update')
  const canDelete = hasOperationPermission('users:delete')

  if (canUpdate || canDelete) {
    cols.push({
      title: tableColTitle('操作', 'user.col.actions'),
      key: 'actions',
      width: canDelete ? 130 : 80,
      resizable: true,
      minWidth: 72,
      fixed: 'right',
      render(row) {
        const buttons = []

        if (canUpdate) {
          buttons.push(
            h(
              NButton,
              {
                size: 'small',
                quaternary: true,
                type: 'primary',
                onClick: (e: MouseEvent) => {
                  e.stopPropagation()
                  handleEdit(row)
                },
                style: 'padding: 0 6px',
              },
              {
                default: () => '编辑',
                icon: () => h(NIcon, { component: CreateOutline }),
              },
            ),
          )
        }

        if (canDelete) {
          buttons.push(
            h(
              NButton,
              {
                size: 'small',
                quaternary: true,
                type: 'error',
                loading: deletingUserId.value === row.id,
                disabled: deletingUserId.value !== null && deletingUserId.value !== row.id,
                onClick: (e: MouseEvent) => {
                  e.stopPropagation()
                  handleDelete(row)
                },
                style: 'padding: 0 6px',
              },
              {
                default: () => '删除',
                icon: () => h(NIcon, { component: TrashOutline }),
              },
            ),
          )
        }

        return h('div', { style: 'display: flex; align-items: center; gap: 4px;' }, buttons)
      },
    })
  }

  return cols
})

// ─── Row click & class ──────────────────────────────────────────
function rowProps(row: UserListItem) {
  return {
    style: 'cursor: pointer',
    onClick: () => handleRowClick(row),
  }
}

function rowClassName(row: UserListItem): string {
  return userStore.newlyCreatedId === row.id ? 'row-newly-created' : ''
}

function handleRowClick(row: UserListItem) {
  router.push({ name: 'UserDetail', params: { id: String(row.id) } })
}

function handleEdit(row: UserListItem) {
  editingUserId.value = row.id
  showEditDrawer.value = true
}

function onUserUpdated() {
  // List already refreshed by store
}

function handleDelete(row: UserListItem) {
  void startDeleteFlow(row)
}

function handleCreate() {
  showCreateDrawer.value = true
}

function onUserCreated() {
  // List has already been refreshed by the store; table will re-render with highlight
}

// ─── Filter / search ────────────────────────────────────────────
watch(isPaidFilter, (val) => {
  userStore.query.isPaid = val
})

function handleSearch() {
  userStore.query.page = 1
  userStore.loadUsers()
}

function handleReset() {
  isPaidFilter.value = null
  userStore.resetQuery()
  userStore.loadUsers()
}

// ─── Pagination ──────────────────────────────────────────────────
function onPageChange(page: number) {
  userStore.query.page = page
  userStore.loadUsers()
}

function onPageSizeChange(size: number) {
  userStore.query.pageSize = size
  userStore.query.page = 1
  userStore.loadUsers()
}

// ─── Export（Story 4-7 / §1.9，不含 wxOpenId）────────────────────
async function handleExport() {
  exporting.value = true
  try {
    await runExportWithPolling({
      start: () =>
        startUsersExport({
          keyword: userStore.query.keyword || undefined,
          rightLeopardCode: userStore.query.rightLeopardCode?.trim() || undefined,
          agentId: userStore.query.agentId,
          mentorId: userStore.query.mentorId,
          schoolId: userStore.query.schoolId,
          codeVerifyStatus: userStore.query.codeVerifyStatus,
          isPaid: userStore.query.isPaid,
        }),
      message,
      rowEstimate: userStore.total,
    })
  } catch (e) {
    message.error(e instanceof Error ? e.message : '导出失败')
  } finally {
    exporting.value = false
  }
}

// ─── Init ────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([userStore.loadUsers(), userStore.loadOptions()])
})
</script>

<style scoped>
/* ─── Layout ──────────────────────────────────────────────────── */
.user-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
  min-height: 100%;
}

/* ─── Header ──────────────────────────────────────────────────── */
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

/* ─── Filter bar ──────────────────────────────────────────────── */
.filter-bar {
  border-radius: var(--radius-lg);
  padding: 16px 20px;
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* ─── Table card ──────────────────────────────────────────────── */
.table-card {
  border-radius: var(--radius-lg);
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.table-summary {
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

/* ─── Pagination ──────────────────────────────────────────────── */
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
}

.user-main-tabs :deep(.n-tabs-nav) {
  margin-bottom: 4px;
}

/* ─── Empty state ─────────────────────────────────────────────── */
.empty-state {
  padding: 48px 0;
}

/* ─── Badge overrides (matching global badge system) ──────────── */
:deep(.badge-green) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  color: var(--badge-green);
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.25);
}

:deep(.badge-orange) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  color: var(--badge-orange);
  background: rgba(251, 146, 60, 0.1);
  border: 1px solid rgba(251, 146, 60, 0.25);
}

:deep(.badge-gray) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  color: var(--badge-gray);
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

/* ─── Table row hover effect ──────────────────────────────────── */
:deep(.n-data-table-tr:hover .n-data-table-td) {
  background: rgba(99, 102, 241, 0.06) !important;
}

:deep(.n-data-table-th) {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted) !important;
}

/* ─── Newly created row highlight (AC#7 — 高亮闪烁) ──────────── */
:deep(.row-newly-created .n-data-table-td) {
  background: rgba(99, 102, 241, 0.14) !important;
  animation: row-flash 0.6s ease-in-out 3;
}

@keyframes row-flash {
  0%   { background: rgba(99, 102, 241, 0.28) !important; }
  50%  { background: rgba(99, 102, 241, 0.06) !important; }
  100% { background: rgba(99, 102, 241, 0.14) !important; }
}

/* 与入群审核列表「近10天动作数」单元格样式一致 */
:deep(.action-stats-cell) {
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-secondary);
}
</style>
