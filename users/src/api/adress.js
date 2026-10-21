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
 * 获取当前登录用户的所有地址列表
 * GET /api/info/addressList
 * 需要 Authorization: Bearer <token>
 */
export function getAddressList() {
  return api
    .get('/api/info/addressList')
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function getUserAddresses(userId) {
  return api
    .get('/api/address/list', { params: { userId } })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function addUserAddress(data) {
  return api
    .post('/api/address/add', data)
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function updateUserAddress(data) {
  return api
    .put('/api/address/update', data)
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export { updateUserAddress as updateAddress }

export function deleteUserAddress(addressId) {
  return api
    .delete(`/api/address/${addressId}`)
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}
