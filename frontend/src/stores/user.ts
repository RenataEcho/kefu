import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { UserListItem, UserListQuery, UserListOptions, CreateUserDto, UpdateUserDto, UserDetail } from '@/types/user'
import { fetchUsers, fetchUserOptions, createUser as apiCreateUser, fetchUser, updateUser as apiUpdateUser, deleteUser as apiDeleteUser } from '@/api/users'

export const useUserStore = defineStore('user', () => {
  const loading = ref(false)
  const optionsLoading = ref(false)
  const creating = ref(false)
  const error = ref<string | null>(null)

  const users = ref<UserListItem[]>([])
  const total = ref(0)
  const options = ref<UserListOptions>({ agents: [], mentors: [], schools: [] })

  // ID of the most recently created user — used to highlight the new row
  const newlyCreatedId = ref<number | null>(null)

  const query = reactive<UserListQuery>({
    page: 1,
    pageSize: 20,
    keyword: '',
    rightLeopardCode: '',
    agentId: null,
    mentorId: null,
    schoolId: null,
    codeVerifyStatus: null,
    isPaid: null,
  })

  async function loadUsers() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchUsers({ ...query })
      users.value = res.items
      total.value = res.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function loadOptions() {
    optionsLoading.value = true
    try {
      options.value = await fetchUserOptions()
    } finally {
      optionsLoading.value = false
    }
  }

  async function createUserRecord(dto: CreateUserDto): Promise<UserListItem> {
    creating.value = true
    try {
      const newUser = await apiCreateUser(dto)
      // Reset to page 1 and reload so new record appears at top
      query.page = 1
      await loadUsers()
      newlyCreatedId.value = newUser.id
      // Clear highlight after 3 seconds
      setTimeout(() => { newlyCreatedId.value = null }, 3000)
      return newUser
    } finally {
      creating.value = false
    }
  }

  async function fetchUserDetail(id: number): Promise<UserDetail> {
    return fetchUser(id)
  }

  async function updateUserRecord(id: number, dto: UpdateUserDto): Promise<UserListItem> {
    const updated = await apiUpdateUser(id, dto)
    // Refresh list to reflect changes
    await loadUsers()
    return updated
  }

  async function deleteUserRecord(id: number): Promise<void> {
    await apiDeleteUser(id)
    // Reset to first page and reload
    query.page = 1
    await loadUsers()
  }

  function resetQuery() {
    query.page = 1
    query.keyword = ''
    query.rightLeopardCode = ''
    query.agentId = null
    query.mentorId = null
    query.schoolId = null
    query.codeVerifyStatus = null
    query.isPaid = null
  }

  return {
    loading,
    optionsLoading,
    creating,
    error,
    users,
    total,
    options,
    query,
    newlyCreatedId,
    loadUsers,
    loadOptions,
    createUserRecord,
    fetchUserDetail,
    updateUserRecord,
    deleteUserRecord,
    resetQuery,
  }
})
