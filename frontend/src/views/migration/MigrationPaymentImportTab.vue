<template>
  <div class="migration-pay-tab">
    <p class="tab-note">
      与「付费记录」页的常规批量导入不同：本入口用于<strong>历史数据迁移</strong>，不校验右豹实时 API、<strong>无单次 500 条上限</strong>；请先完成「用户主档」历史迁移，再导入付费行。
    </p>

    <input
      ref="fileInputRef"
      type="file"
      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
      class="sr-only"
      @change="onImportFileChange"
    />

    <div class="toolbar glass">
      <div class="toolbar-row">
        <n-button quaternary @click="downloadPaymentImportTemplate">
          <template #icon>
            <n-icon :component="DownloadOutline" />
          </template>
          下载模板
        </n-button>
        <n-button :loading="importSubmitting" @click="openImportPicker">
          选择 Excel 并导入
        </n-button>
      </div>
    </div>

    <n-tabs v-model:value="subTab" type="line" class="sub-tabs">
      <n-tab-pane name="hint" tab="说明">
        <ul class="hint-list">
          <li>模板字段与付费记录常规导入一致（右豹编码、金额、付费时间等）。</li>
          <li>对应用户必须在用户主档中已存在；不存在则跳过并标注「用户主档不存在」。</li>
          <li>同一用户已有付费记录时跳过，标注「该用户已有付费记录」。</li>
          <li>导入完成后可在「导入记录」查看成功/失败统计并导出失败明细。</li>
        </ul>
      </n-tab-pane>
      <n-tab-pane name="import" tab="导入记录">
        <MigrationPaymentImportRecordsTab :active="subTab === 'import'" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NIcon, NTabs, NTabPane, useMessage } from 'naive-ui'
import { DownloadOutline } from '@vicons/ionicons5'
import { downloadPaymentImportTemplate, parsePaymentImportFile } from '@/utils/paymentImportExcel'
import { submitMigrationPaymentImport } from '@/api/migrationPayments'
import MigrationPaymentImportRecordsTab from './MigrationPaymentImportRecordsTab.vue'

const message = useMessage()
const fileInputRef = ref<HTMLInputElement | null>(null)
const importSubmitting = ref(false)
const subTab = ref<'hint' | 'import'>('hint')

function openImportPicker() {
  fileInputRef.value?.click()
}

async function onImportFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const { rows, error: parseErr } = await parsePaymentImportFile(file)
  if (parseErr) {
    message.error(parseErr)
    return
  }
  if (rows.length === 0) {
    message.warning('未解析到有效数据行')
    return
  }

  importSubmitting.value = true
  try {
    await submitMigrationPaymentImport({ fileName: file.name, rows })
    message.success('已提交历史付费迁移导入，处理完成后可在「导入记录」查看结果')
    subTab.value = 'import'
  } catch (e) {
    message.error(e instanceof Error ? e.message : '导入提交失败')
  } finally {
    importSubmitting.value = false
  }
}

watch(subTab, (v) => {
  if (v === 'import') {
    /* MigrationPaymentImportRecordsTab 自行轮询 */
  }
})
</script>

<style scoped>
.migration-pay-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tab-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.toolbar {
  border-radius: var(--radius-lg);
  padding: 16px 20px;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.sub-tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-tabs :deep(.n-tabs-nav) {
  margin-bottom: 0;
}

.hint-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
