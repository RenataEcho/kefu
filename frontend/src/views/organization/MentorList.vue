<template>
  <div class="mentor-page">
    <MentorFormDrawer v-model:show="drawerOpen" :mentor="editing" @saved="onSaved" />

    <n-drawer v-model:show="projectDrawerOpen" :width="760" placement="right">
      <n-drawer-content :title="`负责项目 — ${projectMentorName}`" closable>
        <n-spin :show="projectLoading">
          <n-data-table
            :columns="projectColumns"
            :data="projectRows"
            :bordered="false"
            size="small"
            :scroll-x="1180"
          />
        </n-spin>
      </n-drawer-content>
    </n-drawer>

    <n-modal
      v-model:show="showBlockedModal"
      preset="dialog"
      type="warning"
      title="无法删除导师"
      :closable="true"
      positive-text="关闭"
      @positive-click="showBlockedModal = false"
    >
      <p class="modal-text">
        该导师名下有 <strong>{{ blockedStudentCount }}</strong> 名学员，请先解除关联后再删除
      </p>
    </n-modal>

    <n-modal
      v-model:show="showConfirmModal"
      preset="dialog"
      type="error"
      title="确认删除导师"
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
        <div class="page-title-row">
          <h2 class="page-title">导师管理</h2>
          <PageRuleHelpLink />
        </div>
        <span class="page-desc">维护导师与门派归属；第三方同步字段只读展示</span>
      </div>
      <n-button v-if="canManage" type="primary" @click="openCreate">
        <template #icon>
          <n-icon :component="AddOutline" />
        </template>
        新增导师
      </n-button>
    </div>

    <div class="filter-bar glass">
      <div class="filter-row filter-row--labeled">
        <div class="filter-cell">
          <FilterFieldLabel label="关键词" catalog-key="mentor.filter.keyword" />
          <n-input
            v-model:value="query.keyword"
            placeholder="搜索导师名称"
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
          <FilterFieldLabel label="所属门派" catalog-key="mentor.filter.schoolId" />
          <n-select
            v-model:value="query.schoolId"
            :options="schoolFilterOptions"
            placeholder="所属门派"
            clearable
            filterable
            style="width: 200px"
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
        <span class="summary-text">共 <strong>{{ total }}</strong> 名导师</span>
      </div>

      <n-data-table
        v-model:expanded-row-keys="expandedRowKeys"
        :columns="columns"
        :data="items"
        :loading="loading"
        :bordered="false"
        :single-line="false"
        :row-key="(row: MentorListItem) => String(row.id)"
        :row-props="rowProps"
        size="small"
      >
        <template #empty>
          <div class="empty-state">
            <n-empty :description="hasFilters ? '未找到符合条件的记录' : '暂无导师数据'" />
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
import { NButton, NDrawer, NDrawerContent, NIcon, NModal, NSpin, useMessage } from 'naive-ui'
import { AddOutline, CreateOutline, SearchOutline, TrashOutline } from '@vicons/ionicons5'
import type { MentorListItem, MentorProjectRow, MentorStatus } from '@/types/mentor'
import { deleteMentor, fetchMentorProjects, fetchMentors, updateMentor } from '@/api/mentors'
import { fetchSchools } from '@/api/schools'
import { formatDate, formatPeriodRangeDot } from '@/utils/date'
import { usePermission } from '@/composables/usePermission'
import { OPERATION_PERMS } from '@/utils/permission'
import MentorFormDrawer from './MentorFormDrawer.vue'
import FilterFieldLabel from '@/components/common/FilterFieldLabel.vue'
import PageRuleHelpLink from '@/components/common/PageRuleHelpLink.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const message = useMessage()
const router = useRouter()
const { hasOperationPermission } = usePermission()
const canManage = computed(() => hasOperationPermission(OPERATION_PERMS.ORG_MANAGE))

const loading = ref(false)
const items = ref<MentorListItem[]>([])
const total = ref(0)
const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  schoolId: null as number | null,
})

const schoolFilterOptions = ref<{ label: string; value: number }[]>([])
const expandedRowKeys = ref<string[]>([])

const drawerOpen = ref(false)
const editing = ref<MentorListItem | null>(null)
const showBlockedModal = ref(false)
const blockedStudentCount = ref(0)
const showConfirmModal = ref(false)
const deleteTarget = ref<MentorListItem | null>(null)
const deleting = ref(false)
const togglingId = ref<number | null>(null)

const projectDrawerOpen = ref(false)
const projectLoading = ref(false)
const projectRows = ref<MentorProjectRow[]>([])
const projectMentorName = ref('')

const hasFilters = computed(() => !!query.keyword.trim() || query.schoolId != null)

