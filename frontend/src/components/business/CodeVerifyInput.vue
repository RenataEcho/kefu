<template>
  <div class="code-verify-input">
    <n-input
      v-model:value="inputValue"
      :status="inputStatus"
      :placeholder="placeholder"
      :disabled="state === 'loading'"
      class="font-mono"
      @blur="handleBlur"
    >
      <template #suffix>
        <n-icon v-if="state === 'loading'" class="animate-spin code-verify-input__spin">
          <ReloadOutline />
        </n-icon>
        <n-icon v-else-if="state === 'valid'" class="code-verify-input__ok">
          <CheckmarkCircleOutline />
        </n-icon>
        <n-icon v-else-if="state === 'invalid'" class="code-verify-input__err">
          <CloseCircleOutline />
        </n-icon>
      </template>
    </n-input>
    <p v-if="state === 'valid'" class="verify-hint verify-hint--valid">
      <n-icon size="12"><CheckmarkCircleOutline /></n-icon>
      编码有效
    </p>
    <p v-else-if="state === 'invalid'" class="verify-hint verify-hint--invalid">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NIcon } from 'naive-ui'
import { ReloadOutline, CheckmarkCircleOutline, CloseCircleOutline } from '@vicons/ionicons5'

interface VerifyResult {
  valid: boolean
  message?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    onVerify: (code: string) => Promise<VerifyResult>
    placeholder?: string
  }>(),
  {
    placeholder: '请输入右豹编码',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'verify-state-change', state: State): void
}>()

type State = 'idle' | 'loading' | 'valid' | 'invalid'

const state = ref<State>('idle')
const errorMessage = ref('')

const inputValue = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const inputStatus = computed(() => {
  if (state.value === 'valid') return 'success'
  if (state.value === 'invalid') return 'error'
  return undefined
})

const handleBlur = async () => {
  if (!inputValue.value?.trim()) return

  state.value = 'loading'
  errorMessage.value = ''
  emit('verify-state-change', 'loading')

  try {
    const result = await props.onVerify(inputValue.value)
    if (result.valid) {
      state.value = 'valid'
    } else {
      state.value = 'invalid'
      errorMessage.value = result.message || '编码不存在'
    }
  } catch {
    state.value = 'invalid'
    errorMessage.value = '校验服务暂时不可用'
  } finally {
    emit('verify-state-change', state.value)
  }
}

defineExpose({
  state,
  reset: () => {
    state.value = 'idle'
    errorMessage.value = ''
    emit('verify-state-change', 'idle')
  },
})
</script>

<style scoped>
.code-verify-input {
  position: relative;
}

.verify-hint {
  margin: 4px 0 0;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.verify-hint--valid {
  color: var(--status-success);
}

.verify-hint--invalid {
  color: var(--status-error);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.code-verify-input__spin {
  color: var(--accent);
}

.code-verify-input__ok {
  color: var(--status-success);
}

.code-verify-input__err {
  color: var(--status-error);
}
</style>
