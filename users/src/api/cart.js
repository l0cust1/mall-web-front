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
 * 加入购物车
 * POST /api/cart/add
 */
export function addCartItem(payload) {
  return api
    .post('/api/cart/add', payload)
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

/**
 * 查询购物车列表与汇总
 * GET /api/cart/list
 */
export function getCartList() {
  return api
    .get('/api/cart/list')
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

/**
 * 修改购物车商品数量
 * PUT /api/cart/quantity
 */
export function updateCartQuantity(cartItemId, quantity) {
  return api
    .put('/api/cart/quantity', { cartItemId, quantity })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

/**
 * 勾选/取消勾选单个购物车项
 * PUT /api/cart/select
 */
export function updateCartSelected(cartItemId, selected) {
  return api
    .put('/api/cart/select', { cartItemId, selected })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

/**
 * 全选/取消全选
 * PUT /api/cart/selectAll
 */
export function selectAllCart(selected) {
  return api
    .put('/api/cart/selectAll', { selected })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

/**
 * 删除单个购物车项
 * DELETE /api/cart/{cartItemId}
 */
export function removeCartItem(cartItemId) {
  return api
    .delete(`/api/cart/${cartItemId}`)
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

/**
 * 清空购物车
 * DELETE /api/cart/clear
 */
export function clearCart() {
  return api
    .delete('/api/cart/clear')
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

/**
 * 购物车商品数量（导航栏角标）
 * GET /api/cart/count
 */
export function getCartCount() {
  return api
    .get('/api/cart/count')
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}
