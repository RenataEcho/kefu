import { ref } from 'vue'

type ApiStatus = 'idle' | 'loading' | 'success' | 'error'

export function useApiStatus() {
  const status = ref<ApiStatus>('idle')
  const error = ref<string | null>(null)

  const isLoading = () => status.value === 'loading'
  const isSuccess = () => status.value === 'success'
  const isError = () => status.value === 'error'

  async function execute<T>(fn: () => Promise<T>): Promise<T | null> {
    status.value = 'loading'
    error.value = null
    try {
      const result = await fn()
      status.value = 'success'
      return result
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    }
  }

  return { status, error, isLoading, isSuccess, isError, execute }
}
