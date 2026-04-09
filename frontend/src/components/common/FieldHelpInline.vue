<template>
  <InfoTooltip v-if="entry" :title="entry.title ?? ''" :hint="entry.hint" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InfoTooltip from '@/components/common/InfoTooltip.vue'
import { getFieldHelp } from '@/utils/fieldHelpCatalog'

const props = defineProps<{
  catalogKey: string
}>()

const entry = computed(() => getFieldHelp(props.catalogKey))
</script>
