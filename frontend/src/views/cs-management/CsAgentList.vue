<template>
  <div class="cs-agent-page">
    <CsAgentFormDrawer v-model:show="drawerOpen" :agent-id="editingId" @saved="onSaved" />

    <!-- 删除拦截：关联用户 > 0（原型 §2.6：仅关闭，无删除按钮） -->
    <n-modal
      v-model:show="showBlockedModal"
      preset="dialog"
      type="warning"
      title="无法删除客服"
      :closable="true"
      positive-text="关闭"
      @positive-click="showBlockedModal = false"
    >
      <p class="modal-text">
        该客服名下有 <strong>{{ blockedCount }}</strong> 位用户，删除前请先将用户转移至其他客服
      </p>
    </n-modal>

    <n-modal
      v-model:show="showConfirmModal"
      preset="dialog"
      type="error"
      title="确认删除客服"
      :positive-text="deleting ? '删除中…' : '确认删除'"
      negative-text="取消"
      :positive-button-props="{ type: 'error', loading: deleting, disabled: deleting }"
      :closable="!deleting"
      :mask-closable="!deleting"
      @positive-click="confirmDelete"
      @negative-click="showConfirmModal = false"
    >
      <p class="modal-text">删除后不可恢复，确定删除「{{ deleteTarget?.name }}」？</p>
    </n-modal>

    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">客服管理</h2>
        <span class="page-desc">维护客服档案与企微二维码，供用户主档归属选择</span>
      </div>
      <n-button type="primary" @click="openCreate">
        <template #icon>
          <n-icon :component="AddOutline" />
        </template>
        新增客服
      </n-button>
    </div>

    <div class="filter-bar glass">
      <div class="filter-row filter-row--labeled">
        <div class="filter-cell">
          <FilterFieldLabel label="关键词" catalog-key="cs.filter.keyword" />
          <n-input
            v-model:value="query.keyword"
            placeholder="搜索客服名称"
            clearable
            style="width: 220px"
            @keyup.enter="search"
            @clear="search"
          >
            <template #prefix>
              <n-icon :component="SearchOutline" />
            </template>
          </n-input>
        </div>
        <div class="filter-cell">
          <FilterFieldLabel label="状态" catalog-key="cs.filter.status" />
          <n-select
            v-model:value="query.status"
            :options="statusOptions"
            placeholder="全部"
            clearable
            style="width: 140px"
            @update:value="search"
          />
        </div>
        <div class="filter-cell">
          <FilterFieldLabel label="客服类型" catalog-key="cs.filter.agentType" />
          <n-select
            v-model:value="query.agentType"
            :options="agentTypeFilterOptions"
            placeholder="全部"
            clearable
            style="width: 140px"
            @update:value="search"
          />
        </div>
        <div class="filter-actions">
          <n-button @click="resetFilters">重置</n-button>
          <n-button type="primary" @click="search">查询</n-button>
        </div>
      </div>
    </div>

    <div class="table-card glass">
      <div class="table-summary">
        <span class="summary-text">共 <strong>{{ total }}</strong> 名客服</span>
      </div>

      <n-data-table
        :columns="columns"
        :data="items"
        :loading="loading"
        :bordered="false"
        :single-line="false"
        :row-key="(row: CsAgentListItem) => row.id"
        :row-props="rowProps"
        size="small"
      >
        <template #empty>
          <div class="empty-state">
            <n-empty :description="hasFilters ? '未找到符合条件的记录' : '暂无客服数据'" />
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
import { useRouter } from 'vue-router'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NIcon, NModal, useMessage } from 'naive-ui'
import { AddOutline, CreateOutline, SearchOutline, TrashOutline } from '@vicons/ionicons5'
import type { CsAgentListItem, CsAgentStatus, CsAgentType } from '@/types/csAgent'
import { CS_AGENT_TYPE_LABELS } from '@/types/csAgent'
import { deleteCsAgent, fetchCsAgents, updateCsAgent } from '@/api/csAgents'
import { formatDate } from '@/utils/date'
import CsAgentFormDrawer from './CsAgentFormDrawer.vue'
import EntryFormQrThumb from '@/components/cs-management/EntryFormQrThumb.vue'
import FilterFieldLabel from '@/components/common/FilterFieldLabel.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const router = useRouter()
const message = useMessage()

