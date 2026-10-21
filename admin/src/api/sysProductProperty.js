import request from '@/utils/request'

/**
 * 获取属性树形结构
 * @param {Object} params { pageNum, pageSize }
 */
export function loadPropertyTree(params) {
  return request({
    url: '/sysProductProperty/loadPropertyTree',
    method: 'get',
    params
  })
}

/**
 * 根据属性ID修改属性信息
 * @param {String} propertyId 属性ID
 * @param {Object} bean 属性对象
 */
export function updateProperty(propertyId, bean) {
  return request({
    url: '/sysProductProperty/updatePropertyById',
    method: 'post',
    params: { propertyId },
    data: bean
  })
}

/**
 * 新增属性
 * @param {Object} bean 属性对象 { categoryId, propertyName, coverType }
 */
export function addProperty(bean) {
  return request({
    url: '/sysProductProperty/addSmart',
    method: 'post',
    data: bean
  })
}

/**
 * 根据属性ID删除属性
 * @param {String} propertyId
 */
export function deleteProperty(propertyId) {
  return request({
    url: '/sysProductProperty/deletePropertyById',
    method: 'post',
    params: { propertyId }
  })
}
