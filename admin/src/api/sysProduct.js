import request from '@/utils/request'

/**
 * 分页查询商品列表
 * @param {Object} params { productName, status, CommendType, pageNum, pageSize }
 */
export function loadProductList(params) {
  return request({
    url: '/product/list',
    method: 'get',
    params
  })
}

/**
 * 删除商品
 * @param {String} productId
 */
export function deleteProduct(productId) {
  return request({
    url: `/product/delete/${productId}`,
    method: 'post'
  })
}

/**
 * 修改商品推荐状态
 * @param {Object} params { productId, commendType }
 */
export function updateCommendType(params) {
  return request({
    url: '/product/updateCommendType',
    method: 'post',
    params
  })
}
/* 修改商品最高价和最低价 */
export function updateProductPrice(productId, data) {
  return request({
    url: `/product/updatePrice/${productId}`,
    method: 'post',
    data
  })
}

/**
 * 修改商品上下架状态
 * @param {Object} params { productId, status }
 */
export function updateProductStatus(params) {
  return request({
    url: '/product/updateStatus',
    method: 'post',
    params
  })
}

/**
 * 批量更新商品 SKU 库存
 * @param {Object} data { productId, skus }
 */
export function updateProductSkuStock(data) {
  return request({
    url: '/product/updateSkuStock',
    method: 'post',
    data
  })
}

/**
 * 查询商品 SKU 库存明细
 * @param {String} productId
 */
export function loadProductSkus(productId) {
  return request({
    url: `/product/loadStock/${productId}`,
    method: 'get'
  })
}

/**
 * 批量更新商品 SKU 库存
 * @param {Object} data { productId, skus }
 */


/**
 * 修改商品备注
 * @param {Object} params { productId, remark }
 */
export function updateProductRemark(params) {
  return request({
    url: '/product/updateRemark',
    method: 'post',
    params
  })
}

/**
 * 根据商品ID查询商品详情
 * @param {String} productId
 */
export function getProductDetail(productId) {
  return request({
    url: `/product/getProductById/${productId}`,
    method: 'get'
  })
}

/**
 * 发布商品（新增或编辑）
 * @param {Object} data ProductPublishDTO
 */
export function publishProduct(data) {
  return request({
    url: '/product/publish',
    method: 'post',
    data
  })
}
