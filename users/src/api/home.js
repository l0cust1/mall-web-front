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

  const payload = response.data
  const isSuccess = payload.code === 200 || payload.code === 0
  if (!isSuccess) {
    throw new Error(payload.message || '请求失败')
  }

  return payload.data ?? payload
}

export function getHomeAggregate() {
  return api
    .get('/api/home/aggregate')
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}
