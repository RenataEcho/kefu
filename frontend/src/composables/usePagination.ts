import { ref, reactive } from 'vue'

interface PaginationOptions {
  defaultPageSize?: number
}

export function usePagination(options: PaginationOptions = {}) {
  const { defaultPageSize = 20 } = options

  const pagination = reactive({
    page: 1,
    pageSize: defaultPageSize,
    total: 0,
  })

  const loading = ref(false)

  function onPageChange(page: number) {
    pagination.page = page
  }

  function onPageSizeChange(pageSize: number) {
    pagination.pageSize = pageSize
    pagination.page = 1
  }

  function reset() {
    pagination.page = 1
    pagination.total = 0
  }

  return { pagination, loading, onPageChange, onPageSizeChange, reset }
}
