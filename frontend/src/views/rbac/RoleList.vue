<template>
  <div class="role-list-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">角色管理</h2>
        <span class="page-desc">配置角色组及其菜单权限、操作权限与敏感字段权限</span>
      </div>
      <n-button type="primary" @click="openCreateDrawer">
        <template #icon>
          <n-icon :component="AddOutline" />
        </template>
        新增角色
      </n-button>
    </div>

    <!-- Role List Table -->
    <div class="table-card glass">
      <n-data-table
        :columns="columns"
        :data="roles"
        :loading="loading"
        :bordered="false"
        :single-line="false"
        :scroll-x="960"
        row-class-name="table-row"
        :row-key="(row) => row.id"
      />
    </div>

    <!-- Create / Edit Role Modal -->
    <n-modal
      v-model:show="showRoleModal"
      preset="card"
      :title="editingRole ? '编辑角色' : '新增角色'"
      style="max-width: 480px"
      :bordered="false"
      :mask-closable="false"
    >
      <n-form
        ref="roleFormRef"
        :model="roleForm"
        :rules="roleFormRules"
        label-placement="left"
        label-width="80px"
        require-mark-placement="right-hanging"
      >
        <n-form-item path="name">
          <template #label>
            <FormFieldHelpLabel label="角色名称" catalog-key="rbac.form.roleName" />
          </template>
          <n-input v-model:value="roleForm.name" placeholder="请输入角色名称" maxlength="50" />
        </n-form-item>
        <n-form-item path="department">
          <template #label>
            <FormFieldHelpLabel label="所属部门" catalog-key="rbac.form.department" />
          </template>
          <n-input v-model:value="roleForm.department" placeholder="请输入所属部门" maxlength="50" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer-actions">
          <n-button @click="showRoleModal = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="handleSaveRole">
            {{ editingRole ? '保存修改' : '确认创建' }}
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- Delete Confirm Modal -->
    <n-modal
      v-model:show="showDeleteModal"
      preset="card"
      title="确认删除角色"
      style="max-width: 420px"
      :bordered="false"
    >
      <p class="delete-warning">
        确认删除角色「<strong>{{ deletingRole?.name }}</strong>」？此操作不可撤销。
      </p>
      <template #footer>
        <div class="modal-footer-actions">
          <n-button @click="showDeleteModal = false">取消</n-button>
          <n-button type="error" :loading="deleting" @click="handleConfirmDelete">确认删除</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Save Permission Confirmation Modal -->
    <n-modal
      v-model:show="showSavePermModal"
      preset="card"
      title="确认保存权限"
      style="max-width: 440px"
      :bordered="false"
      :mask-closable="false"
    >
      <p class="save-perm-tip">
        权限修改将立即对所有使用「<strong>{{ permDrawerRole?.name }}</strong>」的账号生效。
      </p>
      <template #footer>
        <div class="modal-footer-actions">
          <n-button @click="showSavePermModal = false">取消</n-button>
          <n-button type="primary" :loading="savingPerm" @click="handleConfirmSavePerm">确认保存</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Permission Drawer -->
    <n-drawer
      v-model:show="showPermDrawer"
      :width="920"
      placement="right"
      :mask-closable="false"
    >
      <n-drawer-content :native-scrollbar="false" style="display: flex; flex-direction: column">
        <div class="drawer-header">
          <div class="drawer-title">
            <span class="drawer-role-name">{{ permDrawerRole?.name }}</span>
            <span class="drawer-subtitle">— 分配权限</span>
          </div>
          <div class="drawer-actions">
            <n-button @click="showPermDrawer = false">取消</n-button>
            <n-button type="primary" @click="showSavePermModal = true">保存权限配置</n-button>
          </div>
        </div>

        <div class="drawer-body">
          <div class="perm-tree-panel">
            <div class="panel-title">菜单权限</div>
            <div class="menu-tree">
              <div
                v-for="menu in menuTree"
                :key="menu.key"
                class="menu-tree-item"
              >
                <n-checkbox
                  :checked="isMenuChecked(menu.key)"
                  :indeterminate="isMenuIndeterminate(menu.key)"
                  @update:checked="(v) => onMenuCheck(menu.key, v)"
                />
                <span class="menu-label">{{ menu.label }}</span>
              </div>
            </div>
          </div>

          <div class="perm-main-panel">
            <div class="config-section">
              <div class="config-section-title">操作权限（全量）</div>
              <p class="config-section-desc">与菜单联动：未勾选菜单时对应操作不可选；勾选操作会自动勾选所属菜单。</p>
              <div
                v-for="group in operationGroups"
                :key="group.menuKey"
                class="op-group"
              >
                <div class="op-group-title">{{ group.title }}</div>
                <div class="perm-items perm-items--grid">
                  <div
                    v-for="op in group.items"
                    :key="op.key"
                    class="perm-item"
                  >
                    <n-checkbox
                      :checked="workingOpPerms.has(op.key)"
                      :disabled="isOpDisabled(op.key)"
                      @update:checked="(v) => onGlobalOpCheck(op.key, v)"
                    >
                      {{ op.label }}
                    </n-checkbox>
                  </div>
                </div>
              </div>
            </div>

            <n-divider style="margin: 8px 0" />

            <div class="config-section">
              <div class="config-section-title">敏感字段权限（全量）</div>
              <p class="config-section-desc">无权限时对应字段在列表/详情中不可见（与 PRD 字段分级一致）。</p>
              <div class="field-perm-items">
                <div
                  v-for="field in fieldPermOptions"
                  :key="field.key"
                  class="field-perm-item"
                >
                  <span class="field-label">{{ field.label }}</span>
                  <n-switch
                    :value="workingFieldPerms[field.key] === true"
                    @update:value="(v) => onFieldCheck(field.key, v)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import { NButton, NIcon, useMessage } from 'naive-ui'
