<template>
  <div class="entry-qr-thumb">
    <img v-if="dataUrl" :src="dataUrl" width="40" height="40" alt="" class="entry-qr-thumb__img" />
    <div v-else class="entry-qr-thumb__placeholder" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{
  url: string
}>()

const dataUrl = ref('')

watch(
  () => props.url,
  (u) => {
    if (!u?.trim()) {
      dataUrl.value = ''
      return
    }
    void QRCode.toDataURL(u, { width: 120, margin: 1, errorCorrectionLevel: 'M' })
      .then((s) => {
        dataUrl.value = s
      })
      .catch(() => {
        dataUrl.value = ''
      })
  },
  { immediate: true },
)
</script>

<style scoped>
.entry-qr-thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-raised, rgba(255, 255, 255, 0.04));
  overflow: hidden;
}

.entry-qr-thumb__img {
  display: block;
  width: 40px;
  height: 40px;
  object-fit: cover;
}

.entry-qr-thumb__placeholder {
  width: 40px;
  height: 40px;
  background: var(--border-subtle);
}
</style>
