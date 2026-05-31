import axios from 'axios'
import { CONFIG } from '@/lib/constants/config'

export const apiClient = axios.create({
  baseURL: CONFIG.API_URL + CONFIG.API_PREFIX,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor unwraps { success, data, timestamp } → data
// Return type is `any` intentionally; typed at call-site via typed wrappers below
apiClient.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const refresh = localStorage.getItem('refreshToken')
      if (refresh) {
        try {
          const res = await axios.post(`${CONFIG.API_URL}${CONFIG.API_PREFIX}/auth/refresh`, { refreshToken: refresh })
          const { accessToken, refreshToken: newRefresh } = res.data.data
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', newRefresh)
          if (error.config) {
            error.config.headers!.Authorization = `Bearer ${accessToken}`
            return apiClient.request(error.config)
          }
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/auth/login'
        }
      }
    }
    return Promise.reject(error.response?.data ?? error)
  },
)

// Typed wrappers — return T directly (interceptor already unwrapped)
export const get  = <T>(url: string, config?: any): Promise<T> => apiClient.get(url, config)  as unknown as Promise<T>
export const post = <T>(url: string, data?: any, config?: any): Promise<T> => apiClient.post(url, data, config) as unknown as Promise<T>
export const patch = <T>(url: string, data?: any): Promise<T> => apiClient.patch(url, data) as unknown as Promise<T>
export const del  = <T = void>(url: string): Promise<T> => apiClient.delete(url) as unknown as Promise<T>