import { AddOutline, CreateOutline, TrashOutline, ShieldCheckmarkOutline } from '@vicons/ionicons5'
import type { RbacRole, RbacPermissions } from '@/types/permission'
import { MENU_PERMS } from '@/utils/permission'
import {
  OPERATION_PERM_OPTIONS,
  FIELD_PERM_OPTIONS,
  OPERATION_TO_MENU_KEY,
  groupOperationOptions,
} from '@/utils/rbacCatalog'
import request from '@/api/request'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const message = useMessage()

const roles = ref<RbacRole[]>([])
const loading = ref(false)

async function fetchRoles() {
  loading.value = true
  try {
    const res = await request.get('/roles')
    roles.value = res.data.data.list
  } finally {
    loading.value = false
  }
}

onMounted(fetchRoles)

interface MenuTreeNode {
  key: string
  label: string
  menuPerm: string
}

const menuTree: MenuTreeNode[] = [
  { key: 'dashboard', label: '数据看板', menuPerm: MENU_PERMS.DASHBOARD },
  { key: 'users', label: '用户主档', menuPerm: MENU_PERMS.USERS },
  { key: 'migration', label: '数据迁移', menuPerm: MENU_PERMS.MIGRATION },
  { key: 'payments', label: '付费记录', menuPerm: MENU_PERMS.PAYMENTS },
  { key: 'audit', label: '入群审核', menuPerm: MENU_PERMS.AUDIT },
  { key: 'org', label: '组织管理', menuPerm: MENU_PERMS.ORG_MANAGEMENT },
  { key: 'lark-friends', label: '飞书好友', menuPerm: MENU_PERMS.LARK_FRIENDS },
  { key: 'notifications', label: '通知失败记录', menuPerm: MENU_PERMS.NOTIFICATIONS },
  { key: 'sla-alerts', label: 'SLA 预警记录', menuPerm: MENU_PERMS.SLA_ALERTS },
  { key: 'rbac', label: '角色管理', menuPerm: MENU_PERMS.RBAC },
  { key: 'accounts', label: '账号管理', menuPerm: MENU_PERMS.ACCOUNTS },
]

const operationGroups = computed(() => groupOperationOptions())
const fieldPermOptions = FIELD_PERM_OPTIONS

const workingOpPerms = ref<Set<string>>(new Set())

function getOpsForMenu(menuKey: string) {
  return OPERATION_PERM_OPTIONS.filter((o) => o.menuKey === menuKey)
}

function normalizeFieldPerms(raw: Record<string, boolean>): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const { key } of FIELD_PERM_OPTIONS) {
    out[key] = raw[key] === true
  }
  return out
}

/* ─── Create / Edit ──────────────────────────────────── */
const showRoleModal = ref(false)
const editingRole = ref<RbacRole | null>(null)
const saving = ref(false)
const roleFormRef = ref<FormInst | null>(null)
const roleForm = ref({ name: '', department: '' })

const roleFormRules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  department: [{ required: true, message: '请输入所属部门', trigger: 'blur' }],
}

function openCreateDrawer() {
  editingRole.value = null
  roleForm.value = { name: '', department: '' }
  showRoleModal.value = true
}

function openEditModal(role: RbacRole) {
  editingRole.value = role
  roleForm.value = { name: role.name, department: role.department }
  showRoleModal.value = true
}

