import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  baseURL: '/api', // 基础路径
  timeout: 5000 // 超时时间
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    const token = localStorage.getItem('user_token')
    if (token) {
      config.headers['adminToken'] = token
    }
    return config
  },
  error => {
    console.log(error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    // 如果 response.data 为空，返回整个 response 或 null
    if (response.data === undefined || response.data === null || response.data === '') {
      return response.data
    }

    const res = response.data

    // 如果返回的是二进制数据或字符串（非 JSON 对象），直接返回
    if (typeof res !== 'object') {
      return res
    }

    // 如果没有 code 字段，可能不是标准的 {code, data, message} 格式，直接返回数据本身
    if (res.code === undefined) {
      return res
    }

    // 如果 code 不是 200，说明有错误
    if (res.code !== 200) {
      ElMessage({
        message: res.message || 'Error',
        type: 'error',
        duration: 5 * 1000
      })
      return Promise.reject(new Error(res.message || 'Error'))
    } else {
      // 兼容直接返回 res 或返回 res.data
      // 优先取 data，如果 data 是 null/undefined，则返回 res 整个对象（可能 URL 在外层）
      return (res.data !== undefined && res.data !== null) ? res.data : res
    }
  },
  error => {
    console.log('err' + error)
    ElMessage({
      message: error.message,
      type: 'error',
      duration: 5 * 1000
    })
    return Promise.reject(error)
  }
)

export default service
