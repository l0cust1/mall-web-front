<template>
  <div class="order-confirm-page">
    <!-- 顶部导航 -->
    <div class="header-row">
      <button @click="router.back()" class="back-btn">&larr; 返回</button>
      <h2>确认订单</h2>
    </div>

    <div v-if="loading" class="loading-state">正在加载订单信息...</div>

    <div v-else class="content-layout">
      <!-- ===== 左侧 70% ===== -->
      <div class="left-column">
        <!-- 收货地址 -->
        <div class="section-block address-section">
          <div class="section-header">
            <span class="section-icon">📍</span>
            <span>收货地址</span>
          </div>

          <div v-if="addresses.length === 0" class="empty-address">
            <p>暂无收货地址</p>
            <el-button type="primary" size="small" @click="showAddDialog = true"
              >添加地址</el-button
            >
          </div>

          <div v-else class="address-list">
            <div
              v-for="addr in sortedAddresses"
              :key="addr.addressId"
              class="address-card"
              :class="{ selected: selectedAddress?.addressId === addr.addressId }"
              @click="selectedAddress = addr"
            >
              <div class="address-radio">
                <span
                  class="radio-dot"
                  :class="{ active: selectedAddress?.addressId === addr.addressId }"
                ></span>
              </div>
              <div class="address-info">
                <div class="address-name-row">
                  <span class="address-name">{{ addr.receiverName }}</span>
                  <span class="address-phone">{{ addr.receiverPhone }}</span>
                  <span v-if="addr.isDefault" class="default-badge">默认</span>
                </div>
                <div class="address-detail">{{ formatAddress(addr) }}</div>
                <div class="address-card-actions">
                  <button type="button" class="edit-btn" @click.stop="openEditDialog(addr)">
                    编辑
                  </button>
                </div>
              </div>
            </div>

            <div class="address-actions">
              <el-button type="primary" size="small" plain @click="showAddDialog = true"
                >+ 新增地址</el-button
              >
            </div>
          </div>
        </div>

        <!-- 购物车结算商品 -->
        <div v-if="isCartMode" class="section-block product-section">
          <div class="section-header">
            <span class="section-icon">🛒</span>
            <span>商品信息</span>
            <span v-if="cartItems.length" class="cart-item-count">
              共 {{ cartItems.length }} 种
            </span>
          </div>

          <div v-if="cartItems.length === 0" class="empty-state checkout-empty">
            <p>无法获取结算商品信息，请返回购物车重新选择。</p>
            <button class="back-cart-btn" @click="router.push('/cart')">返回购物车</button>
          </div>

          <div v-else class="cart-checkout-list">
            <div v-for="item in cartItems" :key="item.cartItemId" class="cart-checkout-item">
              <div class="product-thumb">
                <img
                  v-if="getCartImage(item.cover)"
                  :src="getCartImage(item.cover)"
                  :alt="item.productName"
                />
                <div v-else class="thumb-placeholder">商品</div>
              </div>
              <div class="cart-item-info">
                <div class="product-title">{{ item.productName }}</div>
                <div class="product-sku">规格：{{ item.skuInfo || '默认规格' }}</div>
                <div class="product-price-row">
                  <span class="product-price">¥{{ Number(item.price || 0).toFixed(2) }}</span>
                  <span class="product-count">x{{ item.quantity }}</span>
                </div>
              </div>
              <div class="cart-item-subtotal">
                ¥{{ (Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 单个商品信息 -->
        <div v-else class="section-block product-section">
          <div class="section-header">
            <span class="section-icon">🛒</span>
            <span>商品信息</span>
          </div>

          <div v-if="confirmData" class="product-card">
            <div class="product-main">
              <div class="product-thumb">
                <img v-if="imageUrl" :src="imageUrl" alt="商品图片" />
                <div v-else class="thumb-placeholder">商品</div>
              </div>
              <div class="product-meta">
                <div class="product-title">
                  {{ confirmData.productName || productName || '商品名称' }}
                </div>
                <div class="product-sku">规格：{{ skuText }}</div>
                <div class="product-price-row">
                  <span class="product-price"
                    >¥{{ Number(confirmData.price ?? price ?? 0).toFixed(2) }}</span
                  >
                  <span class="product-count">x{{ quantity }}</span>
                </div>
              </div>
            </div>

            <div class="product-details">
              <div class="detail-row">
                <span class="detail-label">商品编号</span>
                <span class="detail-value">{{ confirmData.productId || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">库存状态</span>
                <span class="detail-value stock-status">{{
                  maxQuantity > 0 ? '有货' : '缺货'
                }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">购买数量</span>
                <span class="detail-value">
                  <button class="qty-btn" :disabled="!!createdOrderId" @click="decreaseQuantity">
                    -
                  </button>
                  <input
                    type="number"
                    v-model.number="quantity"
                    min="1"
                    :max="maxQuantity"
                    :disabled="!!createdOrderId"
                  />
                  <button class="qty-btn" :disabled="!!createdOrderId" @click="increaseQuantity">
                    +
                  </button>
                </span>
              </div>
            </div>
          </div>

          <div v-else-if="!loading" class="empty-state">无法获取确认商品信息，请返回重试。</div>
        </div>
      </div>

      <!-- ===== 右侧 30% ===== -->
      <div class="right-column">
        <div class="section-block payment-section">
          <div class="section-header">
            <span class="section-icon">💳</span>
            <span>支付方式</span>
          </div>

          <div class="payment-methods">
            <div class="payment-card selected">
              <span class="payment-icon">🔵</span>
              <span class="payment-name">支付宝</span>
            </div>
          </div>
        </div>

        <!-- 订单汇总 -->
        <div class="section-block summary-section">
          <div class="summary-row">
            <span class="summary-label">商品金额</span>
            <span class="summary-value">¥{{ totalPrice.toFixed(2) }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">运费</span>
            <span class="summary-value free-shipping">免运费</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-row total-row">
            <span class="summary-label">实付金额</span>
            <span class="summary-total">¥{{ totalPrice.toFixed(2) }}</span>
          </div>
        </div>

        <button class="submit-btn" @click="handleSubmitOrder" :disabled="submitting">
          {{ submitting ? '支付中...' : '立即支付' }}
        </button>

        <!-- 安全提示 -->
        <div class="safety-tip">
          <span>🔒</span>
          <span>交易安全，放心支付</span>
        </div>
      </div>
    </div>

    <!-- 新增地址弹窗 -->
    <el-dialog v-model="showAddDialog" title="添加收货地址">
      <el-form :model="addressForm" :rules="addressRules" ref="formRef" label-width="80px">
        <el-form-item label="收货人" prop="receiverName">
          <el-input v-model="addressForm.receiverName" placeholder="请输入收货人姓名"></el-input>
        </el-form-item>
        <el-form-item label="手机号" prop="receiverPhone">
          <el-input v-model="addressForm.receiverPhone" placeholder="请输入收货人手机号"></el-input>
        </el-form-item>
        <el-form-item label="省份">
          <el-input v-model="addressForm.province" placeholder="请输入省份"></el-input>
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="addressForm.city" placeholder="请输入城市"></el-input>
        </el-form-item>
        <el-form-item label="区县">
          <el-input v-model="addressForm.district" placeholder="请输入区县"></el-input>
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input v-model="addressForm.detailAddress" placeholder="请输入详细地址"></el-input>
        </el-form-item>
        <el-form-item label="默认地址">
          <el-switch v-model="addressForm.isDefault" active-value="1" inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="submitAddAddress" :loading="submitLoading"
          >确定添加</el-button
        >
      </template>
    </el-dialog>

    <!-- 编辑地址弹窗 -->
    <el-dialog v-model="showEditDialog" title="编辑收货地址">
      <el-form :model="editAddressForm" :rules="addressRules" ref="editFormRef" label-width="80px">
        <el-form-item label="收货人" prop="receiverName">
          <el-input
            v-model="editAddressForm.receiverName"
            placeholder="请输入收货人姓名"
          ></el-input>
        </el-form-item>
        <el-form-item label="手机号" prop="receiverPhone">
          <el-input
            v-model="editAddressForm.receiverPhone"
            placeholder="请输入收货人手机号"
          ></el-input>
        </el-form-item>
        <el-form-item label="省份">
          <el-input v-model="editAddressForm.province" placeholder="请输入省份"></el-input>
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="editAddressForm.city" placeholder="请输入城市"></el-input>
        </el-form-item>
        <el-form-item label="区县">
          <el-input v-model="editAddressForm.district" placeholder="请输入区县"></el-input>
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input v-model="editAddressForm.detailAddress" placeholder="请输入详细地址"></el-input>
        </el-form-item>
        <el-form-item label="默认地址">
          <el-switch v-model="editAddressForm.isDefault" active-value="1" inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelEditAddress">取消</el-button>
        <el-button type="primary" @click="submitEditAddress" :loading="submitLoading"
          >确定更新</el-button
        >
      </template>
    </el-dialog>

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
          <p class="pay-status-hint">正在前往订单中心...</p>
        </div>

        <!-- 支付失败 -->
        <div v-else-if="payStatusStep === 'failed'" class="pay-status-content">
          <div class="pay-status-icon failed">❌</div>
          <p class="pay-status-text failed">{{ payStatusText }}</p>
          <button class="pay-status-btn retry" @click="retryPayment">重新支付</button>
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

<script setup>
import { computed, onMounted, onUnmounted, ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getConfirmGoods, createOrder } from '@/api/order'
import { getCartList } from '@/api/cart'
import { getAddressList, addUserAddress, updateUserAddress } from '@/api/adress'
import { createPayment, pollPaymentStatus, queryPaymentStatus } from '@/api/pay'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const query = route.query
const cartStore = useCartStore()

// ---- 路由参数 ----
const productName = String(query.productName || '')
const skuLabel = String(query.skuLabel || '')
const price = Number(query.price ?? 0)
const initialQuantity = Number(query.quantity ?? 1)
const propertyValueIdHash = String(query.propertyValueIdHash || '')
const cartItemIds = computed(() =>
  String(query.cartItemIds || '')
    .split(',')
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0),
)
const isCartMode = computed(() => cartItemIds.value.length > 0)

// ---- 商品确认数据 ----
const confirmData = ref(null)
const cartItems = ref([])
const loading = ref(false)
const submitting = ref(false)
const createdOrderId = ref('')
const createdAddressId = ref(null)
const quantity = ref(initialQuantity > 0 ? initialQuantity : 1)

const maxQuantity = computed(() => {
  const stockValue = Number(confirmData.value?.stock ?? query.stock ?? 999)
  return stockValue > 0 ? stockValue : 999
})

const totalPrice = computed(() => {
  if (isCartMode.value) {
    return cartItems.value.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    )
  }
  return Number(quantity.value) * Number(confirmData.value?.price ?? price ?? 0)
})

const skuText = computed(() => {
  if (confirmData.value?.propertyValueIds) {
    return String(confirmData.value.propertyValueIds)
  }
  return skuLabel || '默认规格'
})

const imageUrl = computed(() => {
  const img =
    confirmData.value?.cover || confirmData.value?.coverUrl || confirmData.value?.imageUrl || ''
  if (!img) return ''
  return img.startsWith('http') ? img : `http://localhost:6050${img}`
})

function getCartImage(cover) {
  if (!cover) return ''
  return cover.startsWith('http') ? cover : `http://localhost:6050${cover}`
}

// ---- 地址相关 ----
const addresses = ref([])
const selectedAddress = ref(null)
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const editFormRef = ref(null)
const editingAddressId = ref(null)
const submitLoading = ref(false)
const formRef = ref(null)

const addressForm = reactive({
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  district: '',
  detailAddress: '',
  isDefault: 0,
})

const editAddressForm = reactive({
  addressId: null,
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  district: '',
  detailAddress: '',
  isDefault: 0,
})

const addressRules = {
  receiverName: [
    { required: true, message: '请填写收货人姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' },
  ],
  receiverPhone: [
    { required: true, message: '请填写手机号码', trigger: 'blur' },
    { pattern: /^1[3456789]\d{9}$/, message: '请填写正确的手机号码', trigger: 'blur' },
  ],
}

const sortedAddresses = computed(() => {
  const list = [...addresses.value]
  list.sort((a, b) => {
    if (a.isDefault === b.isDefault) return 0
    return a.isDefault ? -1 : 1
  })
  return list
})

function formatAddress(addr) {
  return [addr.province, addr.city, addr.district, addr.detailAddress].filter(Boolean).join(' ')
}

async function loadAddresses() {
  try {
    const addrData = await getAddressList()
    addresses.value = addrData || []
    // 自动选中默认地址或第一个地址
    if (addresses.value.length > 0) {
      const defaultAddr = addresses.value.find((a) => a.isDefault) || addresses.value[0]
      selectedAddress.value = defaultAddr
    }
  } catch (e) {
    console.warn('地址列表加载失败:', e.message)
  }
}

const submitAddAddress = async () => {
  if (!formRef.value) return
  submitLoading.value = true
  formRef.value.validate(async (valid) => {
    if (!valid) {
      submitLoading.value = false
      return
    }
    try {
      await addUserAddress(addressForm)
      ElMessage.success('地址添加成功')
      showAddDialog.value = false
      formRef.value.resetFields()
      await loadAddresses()
    } catch (err) {
      ElMessage.error(err.msg || '添加地址失败')
    } finally {
      submitLoading.value = false
    }
  })
}

// ---- 编辑地址 ----
function openEditDialog(addr) {
  editingAddressId.value = addr.addressId
  Object.assign(editAddressForm, {
    addressId: addr.addressId,
    receiverName: addr.receiverName || '',
    receiverPhone: addr.receiverPhone || '',
    province: addr.province || '',
    city: addr.city || '',
    district: addr.district || '',
    detailAddress: addr.detailAddress || '',
    isDefault: addr.isDefault ?? 0,
  })
  showEditDialog.value = true
}

const cancelEditAddress = () => {
  showEditDialog.value = false
  if (editFormRef.value) {
    editFormRef.value.resetFields()
  }
}

const submitEditAddress = async () => {
  if (!editFormRef.value) return
  submitLoading.value = true

  editFormRef.value.validate(async (valid) => {
    if (!valid) {
      submitLoading.value = false
      return
    }
    try {
      await updateUserAddress(editAddressForm)
      ElMessage.success('地址更新成功')
      showEditDialog.value = false
      await loadAddresses()
    } catch (err) {
      ElMessage.error(err.msg || '更新地址失败')
    } finally {
      submitLoading.value = false
    }
  })
}

// ---- 数量操作 ----
const decreaseQuantity = () => {
  if (createdOrderId.value) return
  if (quantity.value <= 1) {
    ElMessage.warning('购买数量不能少于 1 件')
    return
  }
  quantity.value -= 1
}

const increaseQuantity = () => {
  if (createdOrderId.value) return
  if (quantity.value >= maxQuantity.value) {
    ElMessage.warning(`库存仅剩 ${maxQuantity.value} 件`)
    return
  }
  quantity.value += 1
}

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

// ---- 支付状态弹窗 ----
const showPayStatusDialog = ref(false)
const payStatusText = ref('正在查询支付状态...')
const payStatusStep = ref('') // 'polling' | 'success' | 'failed' | 'timeout'
const currentOrderId = ref('')
let cancelPolling = null

// ---- 停止轮询 ----
function stopPolling() {
  if (cancelPolling) {
    cancelPolling.cancel?.()
    cancelPolling = null
  }
}

// ---- 支付成功：跳转到订单中心 ----
function handlePaySuccess() {
  if (payStatusStep.value !== 'polling') return
  stopPolling()
  submitting.value = false
  payStatusStep.value = 'success'
  payStatusText.value = '支付成功，正在前往订单中心...'
  setTimeout(() => {
    showPayStatusDialog.value = false
    router.replace({
      name: 'orders',
      query: {
        payResult: 'success',
        ...(currentOrderId.value ? { orderId: currentOrderId.value } : {}),
      },
    })
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
function watchPaymentWindowClose(payWindow, paymentNo) {
  const checkTimer = setInterval(() => {
    if (payWindow && payWindow.closed) {
      clearInterval(checkTimer)
      console.log('[支付] 支付窗口已关闭，开始确认支付结果')
      confirmPayResult(paymentNo, 0)
    }
  }, 1000)
}

// 支付窗口关闭后再确认 3 次，仍未查到结果就停止轮询
async function confirmPayResult(paymentNo, attempt) {
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
    setTimeout(() => confirmPayResult(paymentNo, attempt + 1), 1500)
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

// ---- 重新支付（支付失败时） ----
function retryPayment() {
  closePayStatusDialog()
  // 用户可以重新点击"立即支付"
}

// ---- 提交订单 ----
const handleSubmitOrder = async () => {
  console.log('[支付] handleSubmitOrder 被调用了')
  if (!selectedAddress.value) {
    ElMessage.warning('请选择收货地址')
    return
  }

  if (
    createdOrderId.value &&
    createdAddressId.value &&
    selectedAddress.value.addressId !== createdAddressId.value
  ) {
    ElMessage.warning('订单已创建，收货地址不能修改；如需更换地址请到订单中心取消后重新下单')
    return
  }

  let orderItems = []
  if (isCartMode.value) {
    if (cartItems.value.length === 0) {
      ElMessage.warning('结算商品为空，请返回购物车重新选择')
      return
    }
    orderItems = cartItems.value.map((item) => ({
      productId: item.productId,
      propertyValueIdHash: item.propertyValueIdHash,
      quantity: Number(item.quantity),
    }))
    if (
      orderItems.some(
        (item) => !item.productId || !item.propertyValueIdHash || item.quantity < 1,
      )
    ) {
      ElMessage.error('结算商品信息不完整，请返回购物车重试')
      return
    }
  } else {
    if (quantity.value < 1) {
      ElMessage.warning('购买数量不能少于 1 件')
      return
    }
    if (quantity.value > maxQuantity.value) {
      ElMessage.warning(`购买数量不能超过库存 ${maxQuantity.value} 件`)
      quantity.value = maxQuantity.value
      return
    }
    orderItems = [
      {
        productId: confirmData.value?.productId || route.query.productId,
        propertyValueIdHash: propertyValueIdHash || '',
        quantity: quantity.value,
      },
    ]
  }

  submitting.value = true
  try {
    let orderId = createdOrderId.value

    if (!orderId) {
      console.log('[支付] 开始创建订单...')
      // 1. 调用 createOrder 创建订单
      const orderResult = await createOrder({
        addressId: selectedAddress.value.addressId,
        buyerInfo: `${selectedAddress.value.receiverName} ${selectedAddress.value.receiverPhone} ${selectedAddress.value.province}${selectedAddress.value.city}${selectedAddress.value.district}${selectedAddress.value.detailAddress}`,
        buyerRemark: '',
        orderItemList: orderItems,
        ...(isCartMode.value ? { cartItemIds: cartItemIds.value } : {}),
      })

      console.log('[支付] 订单创建成功:', orderResult)
      orderId = orderResult?.orderId
      if (!orderId) {
        throw new Error('订单创建失败：未返回订单ID')
      }

      // 记录已创建订单，支付失败重试时复用，避免重复下单
      createdOrderId.value = orderId
      createdAddressId.value = selectedAddress.value.addressId

      if (isCartMode.value) {
        cartStore.refreshCount()
      }
    } else {
      console.log('[支付] 复用已创建订单, orderId:', orderId)
    }

    console.log('[支付] 开始创建支付单, orderId:', orderId)
    // 2. 调用后端发起支付接口
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

    // 3. 在新窗口打开支付页面
    const payWindow = openPaymentInNewWindow(payUrl)

    // 4. 如果有 paymentNo，开始轮询支付状态 + 监听窗口关闭
    if (paymentNo) {
      console.log('[支付] 开始轮询支付状态, paymentNo:', paymentNo)
      startPolling(paymentNo, orderId)
      // 监听支付窗口关闭，关闭时立即查询一次状态
      watchPaymentWindowClose(payWindow, paymentNo)
    } else {
      ElMessage.info('已打开支付页面，支付完成后请返回查看订单状态')
      submitting.value = false
    }
  } catch (err) {
    console.error('[支付] 失败:', err)
    ElMessage.error(err.message || '支付失败')
    submitting.value = false
  }
}

// ---- 加载确认商品数据 ----
const loadConfirmData = async () => {
  if (!propertyValueIdHash) {
    return
  }
  loading.value = true
  try {
    const data = await getConfirmGoods(propertyValueIdHash)
    confirmData.value = data
    if (quantity.value > maxQuantity.value) {
      quantity.value = maxQuantity.value
    }
  } catch (err) {
    console.error('确认商品加载失败', err)
    ElMessage.error(err.message || '加载确认商品信息失败')
    confirmData.value = null
  } finally {
    loading.value = false
  }
}

// ---- 加载购物车结算商品 ----
const loadCartCheckoutItems = async () => {
  loading.value = true
  try {
    const data = await getCartList()
    const idSet = new Set(cartItemIds.value)
    const selected = (data?.items || []).filter((item) =>
      idSet.has(Number(item.cartItemId)),
    )

    if (selected.length === 0) {
      throw new Error('未找到可结算的购物车商品，请返回购物车重新选择')
    }
    if (selected.length !== cartItemIds.value.length) {
      throw new Error('部分商品已不在购物车中，请返回购物车重新选择')
    }

    const invalid = selected.find((item) => item.invalid)
    if (invalid) {
      throw new Error(invalid.invalidReason || '部分商品已失效，请返回购物车调整')
    }

    cartItems.value = selected.map((item) => ({
      ...item,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      subtotal: Number(item.subtotal || 0),
    }))
  } catch (err) {
    console.error('加载结算商品失败', err)
    ElMessage.error(err.message || '加载结算商品失败')
    cartItems.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    isCartMode.value ? loadCartCheckoutItems() : loadConfirmData(),
    loadAddresses(),
  ])
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.order-confirm-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* ---- 顶部导航 ---- */
.header-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn {
  border: none;
  background: transparent;
  color: var(--color-text-secondary, #666);
  font-size: 14px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.back-btn:hover {
  background: var(--color-border, #f0f0f0);
}

.header-row h2 {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text, #222);
}

/* ---- 双栏布局 ---- */
.content-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.left-column {
  flex: 7;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.right-column {
  flex: 3;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 20px;
}

/* ---- 区块通用 ---- */
.section-block {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e9e9ea);
  padding: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text, #222);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border, #f0f0f0);
}

.section-icon {
  font-size: 20px;
}

/* ---- 地址区域 ---- */
.empty-address {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  color: var(--color-text-secondary, #999);
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.address-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 2px solid var(--color-border, #e9e9ea);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.address-card:hover {
  border-color: #ff6b35;
  background: #fffaf8;
}

.address-card.selected {
  border-color: #ff6b35;
  background: #fff5f0;
}

.address-radio {
  padding-top: 2px;
}

.radio-dot {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #d0d0d0;
  position: relative;
  transition: all 0.2s;
}

.radio-dot.active {
  border-color: #ff6b35;
}

.radio-dot.active::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff6b35;
}

.address-info {
  flex: 1;
  min-width: 0;
}

.address-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.address-name {
  font-size: 15px;
  font-weight: 600;
  color: #222;
}

.address-phone {
  font-size: 14px;
  color: #666;
}

.default-badge {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #ff6b35;
  color: #fff;
  font-weight: 500;
}

.address-detail {
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

.address-actions {
  margin-top: 4px;
}

.address-card-actions {
  margin-top: 8px;
}

.edit-btn {
  padding: 4px 12px;
  border: 1px solid #ff6b35;
  border-radius: 6px;
  background: transparent;
  color: #ff6b35;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: #ff6b35;
  color: #fff;
}

/* ---- 购物车结算商品 ---- */
.cart-item-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: #999;
}

.cart-checkout-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cart-checkout-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f5f5f5;
}

.cart-checkout-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.cart-checkout-item .product-thumb {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  flex-shrink: 0;
}

.cart-item-info {
  flex: 1;
  min-width: 0;
}

.cart-item-subtotal {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 700;
  color: #ff6b35;
}

.checkout-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.checkout-empty p {
  margin: 0;
}

.back-cart-btn {
  padding: 8px 20px;
  border: 1px solid #ff6b35;
  border-radius: 999px;
  background: #fff;
  color: #ff6b35;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-cart-btn:hover {
  background: #fff5f0;
}

/* ---- 商品区域 ---- */
.product-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-main {
  display: flex;
  gap: 16px;
}

.product-thumb {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  background: #f7f8fb;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.thumb-placeholder {
  color: #999;
  font-size: 14px;
}

.product-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}

.product-title {
  font-size: 16px;
  font-weight: 600;
  color: #222;
  line-height: 1.4;
}

.product-sku {
  font-size: 13px;
  color: #888;
}

.product-price-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-price {
  font-size: 20px;
  font-weight: 700;
  color: #ff6b35;
}

.product-count {
  font-size: 14px;
  color: #888;
}

.product-details {
  display: grid;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border, #f0f0f0);
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-label {
  font-size: 14px;
  color: #888;
}

.detail-value {
  font-size: 14px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stock-status {
  color: #52c41a;
  font-weight: 500;
}

.qty-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  font-size: 18px;
  color: #333;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.qty-btn:hover {
  border-color: #ff6b35;
  color: #ff6b35;
}

.detail-value input {
  width: 64px;
  padding: 4px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
}

.detail-value input:focus {
  outline: none;
  border-color: #ff6b35;
}

/* ---- 支付方式 ---- */
.payment-section {
  position: sticky;
}

.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.payment-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 2px solid var(--color-border, #e9e9ea);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.payment-card:hover {
  border-color: #ff6b35;
  background: #fffaf8;
}

.payment-card.selected {
  border-color: #ff6b35;
  background: #fff5f0;
}

.payment-icon {
  font-size: 24px;
}

.payment-name {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #222;
}

.payment-radio {
  display: flex;
  align-items: center;
}

/* ---- 订单汇总 ---- */
.summary-section {
  padding: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.summary-label {
  font-size: 14px;
  color: #888;
}

.summary-value {
  font-size: 14px;
  color: #333;
}

.free-shipping {
  color: #52c41a;
}

.summary-divider {
  height: 1px;
  background: var(--color-border, #f0f0f0);
  margin: 12px 0;
}

.total-row {
  margin-bottom: 0;
}

.summary-total {
  font-size: 22px;
  font-weight: 700;
  color: #ff6b35;
}

/* ---- 提交按钮 ---- */
.submit-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ---- 安全提示 ---- */
.safety-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #aaa;
}

/* ---- 状态 ---- */
.loading-state,
.empty-state {
  padding: 60px 40px;
  text-align: center;
  color: #999;
  font-size: 15px;
}

/* ---- 响应式 ---- */
@media (max-width: 768px) {
  .content-layout {
    flex-direction: column;
  }

  .left-column,
  .right-column {
    flex: none;
    width: 100%;
  }

  .right-column {
    position: static;
  }

  .order-confirm-page {
    padding: 12px;
  }

  .product-main {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .product-price-row {
    justify-content: center;
  }
}

/* ---- 支付状态弹窗 ---- */
.pay-status-dialog-content {
  padding: 8px 0;
}

.pay-status-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.pay-status-spinner {
  width: 40px;
  height: 40px;
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

.pay-status-text {
  font-size: 16px;
  color: #333;
  text-align: center;
  margin: 0;
}

.pay-status-text.success {
  color: #52c41a;
  font-weight: 600;
}

.pay-status-text.failed {
  color: #ff4d4f;
  font-weight: 600;
}

.pay-status-text.timeout {
  color: #faad14;
  font-weight: 600;
}

.pay-status-hint {
  font-size: 13px;
  color: #999;
  text-align: center;
  margin: 0;
}

.pay-status-icon {
  font-size: 48px;
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