async function handleSaveRole() {
  await roleFormRef.value?.validate()
  saving.value = true
  try {
    if (editingRole.value) {
      await request.patch(`/roles/${editingRole.value.id}`, {
        name: roleForm.value.name,
        department: roleForm.value.department,
      })
      message.success('角色信息已更新')
    } else {
      await request.post('/roles', {
        name: roleForm.value.name,
        department: roleForm.value.department,
        permissions: { menuPerms: [], operationPerms: [], fieldPerms: {} },
      })
      message.success('角色创建成功')
    }
    showRoleModal.value = false
    await fetchRoles()
  } catch {
    message.error('操作失败，请重试')
  } finally {
    saving.value = false
  }
}

/* ─── Delete ─────────────────────────────────────────── */
const showDeleteModal = ref(false)
const deletingRole = ref<RbacRole | null>(null)
const deleting = ref(false)

function openDeleteModal(role: RbacRole) {
  if (role.accountCount > 0) {
    message.warning(`该角色下有 ${role.accountCount} 个账号，请先转移后删除`)
    return
  }
  deletingRole.value = role
  showDeleteModal.value = true
}

async function handleConfirmDelete() {
  if (!deletingRole.value) return
  deleting.value = true
  try {
    await request.delete(`/roles/${deletingRole.value.id}`)
    message.success('角色已删除')
    showDeleteModal.value = false
    await fetchRoles()
  } catch {
    message.error('删除失败，请重试')
  } finally {
    deleting.value = false
  }
}

/* ─── Permission Drawer ──────────────────────────────── */
const showPermDrawer = ref(false)
const permDrawerRole = ref<RbacRole | null>(null)
const workingMenuPerms = ref<Set<string>>(new Set())
const workingFieldPerms = ref<Record<string, boolean>>({})

function openPermDrawer(role: RbacRole) {
  permDrawerRole.value = role
  workingMenuPerms.value = new Set(role.permissions.menuPerms)
  workingOpPerms.value = new Set(role.permissions.operationPerms)
  workingFieldPerms.value = { ...normalizeFieldPerms(role.permissions.fieldPerms ?? {}) }
  showPermDrawer.value = true
}

function isMenuChecked(menuKey: string): boolean {
  const node = menuTree.find((m) => m.key === menuKey)
  if (!node) return false
  return workingMenuPerms.value.has(node.menuPerm)
}

function isMenuIndeterminate(menuKey: string): boolean {
  const node = menuTree.find((m) => m.key === menuKey)
  if (!node) return false
  const menuOn = workingMenuPerms.value.has(node.menuPerm)
  if (!menuOn) return false
  const ops = getOpsForMenu(menuKey)
  if (ops.length === 0) return false
  const n = ops.filter((o) => workingOpPerms.value.has(o.key)).length
  return n > 0 && n < ops.length
}

function onMenuCheck(menuKey: string, checked: boolean) {
  const node = menuTree.find((m) => m.key === menuKey)
  if (!node) return
  if (checked) {
    workingMenuPerms.value = new Set(workingMenuPerms.value).add(node.menuPerm)
  } else {
    const menus = new Set(workingMenuPerms.value)
    menus.delete(node.menuPerm)
    workingMenuPerms.value = menus
    const ops = new Set(workingOpPerms.value)
    getOpsForMenu(menuKey).forEach((op) => ops.delete(op.key))
    workingOpPerms.value = ops
  }
}

function isOpDisabled(opKey: string): boolean {
  const mk = OPERATION_TO_MENU_KEY[opKey]
  if (!mk) return false
  const node = menuTree.find((m) => m.key === mk)
  if (!node) return false
  return !workingMenuPerms.value.has(node.menuPerm)
}

function onGlobalOpCheck(opKey: string, checked: boolean) {
  const ops = new Set(workingOpPerms.value)
  if (checked) {
    ops.add(opKey)
    workingOpPerms.value = ops
    const mk = OPERATION_TO_MENU_KEY[opKey]
    const node = menuTree.find((m) => m.key === mk)
    if (node) {
      workingMenuPerms.value = new Set(workingMenuPerms.value).add(node.menuPerm)
    }
  } else {
    ops.delete(opKey)
    workingOpPerms.value = ops
  }
}

function onFieldCheck(fieldKey: string, value: boolean) {
  workingFieldPerms.value = { ...workingFieldPerms.value, [fieldKey]: value }
}

/* ─── Save Permissions ───────────────────────────────── */
const showSavePermModal = ref(false)
const savingPerm = ref(false)

