<template>
  <div class="filter-field-label">
    <span class="filter-field-label-text">{{ label }}</span>
    <InfoTooltip v-if="entry" :title="entry.title ?? ''" :hint="entry.hint" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InfoTooltip from '@/components/common/InfoTooltip.vue'
import { getFieldHelp } from '@/utils/fieldHelpCatalog'

const props = defineProps<{
  label: string
  /** `fieldHelpCatalog` 中的 key */
  catalogKey: string
}>()

const entry = computed(() => getFieldHelp(props.catalogKey))
</script>

<style scoped>
.filter-field-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  min-height: 18px;
}

.filter-field-label-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
</style>
