<script setup>
import { nextTick, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrderList, cancelOrder, confirmReceive, deleteOrder } from '@/api/order'
import { createPayment, pollPaymentStatus, queryPaymentStatus } from '@/api/pay'

const route = useRoute()
const router = useRouter()

// 订单列表数据
const orders = ref([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(10)
const hasMore = ref(true)
const submitting = ref(false)

// 支付状态弹窗
const showPayStatusDialog = ref(false)
const payStatusText = ref('正在查询支付状态...')
const payStatusStep = ref('') // 'polling' | 'success' | 'failed' | 'timeout'
const currentOrderId = ref('')
const highlightOrderId = ref('')
let cancelPolling = null

// ---- 在新窗口打开支付页面 ----
function openPaymentInNewWindow(payHtml) {
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    // 标记支付弹窗，便于支付宝同步跳转回来后识别并关闭它
    newWindow.name = 'easymall_alipay_pay'
    newWindow.document.open()
    newWindow.document.write(payHtml)
    newWindow.document.close()
  } else {
    ElMessage.warning('弹窗被拦截，请允许弹窗后重试')
  }
  return newWindow
}

// ---- 停止轮询 ----
function stopPolling() {
  if (cancelPolling) {
    cancelPolling.cancel?.()
    cancelPolling = null
  }
}

// ---- 支付成功：刷新订单列表并定位到该订单 ----
function handlePaySuccess() {
  if (payStatusStep.value !== 'polling') return
  stopPolling()
  submitting.value = false
  highlightOrderId.value = currentOrderId.value
  payStatusStep.value = 'success'
  payStatusText.value = '支付成功，正在刷新订单列表...'
  ElMessage.success('支付成功')
  setTimeout(async () => {
    showPayStatusDialog.value = false
    await loadOrders()
    scrollToHighlightedOrder()
  }, 1200)
}

// ---- 支付失败 ----
function handlePayFailed() {
  if (payStatusStep.value !== 'polling') return
  stopPolling()
  submitting.value = false
  payStatusStep.value = 'failed'
  payStatusText.value = '支付失败，请重新支付'
  ElMessage.error('支付失败')
}

// ---- 查询失败（接口异常、超时或关闭支付窗口后仍未查到结果）----
function handleQueryFailed(message = '查询失败，请稍后刷新页面查看订单状态') {
  if (payStatusStep.value !== 'polling') return
  stopPolling()
  submitting.value = false
  payStatusStep.value = 'timeout'
  payStatusText.value = message
  ElMessage.error('查询失败')
}

// ---- 监听支付窗口关闭 ----
function watchPaymentWindowClose(payWindow, paymentNo, orderId) {
  const checkTimer = setInterval(() => {
    if (payWindow && payWindow.closed) {
      clearInterval(checkTimer)
      console.log('[支付] 支付窗口已关闭，开始确认支付结果')
      confirmPayResult(paymentNo, orderId, 0)
    }
  }, 1000)
}

// 支付窗口关闭后再确认 3 次，仍未查到结果就停止轮询
async function confirmPayResult(paymentNo, orderId, attempt) {
  if (payStatusStep.value !== 'polling') return
  try {
    const result = await queryPaymentStatus(paymentNo)
    const status = result?.paymentStatus ?? result?.status
    if (status === 1) {
      handlePaySuccess()
      return
    }
    if (status === 2) {
      handlePayFailed()
      return
    }
  } catch (e) {
    // 查询异常时继续重试
  }

  if (attempt < 2) {
    setTimeout(() => confirmPayResult(paymentNo, orderId, attempt + 1), 1500)
  } else {
    handleQueryFailed('未查询到支付结果，请稍后刷新页面查看订单状态')
  }
}

// ---- 支付状态轮询 ----
function startPolling(paymentNo, orderId) {
  currentOrderId.value = orderId
  showPayStatusDialog.value = true
  payStatusStep.value = 'polling'
  payStatusText.value = '正在查询支付状态，请稍候...'

  cancelPolling = pollPaymentStatus(paymentNo, {
    interval: 2500,
    timeout: 5 * 60 * 1000,
    onProgress: (attempt, maxAttempts) => {
      payStatusText.value = `正在查询支付状态（${attempt}/${maxAttempts}），请稍候...`
    },
  })

  cancelPolling
    .then((status) => {
      if (status === 1) {
        handlePaySuccess()
      } else if (status === 2) {
        handlePayFailed()
      }
    })
    .catch((err) => {
      handleQueryFailed(err.message || '查询失败，请稍后刷新页面查看订单状态')
    })
    .finally(() => {
      submitting.value = false
    })
}

// ---- 关闭支付状态弹窗 ----
function closePayStatusDialog() {
  stopPolling()
  showPayStatusDialog.value = false
  submitting.value = false
}

// 加载订单列表
async function loadOrders() {
  loading.value = true
  try {
    const data = await getOrderList(pageNum.value, pageSize.value)
    if (Array.isArray(data)) {
      orders.value = data
      hasMore.value = data.length >= pageSize.value
    } else if (data?.list) {
      orders.value = data.list
      hasMore.value = data.list.length >= pageSize.value
    } else if (data?.records) {
      orders.value = data.records
      hasMore.value = data.records.length >= pageSize.value
    } else {
      orders.value = []
      hasMore.value = false
    }
  } catch (e) {
    console.error('加载订单失败:', e)
    ElMessage.error('加载订单失败，请稍后重试')
    orders.value = []
  } finally {
    loading.value = false
  }
}

// 滚动到刚支付的订单
function scrollToHighlightedOrder() {
  if (!highlightOrderId.value) return
  nextTick(() => {
    const el = [...document.querySelectorAll('[data-order-id]')].find(
      (node) => node.dataset.orderId === highlightOrderId.value,
    )
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

// 取消订单
async function handleCancel(orderId) {
  try {
    await ElMessageBox.confirm('确定要取消该订单吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await cancelOrder(orderId)
    ElMessage.success('订单已取消')
    loadOrders()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('取消订单失败')
    }
  }
}

// 立即付款
async function handlePay(orderId) {
  try {
    await ElMessageBox.confirm('确认要支付该订单吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })

    submitting.value = true
    
    // 调用后端发起支付接口
    // 注意：后端需要处理订单已有待支付记录的情况，返回现有支付信息
    const paymentResult = await createPayment({
      orderId: orderId,
      paymentMethod: 'alipay',
    })

    console.log('[支付] 支付单创建成功:', paymentResult)
    const payUrl = paymentResult?.payUrl
    const paymentNo = paymentResult?.paymentNo || paymentResult?.payment_no
    
    if (!payUrl) {
      throw new Error('支付单创建失败：未返回支付链接')
    }

    console.log('[支付] 准备跳转到支付页面:', payUrl)

    // 在新窗口打开支付页面
    const payWindow = openPaymentInNewWindow(payUrl)

    // 如果有 paymentNo，开始轮询支付状态 + 监听窗口关闭
    if (paymentNo) {
      console.log('[支付] 开始轮询支付状态, paymentNo:', paymentNo)
      startPolling(paymentNo, orderId)
      watchPaymentWindowClose(payWindow, paymentNo, orderId)
    } else {
      ElMessage.info('已打开支付页面，支付完成后请返回查看订单状态')
      submitting.value = false
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('[支付] 失败:', err)
      ElMessage.error(err.message || '支付失败')
      submitting.value = false
    }
  }
}

// 确认收货
async function handleConfirm(orderId) {
  try {
    await ElMessageBox.confirm('确认已收到该商品？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })
    await confirmReceive(orderId)
    ElMessage.success('已确认收货')
    loadOrders()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('确认收货失败')
    }
  }
}

// 删除订单
async function handleDelete(orderId) {
  try {
    await ElMessageBox.confirm('确定要删除该订单吗？此操作不可恢复', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error',
    })
    await deleteOrder(orderId)
    ElMessage.success('订单已删除')
    loadOrders()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除订单失败')
    }
  }
}

// 获取订单状态文本
function getStatusText(status) {
  const statusMap = {
    0: '已删除',
    1: '待付款',
    2: '已付款，等待商家发货',
    3: '商家已发货',
    4: '订单已完成',
    5: '交易已取消',
  }
  return statusMap[status] || '未知状态'
}

// 获取订单状态样式类
function getStatusClass(status) {
  const classMap = {
    0: 'status-deleted',
    1: 'status-pending',
    2: 'status-paid',
    3: 'status-shipped',
    4: 'status-completed',
    5: 'status-cancelled',
  }
  return classMap[status] || ''
}

// 格式化时间
function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

// 获取完整图片URL
function getImageUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `http://localhost:6050${url}`
}

// 处理支付宝同步跳转 / 支付成功后的页面跳转
async function handleRouteResult() {
  const query = route.query
  const isAlipayReturn =
    query.method === 'alipay.trade.page.pay.return' ||
    (!!query.out_trade_no && !!query.trade_no)

  // ========== 支付宝同步跳转回来 ==========
  if (isAlipayReturn) {
    // 支付弹窗：把主窗口带到订单中心，然后关闭弹窗，避免停在带签名参数的地址
    if (window.name === 'easymall_alipay_pay' && window.opener && !window.opener.closed) {
      try {
        window.opener.location.href = window.location.href
      } catch (e) {
        // 忽略跨窗口访问异常
      }
      window.close()
      return true
    }

    // 非弹窗（弹窗被拦截或单独打开）：主动同步一次支付状态，再清理地址栏参数
    loading.value = true
    const paymentNo = String(query.out_trade_no || '')
    let result = null
    if (paymentNo) {
      try {
        result = await queryPaymentStatus(paymentNo)
      } catch (e) {
        console.warn('支付结果同步失败:', e.message)
      }
    }

    const status = result?.paymentStatus ?? result?.status
    if (status === 1) {
      highlightOrderId.value = String(result?.orderId || '')
      ElMessage.success('支付成功，订单状态已更新')
    } else {
      ElMessage.warning('支付结果确认中，请稍后刷新订单状态')
    }

    router.replace({ name: 'orders' })
    await loadOrders()
    scrollToHighlightedOrder()
    return true
  }

  // ========== 确认订单页支付成功后 SPA 跳转过来 ==========
  if (query.payResult === 'success') {
    highlightOrderId.value = String(query.orderId || '')
    ElMessage.success('支付成功，订单状态已更新')
    router.replace({ name: 'orders' })
    await loadOrders()
    scrollToHighlightedOrder()
    return true
  }

  return false
}

onMounted(async () => {
  const handled = await handleRouteResult()
  if (!handled) {
    await loadOrders()
  }
})

// 同一路由下参数变化时（例如支付弹窗通知主窗口跳转）也要处理
watch(
  () => route.query,
  () => {
    handleRouteResult()
  },
)

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="order-center-page">
    <!-- 页面标题 -->
    <header class="page-header">
      <h1 class="page-title">订单中心</h1>
      <p class="page-desc">管理您的所有订单</p>
    </header>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>正在加载订单...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="orders.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <p class="empty-text">暂无订单</p>
      <button class="go-shopping-btn" @click="router.push('/')">去逛逛</button>
    </div>

    <!-- 订单列表 -->
    <div v-else class="order-list">
      <div
        v-for="order in orders"
        :key="order.id"
        :data-order-id="order.orderId"
        class="order-card"
        :class="{
          'order-card-highlight': highlightOrderId && highlightOrderId === order.orderId,
        }"
      >
        <!-- 订单头部 -->
        <div class="order-header">
          <span class="order-id">订单号：{{ order.orderId }}</span>
          <span class="order-time">{{ formatTime(order.createTime) }}</span>
          <span class="order-status" :class="getStatusClass(order.orderStatus)">
            {{ getStatusText(order.orderStatus) }}
          </span>
          <!-- 交易取消状态下显示删除按钮 -->
          <button
            v-if="order.orderStatus === 5"
            class="delete-icon-btn"
            @click="handleDelete(order.orderId)"
            title="删除订单"
          >
            🗑️
          </button>
        </div>

        <!-- 商品明细 -->
        <div class="order-item">
          <div class="item-cover">
            <img
              v-if="order.productCover"
              :src="getImageUrl(order.productCover)"
              :alt="order.productName"
            />
            <div v-else class="cover-placeholder">📦</div>
          </div>
          <div class="item-info">
            <div class="item-name">{{ order.productName }}</div>
            <div class="item-sku">{{ order.skuInfo }}</div>
            <div class="item-price-row">
              <span class="item-price">¥{{ Number(order.price).toFixed(2) }}</span>
              <span class="item-quantity">x{{ order.quantity }}</span>
            </div>
          </div>
          <div class="item-subtotal">
            <div class="subtotal-label">小计</div>
            <div class="subtotal-value">¥{{ Number(order.subtotal).toFixed(2) }}</div>
          </div>
        </div>

        <!-- 操作按钮区域 - 根据订单状态显示不同按钮 -->
        <div class="order-actions">
          <!-- 状态0: 已删除 -->
          <template v-if="order.orderStatus === 0">
            <span class="action-text deleted-text">订单已删除</span>
          </template>

          <!-- 状态1: 待付款 -->
          <template v-else-if="order.orderStatus === 1">
            <button class="action-btn cancel-btn" @click="handleCancel(order.orderId)">
              取消订单
            </button>
            <button class="action-btn pay-btn" @click="handlePay(order.orderId)">
              立即付款
            </button>
          </template>

          <!-- 状态2: 已付款待发货 -->
          <template v-else-if="order.orderStatus === 2">
            <span class="action-text waiting-text">已付款，等待商家发货</span>
          </template>

          <!-- 状态3: 已发货 -->
          <template v-else-if="order.orderStatus === 3">
            <button class="action-btn confirm-btn" @click="handleConfirm(order.orderId)">
              确认收货
            </button>
          </template>

          <!-- 状态4: 已完成 -->
          <template v-else-if="order.orderStatus === 4">
            <span class="action-text completed-text">订单已完成</span>
          </template>

          <!-- 状态5: 交易取消 -->
          <template v-else-if="order.orderStatus === 5">
            <span class="action-text cancelled-text">交易已取消</span>
          </template>
        </div>
      </div>
    </div>

    <!-- 支付状态弹窗 -->
    <el-dialog
      v-model="showPayStatusDialog"
      :title="payStatusStep === 'polling' ? '支付状态查询中' : '支付结果'"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="payStatusStep !== 'polling'"
      width="420px"
    >
      <div class="pay-status-dialog-content">
        <!-- 轮询中 -->
        <div v-if="payStatusStep === 'polling'" class="pay-status-content">
          <div class="pay-status-spinner"></div>
          <p class="pay-status-text">{{ payStatusText }}</p>
          <p class="pay-status-hint">请在新窗口完成支付，系统将自动确认</p>
        </div>

        <!-- 支付成功 -->
        <div v-else-if="payStatusStep === 'success'" class="pay-status-content">
          <div class="pay-status-icon success">✅</div>
          <p class="pay-status-text success">{{ payStatusText }}</p>
          <p class="pay-status-hint">正在刷新订单列表...</p>
        </div>

        <!-- 支付失败 -->
        <div v-else-if="payStatusStep === 'failed'" class="pay-status-content">
          <div class="pay-status-icon failed">❌</div>
          <p class="pay-status-text failed">{{ payStatusText }}</p>
          <button class="pay-status-btn retry" @click="closePayStatusDialog">我知道了</button>
        </div>

        <!-- 超时 -->
        <div v-else-if="payStatusStep === 'timeout'" class="pay-status-content">
          <div class="pay-status-icon timeout">⏰</div>
          <p class="pay-status-text timeout">{{ payStatusText }}</p>
          <p class="pay-status-hint">您可以稍后在订单中心查看支付结果</p>
          <button class="pay-status-btn" @click="closePayStatusDialog">我知道了</button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.order-center-page {
  padding: 0;
  max-width: 100%;
}

/* ---- 页面标题 ---- */
.page-header {
  padding: 16px 24px 12px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #2d2d2d;
  margin: 0;
}

.page-desc {
  font-size: 13px;
  color: #999;
  margin: 4px 0 0;
}

/* ---- 加载中 ---- */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f0f0f0;
  border-top-color: #ff6b35;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---- 空状态 ---- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #999;
  margin: 0 0 24px;
}

