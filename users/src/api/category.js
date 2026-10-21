import axios from 'axios'
export function getFirstLevelCategories() {
  return axios.get('http://localhost:6050/api/categoryV1/first-level')
}

/**
 * 2. 根据一级分类ID，查询对应二级分类 + 二级下绑定的商品列表
 * @param {string} pCategoryId 一级分类ID
 * @returns Promise 二级分类数组（每个分类携带products商品数组）
 */
export function getSubCategoryWithProduct(pCategoryId) {
  return axios.get('http://localhost:6050/api/categoryV1/getSubCategoryWithProduct', {
    params: {
      pCategoryId,
    },
  })
}
