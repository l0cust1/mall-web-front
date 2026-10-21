import request from '@/utils/request'

/**
 * 获取算术验证码图片
 */
export function getCheckCode() {
  return request({
    url: '/account/checkcode',
    method: 'get'
  })
}

/**
 * 管理员登录
 * @param {Object} data { account, password, checkCode, checkCodeKey }
 */
export function login(data) {
  return request({
    url: '/account/login',
    method: 'post',
    params: data
  })
}

/**
 * 管理员登出
 */
export function logout() {
  return request({
    url: '/account/logout',
    method: 'post'
  })
}
