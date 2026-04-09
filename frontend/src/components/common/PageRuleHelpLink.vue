<template>
  <span v-if="entry" class="page-rule-help-link-wrap">
    <n-button text type="primary" class="page-rule-help-link" @click="showModal = true">
      查看规则说明
    </n-button>
    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="`${entry.menuTitle} · 规则说明`"
      :bordered="false"
      class="page-rule-help-modal"
      style="width: min(640px, 92vw)"
      :content-style="{ maxHeight: 'min(72vh, 560px)', overflowY: 'auto' }"
    >
      <div class="page-rule-help-body">
        <p class="page-rule-help-hint">
          默认配置：<code class="page-rule-help-code">{{ PAGE_RULE_CATALOG_FILE }}</code>
          ，路由键 <code class="page-rule-help-code">{{ resolvedKey }}</code>
        </p>
        <p v-if="source === 'local'" class="page-rule-help-hint page-rule-help-hint--warn">
          当前展示为 admin 在本机保存的覆盖（localStorage）；清除本机覆盖后将使用仓库文件或代码内置默认。
        </p>
        <p v-else-if="source === 'committed'" class="page-rule-help-hint page-rule-help-hint--info">
          当前展示为仓库内 <code class="page-rule-help-code">pageRuleOverridesCommitted.ts</code> 中的团队默认；本机再次编辑保存会覆盖该展示。
        </p>
        <section
          v-for="(sec, idx) in entry.sections"
          :key="idx"
          class="page-rule-help-section"
        >
          <h4 class="page-rule-help-section-title">{{ sec.title }}</h4>
          <div class="page-rule-help-section-body">{{ sec.body }}</div>
        </section>
      </div>
    </n-modal>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { PAGE_RULE_CATALOG_FILE } from '@/utils/pageRuleCatalog'
import { usePageRulesStore } from '@/stores/pageRules'

const props = defineProps<{
  /** 默认使用当前路由 name，与 pageRuleCatalog 的 key 一致 */
  catalogKey?: string
}>()

const route = useRoute()
const showModal = ref(false)
const pageRulesStore = usePageRulesStore()
const { overrides } = storeToRefs(pageRulesStore)

const resolvedKey = computed(() => {
  if (props.catalogKey) return props.catalogKey
  const n = route.name
  return typeof n === 'string' ? n : ''
})

const entry = computed(() => {
  void overrides.value
  return pageRulesStore.effectiveRule(resolvedKey.value)
})

const source = computed(() => {
  void overrides.value
  return pageRulesStore.resolveSource(resolvedKey.value)
})
</script>

<style scoped>
.page-rule-help-link-wrap {
  display: inline-flex;
  align-items: center;
}

.page-rule-help-link {
  font-size: 13px;
  font-weight: 500;
  padding: 0 4px;
}

.page-rule-help-body {
  padding-right: 4px;
}

.page-rule-help-hint {
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.page-rule-help-hint--warn {
  color: var(--badge-orange, #fb923c);
}

.page-rule-help-hint--info {
  color: var(--badge-blue, #38bdf8);
}

.page-rule-help-code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--card-inner-bg, rgba(255, 255, 255, 0.08));
  color: var(--text-secondary);
}

.page-rule-help-section + .page-rule-help-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.page-rule-help-section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-rule-help-section-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-secondary);
  white-space: pre-wrap;
}
</style>
