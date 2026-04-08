<script setup lang="ts">
import { useDialog, useMessage } from 'naive-ui'
import { registerHttpFeedback } from '@/api/httpFeedback'

registerHttpFeedback(useDialog(), useMessage())
</script>

<template>
  <span class="sr-only" aria-hidden="true" />
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
