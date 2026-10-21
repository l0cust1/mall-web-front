import request from '@/utils/request'


/**
 * 查询推荐商品列表（无参数）
 */
export function loadRecommendListAll() {
  return request({
    url: '/admin/recommend/list',
    method: 'get'
  })
}

/**
 * 新增推荐商品
 * @param {Object} data RecommendDTO
 */
export function addRecommend(data) {
  return request({
    url: '/admin/recommend',
    method: 'post',
    data
  })
}

/**
 * 修改推荐商品
 * @param {Object} data RecommendDTO
 */
export function updateRecommend(data) {
  return request({
    url: '/admin/recommend',
    method: 'post',
    data
  })
}

/**
 * 删除推荐商品
 * @param {Number|String} id
 */
export function deleteRecommend(id) {
  return request({
    url: `/admin/recommend/${id}`,
    method: 'delete'
  })
}

/**
 * 清除推荐商品缓存
 */
export function clearRecommendCache() {
  return request({
    url: '/admin/recommend/clear-cache',
    method: 'post'
  })
}
