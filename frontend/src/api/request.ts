import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/api'
import { notifyPermissionUpdated, notifySessionExpired } from '@/api/httpFeedback'
import { useAuthStore } from '@/stores/auth'

const request: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: unknown) => Promise.reject(error),
)

request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // Sliding Session（AC#3）：读取续期 Token 并更新本地存储
    const renewedToken = response.headers['x-renewed-token']
    if (renewedToken) {
      const authStore = useAuthStore()
      authStore.setToken(renewedToken as string, 28800)
    }

    const { data } = response
    if (data.code !== 0 && data.code !== 200) {
      return Promise.reject(new Error(data.message || 'Request failed'))
    }
    return response
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      // prototype-spec §1.3：401 / 403 全局分流；登录页不弹 401 避免死循环
      if (status === 401 && window.location.pathname !== '/login') {
        notifySessionExpired()
      } else if (status === 403) {
        notifyPermissionUpdated()
      }
    }
    return Promise.reject(error)
  },
)

export default request

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await request.get<ApiResponse<T>>(url, config)
  return response.data.data
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await request.post<ApiResponse<T>>(url, data, config)
  return response.data.data
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await request.put<ApiResponse<T>>(url, data, config)
  return response.data.data
}

export async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await request.patch<ApiResponse<T>>(url, data, config)
  return response.data.data
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await request.delete<ApiResponse<T>>(url, config)
  return response.data.data
}
