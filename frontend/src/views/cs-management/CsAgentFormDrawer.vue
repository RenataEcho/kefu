<template>
  <n-drawer
    v-model:show="visible"
    :width="420"
    placement="right"
    :trap-focus="false"
    :block-scroll="false"
    class="cs-agent-drawer"
  >
    <n-drawer-content :title="isEdit ? '编辑客服' : '新增客服'" closable>
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" label-width="auto">
        <n-form-item path="name">
          <template #label>
            <FormFieldHelpLabel label="客服名称" catalog-key="cs.form.name" />
          </template>
          <n-input v-model:value="form.name" placeholder="请输入客服名称" maxlength="50" show-count />
        </n-form-item>
        <n-form-item path="agentType">
          <template #label>
            <FormFieldHelpLabel label="客服类型" catalog-key="cs.form.agentType" />
          </template>
          <n-select
            v-model:value="form.agentType"
            :options="agentTypeOptions"
            placeholder="请选择"
          />
        </n-form-item>
        <n-form-item path="feishuPhone">
          <template #label>
            <FormFieldHelpLabel label="飞书手机号" catalog-key="cs.form.feishuPhone" />
          </template>
          <n-input v-model:value="form.feishuPhone" placeholder="选填，11 位大陆手机号" maxlength="11" clearable />
        </n-form-item>
        <template v-if="isEdit && entryFormUrl">
          <n-divider />
          <div class="entry-form-section">
            <p class="entry-form-section__title">信息录入专属码</p>
            <p class="entry-form-section__hint">
              系统根据客服 ID 生成 H5 链接，用户扫码填写资料；链接参数不可修改。
            </p>
            <div class="entry-form-section__row">
              <EntryFormQrThumb :url="entryFormUrl" />
              <n-button size="small" secondary @click="copyEntryUrl">复制链接</n-button>
            </div>
            <n-input size="small" readonly :value="entryFormUrl" />
          </div>
        </template>
        <template v-else-if="!isEdit">
          <n-divider />
          <p class="entry-form-section__hint">
            保存后系统将分配信息录入专属链接（URL 含 agentId，与客服绑定）。
          </p>
        </template>

        <n-form-item>
          <template #label>
            <FormFieldHelpLabel label="企微二维码" catalog-key="cs.form.wxQrcode" />
          </template>
          <div class="upload-wrap">
            <n-upload
              :max="1"
              accept=".jpg,.jpeg,.png"
              list-type="image-card"
              :default-upload="false"
              @before-upload="onBeforeUpload"
              @remove="onRemove"
            >
              点击上传
            </n-upload>
            <p class="upload-hint">仅支持 jpg/png，最大 5MB</p>
            <div v-if="previewUrl" class="preview-box">
              <span class="preview-label">当前预览</span>
              <img :src="previewUrl" alt="企微二维码预览" class="preview-img" />
            </div>
          </div>
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="drawer-footer drawer-footer-bar">
          <n-button @click="close">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="submit">保存</n-button>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FormInst, FormRules, UploadFileInfo } from 'naive-ui'
import {
  NButton,
  NDivider,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NUpload,
  useMessage,
} from 'naive-ui'
import { createCsAgent, fetchCsAgentDetail, updateCsAgent } from '@/api/csAgents'
import type { CsAgentType } from '@/types/csAgent'
import { CS_AGENT_TYPE_LABELS } from '@/types/csAgent'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import EntryFormQrThumb from '@/components/cs-management/EntryFormQrThumb.vue'

const props = defineProps<{
  show: boolean
  agentId: number | null
}>()

const emit = defineEmits<{
  'update:show': [boolean]
  saved: []
}>()

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const previewUrl = ref<string | null>(null)
const pendingDataUrl = ref<string | null>(null)
const entryFormUrl = ref('')

const visible = computed({
  get: () => props.show,
  set: (v: boolean) => emit('update:show', v),
})