function formatYuanCell(n: number) {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

const projectColumns = computed<DataTableColumns<MentorProjectRow>>(() => [
  {
    title: tableColTitle('项目名称', 'stats.col.projectName'),
    key: 'projectName',
    width: 160,
    resizable: true,
    minWidth: 140,
    ellipsis: { tooltip: true },
  },
  { title: tableColTitle('业务大类', 'stats.col.businessCategory'), key: 'businessCategory', width: 100, resizable: true, minWidth: 88 },
  {
    title: tableColTitle('分配周期', 'stats.col.allocationPeriod'),
    key: 'allocationPeriod',
    width: 200,
    resizable: true,
    minWidth: 168,
    render(row) {
      return h(
        'span',
        { style: { color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap' } },
        formatPeriodRangeDot(row.allocationPeriodStart, row.allocationPeriodEnd),
      )
    },
  },
  { title: tableColTitle('题词数量', 'stats.col.inscriptionCount'), key: 'keywordCount', width: 88, resizable: true, minWidth: 72 },
  { title: tableColTitle('回填数量', 'stats.col.backfillCount'), key: 'backfillCount', width: 88, resizable: true, minWidth: 72 },
  { title: tableColTitle('订单数量', 'stats.col.orderCount'), key: 'orderCount', width: 88, resizable: true, minWidth: 72 },
  {
    title: tableColTitle('已结算收益', 'stats.col.settledRevenue'),
    key: 'settledRevenueYuan',
    width: 112,
    resizable: true,
    minWidth: 96,
    render(row) {
      return h('span', { style: { color: 'var(--text-primary)' } }, formatYuanCell(row.settledRevenueYuan))
    },
  },
  {
    title: tableColTitle('待结算收益', 'stats.col.pendingRevenue'),
    key: 'pendingRevenueYuan',
    width: 112,
    resizable: true,
    minWidth: 96,
    render(row) {
      return h('span', { style: { color: 'var(--text-secondary)' } }, formatYuanCell(row.pendingRevenueYuan))
    },
  },
])

async function openProjectDrawer(row: MentorListItem, e: MouseEvent) {
  e.stopPropagation()
  projectMentorName.value = row.name
  projectDrawerOpen.value = true
  projectLoading.value = true
  projectRows.value = []
  try {
    const res = await fetchMentorProjects(row.id)
    projectRows.value = res.items
  } catch (err) {
    message.error(err instanceof Error ? err.message : '加载项目失败')
  } finally {
    projectLoading.value = false
  }
}

function rowProps(row: MentorListItem) {
  return {
    style: 'cursor: pointer',
    onClick: (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('.action-cell')) return
      if (el.closest('.n-data-table-expand-trigger')) return
      router.push({ name: 'MentorDetail', params: { id: String(row.id) } })
    },
  }
}

function formatYuan(n: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(n)
}

async function loadSchoolFilters() {
  try {
    const sc = await fetchSchools({ page: 1, pageSize: 100 })
    schoolFilterOptions.value = sc.items.map((s) => ({ label: s.name, value: s.id }))
  } catch {
    /* 筛选器失败时仍可加载列表 */
  }
}

async function load() {
  loading.value = true
  try {
    const res = await fetchMentors({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword,
      schoolId: query.schoolId,
    })
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
  query.schoolId = null
  query.page = 1
  load()
}

function onPageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  load()
}

function openCreate() {
  editing.value = null
  drawerOpen.value = true
}

function openEdit(row: MentorListItem) {
  editing.value = row
  drawerOpen.value = true
}

function onSaved() {
  load()
}

function statusBadge(status: MentorStatus) {
  return status === 'ENABLED'
    ? h('span', { class: 'badge-green' }, '启用')
    : h('span', { class: 'badge-gray' }, '禁用')
}

async function toggleStatus(row: MentorListItem, e: MouseEvent) {
  e.stopPropagation()
  const next: MentorStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
  togglingId.value = row.id
  try {
    await updateMentor(row.id, { status: next })
    message.success(next === 'ENABLED' ? '已启用' : '已禁用')
    await load()
  } catch (err) {
    message.error(err instanceof Error ? err.message : '操作失败')
  } finally {
    togglingId.value = null
  }
}

function handleDelete(row: MentorListItem, e: MouseEvent) {
  e.stopPropagation()
  if (row.studentCount > 0) {
    blockedStudentCount.value = row.studentCount
    showBlockedModal.value = true
    return
  }
  deleteTarget.value = row
  showConfirmModal.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteMentor(deleteTarget.value.id)
    showConfirmModal.value = false
    message.success('删除成功')
    deleteTarget.value = null
    await load()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('学员')) {
      showConfirmModal.value = false
      const m = msg.match(/(\d+)\s*名/)
      blockedStudentCount.value = m ? parseInt(m[1], 10) : deleteTarget.value.studentCount
      showBlockedModal.value = true
    } else {
      message.error(msg || '删除失败')
    }
  } finally {
    deleting.value = false
  }
}

