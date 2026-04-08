<template>
  <div class="mentor-detail-page">
    <div class="page-header">
      <div class="header-left">
        <n-button quaternary size="small" class="back-btn" @click="goBack">
          <template #icon>
            <n-icon :component="ChevronBackOutline" />
          </template>
          返回列表
        </n-button>
        <h2 class="page-title">导师详情</h2>
        <span v-if="detail" class="page-desc">{{ detail.name }}</span>
        <span v-else-if="!loadError" class="page-desc">加载中…</span>
      </div>
      <div v-if="detail && canManage" class="header-actions">
        <n-button type="primary" :loading="syncing" :disabled="syncing" @click="onManualSync">
          手动同步
        </n-button>
      </div>
    </div>

    <ApiStatusBar
      :degraded="appStore.mentorApiDegraded"
      message="第三方导师数据暂时无法更新，展示缓存数据"
    />

    <n-spin :show="loading && !detail && !loadError">
      <n-result
        v-if="loadError"
        status="error"
        :title="loadError"
        description="请返回列表重试或检查链接是否正确。"
      >
        <template #footer>
          <n-button type="primary" @click="goBack">返回导师管理</n-button>
        </template>
      </n-result>

      <div v-else-if="detail" class="detail-body">
        <n-tabs v-model:value="activeTab" type="line" animated class="detail-tabs">
          <n-tab-pane name="basic" tab="基本信息">
            <section class="detail-section glass">
              <h3 class="section-title">基础信息</h3>
              <dl class="detail-grid">
                <dt>导师名称</dt>
                <dd>{{ detail.name }}</dd>
                <dt>导师类型</dt>
                <dd>{{ detail.mentorTypeName }}</dd>
                <dt>飞书手机号</dt>
                <dd class="mono">{{ detail.feishuPhone?.trim() || '—' }}</dd>
                <dt>所属门派</dt>
                <dd>
                  <n-button text type="primary" @click="goSchool(detail.schoolId)">
                    {{ detail.schoolName }}
                  </n-button>
                </dd>
                <dt>状态</dt>
                <dd>
                  <span v-if="detail.status === 'ENABLED'" class="badge-green">启用</span>
                  <span v-else class="badge-gray">禁用</span>
                </dd>
                <dt>创建时间</dt>
                <dd class="muted">{{ formatDate(detail.createdAt) }}</dd>
                <dt>导师介绍</dt>
                <dd class="rich-wrap">
                  <div class="rich-preview" v-html="detail.introductionHtml || '<p>—</p>'" />
                </dd>
              </dl>
            </section>

            <section class="detail-section glass">
              <h3 class="section-title">第三方同步数据</h3>
              <p class="sync-hint">
                最后同步时间：<strong>{{ detail.lastSyncedAt ? formatDate(detail.lastSyncedAt) : '—' }}</strong>
              </p>
              <dl class="detail-grid youbao-grid">
                <dt>学员数</dt>
                <dd>{{ detail.studentCount }}</dd>
                <dt>负责项目数</dt>
                <dd>
                  <n-button text type="primary" @click="activeTab = 'projects'">
                    {{ detail.projectCount }}
                  </n-button>
                </dd>
                <dt>总收益</dt>
                <dd>{{ formatYuan(detail.totalRevenue) }}</dd>
              </dl>
            </section>
          </n-tab-pane>

          <n-tab-pane name="students" tab="名下学员">
            <section class="detail-section glass">
              <p class="tab-hint">只读列表；归属变更请在用户主档中维护。</p>
              <n-data-table
                :columns="studentColumns"
                :data="studentRows"
                :loading="studentsLoading"
                :bordered="false"
                :single-line="false"
                :row-key="(r) => r.id"
                size="small"
              />
              <div class="pagination-bar">
                <n-pagination
                  v-model:page="studentQuery.page"
                  v-model:page-size="studentQuery.pageSize"
                  :item-count="studentTotal"
                  :page-sizes="[20, 50]"
                  show-size-picker
                  @update:page="loadStudents"
                  @update:page-size="onStudentPageSize"
                />
              </div>
            </section>
          </n-tab-pane>

          <n-tab-pane name="projects" tab="项目数据">
            <section class="detail-section glass">
              <p class="tab-hint">导师负责项目的汇总明细（Mock）</p>
              <n-spin :show="projectsLoading">
                <n-data-table
                  :columns="projectColumns"
                  :data="projectRows"
                  :bordered="false"
                  size="small"
                  :scroll-x="1020"
                />
              </n-spin>
            </section>
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { h, computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NDataTable,
  NIcon,
  NPagination,
  NResult,
  NSpin,
  NTabs,
  NTabPane,
  useMessage,
} from 'naive-ui'
import { ChevronBackOutline } from '@vicons/ionicons5'
import type { MentorDetail, MentorProjectRow, MentorStudentRow } from '@/types/mentor'
import { fetchMentorDetail, fetchMentorProjects, fetchMentorStudents, postMentorSync } from '@/api/mentors'
import { formatDate } from '@/utils/date'
import { usePermission } from '@/composables/usePermission'
import { OPERATION_PERMS } from '@/utils/permission'
import ApiStatusBar from '@/components/business/ApiStatusBar.vue'
import { useAppStore } from '@/stores/app'
import { tableColTitle } from '@/utils/columnTitleHelp'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const appStore = useAppStore()
const { hasOperationPermission } = usePermission()
const canManage = computed(() => hasOperationPermission(OPERATION_PERMS.ORG_MANAGE))

