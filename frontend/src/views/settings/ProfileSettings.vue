<template>
  <div class="profile-settings">
    <div class="page-header">
      <div class="header-left">
        <div class="page-title-row">
          <h1 class="page-title">个人设置</h1>
          <PageRuleHelpLink />
        </div>
        <p class="page-desc">修改账号显示名与登录密码（prototype-spec §2.10）</p>
      </div>
    </div>

    <n-spin :show="profileLoading">
      <div class="sections">
        <!-- 基本信息 -->
        <section class="settings-card glass">
          <h2 class="card-title">基本信息</h2>
          <n-form label-placement="top" :show-feedback="true">
            <n-form-item>
              <template #label>
                <FormFieldHelpLabel label="账号名称（显示名）" catalog-key="profile.form.displayName" />
              </template>
              <n-input
                v-model:value="nameDraft"
                placeholder="请输入显示名"
                :maxlength="50"
                show-count
                @keydown.enter.prevent="saveName"
              />
              <template v-if="nameError" #feedback>
                <span class="inline-error">{{ nameError }}</span>
              </template>
            </n-form-item>
            <n-form-item>
              <template #label>
                <FormFieldHelpLabel label="登录账号" catalog-key="profile.form.loginId" />
              </template>
              <n-input :value="profile?.loginId ?? ''" disabled />
            </n-form-item>
            <n-form-item>
              <template #label>
                <FormFieldHelpLabel label="当前角色" catalog-key="profile.form.role" />
              </template>
              <n-input :value="roleLabel" disabled />
            </n-form-item>
            <n-button type="primary" :loading="nameSaving" :disabled="!nameDraft.trim()" @click="saveName">
              保存
            </n-button>
          </n-form>
        </section>

        <!-- 密码 -->
        <section class="settings-card glass">
          <h2 class="card-title">密码修改</h2>
          <n-form label-placement="top">
            <n-form-item>
              <template #label>
                <FormFieldHelpLabel label="当前密码" catalog-key="profile.form.currentPassword" />
              </template>
              <n-input
                v-model:value="pwdCurrent"
                type="password"
                show-password-on="click"
                placeholder="请输入当前密码"
                autocomplete="current-password"
              />
              <template v-if="pwdCurrentError" #feedback>
                <span class="inline-error">{{ pwdCurrentError }}</span>
              </template>
            </n-form-item>
            <n-form-item>
              <template #label>
                <FormFieldHelpLabel label="新密码" catalog-key="profile.form.newPassword" />
              </template>
              <n-input
                v-model:value="pwdNew"
                type="password"
                show-password-on="click"
                placeholder="至少 8 位，含大写、小写、数字"
                autocomplete="new-password"
              />
              <template v-if="pwdNewHint" #feedback>
                <span :class="pwdNewValid ? 'inline-ok' : 'inline-error'">{{ pwdNewHint }}</span>
              </template>
            </n-form-item>
            <n-form-item>
              <template #label>
                <FormFieldHelpLabel label="确认新密码" catalog-key="profile.form.confirmPassword" />
              </template>
              <n-input
                v-model:value="pwdConfirm"
                type="password"
                show-password-on="click"
                placeholder="再次输入新密码"
                autocomplete="new-password"
              />
              <template v-if="pwdMismatchHint" #feedback>
                <span class="inline-error">{{ pwdMismatchHint }}</span>
              </template>
            </n-form-item>
            <n-button
              type="primary"
              :loading="pwdSaving"
              :disabled="!canSubmitPassword"
              @click="savePassword"
            >
              保存新密码
            </n-button>
          </n-form>
        </section>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NSpin,
  useMessage,
} from 'naive-ui'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { fetchMe, patchMe, changeMyPassword } from '@/api/me'
import type { MeProfile } from '@/api/me'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import PageRuleHelpLink from '@/components/common/PageRuleHelpLink.vue'

const message = useMessage()
const authStore = useAuthStore()

const profileLoading = ref(true)
const profile = ref<MeProfile | null>(null)
const nameDraft = ref('')
const nameSaving = ref(false)
const nameError = ref('')

