import api from '@/utils/api'

function handleResponse(response) {
  if (!response?.data) {
    throw new Error('响应数据异常')
  }

  const payload = response.data
  const success = payload.code === 200 || payload.code === 0
  if (!success) {
    throw new Error(payload.message || '请求失败')
  }

  return payload.data ?? payload
}

export function getProductDetail(productId) {
  return api.get(`/api/product/detail/${productId}`).then(handleResponse)
}
