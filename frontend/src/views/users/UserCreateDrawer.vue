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
          <span class="drawer-title">新增用户</span>
          <span class="drawer-subtitle">录入新用户主档信息</span>
        </div>
      </template>

      <!-- ─── Youbao API Degraded Banner ──────────────────────────── -->
      <div v-if="appStore.youbaoApiDegraded" class="degraded-banner">
        <n-icon :component="WarningOutline" size="16" />
        <span>右豹校验服务当前不可用</span>
        <span v-if="!isAdmin" class="degraded-notice">普通客服无法在降级状态下创建用户，请联系管理员处理</span>
      </div>

      <!-- ─── Form ─────────────────────────────────────────────────── -->
      <n-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="top"
        label-width="auto"
        require-mark-placement="right-hanging"
        class="create-form"
        @submit.prevent="handleSubmit"
      >
        <!-- ── Section: 基础信息 ──────────────────────────────────── -->
        <div class="form-section">
          <div class="section-label">基础信息</div>

          <!-- 右豹编码 — CodeVerifyInput -->
          <n-form-item path="rightLeopardCode" required>
            <template #label>
              <FormFieldHelpLabel label="右豹编码" catalog-key="user.form.rightLeopardCode" />
            </template>
            <div class="code-verify-wrapper">
              <CodeVerifyInput
                v-model="formData.rightLeopardCode"
                :on-verify="handleCodeVerify"
                placeholder="请输入右豹编码"
                @verify-state-change="onVerifyStateChange"
              />
              <!-- Skip verify button — admin only when API is degraded -->
              <div v-if="showSkipButton" class="skip-verify-row">
                <n-checkbox v-model:checked="formData.skipVerify">
                  <span class="skip-label">暂跳过校验（录入后标记为「编码待验证」，API 恢复后 30 分钟内自动补校验）</span>
                </n-checkbox>
              </div>
              <!-- Warning: api degraded and non-admin -->
              <p v-if="appStore.youbaoApiDegraded && !isAdmin" class="inline-warn">
                <n-icon :component="WarningOutline" size="12" />
                校验服务暂时无响应，请稍后重试
              </p>
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

        <!-- ── Section: 归属信息 ──────────────────────────────────── -->
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

          <!-- 所属门派 — auto-derived from mentor, read-only display -->
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
      </n-form>

      <!-- ─── Footer Actions ────────────────────────────────────── -->
      <template #footer>
        <div class="drawer-footer drawer-footer-bar">
          <n-button :disabled="submitting" @click="handleCancel">取消</n-button>
          <n-button
            type="primary"
            :loading="submitting"
            :disabled="isSubmitDisabled"
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
  NCheckbox,
  useMessage,
  type FormInst,
  type FormRules,
  type SelectOption,
} from 'naive-ui'
import { WarningOutline } from '@vicons/ionicons5'
import CodeVerifyInput from '@/components/business/CodeVerifyInput.vue'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { usePermission } from '@/composables/usePermission'
import { verifyUserCode } from '@/api/users'
import type { CreateUserDto, MentorOption } from '@/types/user'

// ─── Props & Emits ───────────────────────────────────────────────
const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'created'): void
}>()

// ─── Stores & Composables ────────────────────────────────────────
const appStore = useAppStore()
const userStore = useUserStore()
const { hasOperationPermission } = usePermission()
const message = useMessage()

const isAdmin = computed(() => hasOperationPermission('*'))

// ─── Show skip button: admin + API degraded ──────────────────────
const showSkipButton = computed(
  () => appStore.youbaoApiDegraded && isAdmin.value,
)

// ─── Form State ──────────────────────────────────────────────────
const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const codeVerifyState = ref<'idle' | 'loading' | 'valid' | 'invalid'>('idle')
const phoneError = ref('')

const formData = reactive<CreateUserDto & { skipVerify: boolean }>({
  rightLeopardCode: '',
  rightLeopardId: '',
  larkId: '',
  larkPhone: '',
  larkNickname: '',
  agentId: null,
  mentorId: null,
  schoolId: null,
  skipVerify: false,
})

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

