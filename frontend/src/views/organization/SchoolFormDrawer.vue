<template>
  <n-drawer v-model:show="visible" :width="560" placement="right" @after-leave="onAfterLeave">
    <n-drawer-content :title="isEdit ? '编辑门派' : '新增门派'" closable>
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" label-width="auto">
        <n-form-item path="name">
          <template #label>
            <FormFieldHelpLabel label="门派名称" catalog-key="school.form.name" />
          </template>
          <n-input v-model:value="form.name" placeholder="请输入门派名称" maxlength="64" show-count />
        </n-form-item>
        <n-form-item path="principalName">
          <template #label>
            <FormFieldHelpLabel label="门派负责人" catalog-key="school.form.principalName" />
          </template>
          <n-input v-model:value="form.principalName" placeholder="请输入负责人姓名" maxlength="64" show-count />
        </n-form-item>
        <n-form-item>
          <template #label>
            <FormFieldHelpLabel label="门派项目数" catalog-key="school.form.schoolProjectCount" />
          </template>
          <div class="readonly-metric">{{ displaySchoolProjectCount }}</div>
        </n-form-item>
        <n-form-item path="introductionHtml">
          <template #label>
            <FormFieldHelpLabel label="门派介绍" catalog-key="school.form.introductionHtml" />
          </template>
          <RichTextEditor v-model="form.introductionHtml" :min-height="220" />
        </n-form-item>
        <n-form-item v-if="isEdit" path="status">
          <template #label>
            <FormFieldHelpLabel label="状态" catalog-key="school.form.status" />
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
import type { SchoolListItem, SchoolStatus } from '@/types/school'
import { createSchool, updateSchool } from '@/api/schools'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import RichTextEditor from '@/components/common/RichTextEditor.vue'

const props = defineProps<{
  show: boolean
  school: SchoolListItem | null
}>()

const emit = defineEmits<{
  'update:show': [boolean]
  saved: []
}>()

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const saving = ref(false)

const visible = computed({
  get: () => props.show,
  set: (v: boolean) => emit('update:show', v),
})

const isEdit = computed(() => props.school != null)

/** 列表/详情接口已聚合；新建门派尚无导师项目时为 0 */
const displaySchoolProjectCount = computed(() =>
  props.school != null ? props.school.schoolProjectCount : 0,
)

const form = ref({
  name: '',
  principalName: '',
  introductionHtml: '<p></p>',
  status: 'ENABLED' as SchoolStatus,
})

const statusOptions = [
  { label: '启用', value: 'ENABLED' as const },
  { label: '禁用', value: 'DISABLED' as const },
]

const rules: FormRules = {
  name: [
    { required: true, message: '请输入门派名称', trigger: ['blur', 'input'] },
    { min: 1, max: 64, message: '1～64 个字符', trigger: ['blur'] },
  ],
  principalName: [
    { required: true, message: '请输入门派负责人', trigger: ['blur', 'input'] },
    { max: 64, message: '最多 64 个字符', trigger: 'blur' },
  ],
}

watch(
  () => [props.show, props.school] as const,
  ([open, s]) => {
    if (!open) return
    if (s) {
      form.value = {
        name: s.name,
        principalName: s.principalName,
        introductionHtml: s.introductionHtml || '<p></p>',
        status: s.status,
      }
    } else {
      form.value = {
        name: '',
        principalName: '',
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
  saving.value = true
  try {
    const intro = form.value.introductionHtml.trim() || '<p></p>'
    if (isEdit.value && props.school) {
      await updateSchool(props.school.id, {
        name: form.value.name.trim(),
        status: form.value.status,
        principalName: form.value.principalName.trim(),
        introductionHtml: intro,
      })
      message.success('修改成功')
    } else {
      await createSchool({
        name: form.value.name.trim(),
        principalName: form.value.principalName.trim(),
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

.readonly-metric {
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  background: var(--bg-elevated, rgba(0, 0, 0, 0.04));
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
