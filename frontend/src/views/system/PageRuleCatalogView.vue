<template>
  <div class="page-rule-catalog-view">
    <div class="page-header">
      <div class="header-left">
        <div class="page-title-row">
          <h2 class="page-title">规则配置说明</h2>
        </div>
        <span class="page-desc">
          以表格维护各菜单规则说明。生效优先级：<strong>本机编辑（localStorage）</strong> &gt;
          <code class="inline-code">pageRuleOverridesCommitted.ts</code>（提交 Git）&gt;
          <code class="inline-code">{{ PAGE_RULE_CATALOG_FILE }}</code> 内置。
        </span>
      </div>
    </div>

    <n-alert type="info" :bordered="false" class="catalog-alert">
      <template #header>同步到仓库</template>
      在浏览器控制台执行
      <code class="mono">copy(JSON.parse(localStorage.getItem('kefu-page-rule-overrides-v1') || '{}'))</code>
      ，将剪贴板内容合并进
      <code class="mono">frontend/src/mock/pageRuleOverridesCommitted.ts</code>
      的 <code class="mono">PAGE_RULE_COMMITTED_OVERRIDES</code> 后提交，团队即可共享同一套默认规则。
    </n-alert>

    <div class="toolbar-row">
      <n-input
        v-model:value="keyword"
        clearable
        placeholder="按菜单标题或路由键筛选"
        class="catalog-search"
      >
        <template #prefix>
          <n-icon :component="SearchOutline" />
        </template>
      </n-input>
    </div>

    <div class="table-card glass">
      <n-data-table
        :columns="columns"
        :data="tableRows"
        :bordered="false"
        size="small"
        :scroll-x="1180"
        :row-key="(row: RuleTableRow) => row.key"
        class="rule-table"
      >
        <template #empty>
          <n-empty description="无匹配项" />
        </template>
      </n-data-table>
    </div>

    <!-- 只读预览 -->
    <n-modal
      v-model:show="showPreview"
      preset="card"
      :title="previewTitle"
      :bordered="false"
      style="width: min(640px, 92vw)"
      :content-style="{ maxHeight: 'min(70vh, 520px)', overflowY: 'auto' }"
    >
      <template v-if="previewEntry">
        <section
          v-for="(sec, idx) in previewEntry.sections"
          :key="idx"
          class="preview-section"
        >
          <h4 class="preview-section-title">{{ sec.title }}</h4>
          <div class="preview-section-body">{{ sec.body }}</div>
        </section>
      </template>
    </n-modal>

    <!-- 编辑 -->
    <n-modal
      v-model:show="showEdit"
      preset="card"
      :title="`编辑规则 · ${editKey}`"
      :bordered="false"
      class="page-rule-edit-modal"
      style="width: min(720px, 94vw)"
      :mask-closable="false"
      @after-leave="onEditModalLeave"
    >
      <template v-if="draft">
        <n-form label-placement="top" class="edit-form">
          <n-form-item label="菜单标题（展示用）" required>
            <n-input v-model:value="draft.menuTitle" placeholder="如：用户主档表" maxlength="80" show-count />
          </n-form-item>

          <div class="edit-sections-label">规则段落</div>
          <div
            v-for="(sec, idx) in draft.sections"
            :key="idx"
            class="edit-section-block glass"
          >
            <div class="edit-section-head">
              <span class="edit-section-index">段落 {{ idx + 1 }}</span>
              <n-button
                size="tiny"
                quaternary
                type="error"
                :disabled="draft.sections.length <= 1"
                @click="removeSection(idx)"
              >
                删除
              </n-button>
            </div>
            <n-form-item label="小标题" required>
              <n-input v-model:value="sec.title" placeholder="段落标题" maxlength="120" show-count />
            </n-form-item>
            <n-form-item label="正文">
              <n-input
                v-model:value="sec.body"
                type="textarea"
                placeholder="规则说明，支持多行纯文本"
                :rows="5"
                show-count
                :maxlength="8000"
              />
            </n-form-item>
          </div>

          <n-button dashed block class="add-section-btn" @click="addSection">
            新增段落
          </n-button>
        </n-form>
      </template>

      <template #footer>
        <div class="edit-footer">
          <n-button @click="showEdit = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="saveDraft">保存到本机</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { SearchOutline } from '@vicons/ionicons5'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NTag, useMessage, useDialog } from 'naive-ui'