const pwdCurrent = ref('')
const pwdNew = ref('')
const pwdConfirm = ref('')
const pwdCurrentError = ref('')
const pwdSaving = ref(false)

const ROLE_LABELS: Record<string, string> = {
  admin: '超级管理员',
  supervisor: '运营主管',
  kefu: '普通客服',
  auditor: '审核专员',
}

const roleLabel = computed(() => {
  const r = profile.value?.role
  if (!r) return ''
  return ROLE_LABELS[r] ?? r
})

function passwordComplexityOk(p: string): boolean {
  if (p.length < 8) return false
  if (!/[A-Z]/.test(p)) return false
  if (!/[a-z]/.test(p)) return false
  if (!/\d/.test(p)) return false
  return true
}

const pwdNewValid = computed(() => pwdNew.value.length === 0 || passwordComplexityOk(pwdNew.value))

const pwdNewHint = computed(() => {
  if (!pwdNew.value) return ''
  return pwdNewValid.value
    ? '密码强度符合要求'
    : '新密码需至少 8 位，并同时包含大写字母、小写字母与数字'
})

const pwdMismatchHint = ref('')

watch([pwdNew, pwdConfirm], () => {
  if (!pwdConfirm.value) {
    pwdMismatchHint.value = ''
    return
  }
  pwdMismatchHint.value =
    pwdNew.value !== pwdConfirm.value ? '两次输入的密码不一致' : ''
})

const canSubmitPassword = computed(() => {
  return (
    pwdCurrent.value.length > 0 &&
    passwordComplexityOk(pwdNew.value) &&
    pwdNew.value === pwdConfirm.value &&
    !pwdSaving.value
  )
})

async function loadProfile() {
  profileLoading.value = true
  try {
    const data = await fetchMe()
    profile.value = data
    nameDraft.value = data.displayName
  } catch {
    message.error('加载个人信息失败')
    profile.value = authStore.user
      ? {
          id: authStore.user.id,
          loginId: authStore.user.loginId,
          displayName: authStore.user.displayName,
          role: authStore.user.role,
          roleId: authStore.user.roleId,
          isAuditor: authStore.user.isAuditor,
          permissions: authStore.user.permissions,
        }
      : null
    nameDraft.value = authStore.user?.displayName ?? ''
  } finally {
    profileLoading.value = false
  }
}

onMounted(loadProfile)

async function saveName() {
  nameError.value = ''
  const name = nameDraft.value.trim()
  if (!name) {
    nameError.value = '账号名称不能为空'
    return
  }
  nameSaving.value = true
  try {
    const data = await patchMe({ displayName: name })
    profile.value = data
    authStore.updateDisplayName(data.displayName)
    message.success('账号名称已更新')
  } catch {
    message.error('保存失败')
  } finally {
    nameSaving.value = false
  }
}

async function savePassword() {
  pwdCurrentError.value = ''
  if (!canSubmitPassword.value) return
  pwdSaving.value = true
  try {
    await changeMyPassword({
      currentPassword: pwdCurrent.value,
      newPassword: pwdNew.value,
    })
    message.success('密码已更新，下次登录请使用新密码')
    pwdCurrent.value = ''
    pwdNew.value = ''
    pwdConfirm.value = ''
    pwdMismatchHint.value = ''
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 400) {
      const m = (e.response.data as { message?: string })?.message
      pwdCurrentError.value = m || '当前密码不正确'
    } else {
      message.error('修改密码失败')
    }
  } finally {
    pwdSaving.value = false
  }
}
</script>

<style scoped>
.profile-settings {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  max-width: 560px;
}

.page-header {
  margin-bottom: 4px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.sections {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.settings-card {
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--border-subtle);
}

.card-title {
  margin: 0 0 var(--spacing-md);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.inline-error {
  font-size: 12px;
  color: var(--status-error);
}

.inline-ok {
  font-size: 12px;
  color: var(--status-success);
}

.glass {
  background: var(--glass-card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--glass-card-shadow);
}
</style>
