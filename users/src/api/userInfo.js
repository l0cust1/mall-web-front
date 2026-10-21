import api from '@/utils/api'

function buildError(error) {
  if (error.response) {
    const data = error.response.data || {}
    return new Error(data.message || `请求失败 (${error.response.status})`)
  }
  return new Error(error.message || '请求失败')
}

function handleResponse(response) {
  if (!response?.data) {
    throw new Error('响应数据异常')
  }
  if (response.data.code !== 200) {
    throw new Error(response.data.message || `请求失败 (${response.status})`)
  }
  return response.data.data
}

/**
 * 获取当前登录用户信息
 * GET /info/myinfo
 * 请求头需要 Authorization: Bearer <token>
 */
export function getMyInfo() {
  return api
    .get('/info/myinfo')
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}
