import request from '@/utils/request'

/**
 * 分页查询订单列表
 * @param {Object} params { pageNum, pageSize, productName, status }
 */
export function loadOrderList(params) {
  return request({
    url: '/order/list',
    method: 'get',
    params
  })
}

/**
 * 订单发货
 * @param {Object} data { orderId, deliveryCompany, deliverySn }
 */
export function orderDelivery(data) {
  return request({
    url: '/order/delivery',
    method: 'post',
    data
  })
}
