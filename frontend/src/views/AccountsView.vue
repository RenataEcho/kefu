<template>
  <div class="accounts-page">
    <!-- 新增 / 编辑 抽屉 -->
    <n-drawer
      v-model:show="drawerVisible"
      :width="480"
      placement="right"
      :mask-closable="false"
    >
      <n-drawer-content :title="drawerTitle" closable :native-scrollbar="false">
        <n-form
          ref="formRef"
          :model="formModel"
          :rules="formRules"
          label-placement="top"
          require-mark-placement="right-hanging"
        >
          <n-form-item v-if="!editingAccount" path="loginId">
            <template #label>
              <FormFieldHelpLabel label="登录账号" catalog-key="account.form.loginId" />
            </template>
            <n-input
              v-model:value="formModel.loginId"
              placeholder="创建后不可修改"
              :maxlength="32"
              show-count
            />
          </n-form-item>
          <n-form-item v-else>
            <template #label>
              <FormFieldHelpLabel label="登录账号" catalog-key="account.form.loginId" />
            </template>
            <n-input :value="editingAccount.loginId" disabled />
          </n-form-item>
          <n-form-item path="name">
            <template #label>
              <FormFieldHelpLabel label="账号名称（显示名）" catalog-key="account.form.name" />
            </template>
            <n-input v-model:value="formModel.name" placeholder="请输入显示名" :maxlength="50" show-count />
          </n-form-item>
          <n-form-item v-if="!editingAccount" path="password">
            <template #label>
              <FormFieldHelpLabel label="初始密码" catalog-key="account.form.password" />
            </template>
            <n-input
              v-model:value="formModel.password"
              type="password"
              show-password-on="click"
              placeholder="至少 6 位"
            />
          </n-form-item>
          <n-form-item path="roleId">
            <template #label>
              <FormFieldHelpLabel label="所属角色" catalog-key="account.form.roleId" />
            </template>
            <n-select
              v-model:value="formModel.roleId"
              :options="roleOptions"
              placeholder="选择角色组"
            />
          </n-form-item>
          <n-form-item>
            <template #label>
              <FormFieldHelpLabel label="审核员属性" catalog-key="account.form.reviewerAttrs" />
            </template>
            <n-switch v-model:value="formModel.isAuditor">
              <template #checked>是</template>
              <template #unchecked>否</template>
            </n-switch>
          </n-form-item>
        </n-form>
        <template #footer>
          <div class="drawer-footer drawer-footer-bar">
            <n-button @click="drawerVisible = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="submitForm">保存</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>

    <!-- 禁用 -->
    <n-modal
      v-model:show="disableModal"
      preset="card"
      title="禁用账号"
      style="max-width: 420px"
      :bordered="false"
    >
      <p class="modal-text">
        禁用后该账号将无法登录，确认禁用「<strong>{{ actionTarget?.name }}</strong>」？
      </p>
      <template #footer>
        <div class="drawer-footer drawer-footer-bar drawer-footer-bar--modal">
          <n-button @click="disableModal = false">取消</n-button>
          <n-button type="warning" :loading="actionLoading" @click="confirmDisable">确认禁用</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 启用 -->
    <n-modal
      v-model:show="enableModal"
      preset="card"
      title="启用账号"
      style="max-width: 420px"
      :bordered="false"
    >
      <p class="modal-text">确认启用后该账号可重新登录系统。</p>
      <template #footer>
        <div class="drawer-footer drawer-footer-bar drawer-footer-bar--modal">
          <n-button @click="enableModal = false">取消</n-button>
          <n-button type="primary" :loading="actionLoading" @click="confirmEnable">确认启用</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 删除 -->
    <n-modal
      v-model:show="deleteModal"
      preset="card"
      title="确认删除账号"
      style="max-width: 440px"
      :bordered="false"
    >
      <p class="modal-text warn">
        账号「<strong>{{ actionTarget?.name }}</strong>」将被永久删除，此操作不可撤销。该账号的历史操作日志将保留用于审计。
      </p>
      <template #footer>
        <div class="drawer-footer drawer-footer-bar drawer-footer-bar--modal">
          <n-button @click="deleteModal = false">取消</n-button>
          <n-button type="error" :loading="actionLoading" @click="confirmDelete">确认删除</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 重置密码确认 -->
    <n-modal
      v-model:show="resetConfirmModal"
      preset="card"
      title="重置密码"
      style="max-width: 440px"
      :bordered="false"
    >
      <p class="modal-text">
        重置后将生成新的随机密码，账号持有人需使用新密码登录。关闭结果弹窗后密码不可再次查看，请务必记录或告知账号持有人。
      </p>
      <template #footer>
        <div class="drawer-footer drawer-footer-bar drawer-footer-bar--modal">
          <n-button @click="resetConfirmModal = false">取消</n-button>
          <n-button type="primary" :loading="actionLoading" @click="executeResetPassword">确认重置</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 重置密码结果 -->
    <n-modal
      v-model:show="resetModal"
      preset="card"
      title="新密码已生成"
      style="max-width: 420px"
      :bordered="false"
      :mask-closable="false"
      @after-leave="generatedPassword = ''"
    >
      <p class="modal-text">
        请务必记录或告知账号持有人。关闭后将无法再次查看完整密码。
      </p>
      <div class="password-box mono">{{ generatedPassword }}</div>
      <n-button block type="primary" style="margin-top: 12px" @click="copyPassword">复制密码</n-button>
      <template #footer>
        <n-button block @click="resetModal = false">关闭</n-button>
      </template>
    </n-modal>

    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">账号管理</h2>
        <span class="page-desc">创建与维护后台登录账号，分配角色与审核员属性（prototype-spec §2.9.2）</span>
      </div>
      <n-button
        v-if="canManage"
        type="primary"
        @click="openCreate"
      >
        <template #icon>
          <n-icon :component="AddOutline" />
        </template>
        新增账号
      </n-button>
    </div>

    <div class="filter-bar glass">
      <div class="filter-row">
        <n-select
          v-model:value="filterRoleId"
          clearable
          placeholder="全部角色"
          style="width: 180px"
          :options="roleFilterOptions"
          @update:value="onFilterChange"
        />
        <n-select
          v-model:value="filterAuditor"
          placeholder="审核员属性"
          style="width: 160px"
          :options="auditorFilterOptions"
          @update:value="onFilterChange"
        />
      </div>
    </div>

    <div class="table-card glass">
      <n-data-table
        :columns="columns"
        :data="list"
        :loading="loading"
        :bordered="false"
        :single-line="false"
        :row-key="(r) => r.id"
        :scroll-x="1100"
      />
      <div class="pagination-wrap">
        <n-pagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="loadList"
          @update:page-size="onPageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, h, onMounted } from 'vue'
