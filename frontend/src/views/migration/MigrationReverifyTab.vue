<template>
  <div class="reverify-tab">
    <p class="tab-note">
      补校验按 FR48 规格 Mock：每批最多 100 条、批间隔 1 秒；无效记录标记为「编码无效」且不自动删除，需在本页或用户主档中处理。
    </p>

    <div class="stat-grid">
      <div v-for="card in statCards" :key="card.key" class="stat-card glass">
        <div class="stat-value" :class="card.valueClass">{{ card.value }}</div>
        <div class="stat-label">{{ card.label }}</div>
      </div>
    </div>

    <div class="action-bar glass">
      <div class="action-left">
        <n-button
          type="primary"
          :loading="starting"
          :disabled="!canRunReverify"
          @click="onStartReverify"
        >
          启动批量补校验
        </n-button>
        <span v-if="task && task.status === 'running'" class="task-hint">
          处理进度：{{ task.processed }} / {{ task.total }}
        </span>
        <span v-else-if="task && task.status === 'completed'" class="task-done">
          最近一次任务已完成
        </span>
      </div>
      <n-button quaternary :loading="reportLoading" @click="loadReport">刷新统计</n-button>
    </div>

    <div class="invalid-section">
      <div class="section-head">
        <h3 class="section-title">编码无效记录</h3>
        <span class="section-desc">可执行：保留（等待确认）、手动修正编码、删除记录（无关联约束时）</span>
      </div>
      <div class="table-card glass">
        <n-data-table
          :columns="columns"
          :data="invalidUsers"
          :loading="invalidLoading"
          :bordered="false"
          :row-key="(r) => r.id"
          :scroll-x="920"
          size="small"
        />
      </div>
    </div>

    <n-modal
      v-model:show="showFixModal"
      preset="card"
      title="修正右豹编码"
      style="width: 420px"
      :mask-closable="false"
      @after-leave="resetFixForm"
    >
      <p v-if="fixTarget" class="fix-hint">
        用户 <span class="mono">{{ fixTarget.larkNickname }}</span> 将改为新编码并回到「待验证」，可再次触发补校验。
      </p>
      <n-form label-placement="top">
        <n-form-item required>
          <template #label>
            <FormFieldHelpLabel label="新右豹编码" catalog-key="migration.reverify.newCode" />
          </template>
          <n-input v-model:value="fixCode" placeholder="请输入新编码" class="mono-input" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="showFixModal = false">取消</n-button>
          <n-button type="primary" :loading="fixSaving" @click="submitFixCode">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, computed, onMounted, onUnmounted, ref } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NTag,
  useMessage,
} from 'naive-ui'
import { useRouter } from 'vue-router'
import { usePermission } from '@/composables/usePermission'
import type { MigrationReport } from '@/types/migrationReverify'
import type { UserListItem } from '@/types/user'
import {
  fetchMigrationReport,
  fetchMigrationReverifyTask,
  postMigrationReverify,
} from '@/api/migrationReverify'
import { deleteUser, fetchUsers, updateUser } from '@/api/users'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const message = useMessage()
const router = useRouter()
const { hasOperationPermission } = usePermission()

const canRunReverify = computed(() => hasOperationPermission('migration:reverify'))

const report = ref<MigrationReport | null>(null)
const reportLoading = ref(false)
const starting = ref(false)
const task = ref<{ status: 'running' | 'completed'; processed: number; total: number } | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

const invalidUsers = ref<UserListItem[]>([])
const invalidLoading = ref(false)

const showFixModal = ref(false)
const fixTarget = ref<UserListItem | null>(null)
const fixCode = ref('')
const fixSaving = ref(false)

const statCards = computed(() => {
  const r = report.value
  if (!r) {
    return [
      { key: 'total', label: '用户总数', value: '—', valueClass: '' },
      { key: 'verified', label: '已验证', value: '—', valueClass: 'stat--green' },
      { key: 'pending', label: '待验证', value: '—', valueClass: 'stat--orange' },
      { key: 'invalid', label: '编码无效', value: '—', valueClass: 'stat--red' },
      { key: 'failed', label: '校验未响应', value: '—', valueClass: 'stat--muted' },
    ]
  }
  return [
    { key: 'total', label: '用户总数', value: String(r.total), valueClass: '' },
    { key: 'verified', label: '已验证', value: String(r.verified), valueClass: 'stat--green' },
    { key: 'pending', label: '待验证', value: String(r.pendingVerify), valueClass: 'stat--orange' },
    { key: 'invalid', label: '编码无效', value: String(r.invalid), valueClass: 'stat--red' },
    { key: 'failed', label: '校验未响应', value: String(r.failed), valueClass: 'stat--muted' },
  ]
})

async function loadReport() {
  reportLoading.value = true
  try {
    report.value = await fetchMigrationReport()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载报告失败')
  } finally {
    reportLoading.value = false
  }
}

