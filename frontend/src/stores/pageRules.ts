import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PageRuleEntry } from '@/utils/pageRuleCatalog'
import { getBasePageRule, listPageRulesOrdered } from '@/utils/pageRuleCatalog'
import { PAGE_RULE_COMMITTED_OVERRIDES } from '@/mock/pageRuleOverridesCommitted'

const STORAGE_KEY = 'kefu-page-rule-overrides-v1'

export type PageRuleSource = 'local' | 'committed' | 'code'

function cloneEntry(e: PageRuleEntry): PageRuleEntry {
  return JSON.parse(JSON.stringify(e)) as PageRuleEntry
}

export const usePageRulesStore = defineStore('pageRules', () => {
  const overrides = ref<Record<string, PageRuleEntry>>({})

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        overrides.value = {}
        return
      }
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        overrides.value = parsed as Record<string, PageRuleEntry>
      } else {
        overrides.value = {}
      }
    } catch {
      overrides.value = {}
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides.value))
    } catch {
      /* 存储满或禁用 localStorage 时忽略 */
    }
  }

  loadFromStorage()

  function hasCommitted(routeName: string): boolean {
    return Object.prototype.hasOwnProperty.call(PAGE_RULE_COMMITTED_OVERRIDES, routeName)
  }

  function effectiveRule(routeName: string): PageRuleEntry | null {
    const o = overrides.value[routeName]
    if (o) return cloneEntry(o)
    const c = PAGE_RULE_COMMITTED_OVERRIDES[routeName]
    if (c) return cloneEntry(c)
    const base = getBasePageRule(routeName)
    return base ? cloneEntry(base) : null
  }

  function resolveSource(routeName: string): PageRuleSource {
    if (Object.prototype.hasOwnProperty.call(overrides.value, routeName)) return 'local'
    if (hasCommitted(routeName)) return 'committed'
    return 'code'
  }

  function isOverridden(routeName: string): boolean {
    return Object.prototype.hasOwnProperty.call(overrides.value, routeName)
  }

  function setOverride(routeName: string, entry: PageRuleEntry) {
    overrides.value = {
      ...overrides.value,
      [routeName]: cloneEntry(entry),
    }
    persist()
  }

  function clearOverride(routeName: string) {
    if (!isOverridden(routeName)) return
    const next = { ...overrides.value }
    delete next[routeName]
    overrides.value = next
    persist()
  }

  function listMergedOrdered() {
    return listPageRulesOrdered().map(({ key, entry: base }) => ({
      key,
      base,
      entry: effectiveRule(key)!,
      overridden: isOverridden(key),
      source: resolveSource(key),
      hasCommitted: hasCommitted(key),
    }))
  }

  return {
    overrides,
    loadFromStorage,
    effectiveRule,
    resolveSource,
    isOverridden,
    hasCommitted,
    setOverride,
    clearOverride,
    listMergedOrdered,
  }
})