.go-shopping-btn {
  padding: 10px 32px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.go-shopping-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(255, 107, 53, 0.35);
}

/* ---- 订单列表 ---- */
.order-list {
  padding: 0 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---- 订单卡片 ---- */
.order-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.order-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

/* 刚支付成功的订单高亮 */
.order-card-highlight {
  border-color: #52c41a;
  box-shadow: 0 0 0 3px rgba(82, 196, 26, 0.14);
  animation: orderHighlight 1.8s ease-out;
}

@keyframes orderHighlight {
  0% {
    background: #f6ffed;
  }
  100% {
    background: #fff;
  }
}

/* ---- 订单头部 ---- */
.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.order-id {
  font-size: 13px;
  color: #666;
  font-family: 'Courier New', monospace;
}

.order-time {
  font-size: 12px;
  color: #999;
}

.order-status {
  font-size: 13px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
}

.status-deleted {
  color: #999;
  background: #f5f5f5;
}

.status-pending {
  color: #ff6b35;
  background: #fff5f0;
}

.status-paid {
  color: #1890ff;
  background: #e6f7ff;
}

.status-shipped {
  color: #52c41a;
  background: #f6ffed;
}

.status-completed {
  color: #52c41a;
  background: #f6ffed;
}

.status-cancelled {
  color: #999;
  background: #f5f5f5;
}

.delete-icon-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
  opacity: 0.6;
}

