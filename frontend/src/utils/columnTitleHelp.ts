import { h } from 'vue'
import type { VNode } from 'vue'
import InfoTooltip from '@/components/common/InfoTooltip.vue'
import { getFieldHelp } from '@/utils/fieldHelpCatalog'

/** 表头：标签 + InfoTooltip（无 catalog 条目时退回纯字符串） */
export function tableColTitle(label: string, catalogKey: string): string | (() => VNode) {
  const help = getFieldHelp(catalogKey)
  if (!help) return label
  return () =>
    h('span', { class: 'table-col-title-with-help' }, [
      h('span', { class: 'table-col-title-text' }, label),
      h(InfoTooltip, { title: help.title ?? '', hint: help.hint }),
    ])
}