const isEdit = computed(() => props.agentId != null)

const agentTypeOptions = [
  { label: CS_AGENT_TYPE_LABELS.NORMAL, value: 'NORMAL' as const },
  { label: CS_AGENT_TYPE_LABELS.PAID, value: 'PAID' as const },
]

const form = ref({
  name: '',
  agentType: 'NORMAL' as CsAgentType,
  feishuPhone: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入客服名称', trigger: ['blur', 'input'] },
    { min: 1, max: 50, message: '名称长度 1～50 字', trigger: ['blur', 'input'] },
  ],
  agentType: [{ required: true, message: '请选择客服类型', trigger: ['change'] }],
  feishuPhone: [
    {
      validator: (_rule, value: string) => {
        const v = (value || '').trim()
        if (!v) return true
        return /^1[3-9]\d{9}$/.test(v)
      },
      message: '请输入正确的 11 位手机号',
      trigger: ['blur', 'input'],
    },
  ],
}

function reset() {
  form.value.name = ''
  form.value.agentType = 'NORMAL'
  form.value.feishuPhone = ''
  previewUrl.value = null
  pendingDataUrl.value = null
  entryFormUrl.value = ''
}

async function copyEntryUrl() {
  if (!entryFormUrl.value) return
  try {
    await navigator.clipboard.writeText(entryFormUrl.value)
    message.success('已复制录入链接')
  } catch {
    message.error('复制失败')
  }
}

watch(
  () => [props.show, props.agentId] as const,
  async ([open, id]) => {
    if (!open) return
    reset()
    if (id != null) {
      try {
        const d = await fetchCsAgentDetail(id)
        form.value.name = d.name
        form.value.agentType = d.agentType
        form.value.feishuPhone = d.feishuPhone || ''
        previewUrl.value = d.wxQrcodeUrl
        pendingDataUrl.value = null
        entryFormUrl.value = d.entryFormUrl || ''
      } catch {
        message.error('加载客服信息失败')
        visible.value = false
      }
    }
  },
)

function close() {
  visible.value = false
}

function onBeforeUpload(data: { file: UploadFileInfo }) {
  const f = data.file.file
  if (!f) return false
  const okType = ['image/jpeg', 'image/png'].includes(f.type)
  if (!okType) {
    message.error('仅支持 jpg/png 格式图片')
    return false
  }
  if (f.size > 5 * 1024 * 1024) {
    message.error('图片大小不能超过 5MB')
    return false
  }
  const reader = new FileReader()
  reader.onload = () => {
    const url = typeof reader.result === 'string' ? reader.result : null
    if (url) {
      pendingDataUrl.value = url
      previewUrl.value = url
    }
  }
  reader.readAsDataURL(f)
  return false
}

function onRemove() {
  previewUrl.value = null
  pendingDataUrl.value = null
}

async function submit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value && props.agentId != null) {
      await updateCsAgent(props.agentId, {
        name: form.value.name.trim(),
        agentType: form.value.agentType,
        feishuPhone: form.value.feishuPhone.trim(),
        ...(pendingDataUrl.value ? { wxQrcodeUrl: pendingDataUrl.value } : {}),
      })
      message.success('已保存')
    } else {
      await createCsAgent({
        name: form.value.name.trim(),
        agentType: form.value.agentType,
        feishuPhone: form.value.feishuPhone.trim() || undefined,
        ...(pendingDataUrl.value ? { wxQrcodeUrl: pendingDataUrl.value } : {}),
      })
      message.success('客服已创建')
    }
    emit('saved')
    close()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.upload-wrap {
  width: 100%;
}

.upload-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.preview-box {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.preview-img {
  width: 120px;
  height: 120px;
  object-fit: contain;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--card-inner-bg);
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.entry-form-section {
  margin-bottom: 8px;
}

.entry-form-section__title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.entry-form-section__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.entry-form-section__row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
</style>