.delete-icon-btn:hover {
  opacity: 1;
  background: #fff1f0;
  transform: scale(1.1);
}

/* ---- 商品明细 ---- */
.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}

.item-cover {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: #fff5f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  font-size: 32px;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #2d2d2d;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-sku {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}

.item-price-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-price {
  font-size: 16px;
  font-weight: 700;
  color: #ff6b35;
}

.item-quantity {
  font-size: 13px;
  color: #999;
}

.item-subtotal {
  text-align: right;
  flex-shrink: 0;
}

.subtotal-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}

.subtotal-value {
  font-size: 16px;
  font-weight: 700;
  color: #2d2d2d;
}

/* ---- 操作按钮 ---- */
.order-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.cancel-btn {
  background: #fff;
  color: #ff6b35;
  border-color: #ff6b35;
}

.cancel-btn:hover {
  background: #fff5f0;
}

.confirm-btn {
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  border: none;
}

.confirm-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.delete-btn {
  background: #fff;
  color: #999;
  border-color: #e0e0e0;
}

.delete-btn:hover {
  color: #ff4d4f;
  border-color: #ff4d4f;
  background: #fff1f0;
}

.pay-btn {
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  border: none;
}

.pay-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.action-text {
  font-size: 13px;
  font-weight: 500;
  padding: 6px 16px;
}

.deleted-text {
  color: #999;
}

.waiting-text {
  color: #1890ff;
}

.completed-text {
  color: #52c41a;
}

.cancelled-text {
  color: #999;
}

/* ---- 支付状态弹窗 ---- */
.pay-status-dialog-content {
  padding: 20px 0;
  text-align: center;
}

.pay-status-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.pay-status-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f0f0f0;
  border-top-color: #ff6b35;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.pay-status-icon {
  font-size: 64px;
}

.pay-status-text {
  font-size: 16px;
  color: #333;
  margin: 0;
  font-weight: 500;
}

.pay-status-text.success {
  color: #52c41a;
}

.pay-status-text.failed {
  color: #ff4d4f;
}

.pay-status-text.timeout {
  color: #faad14;
}

.pay-status-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.pay-status-btn {
  padding: 10px 32px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.pay-status-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.pay-status-btn.retry {
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
}
</style>