const loading = ref(false)
const items = ref<CsAgentListItem[]>([])
const total = ref(0)

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: null as CsAgentStatus | null,
  agentType: null as CsAgentType | null,
})

const statusOptions = [
  { label: '启用', value: 'ENABLED' as const },
  { label: '禁用', value: 'DISABLED' as const },
]

const agentTypeFilterOptions = [
  { label: CS_AGENT_TYPE_LABELS.NORMAL, value: 'NORMAL' as const },
  { label: CS_AGENT_TYPE_LABELS.PAID, value: 'PAID' as const },
]

const drawerOpen = ref(false)
const editingId = ref<number | null>(null)

const showBlockedModal = ref(false)
const blockedCount = ref(0)
const showConfirmModal = ref(false)
const deleteTarget = ref<CsAgentListItem | null>(null)
const deleting = ref(false)
const togglingId = ref<number | null>(null)

const hasFilters = computed(() => !!query.keyword || query.status != null || query.agentType != null)

async function load() {
  loading.value = true
  try {
    const res = await fetchCsAgents({ ...query })
    items.value = res.items
    total.value = res.total
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function search() {
  query.page = 1
  load()
}

function resetFilters() {
  query.keyword = ''
  query.status = null
  query.agentType = null
  query.page = 1
  load()
}

function onPageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  load()
}

function openCreate() {
  editingId.value = null
  drawerOpen.value = true
}

function openEdit(row: CsAgentListItem) {
  editingId.value = row.id
  drawerOpen.value = true
}

function onSaved() {
  load()
}

function rowProps(row: CsAgentListItem) {
  return {
    style: 'cursor: pointer',
    onClick: () => router.push({ name: 'CsAgentDetail', params: { id: String(row.id) } }),
  }
}

function statusBadge(row: CsAgentListItem) {
  return row.status === 'ENABLED'
    ? h('span', { class: 'badge-green' }, '启用')
    : h('span', { class: 'badge-gray' }, '禁用')
}

async function toggleStatus(row: CsAgentListItem, e: MouseEvent) {
  e.stopPropagation()
  const next: CsAgentStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
  togglingId.value = row.id
  try {
    await updateCsAgent(row.id, { status: next })
    message.success(next === 'ENABLED' ? '已启用' : '已禁用')
    await load()
  } catch (err) {
    message.error(err instanceof Error ? err.message : '操作失败')
  } finally {
    togglingId.value = null
  }
}

function handleDelete(row: CsAgentListItem, e: MouseEvent) {
  e.stopPropagation()
  if (row.linkedUserCount > 0) {
    blockedCount.value = row.linkedUserCount
    showBlockedModal.value = true
    return
  }
  deleteTarget.value = row
  showConfirmModal.value = true
}

async function copyEntryUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    message.success('已复制录入链接')
  } catch {
    message.error('复制失败，请手动选择链接复制')
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteCsAgent(deleteTarget.value.id)
    showConfirmModal.value = false
    message.success('已删除')
    deleteTarget.value = null
    await load()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('名下有') || msg.includes('关联')) {
      showConfirmModal.value = false
      const m = msg.match(/(\d+)\s*名/)
      blockedCount.value = m ? parseInt(m[1], 10) : deleteTarget.value.linkedUserCount
      showBlockedModal.value = true
    } else {
      message.error(msg || '删除失败')
    }
  } finally {
    deleting.value = false
  }
}

