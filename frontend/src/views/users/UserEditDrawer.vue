<template>
  <n-drawer
    :show="show"
    :width="520"
    placement="right"
    :mask-closable="!submitting"
    :close-on-esc="!submitting"
    @update:show="handleDrawerUpdate"
  >
    <n-drawer-content closable :native-scrollbar="false">
      <template #header>
        <div class="drawer-header">
          <span class="drawer-title">编辑用户</span>
          <span class="drawer-subtitle">修改用户主档信息</span>
        </div>
      </template>

      <!-- ─── Loading State ────────────────────────────────────────── -->
      <div v-if="loading" class="loading-state">
        <n-spin size="medium" />
        <span class="loading-text">加载用户信息…</span>
      </div>

      <!-- ─── Load Error ────────────────────────────────────────────── -->
      <div v-else-if="loadError" class="error-state">
        <n-icon :component="AlertCircleOutline" size="32" color="#ef4444" />
        <span class="error-text">{{ loadError }}</span>
        <n-button size="small" @click="loadDetail">重试</n-button>
      </div>

      <!-- ─── Form + 操作日志 ─────────────────────────────────────── -->
      <template v-else>
        <n-form
          ref="formRef"
          :model="formData"
          label-placement="top"
          label-width="auto"
          require-mark-placement="right-hanging"
          class="edit-form"
          @submit.prevent="handleSubmit"
        >
        <!-- ── Section: 基础信息 ──────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">基础信息</div>

          <!-- 右豹编码（只读） -->
          <n-form-item>
            <template #label>
              <FormFieldHelpLabel label="右豹编码" catalog-key="user.form.rightLeopardCode" />
            </template>
            <div class="readonly-field">
              <span class="readonly-code">{{ detail?.rightLeopardCode }}</span>
              <n-tag :type="codeVerifyTagType" size="small" round>
                {{ codeVerifyTagLabel }}
              </n-tag>
            </div>
          </n-form-item>

          <!-- 右豹 ID -->
          <n-form-item path="rightLeopardId">
            <template #label>
              <FormFieldHelpLabel label="右豹 ID" catalog-key="user.form.rightLeopardId" />
            </template>
            <n-input
              v-model:value="formData.rightLeopardId"
              placeholder="请输入右豹 ID（选填）"
              class="mono-input"
              clearable
            />
          </n-form-item>
        </div>

        <div class="section-divider" />

        <!-- ── Section: 飞书信息 ──────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">飞书信息</div>

          <!-- 飞书 ID -->
          <n-form-item path="larkId">
            <template #label>
              <FormFieldHelpLabel label="飞书 ID" catalog-key="user.form.larkId" />
            </template>
            <n-input
              v-model:value="formData.larkId"
              placeholder="请输入飞书 ID（选填）"
              class="mono-input"
              clearable
            />
          </n-form-item>

          <!-- 飞书手机号 -->
          <n-form-item path="larkPhone">
            <template #label>
              <FormFieldHelpLabel label="飞书手机号" catalog-key="user.form.larkPhone" />
            </template>
            <n-input
              v-model:value="formData.larkPhone"
              placeholder="请输入手机号（选填）"
              clearable
              @blur="validatePhone"
            />
            <template v-if="phoneError" #feedback>
              <span class="inline-error">{{ phoneError }}</span>
            </template>
          </n-form-item>

          <!-- 飞书昵称 -->
          <n-form-item path="larkNickname">
            <template #label>
              <FormFieldHelpLabel label="飞书昵称" catalog-key="user.form.larkNickname" />
            </template>
            <n-input
              v-model:value="formData.larkNickname"
              placeholder="请输入飞书昵称（选填）"
              clearable
            />
          </n-form-item>
        </div>

        <div class="section-divider" />

        <!-- ── Section: 归属信息（需组织管理菜单权限 org:read） ───── -->
        <template v-if="canEditOrgAssignment">
        <div class="form-section">
          <div class="section-label">归属信息</div>

          <!-- 所属客服 -->
          <n-form-item path="agentId">
            <template #label>
              <FormFieldHelpLabel label="所属客服" catalog-key="user.form.agentId" />
            </template>
            <n-select
              v-model:value="formData.agentId"
              :options="agentOptions"
              placeholder="请选择所属客服（选填）"
              clearable
              filterable
            />
          </n-form-item>

          <!-- 所属导师 -->
          <n-form-item path="mentorId">
            <template #label>
              <FormFieldHelpLabel label="所属导师" catalog-key="user.form.mentorId" />
            </template>
            <n-select
              v-model:value="formData.mentorId"
              :options="mentorOptions"
              placeholder="请选择所属导师（选填）"
              clearable
              filterable
              @update:value="onMentorChange"
            />
          </n-form-item>

          <!-- 所属门派 — 导师选中时自动关联，否则手动选 -->
          <n-form-item path="schoolId">
            <template #label>
              <FormFieldHelpLabel label="所属门派" catalog-key="user.form.schoolId" />
            </template>
            <n-input
              v-if="derivedSchoolName"
              :value="derivedSchoolName"
              disabled
              placeholder="由所属导师自动关联"
            />
            <n-select
              v-else
              v-model:value="formData.schoolId"
              :options="schoolOptions"
              placeholder="请选择所属门派（选填）"
              clearable
              filterable
            />
          </n-form-item>
        </div>
        </template>
        </n-form>

        <div v-if="detail" class="form-section audit-embed">
          <div class="section-label">操作日志</div>
          <AuditLogTable
            table-name="users"
            :record-id="detail.id"
            :reload-nonce="auditReloadNonce"
          />
        </div>
      </template>

      <!-- ─── Footer Actions ────────────────────────────────────── -->
      <template #footer>
        <div class="drawer-footer drawer-footer-bar">
          <n-button :disabled="submitting" @click="handleCancel">取消</n-button>
          <n-button
            type="primary"
            :loading="submitting"
            :disabled="loading || !!loadError || submitting"
            @click="handleSubmit"
          >
            保存
          </n-button>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import {
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NButton,
  NIcon,
  NTag,
  NSpin,
  useMessage,
  type FormInst,
  type SelectOption,
} from 'naive-ui'
import { AlertCircleOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'
import { usePermission } from '@/composables/usePermission'
import { MENU_PERMS } from '@/utils/permission'
import type { UserDetail, UpdateUserDto, MentorOption } from '@/types/user'
import AuditLogTable from '@/components/common/AuditLogTable.vue'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'

// ─── Props & Emits ───────────────────────────────────────────────
const props = defineProps<{
  show: boolean
  userId: number | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'updated'): void
}>()