import {
  PAGE_RULE_CATALOG_FILE,
  type PageRuleEntry,
} from '@/utils/pageRuleCatalog'
import type { PageRuleSource } from '@/stores/pageRules'
import { usePageRulesStore } from '@/stores/pageRules'

interface RuleTableRow {
  key: string
  menuTitle: string
  summary: string
  source: PageRuleSource
  entry: PageRuleEntry
  overridden: boolean
}

const message = useMessage()
const dialog = useDialog()
const pageRulesStore = usePageRulesStore()
const { overrides } = storeToRefs(pageRulesStore)

const keyword = ref('')

const mergedRows = computed(() => {
  void overrides.value
  return pageRulesStore.listMergedOrdered()
})

const filteredMerged = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return mergedRows.value
  return mergedRows.value.filter(
    (r) =>
      r.key.toLowerCase().includes(q) ||
      r.entry.menuTitle.toLowerCase().includes(q),
  )
})

function ruleSummary(entry: PageRuleEntry): string {
  const first = entry.sections[0]
  if (!first) return '—'
  const t = `${first.title}：${first.body}`.replace(/\s+/g, ' ').trim()
  return t.length > 72 ? `${t.slice(0, 72)}…` : t
}

const tableRows = computed<RuleTableRow[]>(() =>
  filteredMerged.value.map((r) => ({
    key: r.key,
    menuTitle: r.entry.menuTitle,
    summary: ruleSummary(r.entry),
    source: r.source,
    entry: r.entry,
    overridden: r.overridden,
  })),
)

function sourceTagType(s: PageRuleSource): 'default' | 'info' | 'warning' {
  if (s === 'local') return 'warning'
  if (s === 'committed') return 'info'
  return 'default'
}

function sourceLabel(s: PageRuleSource): string {
  if (s === 'local') return '本机覆盖'
  if (s === 'committed') return '仓库默认'
  return '代码内置'
}

const showPreview = ref(false)
const previewKey = ref('')
const previewEntry = ref<PageRuleEntry | null>(null)

const previewTitle = computed(() =>
  previewEntry.value ? `${previewEntry.value.menuTitle} · ${previewKey.value}` : '',
)

function openPreview(row: RuleTableRow) {
  previewKey.value = row.key
  previewEntry.value = JSON.parse(JSON.stringify(row.entry)) as PageRuleEntry
  showPreview.value = true
}

const showEdit = ref(false)
const editKey = ref('')
const draft = ref<PageRuleEntry | null>(null)
const saving = ref(false)

function cloneEntry(e: PageRuleEntry): PageRuleEntry {
  return JSON.parse(JSON.stringify(e)) as PageRuleEntry
}

function openEdit(key: string) {
  const cur = pageRulesStore.effectiveRule(key)
  if (!cur) return
  editKey.value = key
  draft.value = cloneEntry(cur)
  showEdit.value = true
}

function onEditModalLeave() {
  draft.value = null
  editKey.value = ''
}

function addSection() {
  if (!draft.value) return
  draft.value.sections.push({ title: '新段落', body: '' })
}

function removeSection(idx: number) {
  if (!draft.value || draft.value.sections.length <= 1) return
  draft.value.sections.splice(idx, 1)
}

