import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  const loading = ref(false)
  const unreadCount = ref(0)

  return { loading, unreadCount }
})
