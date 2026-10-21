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

/**
 * 创建支付单并获取支付跳转链接
 * POST /pay/create
 * 需要 Authorization: Bearer <token>
 */
export function createPayment(data) {
  return api
    .post('/api/pay/create', data)
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

/**
 * 查询支付状态
 * GET /pay/queryStatus?payment_no={paymentNo}
 */
export function queryPaymentStatus(paymentNo) {
  return api
    .get(`/api/pay/query?payment_no=${paymentNo}`)
    .then(handleResponse)
    .catch((error) => {
      throw buildError(error)
    })
}

/**
 * 轮询支付状态
 * @param {string} paymentNo - 支付单号
 * @param {object} options - 轮询配置
 * @param {number} options.interval - 轮询间隔（毫秒），默认 2500
 * @param {number} options.timeout - 超时时间（毫秒），默认 5 分钟
 * @param {function} options.onProgress - 进度回调 (attempt, maxAttempts)
 * @returns {Promise<number>} 支付状态：0=待支付, 1=已支付, 2=支付失败
 */
export function pollPaymentStatus(paymentNo, options = {}) {
  const {
    interval = 2500,
    timeout = 5 * 60 * 1000, // 5 分钟
    onProgress,
  } = options

  const startTime = Date.now()
  const maxAttempts = Math.floor(timeout / interval)
  let attempt = 0
  let timer = null
  let stopped = false

  const promise = new Promise((resolve, reject) => {
    function cleanup() {
      if (timer) clearTimeout(timer)
      timer = null
    }

    function finish(value, error) {
      if (stopped) return
      stopped = true
      cleanup()
      if (error) reject(error)
      else resolve(value)
    }

    function poll() {
      if (stopped) return
      attempt++

      // 超时检查
      if (Date.now() - startTime >= timeout) {
        finish(undefined, new Error('支付查询超时，请稍后手动查看订单状态'))
        return
      }

      // 最大次数检查
      if (attempt > maxAttempts) {
        finish(undefined, new Error('支付查询次数已达上限，请稍后手动查看订单状态'))
        return
      }

      if (onProgress) onProgress(attempt, maxAttempts)

      queryPaymentStatus(paymentNo)
        .then((result) => {
          if (stopped) return
          const status = result?.paymentStatus ?? result?.status
          if (status === 1 || status === 2) {
            // 已支付或支付失败，停止轮询
            finish(status)
          } else {
            // 待支付，继续下一轮
            timer = setTimeout(poll, interval)
          }
        })
        .catch((err) => {
          if (stopped) return
          // 查询接口失败不立即中断，继续重试直到超时
          if (Date.now() - startTime >= timeout - interval) {
            finish(undefined, new Error('支付状态查询失败：' + (err.message || '网络异常')))
          } else {
            timer = setTimeout(poll, interval)
          }
        })
    }

    poll()
  })

  // 暴露取消方法，供成功/失败/关闭弹窗/页面卸载时停止轮询
  promise.cancel = () => {
    stopped = true
    if (timer) clearTimeout(timer)
    timer = null
  }

  return promise
}
