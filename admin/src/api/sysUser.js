import request from '@/utils/request'

/**
 * 分页查询系统用户列表
 * @param {Object} params { nickname, status, pageNum, pageSize }
 */
export function loadUserList(params) {
  return request({
    url: '/sysUser/loadUserList',
    method: 'get',
    params
  })
}

/**
 * 修改用户状态
 * @param {Object} data { userId, status }
 */
export function updateUserStatus(data) {
  return request({
    url: '/sysUser/updateUserStatus',
    method: 'post',
    params: data // 使用 params 以适配后端的 @RequestParam 接收方式
  })
}
