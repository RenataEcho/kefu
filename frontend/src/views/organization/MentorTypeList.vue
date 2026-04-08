<template>
  <div class="mentor-type-page">
    <n-modal
      v-model:show="formOpen"
      preset="card"
      :title="editingId ? '编辑导师类型' : '新增导师类型'"
      style="width: 420px"
      :bordered="false"
      size="huge"
    >
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item path="name">
          <template #label>
            <FormFieldHelpLabel label="类型名称" catalog-key="mentorType.form.name" />
          </template>
          <n-input v-model:value="form.name" placeholder="请输入类型名称" maxlength="32" show-count />
        </n-form-item>
        <n-form-item path="status">
          <template #label>
            <FormFieldHelpLabel label="状态" catalog-key="mentorType.form.status" />
          </template>
          <n-select v-model:value="form.status" :options="statusOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="formOpen = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="submitForm">保存</n-button>
        </div>
      </template>
    </n-modal>

    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">导师类型</h2>
        <span class="page-desc">维护导师分类，供导师档案与筛选使用</span>
      </div>
      <n-button type="primary" @click="openCreate">
        <template #icon>
          <n-icon :component="AddOutline" />
        </template>
        新增类型
      </n-button>
    </div>

    <div class="table-card glass">
      <n-data-table
        :columns="columns"
        :data="items"
        :loading="loading"
        :bordered="false"
        :single-line="false"
        :row-key="(row) => row.id"
        size="small"
      >
        <template #empty>
          <n-empty description="暂无导师类型" />
        </template>
      </n-data-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import { NButton, NIcon, useMessage, useDialog } from 'naive-ui'
import { AddOutline, CreateOutline, TrashOutline } from '@vicons/ionicons5'
import {
  createMentorType,
  deleteMentorType,
  fetchMentorTypes,
  updateMentorType,
  type MentorTypeDto,
  type MentorTypeStatus,
} from '@/api/mentorTypes'
import { formatDate } from '@/utils/date'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const items = ref<MentorTypeDto[]>([])
const formOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formRef = ref<FormInst | null>(null)

const form = ref({ name: '', status: 'ENABLED' as MentorTypeStatus })

const statusOptions = [
  { label: '启用', value: 'ENABLED' as const },
  { label: '禁用', value: 'DISABLED' as const },
]

const rules: FormRules = {
  name: [
    { required: true, message: '请输入类型名称', trigger: ['blur', 'input'] },
    { min: 1, max: 32, message: '1～32 个字符', trigger: 'blur' },
  ],
}

const columns: DataTableColumns<MentorTypeDto> = [
  {
    title: tableColTitle('类型名称', 'mentorType.col.name'),
    key: 'name',
    width: 160,
    resizable: true,
    minWidth: 140,
    render(row) {
      return h('span', { style: { fontWeight: 500, color: 'var(--text-primary)' } }, row.name)
    },
  },
  {
    title: tableColTitle('添加时间', 'mentorType.col.addedAt'),
    key: 'createdAt',
    width: 172,
    resizable: true,
    minWidth: 140,
    render(row) {
      return h('span', { class: 'muted', style: 'font-size:13px' }, formatDate(row.createdAt))
    },
  },
  {
    title: tableColTitle('状态', 'mentorType.col.status'),
    key: 'status',
    width: 88,
    resizable: true,
    minWidth: 72,
    render(row) {
      return row.status === 'ENABLED'
        ? h('span', { class: 'badge-green' }, '启用')
        : h('span', { class: 'badge-gray' }, '禁用')
    },
  },
  {
    title: tableColTitle('操作', 'mentorType.col.actions'),
    key: 'actions',
    width: 140,
    resizable: true,
    minWidth: 120,
    render(row) {
      return h('div', { class: 'action-cell' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'primary',
            onClick: () => openEdit(row),
          },
          { default: () => '编辑', icon: () => h(NIcon, { component: CreateOutline }) },
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'error',
            onClick: () => confirmDelete(row),
          },
          { default: () => '删除', icon: () => h(NIcon, { component: TrashOutline }) },
        ),
      ])
    },
  },
]

async function load() {
  loading.value = true
  try {
    items.value = await fetchMentorTypes()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  form.value = { name: '', status: 'ENABLED' }
  formOpen.value = true
}

function openEdit(row: MentorTypeDto) {
  editingId.value = row.id
  form.value = { name: row.name, status: row.status }
  formOpen.value = true
}

function confirmDelete(row: MentorTypeDto) {
  dialog.warning({
    title: '删除导师类型',
    content: `确定删除「${row.name}」？已关联导师的类型 ID 可能需手动调整（Mock）。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteMentorType(row.id)
        message.success('已删除')
        await load()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '删除失败')
      }
    },
  })
}

async function submitForm() {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (editingId.value != null) {
      await updateMentorType(editingId.value, {
        name: form.value.name.trim(),
        status: form.value.status,
      })
      message.success('已保存')
    } else {
      await createMentorType({
        name: form.value.name.trim(),
        status: form.value.status,
      })
      message.success('已创建')
    }
    formOpen.value = false
    await load()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => load())
</script>

<style scoped>
.mentor-type-page {
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
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.page-desc {
  font-size: 13px;
  color: var(--text-muted);
}

.table-card {
  border-radius: var(--radius-lg);
  padding: 16px 20px 20px;
  overflow: hidden;
}

.muted {
  color: var(--text-muted);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.action-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