// ─── Stores & Composables ────────────────────────────────────────
const userStore = useUserStore()
const { hasMenuPermission } = usePermission()
const message = useMessage()

const canEditOrgAssignment = computed(() => hasMenuPermission(MENU_PERMS.ORG_MANAGEMENT))

const auditReloadNonce = ref(0)

// ─── Loading & Detail State ──────────────────────────────────────
const loading = ref(false)
const loadError = ref('')
const detail = ref<UserDetail | null>(null)
const submitting = ref(false)
const phoneError = ref('')

const codeVerifyTagType = computed(() => {
  const s = detail.value?.codeVerifyStatus
  if (s === 'VERIFIED') return 'success' as const
  if (s === 'INVALID') return 'error' as const
  if (s === 'FAILED') return 'default' as const
  return 'warning' as const
})

const codeVerifyTagLabel = computed(() => {
  const s = detail.value?.codeVerifyStatus
  if (s === 'VERIFIED') return '已验证'
  if (s === 'PENDING_VERIFY') return '编码待验证'
  if (s === 'INVALID') return '编码无效'
  if (s === 'FAILED') return '校验未响应'
  return '—'
})

// ─── Form State ──────────────────────────────────────────────────
const formRef = ref<FormInst | null>(null)
const formData = reactive<UpdateUserDto>({
  rightLeopardId: '',
  larkId: '',
  larkPhone: '',
  larkNickname: '',
  agentId: null,
  mentorId: null,
  schoolId: null,
})

// ─── Load user detail when drawer opens ─────────────────────────
watch(
  () => props.show,
  (visible) => {
    if (visible && props.userId != null) {
      loadDetail()
    }
  },
)

