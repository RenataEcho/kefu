<template>
  <div class="login-page">
    <!-- 背景渐变光晕 -->
    <div class="bg-mesh" />

    <div class="login-container glass">
      <!-- Logo & Title -->
      <div class="login-header">
        <div class="login-logo">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <rect width="44" height="44" rx="14" fill="#6366f1" />
            <path d="M13 22l6 6 12-12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <h1 class="login-title">客户服务中心</h1>
        <p class="login-subtitle">内部运营管理系统</p>
      </div>

      <!-- 登录表单 -->
      <n-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        size="large"
        class="login-form"
        @keydown.enter="handleLogin"
      >
        <n-form-item path="loginId">
          <template #label>
            <FormFieldHelpLabel label="账号" catalog-key="login.form.loginId" />
          </template>
          <n-input
            v-model:value="formData.loginId"
            placeholder="请输入账号名"
            :input-props="{ autocomplete: 'username' }"
            :disabled="loading"
          >
            <template #prefix>
              <n-icon :component="PersonOutline" :size="16" style="color: var(--text-muted)" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="password">
          <template #label>
            <FormFieldHelpLabel label="密码" catalog-key="login.form.password" />
          </template>
          <n-input
            v-model:value="formData.password"
            type="password"
            placeholder="请输入密码"
            show-password-on="click"
            :input-props="{ autocomplete: 'current-password' }"
            :disabled="loading"
          >
            <template #prefix>
              <n-icon :component="LockClosedOutline" :size="16" style="color: var(--text-muted)" />
            </template>
          </n-input>
        </n-form-item>

        <n-button
          type="primary"
          block
          size="large"
          :loading="loading"
          class="login-btn"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </n-button>
      </n-form>

      <!-- 测试账号提示 -->
      <div class="login-hint">
        <span class="hint-label">测试账号</span>
        <div class="hint-accounts">
          <n-tooltip v-for="acc in testAccounts" :key="acc.role" trigger="hover" placement="bottom">
            <template #trigger>
              <span class="hint-tag" @click="fillTestAccount(acc.loginId)">
                {{ acc.loginId }}
              </span>
            </template>
            {{ acc.label }}
          </n-tooltip>
        </div>
        <span class="hint-password">密码均为 <code>123456</code></span>
        <p class="hint-supplement">
          补充需求里的菜单、列表列、表单字段会随<strong>角色与字段权限</strong>裁剪。要一次性对照验收，请用
          <strong>admin</strong> 登录；例如 <code>kefu</code> 账号无「付费记录 / 组织管理 / 权限管理」等菜单，且用户表「项目收益」列需
          <code>paymentAmount</code> 字段权限才会显示。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { PersonOutline, LockClosedOutline } from '@vicons/ionicons5'
import { post } from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import type { AuthUser } from '@/stores/auth'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'

interface LoginResponse {
  accessToken: string
  expiresIn: number
  user: AuthUser
}

const testAccounts = [
  { loginId: 'admin', label: '系统管理员（admin）' },
  { loginId: 'supervisor', label: '运营主管（supervisor）' },
  { loginId: 'kefu', label: '普通客服（kefu）' },
  { loginId: 'auditor', label: '审核员（auditor）' },
]

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const formData = reactive({
  loginId: '',
  password: '',
})

const formRules: FormRules = {
  loginId: [{ required: true, message: '请输入账号名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

function fillTestAccount(loginId: string) {
  formData.loginId = loginId
  formData.password = '123456'
}

async function handleLogin() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    const result = await post<LoginResponse>('/auth/login', {
      loginId: formData.loginId,
      password: formData.password,
    })
    authStore.setAuth(result.user, result.accessToken, result.expiresIn)
    message.success(`欢迎回来，${result.user.displayName}`)
    await router.push('/')
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '登录失败，请检查账号密码'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  position: relative;
  overflow: hidden;
}

.bg-mesh {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 40%, rgba(99, 102, 241, 0.18) 0%, transparent 65%),
    radial-gradient(ellipse 60% 50% at 80% 70%, rgba(56, 189, 248, 0.10) 0%, transparent 60%),
    radial-gradient(ellipse 40% 40% at 50% 10%, rgba(129, 140, 248, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

.login-container {
  width: 100%;
  max-width: 420px;
  padding: 48px 40px 40px;
  border-radius: 20px;
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.login-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px;
  letter-spacing: -0.3px;
}

.login-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.login-btn {
  margin-top: 8px;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* 测试账号提示 */
.login-hint {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-subtle);
  text-align: center;
}

.hint-label {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.hint-accounts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-bottom: 8px;
}

.hint-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  background: var(--accent-muted);
  border: 1px solid rgba(99, 102, 241, 0.25);
  color: var(--accent-hover);
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  transition: background 0.15s;
}

.hint-tag:hover {
  background: rgba(99, 102, 241, 0.25);
}

:global([data-theme="light"]) .bg-mesh {
  background:
    radial-gradient(ellipse 80% 60% at 20% 40%, rgba(79, 70, 229, 0.1) 0%, transparent 65%),
    radial-gradient(ellipse 60% 50% at 80% 70%, rgba(56, 189, 248, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 40% 40% at 50% 10%, rgba(129, 140, 248, 0.05) 0%, transparent 50%);
}

.hint-password {
  font-size: 12px;
  color: var(--text-muted);
}

.hint-password code {
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
  background: rgba(148, 163, 184, 0.1);
  padding: 1px 5px;
  border-radius: 4px;
}

.hint-supplement {
  margin: 14px 0 0;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-secondary);
  text-align: left;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.12);
}

.hint-supplement code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}
</style>
