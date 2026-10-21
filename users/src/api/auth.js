import api from '@/utils/api'

function buildError(error) {
  if (error.response) {
    const data = error.response.data || {}
    return new Error(data.message || `请求失败 (${error.response.status})`)
  }
  return new Error(error.message || '请求失败')
}

function handleResponse(response) {
  if (!response?.data) {
    throw new Error('响应数据异常')
  }
  if (response.data.code !== 200) {
    throw new Error(response.data.message || `请求失败 (${response.status})`)
  }
  return response.data.data
}

export function register(username, password, phone, code) {
  return api
    .post('/api/auth/register', { username, password, phone, code })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function login(username, password) {
  return api
    .post('/api/auth/login', { username, password })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function sendCode(phone) {
  return api
    .post('/api/auth/sendCode', null, { params: { phone } })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function logout() {
  return api
    .post('/api/auth/logout')
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function updateGender(gender) {
  return api
    .post('/api/info/gender', { gender })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function updatePhone(phone, code) {
  return api
    .post('/api/info/phone', { phone, code })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function updateEmail(email, code) {
  return api
    .post('/api/info/email', { email, code })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function updatePassword(oldPassword, newPassword) {
  return api
    .post('/api/info/password', { oldPassword, newPassword })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function authSendCode(phone) {
  return api
    .post('/api/auth/sendCode', null, { params: { phone } })
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

export function getMyInfo() {
  return api
    .get('/api/info/myinfo')
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

/** 获取地址列表 GET /api/info/addressList */
export function getAddressList() {
  return api
    .get('/api/info/addressList')
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}
