<template>
  <div class="school-page">
    <SchoolFormDrawer v-model:show="drawerOpen" :school="editing" @saved="onSaved" />

    <n-modal
      v-model:show="showBlockedModal"
      preset="dialog"
      type="warning"
      title="无法删除门派"
      :closable="true"
      positive-text="关闭"
      @positive-click="showBlockedModal = false"
    >
      <p class="modal-text">
        该门派下有 <strong>{{ blockedMentorCount }}</strong> 名导师，请先解除关联后再删除
      </p>
    </n-modal>

    <n-modal
      v-model:show="showConfirmModal"
      preset="dialog"
      type="error"
      title="确认删除门派"
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
          <h2 class="page-title">门派管理</h2>
          <PageRuleHelpLink />
        </div>
        <span class="page-desc">维护组织顶层门派；门派侧不提供导师归属操作（需在导师管理中维护）</span>
      </div>
      <n-button v-if="canManage" type="primary" @click="openCreate">
        <template #icon>
          <n-icon :component="AddOutline" />
        </template>
        新增门派
      </n-button>
    </div>

    <div class="filter-bar glass">
      <div class="filter-row filter-row--labeled">
        <div class="filter-cell">
          <FilterFieldLabel label="关键词" catalog-key="school.filter.keyword" />
          <n-input
            v-model:value="query.keyword"
            placeholder="搜索门派名称"
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
        <div class="filter-actions">
          <n-button @click="resetFilters">重置</n-button>
          <n-button type="primary" @click="search">查询</n-button>
        </div>
      </div>
    </div>

    <div class="table-card glass">
      <div class="table-summary">
        <span class="summary-text">共 <strong>{{ total }}</strong> 个门派</span>
      </div>

      <n-data-table
        :columns="columns"
        :data="items"
        :loading="loading"
        :bordered="false"
        :single-line="false"
        :row-key="(row: SchoolListItem) => row.id"
        :row-props="rowProps"
        size="small"
      >
        <template #empty>
          <div class="empty-state">
            <n-empty :description="hasFilters ? '未找到符合条件的记录' : '暂无门派数据'" />
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
import type { SchoolListItem, SchoolStatus } from '@/types/school'
import { deleteSchool, fetchSchools, updateSchool } from '@/api/schools'
import { formatDate } from '@/utils/date'
import { usePermission } from '@/composables/usePermission'
import { OPERATION_PERMS } from '@/utils/permission'
import SchoolFormDrawer from './SchoolFormDrawer.vue'
import FilterFieldLabel from '@/components/common/FilterFieldLabel.vue'
import PageRuleHelpLink from '@/components/common/PageRuleHelpLink.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const message = useMessage()
const router = useRouter()
const { hasOperationPermission } = usePermission()
const canManage = computed(() => hasOperationPermission(OPERATION_PERMS.ORG_MANAGE))

const loading = ref(false)
const items = ref<SchoolListItem[]>([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 20, keyword: '' })

const drawerOpen = ref(false)
const editing = ref<SchoolListItem | null>(null)
const showBlockedModal = ref(false)
const blockedMentorCount = ref(0)
const showConfirmModal = ref(false)
const deleteTarget = ref<SchoolListItem | null>(null)
const deleting = ref(false)
const togglingId = ref<number | null>(null)

const hasFilters = computed(() => !!query.keyword.trim())

function formatYuan(n: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(n)
}

function rowProps(row: SchoolListItem) {
  return {
    style: 'cursor: pointer',
    onClick: (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.action-cell')) return
      router.push({ name: 'SchoolDetail', params: { id: String(row.id) } })
    },
  }
}

async function load() {
  loading.value = true
  try {
    const res = await fetchSchools({ ...query })
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

function openEdit(row: SchoolListItem) {
  editing.value = row
  drawerOpen.value = true
}

function onSaved() {
  load()
}

function statusBadge(status: SchoolStatus) {
  return status === 'ENABLED'
    ? h('span', { class: 'badge-green' }, '启用')
    : h('span', { class: 'badge-gray' }, '禁用')
}

async function toggleStatus(row: SchoolListItem, e: MouseEvent) {
  e.stopPropagation()
  const next: SchoolStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
  togglingId.value = row.id
  try {
    await updateSchool(row.id, { status: next })
    message.success(next === 'ENABLED' ? '已启用' : '已禁用')
    await load()
  } catch (err) {
    message.error(err instanceof Error ? err.message : '操作失败')
  } finally {
    togglingId.value = null
  }
}

function handleDelete(row: SchoolListItem, e: MouseEvent) {
  e.stopPropagation()
  if (row.mentorCount > 0) {
    blockedMentorCount.value = row.mentorCount
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
    await deleteSchool(deleteTarget.value.id)
    showConfirmModal.value = false
    message.success('删除成功')
    deleteTarget.value = null
    await load()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('导师')) {
      showConfirmModal.value = false
      const m = msg.match(/(\d+)\s*名/)
      blockedMentorCount.value = m ? parseInt(m[1], 10) : deleteTarget.value.mentorCount
      showBlockedModal.value = true
    } else {
      message.error(msg || '删除失败')
    }
  } finally {
    deleting.value = false
  }
}

const columns = computed<DataTableColumns<SchoolListItem>>(() => {
  void togglingId.value
  void deleting.value
  const base: DataTableColumns<SchoolListItem> = [
    {
      title: tableColTitle('门派名称', 'school.col.name'),
      key: 'name',
      width: 160,
      resizable: true,
      minWidth: 140,
      ellipsis: { tooltip: true },
      render(row) {
        return h('span', { style: { color: 'var(--text-primary)', fontWeight: '500' } }, row.name)
      },
    },
    {
      title: tableColTitle('门派负责人', 'school.col.principalName'),
      key: 'principalName',
      width: 108,
      resizable: true,
      minWidth: 96,
      render(row) {
        return h('span', { style: { color: 'var(--text-secondary)' } }, row.principalName)
      },
    },
    {
      title: tableColTitle('门派项目数', 'school.col.schoolProjectCount'),
      key: 'schoolProjectCount',
      width: 104,
      resizable: true,
      minWidth: 88,
      render(row) {
        return h('span', { style: { color: 'var(--text-secondary)' } }, String(row.schoolProjectCount))
      },
    },
    {
      title: tableColTitle('导师数量', 'school.col.mentorCount'),
      key: 'mentorCount',
      width: 100,
      resizable: true,
      minWidth: 88,
      render(row) {
        return h('span', { style: { color: 'var(--text-secondary)' } }, String(row.mentorCount))
      },
    },
    {
      title: tableColTitle('学员总数', 'school.col.studentTotalCount'),
      key: 'totalStudents',
      width: 100,
      resizable: true,
      minWidth: 88,
      render(row) {
        return h('span', { style: { color: 'var(--text-secondary)' } }, String(row.totalStudents))
      },
    },
    {
      title: tableColTitle('学员总收益', 'school.col.studentTotalRevenue'),
      key: 'totalRevenue',
      width: 128,
      resizable: true,
      minWidth: 110,
      render(row) {
        return h(
          'span',
          { style: { color: 'var(--text-primary)', fontWeight: '500' } },
          formatYuan(row.totalRevenue),
        )
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
  ]

  if (!canManage.value) return base

  return [
    ...base,
    {
      title: tableColTitle('操作', 'school.col.actions'),
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

onMounted(() => load())
</script>

<style scoped>
.school-page {
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
</style>
