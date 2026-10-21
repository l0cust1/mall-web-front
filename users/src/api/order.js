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

/** 获取确认商品信息 */
export function getConfirmGoods(propertyValueIdHash) {
  return api.get(`/api/order/getConfirmGoods/${propertyValueIdHash}`).then(handleResponse)
}

/** 创建订单 */
export function createOrder(orderData) {
  return api.post('/api/order/create', orderData).then(handleResponse)
}

/** 查询订单列表 */
export function getOrderList(pageNum = 1, pageSize = 10) {
  return api
    .get(`/api/order/showOrder?pageNum=${pageNum}&pageSize=${pageSize}`)
    .then(handleResponse)
}

/** 取消订单 */
export function cancelOrder(orderId) {
  return api.put('/api/order/cancel', { orderId }).then(handleResponse)
}

/** 确认收货 */
export function confirmReceive(orderId) {
  return api.put('/api/order/confirmReceive', { orderId }).then(handleResponse)
}

/** 删除订单 */
export function deleteOrder(orderId) {
  return api.put('/api/order/delete', { orderId }).then(handleResponse)
}

/** 支付订单 */
export function payOrder(orderId) {
  return api.put('/api/order/pay', { orderId }).then(handleResponse)
}

export default {
  getConfirmGoods,
  createOrder,
  getOrderList,
  cancelOrder,
  confirmReceive,
  deleteOrder,
}