// ─── Form Rules ──────────────────────────────────────────────────
const formRules: FormRules = {
  rightLeopardCode: [
    { required: true, message: '请输入右豹编码', trigger: ['blur', 'input'] },
  ],
}

// ─── Phone validation (non-blocking per spec) ───────────────────
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

// ─── Code verify callback (called by CodeVerifyInput on blur) ────
async function handleCodeVerify(code: string): Promise<{ valid: boolean; message?: string }> {
  // If API is degraded and admin has opted to skip, bypass verify
  if (formData.skipVerify && appStore.youbaoApiDegraded && isAdmin.value) {
    return { valid: true }
  }
  try {
    const result = await verifyUserCode(code)
    // If verify call reveals the API is timing out, flag degraded state
    return result
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('暂时无响应') || msg.includes('不可达')) {
      appStore.setYoubaoApiDegraded(true)
    }
    return { valid: false, message: msg || '校验服务暂时无响应，请稍后重试' }
  }
}

function onVerifyStateChange(state: 'idle' | 'loading' | 'valid' | 'invalid') {
  codeVerifyState.value = state
}

function onMentorChange() {
  // schoolId is auto-synced via watcher
}

// ─── Submit gate ─────────────────────────────────────────────────
const isSubmitDisabled = computed(() => {
  if (submitting.value) return true
  if (!formData.rightLeopardCode?.trim()) return true
  // Block if code is invalid and skip is not enabled
  if (codeVerifyState.value === 'invalid' && !formData.skipVerify) return true
  // Block if code is still being verified
  if (codeVerifyState.value === 'loading') return true
  // Block if API degraded and not admin (no skip channel)
  if (appStore.youbaoApiDegraded && !isAdmin.value) return true
  return false
})

// ─── Submit ──────────────────────────────────────────────────────
async function handleSubmit() {
  // Validate phone before submit
  validatePhone()
  if (phoneError.value) return

  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  // Code must be verified (or skip allowed for admin when degraded)
  if (
    codeVerifyState.value !== 'valid' &&
    !(formData.skipVerify && isAdmin.value && appStore.youbaoApiDegraded)
  ) {
    message.warning('请先完成右豹编码校验')
    return
  }

  submitting.value = true
  try {
    const dto: CreateUserDto = {
      rightLeopardCode: formData.rightLeopardCode.trim(),
      rightLeopardId: formData.rightLeopardId?.trim() || undefined,
      larkId: formData.larkId?.trim() || undefined,
      larkPhone: formData.larkPhone?.trim() || undefined,
      larkNickname: formData.larkNickname?.trim() || undefined,
      agentId: formData.agentId ?? undefined,
      mentorId: formData.mentorId ?? undefined,
      schoolId: formData.schoolId ?? undefined,
      skipVerify: formData.skipVerify,
    }

    await userStore.createUserRecord(dto)
    message.success('用户已录入')
    emit('created')
    closeDrawer()
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : '录入失败，请重试'
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
  resetForm()
}

function resetForm() {
  formData.rightLeopardCode = ''
  formData.rightLeopardId = ''
  formData.larkId = ''
  formData.larkPhone = ''
  formData.larkNickname = ''
  formData.agentId = null
  formData.mentorId = null
  formData.schoolId = null
  formData.skipVerify = false
  codeVerifyState.value = 'idle'
  phoneError.value = ''
  formRef.value?.restoreValidation()
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

/* ─── Degraded Banner ────────────────────────────────────────── */
.degraded-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: rgba(251, 146, 60, 0.1);
  border: 1px solid rgba(251, 146, 60, 0.3);
  color: #fb923c;
  font-size: 13px;
  line-height: 1.5;
  flex-wrap: wrap;
}

.degraded-notice {
  color: var(--text-secondary);
  font-size: 12px;
  width: 100%;
  margin-top: 2px;
}

/* ─── Form Layout ─────────────────────────────────────────────── */
.create-form {
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

/* ─── Code Verify Wrapper ────────────────────────────────────── */
.code-verify-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.skip-verify-row {
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
}

.skip-label {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* ─── Inline messages ─────────────────────────────────────────── */
.inline-error {
  font-size: 12px;
  color: #ef4444;
  display: block;
  margin-top: 4px;
}

.inline-warn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #fb923c;
  margin: 0;
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