import type { DataTableColumns, FormInst, FormRules, SelectOption } from 'naive-ui'
import {
  NButton,
  NDataTable,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSwitch,
  NTag,
  NTooltip,
  useMessage,
} from 'naive-ui'
import axios from 'axios'
import {
  AddOutline,
  CreateOutline,
  KeyOutline,
  PowerOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import type { AdminAccount } from '@/types/account'
import type { RbacRole } from '@/types/permission'
import request from '@/api/request'
import {
  createAccount,
  deleteAccount,
  fetchAccounts,
  resetAccountPassword,
  updateAccount,
} from '@/api/accounts'
import { usePermission } from '@/composables/usePermission'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const message = useMessage()
const { hasOperationPermission } = usePermission()
const canManage = computed(() => hasOperationPermission('accounts:manage'))

const list = ref<AdminAccount[]>([])
const loading = ref(false)
const roles = ref<RbacRole[]>([])

const filterRoleId = ref<number | null>(null)
const filterAuditor = ref<'all' | 'yes' | 'no'>('all')

const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
})

const auditorFilterOptions: SelectOption[] = [
  { label: '全部', value: 'all' },
  { label: '审核员', value: 'yes' },
  { label: '非审核员', value: 'no' },
]

const roleFilterOptions = computed<SelectOption[]>(() => [
  ...roles.value.map((r) => ({ label: r.name, value: r.id })),
])

const roleOptions = computed<SelectOption[]>(() =>
  roles.value.map((r) => ({ label: r.name, value: r.id })),
)

async function loadRoles() {
  try {
    const res = await request.get('/roles')
    roles.value = res.data.data.list as RbacRole[]
  } catch {
    message.error('加载角色列表失败')
  }
}