async function handleConfirmSavePerm() {
  if (!permDrawerRole.value) return
  savingPerm.value = true
  try {
    const permissions: RbacPermissions = {
      menuPerms: Array.from(workingMenuPerms.value),
      operationPerms: Array.from(workingOpPerms.value),
      fieldPerms: normalizeFieldPerms(workingFieldPerms.value),
    }
    await request.patch(`/roles/${permDrawerRole.value.id}`, { permissions })
    message.success('权限配置已保存')
    showSavePermModal.value = false
    showPermDrawer.value = false
    await fetchRoles()
  } catch {
    message.error('保存失败，请重试')
  } finally {
    savingPerm.value = false
  }
}

/* ─── Table Columns ──────────────────────────────────── */
function renderIconBtn(icon: unknown, label: string, type: 'default' | 'primary' | 'error', onClick: () => void) {
  return h(
    NButton,
    {
      size: 'small',
      quaternary: true,
      type,
      onClick,
      style: 'padding: 0 6px',
    },
    {
      default: () => label,
      icon: () => h(NIcon, { component: icon as any }),
    },
  )
}

const columns = computed<DataTableColumns<RbacRole>>(() => [
  {
    title: tableColTitle('角色名称', 'rbac.col.name'),
    key: 'name',
    resizable: true,
    minWidth: 140,
    render: (row) =>
      h('span', { style: 'font-weight: 500; color: var(--text-primary)' }, row.name),
  },
  {
    title: tableColTitle('所属部门', 'rbac.col.department'),
    key: 'department',
    resizable: true,
    minWidth: 120,
    render: (row) =>
      h('span', { style: 'color: var(--text-secondary)' }, row.department),
  },
  {
    title: tableColTitle('角色人数', 'rbac.col.memberCount'),
    key: 'accountCount',
    width: 100,
    resizable: true,
    minWidth: 90,
    render: (row) =>
      h(
        'span',
        {
          class: row.accountCount > 0 ? 'badge-blue' : 'badge-gray',
        },
        `${row.accountCount} 人`,
      ),
  },
  {
    title: tableColTitle('创建时间', 'rbac.col.createdAt'),
    key: 'createdAt',
    width: 180,
    resizable: true,
    minWidth: 160,
    render: (row) =>
      h(
        'span',
        { style: 'color: var(--text-muted); font-size: 13px; font-family: "JetBrains Mono", monospace' },
        new Date(row.createdAt).toLocaleString('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        }),
      ),
  },
  {
    title: tableColTitle('操作', 'rbac.col.actions'),
    key: 'actions',
    width: 200,
    resizable: true,
    minWidth: 180,
    render: (row) =>
      h('div', { style: 'display: flex; gap: 4px; align-items: center' }, [
        renderIconBtn(CreateOutline, '编辑', 'default', () => openEditModal(row)),
        renderIconBtn(ShieldCheckmarkOutline, '分配权限', 'primary', () => openPermDrawer(row)),
        renderIconBtn(
          TrashOutline,
          '删除',
          'error',
          () => openDeleteModal(row),
        ),
      ]),
  },
])
</script>

<style scoped>
.role-list-page {
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

.table-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.modal-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  position: relative;
  z-index: 2;
  background: var(--bg-surface);
  box-shadow: 0 -10px 24px -10px rgba(0, 0, 0, 0.35);
  margin: 0 -4px -4px;
  padding: 12px 4px 0;
  border-top: 1px solid var(--border-subtle);
}

.delete-warning,
.save-perm-tip {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.7;
  padding: 4px 0 8px;
}

.delete-warning strong,
.save-perm-tip strong {
  color: var(--accent);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-surface);
}

.drawer-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.drawer-role-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.drawer-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.drawer-actions {
  display: flex;
  gap: 8px;
}

.drawer-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.perm-tree-panel {
  width: 240px;
  min-width: 240px;
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-title {
  padding: 16px 20px 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.menu-tree {
  display: flex;
  flex-direction: column;
  padding: 0 8px 16px;
}

.menu-tree-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
}

.menu-label {
  font-size: 14px;
  color: var(--text-primary);
  flex: 1;
}

.perm-main-panel {
  flex: 1;
  padding: 16px 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.config-section-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: -6px;
}

.op-group {
  margin-bottom: 4px;
}

.op-group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  padding-top: 4px;
}

.perm-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding: 4px 0;
}

.perm-items--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px 16px;
}

.perm-item {
  min-width: 0;
}

.field-perm-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-perm-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}

.field-label {
  font-size: 14px;
  color: var(--text-primary);
  padding-right: 12px;
}
</style>