async function loadDetail() {
  if (props.userId == null) return
  loading.value = true
  loadError.value = ''
  try {
    const data = await userStore.fetchUserDetail(props.userId)
    detail.value = data
    prefillForm(data)
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function prefillForm(data: UserDetail) {
  formData.rightLeopardId = data.rightLeopardId ?? ''
  formData.larkId = data.larkId ?? ''
  formData.larkPhone = data.larkPhone ?? ''
  formData.larkNickname = data.larkNickname ?? ''
  formData.agentId = data.agentId || null
  formData.mentorId = data.mentorId || null
  formData.schoolId = data.schoolId || null
  phoneError.value = ''
}

// ─── Derived school name from selected mentor ────────────────────
const derivedSchoolName = computed(() => {
  if (!formData.mentorId) return ''
  const mentor = userStore.options.mentors.find(
    (m: MentorOption) => m.id === formData.mentorId,
  )
  return mentor?.schoolName ?? ''
})

// Auto-sync schoolId from mentor selection
watch(
  () => formData.mentorId,
  (mentorId) => {
    if (mentorId) {
      const mentor = userStore.options.mentors.find(
        (m: MentorOption) => m.id === mentorId,
      )
      if (mentor) {
        formData.schoolId = mentor.schoolId
      }
    } else {
      formData.schoolId = null
    }
  },
)

// ─── Dropdown Options ────────────────────────────────────────────
const agentOptions = computed<SelectOption[]>(() =>
  userStore.options.agents.map((a) => ({ label: a.name, value: a.id })),
)

const mentorOptions = computed<SelectOption[]>(() =>
  userStore.options.mentors.map((m: MentorOption) => ({
    label: `${m.name}（${m.schoolName}）`,
    value: m.id,
  })),
)

const schoolOptions = computed<SelectOption[]>(() =>
  userStore.options.schools.map((s) => ({ label: s.name, value: s.id })),
)

// ─── Phone validation ────────────────────────────────────────────
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/

function validatePhone() {
  const phone = formData.larkPhone?.trim() ?? ''
  if (!phone) {
    phoneError.value = ''
    return
  }
  if (!PHONE_REGEX.test(phone)) {
    phoneError.value = '手机号格式不正确，请确认为 11 位中国大陆手机号'
  } else {
    phoneError.value = ''
  }
}

function onMentorChange() {
  // schoolId is auto-synced via watcher
}

// ─── Submit ──────────────────────────────────────────────────────
async function handleSubmit() {
  validatePhone()
  if (phoneError.value) return
  if (props.userId == null) return

  submitting.value = true
  try {
    const dto: UpdateUserDto = {
      rightLeopardId: formData.rightLeopardId?.trim() || undefined,
      larkId: formData.larkId?.trim() || undefined,
      larkPhone: formData.larkPhone?.trim() || undefined,
      larkNickname: formData.larkNickname?.trim() || undefined,
    }
    if (canEditOrgAssignment.value) {
      dto.agentId = formData.agentId ?? null
      dto.mentorId = formData.mentorId ?? null
      dto.schoolId = formData.schoolId ?? null
    }

    await userStore.updateUserRecord(props.userId, dto)
    message.success('保存成功')
    auditReloadNonce.value += 1
    emit('updated')
    closeDrawer()
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '保存失败，请重试'
    message.error(errMsg)
  } finally {
    submitting.value = false
  }
}

// ─── Close / Cancel ──────────────────────────────────────────────
function handleCancel() {
  if (submitting.value) return
  closeDrawer()
}

function handleDrawerUpdate(val: boolean) {
  if (!val && !submitting.value) {
    closeDrawer()
  }
}

function closeDrawer() {
  emit('update:show', false)
  resetState()
}

function resetState() {
  detail.value = null
  loadError.value = ''
  phoneError.value = ''
  formData.rightLeopardId = ''
  formData.larkId = ''
  formData.larkPhone = ''
  formData.larkNickname = ''
  formData.agentId = null
  formData.mentorId = null
  formData.schoolId = null
}
</script>

<style scoped>
/* ─── Drawer Header ──────────────────────────────────────────── */
.drawer-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.drawer-subtitle {
  font-size: 12px;
  color: var(--text-muted);
}

/* ─── Loading / Error State ──────────────────────────────────── */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 0;
}

.loading-text {
  font-size: 13px;
  color: var(--text-muted);
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 0;
  text-align: center;
}

.error-text {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ─── Readonly field ─────────────────────────────────────────── */
.readonly-field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--hover-bg);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  width: 100%;
}

.readonly-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  flex: 1;
}

/* ─── Form Layout ─────────────────────────────────────────────── */
.edit-form {
  padding: 0;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: 4px 0 12px;
}

.section-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 8px 0 20px;
}

.audit-embed {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-subtle);
}

/* ─── Inline messages ─────────────────────────────────────────── */
.inline-error {
  font-size: 12px;
  color: #ef4444;
  display: block;
  margin-top: 4px;
}

/* ─── Mono fields ─────────────────────────────────────────────── */
:deep(.mono-input .n-input__input-el) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

/* ─── Footer ─────────────────────────────────────────────────── */
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}
</style>
