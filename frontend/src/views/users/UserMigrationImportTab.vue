<template>
  <div class="migration-tab">
    <div class="migration-toolbar glass">
      <div class="toolbar-row">
        <n-button secondary @click="downloadMigrationUserTemplate">
          <template #icon>
            <n-icon :component="DownloadOutline" />
          </template>
          下载模板
        </n-button>
        <n-upload
          :show-file-list="false"
          accept=".xlsx,.xls"
          :custom-request="onFilePick"
        >
          <n-button type="primary">
            <template #icon>
              <n-icon :component="CloudUploadOutline" />
            </template>
            选择 Excel
          </n-button>
        </n-upload>
        <span v-if="parsedRows.length" class="parse-hint">已解析 {{ parsedRows.length }} 行</span>
        <n-button
          type="primary"
          :disabled="!parsedRows.length || submitting"
          :loading="submitting"
          @click="submitImport"
        >
          开始导入
        </n-button>
      </div>
      <p class="toolbar-note">
        历史迁移跳过右豹实时 API 校验，成功行均为「待验证」状态；无单次 500 条上限（Story 5.1）。
      </p>
    </div>

    <div v-if="lastResult" class="result-card glass">
      <div class="result-title">最近一次导入结果</div>
      <div class="result-grid">
        <div><span class="lbl">批次</span>{{ lastResult.batchNo }}</div>
        <div><span class="lbl">成功</span>{{ lastResult.successCount }} 条</div>
        <div><span class="lbl">失败</span>{{ lastResult.failCount }} 条</div>
        <div><span class="lbl">待验证</span>{{ lastResult.pendingVerifyCount }} 条</div>
      </div>
      <n-button
        v-if="lastResult.failCount > 0 && lastResult.failedRows.length"
        size="small"
        quaternary
        class="fail-export"
        @click="downloadMigrationUserFailures(lastResult.failedRows)"
      >
        导出失败明细
      </n-button>
    </div>

    <div class="batch-card glass">
      <div class="batch-head">
        <span class="batch-title">导入记录</span>
        <n-button quaternary size="small" :loading="listLoading" @click="refreshBatches">刷新</n-button>
      </div>
      <n-data-table
        :columns="batchColumns"
        :data="batchList"
        :loading="listLoading"
        :bordered="false"
        size="small"
        :row-key="(r) => r.id"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, onUnmounted, ref } from 'vue'
import type { DataTableColumns, UploadCustomRequestOptions } from 'naive-ui'
import { NButton, NDataTable, NIcon, NTag, NUpload, useMessage } from 'naive-ui'
import { CloudUploadOutline, DownloadOutline } from '@vicons/ionicons5'
import type { MigrationUserImportBatch, MigrationUserImportRowInput } from '@/types/migrationUsers'
import {
  fetchMigrationUserImportBatchDetail,
  fetchMigrationUserImportBatches,
  postMigrationUserImport,
} from '@/api/migrationUsers'
import {
  downloadMigrationUserFailures,
  downloadMigrationUserTemplate,
  parseMigrationUserImportFile,
} from '@/utils/migrationUserImportExcel'
import { formatDate } from '@/utils/date'
import { tableColTitle } from '@/utils/columnTitleHelp'

const message = useMessage()

const parsedRows = ref<MigrationUserImportRowInput[]>([])
const parsedFileName = ref('')
const submitting = ref(false)
const listLoading = ref(false)
const batchList = ref<Omit<MigrationUserImportBatch, 'failedRows'>[]>([])
const lastResult = ref<MigrationUserImportBatch | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null

const batchColumns: DataTableColumns<Omit<MigrationUserImportBatch, 'failedRows'>> = [
  { title: tableColTitle('批次号', 'migration.userImport.batchNo'), key: 'batchNo', width: 120, resizable: true, minWidth: 100 },
  {
    title: tableColTitle('文件名', 'migration.userImport.fileName'),
    key: 'fileName',
    ellipsis: { tooltip: true },
    minWidth: 140,
    resizable: true,
  },
  {
    title: tableColTitle('状态', 'migration.userImport.status'),
    key: 'status',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(row) {
      const type = row.status === 'PROCESSING' ? 'info' : 'success'
      const label = row.status === 'PROCESSING' ? '处理中' : '已完成'
      return h(NTag, { type, size: 'small' }, { default: () => label })
    },
  },
  {
    title: tableColTitle('成功 / 失败 / 待验证', 'migration.userImport.counts'),
    key: 'counts',
    width: 180,
    resizable: true,
    minWidth: 160,
    render(row) {
      return `${row.successCount} / ${row.failCount} / ${row.pendingVerifyCount}`
    },
  },
  {
    title: tableColTitle('导入时间', 'migration.userImport.importedAt'),
    key: 'createdAt',
    width: 160,
    resizable: true,
    minWidth: 140,
    render(row) {
      return formatDate(row.createdAt)
    },
  },
]

async function refreshBatches() {
  listLoading.value = true
  try {
    const res = await fetchMigrationUserImportBatches()
    batchList.value = res.items
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    listLoading.value = false
  }
}

async function onFilePick({ file }: UploadCustomRequestOptions) {
  const f = file.file
  if (!f) return
  try {
    const { rows, error } = await parseMigrationUserImportFile(f)
    if (error) {
      message.error(error)
      parsedRows.value = []
      return
    }
    parsedRows.value = rows
    parsedFileName.value = f.name
    message.success(`已解析 ${rows.length} 行`)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '解析失败')
    parsedRows.value = []
  }
}

async function submitImport() {
  if (!parsedRows.value.length) return
  submitting.value = true
  try {
    const { batchId } = await postMigrationUserImport({
      fileName: parsedFileName.value || 'migration.xlsx',
      rows: parsedRows.value,
    })
    message.success('已提交后台处理，导入记录将自动刷新')
    parsedRows.value = []
    await refreshBatches()
    startPollingBatch(batchId)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    submitting.value = false
  }
}

function startPollingBatch(batchId: string) {
  stopPolling()
  pollTimer = window.setInterval(async () => {
    try {
      const detail = await fetchMigrationUserImportBatchDetail(batchId)
      if (detail.status === 'COMPLETED') {
        lastResult.value = detail
        stopPolling()
        await refreshBatches()
        message.success('迁移导入已完成')
      }
    } catch {
      stopPolling()
    }
  }, 2000)
}

function stopPolling() {
  if (pollTimer != null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  void refreshBatches()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.migration-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.migration-toolbar,
.result-card,
.batch-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  padding: 16px 20px;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.parse-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

.toolbar-note {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.result-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.lbl {
  color: var(--text-muted);
  margin-right: 6px;
}

.fail-export {
  margin-top: 12px;
}

.batch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.batch-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