async function loadList() {
  loading.value = true
  try {
    const isAuditor =
      filterAuditor.value === 'all' ? undefined : filterAuditor.value === 'yes'
    const data = await fetchAccounts({
      page: pagination.page,
      pageSize: pagination.pageSize,
      roleId: filterRoleId.value ?? undefined,
      isAuditor,
    })
    list.value = data.list
    pagination.itemCount = data.total
  } catch {
    message.error('加载账号列表失败')
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  pagination.page = 1
  loadList()
}

function onPageSizeChange() {
  pagination.page = 1
  loadList()
}

onMounted(async () => {
  await loadRoles()
  await loadList()
})

/* ─── 抽屉表单 ─── */
const drawerVisible = ref(false)
const editingAccount = ref<AdminAccount | null>(null)
const saving = ref(false)
const formRef = ref<FormInst | null>(null)
const formModel = reactive({
  loginId: '',
  name: '',
  password: '',
  roleId: null as number | null,
  isAuditor: false,
})

const drawerTitle = computed(() => (editingAccount.value ? '编辑账号' : '新增账号'))

const formRules: FormRules = {
  loginId: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入账号名称', trigger: 'blur' }],
  password: [
    {
      validator: (_r, v: string) => {
        if (editingAccount.value) return true
        if (!v || v.length < 6) return new Error('密码至少 6 位')
        return true
      },
      trigger: 'blur',
    },
  ],
  roleId: [
    {
      required: true,
      validator: (_r, v: number | null) => (v != null ? true : new Error('请选择角色')),
      trigger: 'change',
    },
  ],
}

function openCreate() {
  editingAccount.value = null
  formModel.loginId = ''
  formModel.name = ''
  formModel.password = ''
  formModel.roleId = roles.value[0]?.id ?? null
  formModel.isAuditor = false
  drawerVisible.value = true
}

function openEdit(row: AdminAccount) {
  editingAccount.value = row
  formModel.name = row.name
  formModel.roleId = row.roleId
  formModel.isAuditor = row.isAuditor
  formModel.password = ''
  drawerVisible.value = true
}

async function submitForm() {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (editingAccount.value) {
      await updateAccount(editingAccount.value.id, {
        name: formModel.name,
        roleId: formModel.roleId!,
        isAuditor: formModel.isAuditor,
      })
      message.success('账号信息已更新')
    } else {
      await createAccount({
        name: formModel.name,
        loginId: formModel.loginId.trim(),
        password: formModel.password,
        roleId: formModel.roleId!,
        isAuditor: formModel.isAuditor,
      })
      message.success('账号已创建')
    }
    drawerVisible.value = false
    await loadList()
    await loadRoles()
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 409) {
      const m = (e.response.data as { message?: string })?.message
      message.error(m || '登录ID已存在')
    } else {
      message.error('保存失败，请重试')
    }
  } finally {
    saving.value = false
  }
}

/* ─── 禁用 / 启用 / 删除 / 重置密码 ─── */
const disableModal = ref(false)
const enableModal = ref(false)
const deleteModal = ref(false)
const resetConfirmModal = ref(false)
const resetModal = ref(false)
const actionLoading = ref(false)
const actionTarget = ref<AdminAccount | null>(null)
const generatedPassword = ref('')

function openDisable(row: AdminAccount) {
  actionTarget.value = row
  disableModal.value = true
}

async function confirmDisable() {
  if (!actionTarget.value) return
  actionLoading.value = true
  try {
    await updateAccount(actionTarget.value.id, { status: 'DISABLED' })
    message.success('账号已禁用')
    disableModal.value = false
    await loadList()
  } catch {
    message.error('操作失败')
  } finally {
    actionLoading.value = false
  }
}

function openEnable(row: AdminAccount) {
  actionTarget.value = row
  enableModal.value = true
}

async function confirmEnable() {
  if (!actionTarget.value) return
  actionLoading.value = true
  try {
    await updateAccount(actionTarget.value.id, { status: 'ACTIVE' })
    message.success('账号已启用')
    enableModal.value = false
    await loadList()
  } catch {
    message.error('操作失败')
  } finally {
    actionLoading.value = false
  }
}

function openDelete(row: AdminAccount) {
  actionTarget.value = row
  deleteModal.value = true
}

async function confirmDelete() {
  if (!actionTarget.value) return
  actionLoading.value = true
  try {
    await deleteAccount(actionTarget.value.id)
    message.success('账号已删除')
    deleteModal.value = false
    await loadList()
    await loadRoles()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '删除失败')
  } finally {
    actionLoading.value = false
  }
}

function openResetConfirm(row: AdminAccount) {
  actionTarget.value = row
  resetConfirmModal.value = true
}

async function executeResetPassword() {
  if (!actionTarget.value) return
  actionLoading.value = true
  try {
    const { newPassword } = await resetAccountPassword(actionTarget.value.id)
    generatedPassword.value = newPassword
    resetConfirmModal.value = false
    resetModal.value = true
    message.success('新密码已生成')
  } catch {
    message.error('重置失败')
  } finally {
    actionLoading.value = false
  }
}

async function copyPassword() {
  try {
    await navigator.clipboard.writeText(generatedPassword.value)
    message.success('已复制到剪贴板')
  } catch {
    message.warning('复制失败，请手动选择复制')
  }
}