async function loadInvalidUsers() {
  invalidLoading.value = true
  try {
    const res = await fetchUsers({
      page: 1,
      pageSize: 100,
      codeVerifyStatus: 'INVALID',
    })
    invalidUsers.value = res.items
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载无效记录失败')
  } finally {
    invalidLoading.value = false
  }
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function pollTask(taskId: string) {
  stopPoll()
  const tick = async () => {
    try {
      const t = await fetchMigrationReverifyTask(taskId)
      task.value = { status: t.status, processed: t.processed, total: t.total }
      if (t.status === 'completed') {
        stopPoll()
        starting.value = false
        message.success('批量补校验已完成')
        await loadReport()
        await loadInvalidUsers()
      }
    } catch {
      stopPoll()
      starting.value = false
    }
  }
  await tick()
  pollTimer = setInterval(tick, 1200)
}

async function onStartReverify() {
  starting.value = true
  try {
    const { taskId } = await postMigrationReverify()
    task.value = { status: 'running', processed: 0, total: 0 }
    message.info('补校验任务已启动（Mock 按批限速）')
    await pollTask(taskId)
  } catch (e) {
    starting.value = false
    message.error(e instanceof Error ? e.message : '启动失败')
  }
}

function openFix(row: UserListItem) {
  fixTarget.value = row
  fixCode.value = ''
  showFixModal.value = true
}

function resetFixForm() {
  fixTarget.value = null
  fixCode.value = ''
}

async function submitFixCode() {
  if (!fixTarget.value) return
  const code = fixCode.value.trim()
  if (!code) {
    message.warning('请填写新编码')
    return
  }
  fixSaving.value = true
  try {
    await updateUser(fixTarget.value.id, {
      rightLeopardCode: code,
      codeVerifyStatus: 'PENDING_VERIFY',
      invalidRetained: false,
    })
    message.success('已更新编码并设为待验证')
    showFixModal.value = false
    await loadInvalidUsers()
    await loadReport()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    fixSaving.value = false
  }
}

async function markRetain(row: UserListItem) {
  try {
    await updateUser(row.id, { invalidRetained: true })
    message.success('已标记为保留，待后续确认')
    await loadInvalidUsers()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '操作失败')
  }
}

async function removeUser(row: UserListItem) {
  try {
    await deleteUser(row.id)
    message.success('已删除记录')
    await loadInvalidUsers()
    await loadReport()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '删除失败（可能存在关联数据）')
  }
}

const columns = computed<DataTableColumns<UserListItem>>(() => [
  {
    title: tableColTitle('右豹编码', 'migration.reverify.col.code'),
    key: 'rightLeopardCode',
    width: 140,
    resizable: true,
    minWidth: 120,
    render(r) {
      return h('span', { class: 'mono' }, r.rightLeopardCode)
    },
  },
  { title: tableColTitle('飞书昵称', 'migration.reverify.col.larkNickname'), key: 'larkNickname', minWidth: 100, resizable: true },
  {
    title: tableColTitle('保留标记', 'migration.reverify.col.retain'),
    key: 'invalidRetained',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(r) {
      return r.invalidRetained
        ? h(NTag, { type: 'info', size: 'small' }, { default: () => '已保留' })
        : h('span', { style: { color: 'var(--text-muted)' } }, '—')
    },
  },
  {
    title: tableColTitle('操作', 'migration.reverify.col.actions'),
    key: 'actions',
    width: 280,
    resizable: true,
    minWidth: 220,
    fixed: 'right',
    render(row) {
      return h('div', { class: 'row-actions' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            onClick: () => markRetain(row),
          },
          { default: () => '保留' },
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'primary',
            onClick: () => openFix(row),
          },
          { default: () => '修正编码' },
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'error',
            onClick: () => removeUser(row),
          },
          { default: () => '删除' },
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            onClick: () => router.push({ name: 'UserDetail', params: { id: String(row.id) } }),
          },
          { default: () => '详情' },
        ),
      ])
    },
  },
])

onMounted(() => {
  void loadReport()
  void loadInvalidUsers()
})

onUnmounted(() => {
  stopPoll()
})
</script>

<style scoped>
.reverify-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tab-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.stat-card {
  border-radius: var(--radius-lg);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value.stat--green {
  color: var(--badge-green);
}

.stat-value.stat--orange {
  color: var(--badge-orange);
}

.stat-value.stat--red {
  color: var(--badge-red);
}

.stat-value.stat--muted {
  color: var(--text-muted);
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 18px;
  border-radius: var(--radius-lg);
}

.action-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.task-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

.task-done {
  font-size: 13px;
  color: var(--badge-green);
}

.invalid-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.table-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
}

.fix-hint {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.mono-input .n-input__input-el) {
  font-family: 'JetBrains Mono', monospace;
}
</style>