function saveDraft() {
  const d = draft.value
  const key = editKey.value
  if (!d || !key) return

  if (!d.menuTitle.trim()) {
    message.warning('请填写菜单标题')
    return
  }
  if (!d.sections.length) {
    message.warning('至少保留一个规则段落')
    return
  }
  for (let i = 0; i < d.sections.length; i++) {
    if (!d.sections[i].title.trim()) {
      message.warning(`段落 ${i + 1} 缺少小标题`)
      return
    }
  }

  saving.value = true
  try {
    pageRulesStore.setOverride(key, d)
    message.success('已保存至本机浏览器')
    showEdit.value = false
  } finally {
    saving.value = false
  }
}

function confirmReset(key: string) {
  dialog.warning({
    title: '清除本机覆盖',
    content:
      '将删除该菜单在本机 localStorage 中的覆盖。清除后本条将使用仓库文件 pageRuleOverridesCommitted.ts（若已配置）或 pageRuleCatalog.ts 内置文案。',
    positiveText: '清除',
    negativeText: '取消',
    onPositiveClick: () => {
      pageRulesStore.clearOverride(key)
      message.success('已清除本机覆盖')
    },
  })
}

const columns = computed<DataTableColumns<RuleTableRow>>(() => [
  {
    title: '菜单标题',
    key: 'menuTitle',
    width: 160,
    minWidth: 120,
    ellipsis: { tooltip: true },
    render(row) {
      return h(
        'span',
        { style: { fontWeight: '600', color: 'var(--text-primary)' } },
        row.menuTitle,
      )
    },
  },
  {
    title: '路由键',
    key: 'key',
    width: 168,
    minWidth: 140,
    ellipsis: { tooltip: true },
    render(row) {
      return h(
        'code',
        {
          style: {
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          },
        },
        row.key,
      )
    },
  },
  {
    title: '内容摘要',
    key: 'summary',
    minWidth: 280,
    ellipsis: { tooltip: true },
    render(row) {
      return h(
        'span',
        { style: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' } },
        row.summary,
      )
    },
  },
  {
    title: '当前来源',
    key: 'source',
    width: 108,
    minWidth: 96,
    render(row) {
      return h(
        NTag,
        { size: 'small', type: sourceTagType(row.source), bordered: false },
        { default: () => sourceLabel(row.source) },
      )
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    minWidth: 200,
    fixed: 'right',
    render(row) {
      return h('div', { class: 'action-cell' }, [
        h(
          NButton,
          { size: 'small', quaternary: true, onClick: () => openPreview(row) },
          { default: () => '查看' },
        ),
        h(
          NButton,
          { size: 'small', type: 'primary', onClick: () => openEdit(row.key) },
          { default: () => '编辑' },
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            disabled: !row.overridden,
            onClick: () => confirmReset(row.key),
          },
          { default: () => '清本机' },
        ),
      ])
    },
  },
])
</script>

<style scoped>
.page-rule-catalog-view {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
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
  line-height: 1.6;
  max-width: 880px;
}

.page-desc strong {
  color: var(--text-secondary);
  font-weight: 600;
}

.inline-code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--card-inner-bg, rgba(255, 255, 255, 0.08));
  color: var(--text-secondary);
}

.catalog-alert {
  margin: 0;
}

.catalog-alert :deep(.n-alert-body__content) {
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--card-inner-bg, rgba(255, 255, 255, 0.08));
  word-break: break-all;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.catalog-search {
  max-width: 360px;
  width: 100%;
}

.table-card {
  border-radius: var(--radius-lg, 16px);
  padding: 0 0 8px;
  overflow: hidden;
}

.rule-table :deep(.n-data-table-th) {
  font-size: 11px;
}

.preview-section + .preview-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.preview-section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-section-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.edit-form {
  max-height: min(65vh, 520px);
  overflow-y: auto;
  padding-right: 6px;
}

.edit-sections-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.edit-section-block {
  padding: 12px 14px;
  border-radius: var(--radius-md, 10px);
  margin-bottom: 12px;
  border: 1px solid var(--border-subtle);
}

.edit-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.edit-section-index {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.add-section-btn {
  margin-top: 4px;
}

.edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.action-cell) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
</style>