function statusTag(status: AdminAccount['status']) {
  if (status === 'ACTIVE') {
    return h(NTag, { type: 'success', size: 'small', bordered: false }, () => '启用')
  }
  return h(NTag, { size: 'small', bordered: false, style: { background: 'var(--badge-gray)', color: 'var(--text-inverse)' } }, () => '禁用')
}

const columns = computed<DataTableColumns<AdminAccount>>(() => {
  const cols: DataTableColumns<AdminAccount> = [
    {
      title: tableColTitle('登录账号', 'account.col.loginId'),
      key: 'loginId',
      width: 130,
      resizable: true,
      minWidth: 110,
      ellipsis: { tooltip: true },
      render: (row) =>
        h('span', { class: 'mono', style: { color: 'var(--text-primary)' } }, row.loginId),
    },
    {
      title: tableColTitle('账号名称', 'account.col.name'),
      key: 'name',
      width: 140,
      resizable: true,
      minWidth: 120,
      ellipsis: { tooltip: true },
    },
    {
      title: tableColTitle('登录密码', 'account.col.password'),
      key: 'passwordSet',
      width: 100,
      resizable: true,
      minWidth: 88,
      render: () => h('span', { style: { color: 'var(--text-muted)', fontSize: '13px' } }, '已设置'),
    },
    {
      title: tableColTitle('当前角色', 'account.col.role'),
      key: 'roleName',
      width: 120,
      resizable: true,
      minWidth: 100,
      ellipsis: { tooltip: true },
    },
    {
      title: tableColTitle('审核员', 'account.col.reviewer'),
      key: 'isAuditor',
      width: 80,
      resizable: true,
      minWidth: 72,
      render: (row) => (row.isAuditor ? '是' : '—'),
    },
    {
      title: tableColTitle('状态', 'common.status'),
      key: 'status',
      width: 88,
      resizable: true,
      minWidth: 72,
      render: (row) => statusTag(row.status),
    },
    {
      title: tableColTitle('创建时间', 'common.createdAt'),
      key: 'createdAt',
      width: 168,
      resizable: true,
      minWidth: 140,
      render: (row) =>
        h(
          'span',
          { style: 'color: var(--text-muted); font-size: 13px; font-family: JetBrains Mono, monospace' },
          new Date(row.createdAt).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
        ),
    },
  ]

  if (canManage.value) {
    cols.push({
      title: tableColTitle('操作', 'account.col.actions'),
      key: 'actions',
      width: 220,
      resizable: true,
      minWidth: 180,
      fixed: 'right',
      render: (row) => {
        const btns = [
          h(
            NButton,
            { size: 'small', quaternary: true, onClick: () => openEdit(row), style: 'padding: 0 6px' },
            {
              default: () => '编辑',
              icon: () => h(NIcon, { component: CreateOutline }),
            },
          ),
          h(
            NButton,
            { size: 'small', quaternary: true, onClick: () => openResetConfirm(row), style: 'padding: 0 6px' },
            {
              default: () => '重置密码',
              icon: () => h(NIcon, { component: KeyOutline }),
            },
          ),
        ]
        if (row.status === 'ACTIVE') {
          btns.push(
            h(
              NButton,
              {
                size: 'small',
                quaternary: true,
                type: 'warning',
                onClick: () => openDisable(row),
                style: 'padding: 0 6px',
              },
              {
                default: () => '禁用',
                icon: () => h(NIcon, { component: PowerOutline }),
              },
            ),
          )
        } else {
          btns.push(
            h(
              NButton,
              {
                size: 'small',
                quaternary: true,
                type: 'success',
                onClick: () => openEnable(row),
                style: 'padding: 0 6px',
              },
              {
                default: () => '启用',
                icon: () => h(NIcon, { component: PowerOutline }),
              },
            ),
          )
        }
        const deleteBtn = h(
          NTooltip,
          { trigger: 'hover', disabled: row.status === 'DISABLED' },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  type: 'error',
                  disabled: row.status !== 'DISABLED',
                  style: 'padding: 0 6px',
                  onClick: () => row.status === 'DISABLED' && openDelete(row),
                },
                {
                  default: () => '删除',
                  icon: () => h(NIcon, { component: TrashOutline }),
                },
              ),
            default: () => '请先禁用账号后再删除',
          },
        )
        btns.push(deleteBtn)
        return h('div', { class: 'action-row' }, btns)
      },
    })
  }

  return cols
})
</script>

<style scoped>
.accounts-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.filter-bar {
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.table-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-subtle);
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}

.modal-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.65;
}

.modal-text.warn strong {
  color: var(--accent);
}

.password-box {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--card-inner-bg);
  border: 1px solid var(--border-default);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: center;
  color: var(--text-primary);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
}
</style>
