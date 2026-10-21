import request from '@/utils/request'

/**
 * 分页查询轮播图列表
 * @param {Object} params { title, pageNum, pageSize }
 */
export function loadCarouselList(params) {
  return request({
    url: '/admin/carousel/list',
    method: 'get',
    params
  })
}

/**
 * 新增轮播图
 * @param {Object} data CarouselDTO
 */
export function addCarousel(data) {
  return request({
    url: '/admin/carousel/add',
    method: 'post',
    data
  })
}

/**
 * 修改轮播图
 * @param {Object} data CarouselDTO
 */
export function updateCarousel(data) {
  return request({
    url: '/admin/carousel/update',
    method: 'post',
    data
  })
}

/**
 * 删除轮播图
 * @param {Number|String} id
 */
export function deleteCarousel(id) {
  return request({
    url: `/admin/carousel/delete/${id}`,
    method: 'post'
  })
}

/**
 * 清除轮播图缓存
 */
export function clearCarouselCache() {
  return request({
    url: '/admin/carousel/clearCache',
    method: 'post'
  })
}
