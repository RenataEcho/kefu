<template>
  <div class="school-detail-page">
    <div class="page-header">
      <div class="header-left">
        <n-button quaternary size="small" class="back-btn" @click="goBack">
          <template #icon>
            <n-icon :component="ChevronBackOutline" />
          </template>
          返回列表
        </n-button>
        <h2 class="page-title">门派详情</h2>
        <span v-if="detail" class="page-desc">{{ detail.name }}</span>
        <span v-else-if="!loadError" class="page-desc">加载中…</span>
      </div>
    </div>

    <n-spin :show="loading && !detail && !loadError">
      <n-result
        v-if="loadError"
        status="error"
        :title="loadError"
        description="请返回列表重试或检查链接是否正确。"
      >
        <template #footer>
          <n-button type="primary" @click="goBack">返回门派管理</n-button>
        </template>
      </n-result>

      <div v-else-if="detail" class="detail-body">
        <n-tabs v-model:value="activeTab" type="line" animated class="detail-tabs">
          <n-tab-pane name="basic" tab="基本信息">
            <section class="detail-section glass">
              <h3 class="section-title">基础信息</h3>
              <dl class="detail-grid">
                <dt>门派名称</dt>
                <dd>{{ detail.name }}</dd>
                <dt>门派负责人</dt>
                <dd>{{ detail.principalName }}</dd>
                <dt>门派项目数</dt>
                <dd>{{ detail.schoolProjectCount }}</dd>
                <dt>导师介绍</dt>
                <dd class="rich-wrap">
                  <div class="rich-preview" v-html="detail.introductionHtml || '<p>—</p>'" />
                </dd>
                <dt>状态</dt>
                <dd>
                  <span v-if="detail.status === 'ENABLED'" class="badge-green">启用</span>
                  <span v-else class="badge-gray">禁用</span>
                </dd>
                <dt>创建时间</dt>
                <dd class="muted">{{ formatDate(detail.createdAt) }}</dd>
              </dl>
            </section>

            <section class="detail-section glass">
              <h3 class="section-title">聚合数据</h3>
              <dl class="detail-grid">
                <dt>旗下导师数</dt>
                <dd>{{ detail.mentorCount }}</dd>
                <dt>学员总数</dt>
                <dd>{{ detail.totalStudents }}</dd>
                <dt>学员总收益</dt>
                <dd>{{ formatYuan(detail.totalRevenue) }}</dd>
              </dl>
            </section>
          </n-tab-pane>

          <n-tab-pane name="mentors" tab="旗下导师">
            <section class="detail-section glass">
              <p class="tab-hint">只读列表；导师与门派归属请在导师管理中维护。</p>
              <n-data-table
                :columns="mentorColumns"
                :data="mentorRows"
                :loading="mentorsLoading"
                :bordered="false"
                :single-line="false"
                :row-key="(r) => String(r.id)"
                size="small"
              />
            </section>
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { h, computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NDataTable, NIcon, NResult, NSpin, NTabs, NTabPane, useMessage } from 'naive-ui'
import { ChevronBackOutline } from '@vicons/ionicons5'
import type { MentorListItem } from '@/types/mentor'
import type { SchoolListItem } from '@/types/school'
import { fetchSchoolDetail, fetchSchoolMentors } from '@/api/schools'
import { formatDate } from '@/utils/date'
import { tableColTitle } from '@/utils/columnTitleHelp'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const schoolId = computed(() => {
  const n = Number(route.params.id)
  return Number.isFinite(n) && n > 0 ? n : NaN
})

const detail = ref<SchoolListItem | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const activeTab = ref('basic')

const mentorRows = ref<MentorListItem[]>([])
const mentorsLoading = ref(false)

function formatYuan(n: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(n)
}

const mentorColumns = computed<DataTableColumns<MentorListItem>>(() => [
  {
    title: tableColTitle('导师名称', 'school.detail.col.mentorName'),
    key: 'name',
    width: 140,
    resizable: true,
    minWidth: 120,
    render(row) {
      return h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () =>
            router.push({
              name: 'MentorDetail',
              params: { id: String(row.id) },
            }),
        },
        { default: () => row.name },
      )
    },
  },
  {
    title: tableColTitle('学员数', 'school.detail.col.studentCount'),
    key: 'studentCount',
    width: 88,
    resizable: true,
    minWidth: 72,
    render(row) {
      return h('span', { class: 'muted' }, String(row.studentCount))
    },
  },
  {
    title: tableColTitle('学员总收益', 'school.detail.col.studentTotalRevenue'),
    key: 'totalRevenue',
    width: 128,
    resizable: true,
    minWidth: 110,
    render(row) {
      return h('span', { style: { fontWeight: '500' } }, formatYuan(row.totalRevenue))
    },
  },
  {
    title: tableColTitle('最后同步', 'school.detail.col.lastSyncedAt'),
    key: 'lastSyncedAt',
    width: 168,
    resizable: true,
    minWidth: 140,
    render(row) {
      const t = row.lastSyncedAt ? formatDate(row.lastSyncedAt) : '—'
      return h('span', { class: 'muted', style: 'font-size:13px' }, t)
    },
  },
])

function goBack() {
  router.push({ name: 'SectManagement' })
}

async function loadDetail() {
  loadError.value = null
  if (Number.isNaN(schoolId.value)) {
    loadError.value = '无效的门派 ID'
    detail.value = null
    return
  }
  loading.value = true
  try {
    detail.value = await fetchSchoolDetail(schoolId.value)
  } catch (e) {
    detail.value = null
    loadError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadMentors() {
  if (Number.isNaN(schoolId.value)) return
  mentorsLoading.value = true
  try {
    const res = await fetchSchoolMentors(schoolId.value, { page: 1, pageSize: 200 })
    mentorRows.value = res.items
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载导师失败')
  } finally {
    mentorsLoading.value = false
  }
}

watch(activeTab, (v) => {
  if (v === 'mentors' && detail.value) {
    void loadMentors()
  }
})

onMounted(() => {
  void loadDetail()
})
</script>

<style scoped>
.school-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.back-btn {
  align-self: flex-start;
  margin-bottom: 4px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.page-desc {
  font-size: 13px;
  color: var(--text-muted);
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-tabs :deep(.n-tabs-nav) {
  margin-bottom: 8px;
}

.detail-section {
  border-radius: var(--radius-lg);
  padding: 20px 22px;
}

.section-title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px 20px;
  margin: 0;
  font-size: 14px;
}

.detail-grid dt {
  margin: 0;
  color: var(--text-muted);
  font-weight: 500;
}

.detail-grid dd {
  margin: 0;
  color: var(--text-primary);
}

.muted {
  color: var(--text-muted);
}

.tab-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 12px;
}

.rich-preview {
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-primary);
}

.rich-preview :deep(p) {
  margin: 0 0 8px;
}

.rich-preview :deep(p:last-child) {
  margin-bottom: 0;
}

.rich-preview :deep(strong) {
  font-weight: 600;
}
</style>
