import request from '@/utils/request'

/**
 * 获取三级分类树形结构
 * @param {Object} params { categoryName, pcategoryId, pageNum, pageSize }
 */
export function loadCategoryTree(params) {
  return request({
    url: '/sysCategory/loadCategoryTree',
    method: 'get',
    params
  })
}

/**
 * 新增单个分类
 * @param {Object} data { categoryId, categoryName, pcategoryId, sort }
 */
export function addCategory(data) {
  return request({
    url: '/sysCategory/add',
    method: 'post',
    data
  })
}

/**
 * 根据分类ID查询分类详情
 * @param {String} categoryId
 */
export function getCategoryDetail(categoryId) {
  return request({
    url: '/sysCategory/getSysCategoryByCategoryId',
    method: 'get',
    params: { categoryId }
  })
}

/**
 * 根据分类ID修改分类信息
 * @param {String} categoryId 分类ID
 * @param {Object} bean 分类对象
 */
export function updateCategory(categoryId, bean) {
  return request({
    url: '/sysCategory/updateSysCategoryByCategoryId',
    method: 'post',
    params: { categoryId },
    data: bean
  })
}

/**
 * 根据分类ID删除分类
 * @param {String} categoryId
 */
export function deleteCategory(categoryId) {
  return request({
    url: '/sysCategory/deleteSysCategoryByCategoryId',
    method: 'post',
    params: { categoryId }
  })
}
