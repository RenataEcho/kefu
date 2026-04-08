import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuditStore = defineStore('audit', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  return { loading, error }
})