const columns = computed<DataTableColumns<CsAgentListItem>>(() => {
  void togglingId.value
  void deleting.value
  void deleteTarget.value
  return [
  {
    title: tableColTitle('客服名称', 'cs.col.name'),
    key: 'name',
    width: 140,
    resizable: true,
    minWidth: 120,
    ellipsis: { tooltip: true },
    render(row) {
      return h('span', { style: { color: 'var(--text-primary)', fontWeight: '500' } }, row.name)
    },
  },
  {
    title: tableColTitle('客服类型', 'cs.col.agentType'),
    key: 'agentType',
    width: 108,
    resizable: true,
    minWidth: 96,
    render(row) {
      return h(
        'span',
        { style: { color: 'var(--text-secondary)', fontSize: '13px' } },
        CS_AGENT_TYPE_LABELS[row.agentType],
      )
    },
  },
  {
    title: tableColTitle('飞书手机号', 'cs.col.feishuPhone'),
    key: 'feishuPhone',
    width: 128,
    resizable: true,
    minWidth: 110,
    render(row) {
      return h('span', { class: 'mono-cell', style: { fontFamily: '"JetBrains Mono", monospace', fontSize: '13px' } }, row.feishuPhone || '—')
    },
  },
  {
    title: tableColTitle('企微二维码', 'cs.col.wxQrcode'),
    key: 'wxQrcodeUrl',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(row) {
      return h('img', {
        src: row.wxQrcodeUrl,
        alt: '企微二维码',
        class: 'qr-thumb',
      })
    },
  },
  {
    title: tableColTitle('信息录入专属码', 'cs.col.entryFormUrl'),
    key: 'entryFormUrl',
    width: 168,
    resizable: true,
    minWidth: 140,
    render(row) {
      return h(
        'div',
        { class: 'entry-code-cell', onClick: (e: MouseEvent) => e.stopPropagation() },
        [
          h(EntryFormQrThumb, { url: row.entryFormUrl }),
          h(
            NButton,
            {
              size: 'small',
              secondary: true,
              onClick: () => void copyEntryUrl(row.entryFormUrl),
            },
            { default: () => '复制链接' },
          ),
        ],
      )
    },
  },
  {
    title: tableColTitle('关联用户数', 'cs.col.linkedUsers'),
    key: 'linkedUserCount',
    width: 110,
    resizable: true,
    minWidth: 96,
    render(row) {
      return h('span', { style: { color: 'var(--text-secondary)' } }, String(row.linkedUserCount))
    },
  },
  {
    title: tableColTitle('状态', 'common.status'),
    key: 'status',
    width: 88,
    resizable: true,
    minWidth: 72,
    render(row) {
      return statusBadge(row)
    },
  },
  {
    title: tableColTitle('创建时间', 'common.createdAt'),
    key: 'createdAt',
    width: 168,
    resizable: true,
    minWidth: 140,
    render(row) {
      return h(
        'span',
        { style: { color: 'var(--text-secondary)', fontSize: '13px' } },
        formatDate(row.createdAt),
      )
    },
  },
  {
    title: tableColTitle('操作', 'cs.col.actions'),
    key: 'actions',
    width: 220,
    resizable: true,
    minWidth: 180,
    fixed: 'right',
    render(row) {
      const disableLoading = togglingId.value === row.id
      return h('div', { class: 'action-cell', onClick: (e: MouseEvent) => e.stopPropagation() }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'primary',
            onClick: (e: MouseEvent) => {
              e.stopPropagation()
              openEdit(row)
            },
            style: 'padding: 0 6px',
          },
          { default: () => '编辑', icon: () => h(NIcon, { component: CreateOutline }) },
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'default',
            loading: disableLoading,
            disabled: togglingId.value !== null && togglingId.value !== row.id,
            onClick: (e: MouseEvent) => toggleStatus(row, e),
            style: 'padding: 0 6px',
          },
          { default: () => (row.status === 'ENABLED' ? '禁用' : '启用') },
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'error',
            loading: deleting.value && deleteTarget.value?.id === row.id,
            onClick: (e: MouseEvent) => handleDelete(row, e),
            style: 'padding: 0 6px',
          },
          { default: () => '删除', icon: () => h(NIcon, { component: TrashOutline }) },
        ),
      ])
    },
  },
  ]
})

onMounted(() => load())
</script>

<style scoped>
.cs-agent-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
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

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
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

.modal-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.modal-text strong {
  color: var(--text-primary);
}

:deep(.qr-thumb) {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  background: var(--card-inner-bg);
  vertical-align: middle;
}

:deep(.action-cell) {
  display: flex;
  align-items: center;
  gap: 4px;
}

.entry-code-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
