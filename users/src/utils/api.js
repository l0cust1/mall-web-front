import axios from 'axios'
import router from '@/router'

const api = axios.create({
  baseURL: 'http://localhost:6050',
  withCredentials: true,
})

function getAccessToken() {
  return localStorage.getItem('accessToken') || ''
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      if (originalRequest.url?.includes('/api/auth/refresh')) {
        localStorage.removeItem('accessToken')
        router.push('/login')
        return Promise.reject(error)
      }

      originalRequest._retry = true
      try {
        const refreshRes = await axios.post(
          'http://localhost:6050/api/auth/refresh',
          {},
          { withCredentials: true },
        )
        if (refreshRes.data?.code === 200) {
          const newAccessToken = refreshRes.data.data
          localStorage.setItem('accessToken', newAccessToken)
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return api.request(originalRequest)
        }
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError)
      }

      localStorage.removeItem('accessToken')
      router.push('/login')
    }
    return Promise.reject(error)
  },
)

export default api
