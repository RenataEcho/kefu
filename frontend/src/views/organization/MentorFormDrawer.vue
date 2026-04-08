<template>
  <n-drawer v-model:show="visible" :width="560" placement="right" @after-leave="onAfterLeave">
    <n-drawer-content :title="isEdit ? '编辑导师' : '新增导师'" closable>
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" label-width="auto">
        <n-form-item path="name">
          <template #label>
            <FormFieldHelpLabel label="导师名称" catalog-key="mentor.form.name" />
          </template>
          <n-input v-model:value="form.name" placeholder="请输入导师名称" maxlength="64" show-count />
        </n-form-item>
        <n-form-item path="schoolId">
          <template #label>
            <FormFieldHelpLabel label="所属门派" catalog-key="mentor.form.schoolId" />
          </template>
          <n-select
            v-model:value="form.schoolId"
            :options="schoolOptions"
            placeholder="请选择所属门派"
            filterable
            :loading="optionsLoading"
          />
        </n-form-item>
        <n-form-item path="mentorTypeId">
          <template #label>
            <FormFieldHelpLabel label="导师类型" catalog-key="mentor.form.mentorTypeId" />
          </template>
          <n-select
            v-model:value="form.mentorTypeId"
            :options="typeOptions"
            placeholder="请选择导师类型"
            filterable
            :loading="typesLoading"
          />
        </n-form-item>
        <n-form-item path="feishuPhone">
          <template #label>
            <FormFieldHelpLabel label="飞书手机号" catalog-key="mentor.form.feishuPhone" />
          </template>
          <n-input v-model:value="form.feishuPhone" placeholder="选填，11 位大陆手机号" maxlength="11" clearable />
        </n-form-item>
        <n-form-item path="introductionHtml">
          <template #label>
            <FormFieldHelpLabel label="导师介绍" catalog-key="mentor.form.introductionHtml" />
          </template>
          <RichTextEditor v-model="form.introductionHtml" :min-height="220" />
        </n-form-item>
        <n-form-item v-if="isEdit" path="status">
          <template #label>
            <FormFieldHelpLabel label="状态" catalog-key="mentor.form.status" />
          </template>
          <n-select v-model:value="form.status" :options="statusOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="drawer-footer drawer-footer-bar">
          <n-button @click="visible = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="submit">保存</n-button>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
import { useMessage } from 'naive-ui'
import type { MentorListItem, MentorStatus } from '@/types/mentor'
import { createMentor, updateMentor } from '@/api/mentors'
import { fetchSchoolOptions } from '@/api/schools'
import { fetchMentorTypes } from '@/api/mentorTypes'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import RichTextEditor from '@/components/common/RichTextEditor.vue'

const props = defineProps<{
  show: boolean
  mentor: MentorListItem | null
}>()

const emit = defineEmits<{
  'update:show': [boolean]
  saved: []
}>()

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const saving = ref(false)
const optionsLoading = ref(false)
const typesLoading = ref(false)
const schoolOptions = ref<{ label: string; value: number }[]>([])
const typeOptions = ref<{ label: string; value: number }[]>([])

const visible = computed({
  get: () => props.show,
  set: (v: boolean) => emit('update:show', v),
})

const isEdit = computed(() => props.mentor != null)

const form = ref({
  name: '',
  schoolId: null as number | null,
  mentorTypeId: null as number | null,
  feishuPhone: '',
  introductionHtml: '<p></p>',
  status: 'ENABLED' as MentorStatus,
})

const statusOptions = [
  { label: '启用', value: 'ENABLED' as const },
  { label: '禁用', value: 'DISABLED' as const },
]

const rules: FormRules = {
  name: [
    { required: true, message: '请输入导师名称', trigger: ['blur', 'input'] },
    { min: 1, max: 64, message: '1～64 个字符', trigger: ['blur'] },
  ],
  schoolId: [
    {
      required: true,
      validator(_rule, value: number | null) {
        if (value == null || Number.isNaN(value)) {
          return new Error('请选择所属门派')
        }
        return true
      },
      trigger: ['change', 'blur'],
    },
  ],
  mentorTypeId: [
    {
      required: true,
      validator(_rule, value: number | null) {
        if (value == null || Number.isNaN(value)) {
          return new Error('请选择导师类型')
        }
        return true
      },
      trigger: ['change', 'blur'],
    },
  ],
  feishuPhone: [
    {
      validator(_rule, value: string) {
        const v = (value || '').trim()
        if (!v) return true
        if (!/^1[3-9]\d{9}$/.test(v)) {
          return new Error('请输入正确的 11 位手机号')
        }
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
}

async function loadSchoolOptions() {
  optionsLoading.value = true
  try {
    const list = await fetchSchoolOptions()
    schoolOptions.value = list.map((s) => ({ label: s.name, value: s.id }))
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载门派失败')
  } finally {
    optionsLoading.value = false
  }
}

async function loadTypeOptions() {
  typesLoading.value = true
  try {
    const list = await fetchMentorTypes()
    typeOptions.value = list
      .filter((t) => t.status === 'ENABLED' || (props.mentor && t.id === props.mentor.mentorTypeId))
      .map((t) => ({ label: t.name, value: t.id }))
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载导师类型失败')
  } finally {
    typesLoading.value = false
  }
}

watch(
  () => props.show,
  (open) => {
    if (open) {
      void loadSchoolOptions()
      void loadTypeOptions()
    }
  },
)

watch(
  () => [props.show, props.mentor] as const,
  ([open, m]) => {
    if (!open) return
    if (m) {
      form.value = {
        name: m.name,
        schoolId: m.schoolId,
        mentorTypeId: m.mentorTypeId,
        feishuPhone: m.feishuPhone || '',
        introductionHtml: m.introductionHtml ?? '<p></p>',
        status: m.status,
      }
    } else {
      form.value = {
        name: '',
        schoolId: null,
        mentorTypeId: null,
        feishuPhone: '',
        introductionHtml: '<p></p>',
        status: 'ENABLED',
      }
    }
  },
)

function onAfterLeave() {
  formRef.value?.restoreValidation()
}

async function submit() {
  await formRef.value?.validate()
  const sid = form.value.schoolId
  const tid = form.value.mentorTypeId
  if (sid == null || tid == null) {
    message.error('请完整填写必填项')
    return
  }
  saving.value = true
  try {
    const intro = form.value.introductionHtml.trim() || '<p></p>'
    const phone = form.value.feishuPhone.trim()
    if (isEdit.value && props.mentor) {
      await updateMentor(props.mentor.id, {
        name: form.value.name.trim(),
        schoolId: sid,
        status: form.value.status,
        mentorTypeId: tid,
        feishuPhone: phone,
        introductionHtml: intro,
      })
      message.success('修改成功')
    } else {
      await createMentor({
        name: form.value.name.trim(),
        schoolId: sid,
        mentorTypeId: tid,
        feishuPhone: phone || undefined,
        introductionHtml: intro,
      })
      message.success('创建成功')
    }
    visible.value = false
    emit('saved')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
