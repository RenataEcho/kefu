<template>
  <div class="cs-detail-page">
    <div class="cs-detail glass">
      <div class="cs-detail__header">
        <n-button quaternary size="small" @click="goBack">
          <template #icon>
            <n-icon :component="ChevronBackOutline" />
          </template>
          返回列表
        </n-button>
      </div>

      <n-spin :show="loading">
        <template v-if="detail">
          <h1 class="cs-detail__title">{{ detail.name }}</h1>
          <p class="cs-detail__meta">客服 ID：{{ detail.id }}</p>

          <section class="section">
            <h2 class="section__title">基础信息</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">名称</span>
                <span class="info-value">{{ detail.name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">客服类型</span>
                <span class="info-value">{{ CS_AGENT_TYPE_LABELS[detail.agentType] }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">飞书手机号</span>
                <span class="info-value mono">{{ detail.feishuPhone || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">状态</span>
                <span v-if="detail.status === 'ENABLED'" class="badge-green">启用</span>
                <span v-else class="badge-gray">禁用</span>
              </div>
              <div class="info-item">
                <span class="info-label">创建时间</span>
                <span class="info-value">{{ formatDate(detail.createdAt) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">创建人</span>
                <span class="info-value">{{ detail.createdByName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">关联用户数</span>
                <span class="info-value">{{ detail.linkedUserCount }}</span>
              </div>
            </div>
          </section>

          <section class="section">
            <h2 class="section__title">企微二维码</h2>
            <div class="qrcode-panel">
              <img :src="detail.wxQrcodeUrl" alt="企微二维码" class="qrcode-img" />
            </div>
          </section>

          <section class="section">
            <h2 class="section__title">信息录入专属码</h2>
            <p class="section__hint">用户扫码填写资料的 H5 链接（Mock），含本客服 agentId 参数。</p>
            <div class="entry-row">
              <EntryFormQrThumb :url="detail.entryFormUrl" />
              <n-button size="small" secondary @click="copyEntryFormUrl">复制链接</n-button>
            </div>
            <n-input class="entry-url-input" size="small" readonly :value="detail.entryFormUrl" />
          </section>

          <section class="section section--logs">
            <h2 class="section__title">操作日志</h2>
            <div class="logs-card">
              <n-data-table
                :columns="logColumns"
                :data="detail.auditLogs"
                :bordered="false"
                :single-line="false"
                size="small"
              />
            </div>
          </section>
        </template>
        <div v-else-if="!loading" class="not-found">
          <n-empty description="未找到该客服" />
          <n-button class="mt-4" @click="goBack">返回列表</n-button>
        </div>
      </n-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NDataTable, NEmpty, NIcon, NInput, NSpin, useMessage } from 'naive-ui'
import { ChevronBackOutline } from '@vicons/ionicons5'
import type { CsAgentAuditLogEntry, CsAgentDetail } from '@/types/csAgent'
import { CS_AGENT_TYPE_LABELS } from '@/types/csAgent'
import { fetchCsAgentDetail } from '@/api/csAgents'
import { formatDate } from '@/utils/date'
import EntryFormQrThumb from '@/components/cs-management/EntryFormQrThumb.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(true)
const detail = ref<CsAgentDetail | null>(null)

const logColumns = computed<DataTableColumns<CsAgentAuditLogEntry>>(() => [
  {
    title: tableColTitle('操作时间', 'cs.detail.audit.time'),
    key: 'operatedAt',
    width: 168,
    resizable: true,
    minWidth: 140,
    render(row) {
      return h(
        'span',
        { style: { color: 'var(--text-secondary)', fontSize: '13px' } },
        formatDate(row.operatedAt),
      )
    },
  },
  {
    title: tableColTitle('操作人', 'cs.detail.audit.operator'),
    key: 'operatorName',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(row) {
      return h('span', { style: { color: 'var(--text-primary)' } }, row.operatorName)
    },
  },
  {
    title: tableColTitle('操作类型', 'cs.detail.audit.actionType'),
    key: 'operationType',
    width: 88,
    resizable: true,
    minWidth: 72,
    render(row) {
      return h('span', { style: { color: 'var(--text-secondary)' } }, row.operationType)
    },
  },
  {
    title: tableColTitle('变更字段', 'cs.detail.audit.field'),
    key: 'fieldName',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(row) {
      return h('span', { style: { color: 'var(--text-secondary)' } }, row.fieldName)
    },
  },
  {
    title: tableColTitle('变更前值', 'cs.detail.audit.old'),
    key: 'beforeValue',
    width: 160,
    resizable: true,
    minWidth: 100,
    ellipsis: { tooltip: true },
    render(row) {
      return h('span', { style: { color: 'var(--text-muted)', fontSize: '13px' } }, row.beforeValue)
    },
  },
  {
    title: tableColTitle('变更后值', 'cs.detail.audit.new'),
    key: 'afterValue',
    width: 160,
    resizable: true,
    minWidth: 100,
    ellipsis: { tooltip: true },
    render(row) {
      return h('span', { style: { color: 'var(--text-muted)', fontSize: '13px' } }, row.afterValue)
    },
  },
])

function goBack() {
  router.push({ name: 'CsManagement' })
}

async function copyEntryFormUrl() {
  if (!detail.value?.entryFormUrl) return
  try {
    await navigator.clipboard.writeText(detail.value.entryFormUrl)
    message.success('已复制录入链接')
  } catch {
    message.error('复制失败')
  }
}

onMounted(async () => {
  const id = parseInt(route.params.id as string, 10)
  if (Number.isNaN(id)) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    detail.value = await fetchCsAgentDetail(id)
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.cs-detail-page {
  padding: 24px;
  min-height: 100%;
}

.cs-detail {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
  border-radius: var(--radius-lg);
}

.cs-detail__header {
  margin-bottom: 16px;
}

.cs-detail__title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.cs-detail__meta {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--text-secondary);
}

.section {
  margin-bottom: 28px;
}

.section__title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.section__hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}

.entry-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.entry-url-input {
  max-width: 480px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: var(--text-muted);
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
}

.info-value.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.qrcode-panel {
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--card-inner-bg);
  border: 1px solid var(--border-default);
  display: inline-block;
}

.qrcode-img {
  width: 200px;
  height: 200px;
  object-fit: contain;
  display: block;
  border-radius: var(--radius-sm);
}

.logs-card {
  border-radius: var(--radius-md);
  overflow: hidden;
}

.not-found {
  text-align: center;
  padding: 48px 0;
}

.mt-4 {
  margin-top: 16px;
}
</style>
