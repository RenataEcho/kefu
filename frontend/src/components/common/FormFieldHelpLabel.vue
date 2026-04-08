<template>
  <span class="form-field-help-label">
    {{ label }}
    <InfoTooltip v-if="entry" :title="entry.title ?? ''" :hint="entry.hint" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InfoTooltip from '@/components/common/InfoTooltip.vue'
import { getFieldHelp } from '@/utils/fieldHelpCatalog'

const props = defineProps<{
  label: string
  catalogKey: string
}>()

const entry = computed(() => getFieldHelp(props.catalogKey))
</script>

<style scoped>
.form-field-help-label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  vertical-align: middle;
}
</style>
