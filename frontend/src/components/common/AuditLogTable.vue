<template>
  <div class="audit-log-table">
    <n-spin :show="loading && !logs.length">
      <n-empty v-if="!loading && !logs.length" description="暂无操作日志" />
      <n-collapse v-else class="log-collapse">
        <n-collapse-item
          v-for="log in logs"
          :key="log.id"
          :title="collapseTitle(log)"
          :name="log.id"
        >
          <div class="json-blocks">
            <div v-if="log.beforeData" class="json-block">
              <div class="json-label">before_data</div>
              <n-code
                :code="formatJson(log.beforeData)"
                language="json"
                :word-wrap="true"
                class="json-code"
              />
            </div>
            <div v-if="log.afterData" class="json-block">
              <div class="json-label">after_data</div>
              <n-code
                :code="formatJson(log.afterData)"
                language="json"
                :word-wrap="true"
                class="json-code"
              />
            </div>
            <div v-if="!log.beforeData && !log.afterData" class="muted">无快照数据</div>
          </div>
        </n-collapse-item>
      </n-collapse>
      <div v-if="hasMore" class="load-more">
        <n-button text type="primary" :loading="loading" @click="loadMore">加载更多</n-button>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NCollapse, NCollapseItem, NCode, NEmpty, NSpin } from 'naive-ui'
import { fetchAuditLogs } from '@/api/auditLogs'
import type { AuditLogItem } from '@/types/auditLog'
import { actionTypeLabel } from '@/utils/auditLogLabels'

const props = defineProps<{
  tableName: string
  recordId: string | number
  /** 递增后强制重新拉取（如保存后抽屉未卸载时需刷新列表） */
  reloadNonce?: number
}>()

const logs = ref<AuditLogItem[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = 20
const total = ref(0)
const hasMore = ref(false)

function formatJson(obj: Record<string, unknown>) {
  return JSON.stringify(obj, null, 2)
}

function collapseTitle(log: AuditLogItem) {
  const act = actionTypeLabel(log.actionType)
  return `${log.operatedAt.slice(0, 19).replace('T', ' ')} · ${act} · ${log.operatorName}`
}

async function fetchPage(append: boolean) {
  loading.value = true
  try {
    const data = await fetchAuditLogs({
      page: page.value,
      pageSize,
      tableName: props.tableName,
      recordId: props.recordId,
    })
    if (append) logs.value = logs.value.concat(data.list)
    else logs.value = data.list
    total.value = data.total
    hasMore.value = logs.value.length < data.total
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value += 1
  fetchPage(true)
}

watch(
  () => [props.tableName, props.recordId, props.reloadNonce ?? 0] as const,
  () => {
    page.value = 1
    logs.value = []
    fetchPage(false)
  },
  { immediate: true },
)
</script>

<style scoped>
.audit-log-table {
  width: 100%;
}

.log-collapse {
  border: none;
  background: transparent;
}

.log-collapse :deep(.n-collapse-item) {
  margin-bottom: 8px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--panel-bg);
}

.json-blocks {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.json-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.json-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.json-code :deep(pre) {
  margin: 0;
  max-height: 240px;
  overflow: auto;
}

.muted {
  font-size: 13px;
  color: var(--text-muted);
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}
</style>