const mentorId = computed(() => {
  const n = Number(route.params.id)
  return Number.isFinite(n) && n > 0 ? n : NaN
})

const detail = ref<MentorDetail | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const syncing = ref(false)
const activeTab = ref('basic')

const studentRows = ref<MentorStudentRow[]>([])
const studentsLoading = ref(false)
const studentTotal = ref(0)
const studentQuery = reactive({ page: 1, pageSize: 20 })

const projectRows = ref<MentorProjectRow[]>([])
const projectsLoading = ref(false)

function formatYuan(n: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(n)
}

function formatYuanPlain(n: number) {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

const projectColumns: DataTableColumns<MentorProjectRow> = [
  {
    title: tableColTitle('项目名称', 'stats.col.projectName'),
    key: 'projectName',
    width: 160,
    resizable: true,
    minWidth: 140,
    ellipsis: { tooltip: true },
  },
  { title: tableColTitle('业务大类', 'stats.col.businessCategory'), key: 'businessCategory', width: 100, resizable: true, minWidth: 88 },
  { title: tableColTitle('题词数量', 'stats.col.inscriptionCount'), key: 'keywordCount', width: 88, resizable: true, minWidth: 72 },
  { title: tableColTitle('回填数量', 'stats.col.backfillCount'), key: 'backfillCount', width: 88, resizable: true, minWidth: 72 },
  { title: tableColTitle('订单数量', 'stats.col.orderCount'), key: 'orderCount', width: 88, resizable: true, minWidth: 72 },
  {
    title: tableColTitle('已结算收益', 'stats.col.settledRevenue'),
    key: 'settledRevenueYuan',
    width: 120,
    resizable: true,
    minWidth: 100,
    render(row) {
      return h('span', {}, formatYuanPlain(row.settledRevenueYuan))
    },
  },
  {
    title: tableColTitle('待结算收益', 'stats.col.pendingRevenue'),
    key: 'pendingRevenueYuan',
    width: 120,
    resizable: true,
    minWidth: 100,
    render(row) {
      return h('span', { class: 'muted' }, formatYuanPlain(row.pendingRevenueYuan))
    },
  },
]

const studentColumns = computed<DataTableColumns<MentorStudentRow>>(() => [
  {
    title: tableColTitle('右豹编码', 'mentor.detail.student.code'),
    key: 'rightLeopardCode',
    width: 140,
    resizable: true,
    minWidth: 120,
    render(row) {
      return h('span', { class: 'mono' }, row.rightLeopardCode)
    },
  },
  { title: tableColTitle('飞书昵称', 'mentor.detail.student.larkNickname'), key: 'larkNickname', minWidth: 120, resizable: true },
  {
    title: tableColTitle('是否付费', 'mentor.detail.student.isPaid'),
    key: 'isPaid',
    width: 96,
    resizable: true,
    minWidth: 80,
    render(row) {
      return row.isPaid
        ? h('span', { class: 'badge-green' }, '已付费')
        : h('span', { class: 'badge-gray' }, '未付费')
    },
  },
  { title: tableColTitle('题词数量', 'stats.col.inscriptionCount'), key: 'keywordCount', width: 88, resizable: true, minWidth: 72 },
  { title: tableColTitle('回填数量', 'stats.col.backfillCount'), key: 'backfillCount', width: 88, resizable: true, minWidth: 72 },
  { title: tableColTitle('订单数量', 'stats.col.orderCount'), key: 'orderCount', width: 88, resizable: true, minWidth: 72 },
  {
    title: tableColTitle('已结算收益', 'stats.col.settledRevenue'),
    key: 'settledRevenueYuan',
    width: 112,
    resizable: true,
    minWidth: 96,
    render(row) {
      return h('span', { style: { fontSize: '13px' } }, formatYuanPlain(row.settledRevenueYuan))
    },
  },
  {
    title: tableColTitle('待结算收益', 'stats.col.pendingRevenue'),
    key: 'pendingRevenueYuan',
    width: 112,
    resizable: true,
    minWidth: 96,
    render(row) {
      return h('span', { class: 'muted', style: 'font-size:13px' }, formatYuanPlain(row.pendingRevenueYuan))
    },
  },
  {
    title: tableColTitle('录入时间', 'mentor.detail.student.createdAt'),
    key: 'createdAt',
    width: 168,
    resizable: true,
    minWidth: 140,
    render(row) {
      return h('span', { class: 'muted', style: 'font-size:13px' }, formatDate(row.createdAt))
    },
  },
  {
    title: tableColTitle('操作', 'mentor.detail.student.actions'),
    key: 'op',
    width: 88,
    resizable: true,
    minWidth: 72,
    render(row) {
      return h(
        NButton,
        {
          size: 'small',
          quaternary: true,
          type: 'primary',
          onClick: () =>
            router.push({
              name: 'UserDetail',
              params: { id: String(row.id) },
            }),
        },
        { default: () => '查看' },
      )
    },
  },
])

function goBack() {
  router.push({ name: 'MentorManagement' })
}

function goSchool(id: number) {
  router.push({ name: 'SchoolDetail', params: { id: String(id) } })
}

async function loadDetail() {
  loadError.value = null
  if (Number.isNaN(mentorId.value)) {
    loadError.value = '无效的导师 ID'
    detail.value = null
    return
  }
  loading.value = true
  try {
    const d = await fetchMentorDetail(mentorId.value)
    detail.value = d
    appStore.setMentorApiDegraded(d.mentorApiDegraded ?? false)
  } catch (e) {
    detail.value = null
    appStore.setMentorApiDegraded(false)
    loadError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadStudents() {
  if (Number.isNaN(mentorId.value)) return
  studentsLoading.value = true
  try {
    const res = await fetchMentorStudents(mentorId.value, {
      page: studentQuery.page,
      pageSize: studentQuery.pageSize,
    })
    studentRows.value = res.items
    studentTotal.value = res.total
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载学员失败')
  } finally {
    studentsLoading.value = false
  }
}

function onStudentPageSize() {
  studentQuery.page = 1
  void loadStudents()
}

async function loadProjects() {
  if (Number.isNaN(mentorId.value)) return
  projectsLoading.value = true
  try {
    const res = await fetchMentorProjects(mentorId.value)
    projectRows.value = res.items
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载项目数据失败')
  } finally {
    projectsLoading.value = false
  }
}

watch(activeTab, (v) => {
  if (v === 'students' && detail.value) {
    void loadStudents()
  }
  if (v === 'projects' && detail.value) {
    void loadProjects()
  }
})

async function onManualSync() {
  if (!detail.value || syncing.value) return
  syncing.value = true
  const id = detail.value.id
  const prev = detail.value.lastSyncedAt
  try {
    const res = await postMentorSync(id)
    if (res.status === 'queued') {
      message.success('同步任务已入队，正在刷新…')
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 200))
        const next = await fetchMentorDetail(id)
        detail.value = next
        appStore.setMentorApiDegraded(next.mentorApiDegraded ?? false)
        if (next.lastSyncedAt && next.lastSyncedAt !== prev) {
          message.success('导师数据已更新')
          syncing.value = false
          return
        }
      }
      message.info('同步处理中，请稍后刷新页面查看')
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : '同步失败')
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  void loadDetail()
})

onUnmounted(() => {
  appStore.setMentorApiDegraded(false)
})
</script>

<style scoped>
.mentor-detail-page {
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

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
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

.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.muted {
  color: var(--text-muted);
}

.sync-hint {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 12px;
}

.youbao-grid {
  margin-top: 8px;
}

.tab-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 12px;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.rich-wrap {
  grid-column: 2;
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
  color: var(--text-primary);
}
</style>