const columns = computed<DataTableColumns<MentorListItem>>(() => {
  void togglingId.value
  void deleting.value
  const expandCol = {
    type: 'expand' as const,
    expandable: (row: MentorListItem) => (row.revenueDetail?.length ?? 0) > 0,
    renderExpand: (row: MentorListItem) => {
      const lines = row.revenueDetail ?? []
      return h('div', { class: 'expand-inner' }, [
        h('div', { class: 'expand-title' }, '收益明细（按周期）'),
        ...lines.map((line) =>
          h(
            'div',
            { class: 'expand-line' },
            `${line.period}：${formatYuan(line.amountYuan)}`,
          ),
        ),
      ])
    },
  }

  const base: DataTableColumns<MentorListItem> = [
    expandCol,
    {
      title: tableColTitle('导师名称', 'mentor.col.name'),
      key: 'name',
      width: 120,
      resizable: true,
      minWidth: 100,
      ellipsis: { tooltip: true },
      render(row) {
        return h('span', { style: { color: 'var(--text-primary)', fontWeight: '500' } }, row.name)
      },
    },
    {
      title: tableColTitle('所属门派', 'mentor.col.schoolName'),
      key: 'schoolName',
      width: 120,
      resizable: true,
      minWidth: 100,
      ellipsis: { tooltip: true },
      render(row) {
        return h('span', { style: { color: 'var(--text-secondary)' } }, row.schoolName)
      },
    },
    {
      title: tableColTitle('导师类型', 'mentor.col.mentorTypeName'),
      key: 'mentorTypeName',
      width: 100,
      resizable: true,
      minWidth: 88,
      render(row) {
        return h('span', { style: { color: 'var(--text-secondary)' } }, row.mentorTypeName)
      },
    },
    {
      title: tableColTitle('飞书手机号', 'mentor.col.feishuPhone'),
      key: 'feishuPhone',
      width: 120,
      resizable: true,
      minWidth: 100,
      render(row) {
        const p = row.feishuPhone?.trim()
        return h('span', { class: 'mono', style: { fontSize: '13px', color: 'var(--text-secondary)' } }, p || '—')
      },
    },
    {
      title: tableColTitle('学员数', 'mentor.col.studentCount'),
      key: 'studentCount',
      width: 80,
      resizable: true,
      minWidth: 72,
      render(row) {
        return h('span', { style: { color: 'var(--text-secondary)' } }, String(row.studentCount))
      },
    },
    {
      title: tableColTitle('负责项目数', 'mentor.col.projectCount'),
      key: 'projectCount',
      width: 108,
      resizable: true,
      minWidth: 96,
      render(row) {
        return h(
          NButton,
          {
            text: true,
            type: 'primary',
            tag: 'span',
            onClick: (e: MouseEvent) => openProjectDrawer(row, e),
          },
          { default: () => String(row.projectCount) },
        )
      },
    },
    {
      title: tableColTitle('总收益', 'mentor.col.totalRevenue'),
      key: 'totalRevenue',
      width: 120,
      resizable: true,
      minWidth: 100,
      render(row) {
        return h(
          'span',
          { style: { color: 'var(--text-primary)', fontWeight: '500' } },
          formatYuan(row.totalRevenue),
        )
      },
    },
    {
      title: tableColTitle('最后同步', 'mentor.col.lastSyncedAt'),
      key: 'lastSyncedAt',
      width: 168,
      resizable: true,
      minWidth: 140,
      render(row) {
        const t = row.lastSyncedAt ? formatDate(row.lastSyncedAt) : '—'
        return h('span', { style: { color: 'var(--text-muted)', fontSize: '13px' } }, t)
      },
    },
    {
      title: tableColTitle('状态', 'common.status'),
      key: 'status',
      width: 88,
      resizable: true,
      minWidth: 72,
      render(row) {
        return statusBadge(row.status)
      },
    },
  ]

  if (!canManage.value) return base

  return [
    ...base,
    {
      title: tableColTitle('操作', 'mentor.col.actions'),
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
              style: 'padding: 0 6px',
              onClick: () => openEdit(row),
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

onMounted(() => {
  void loadSchoolFilters()
  load()
})
</script>

<style scoped>
.mentor-page {
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

:deep(.action-cell) {
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.expand-inner) {
  padding: 12px 16px 16px 48px;
  font-size: 13px;
  color: var(--text-secondary);
}

:deep(.expand-title) {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

:deep(.expand-line) {
  padding: 4px 0;
  border-bottom: 1px solid var(--border-subtle);
}

:deep(.expand-line:last-child) {
  border-bottom: none;
}
</style>
