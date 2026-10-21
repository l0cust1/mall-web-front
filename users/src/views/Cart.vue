<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import {
  clearCart,
  getCartList,
  removeCartItem,
  selectAllCart,
  updateCartQuantity,
  updateCartSelected,
} from '@/api/cart'

const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

const cartItems = ref([])
const loading = ref(true)
const loadError = ref('')
const clearing = ref(false)
const selectAllLoading = ref(false)

const validItems = computed(() => cartItems.value.filter((item) => !item.invalid))
const selectedValidItems = computed(() => validItems.value.filter((item) => item.selected === 1))
const totalQuantity = computed(() =>
  cartItems.value.reduce((sum, item) => sum + (item.quantity || 0), 0),
)
const selectedQuantity = computed(() =>
  selectedValidItems.value.reduce((sum, item) => sum + (item.quantity || 0), 0),
)
const selectedAmount = computed(() =>
  selectedValidItems.value.reduce(
    (sum, item) => sum + Number(item.price || 0) * (item.quantity || 0),
    0,
  ),
)
const allSelected = computed(
  () => validItems.value.length > 0 && validItems.value.every((item) => item.selected === 1),
)
const partiallySelected = computed(
  () => selectedValidItems.value.length > 0 && !allSelected.value,
)
const canCheckout = computed(() => selectedValidItems.value.length > 0)

function getImageUrl(url) {
  if (!url) return ''
  return url.startsWith('http') ? url : `http://localhost:6050${url}`
}

function formatPrice(value) {
  return Number(value || 0).toFixed(2)
}

async function loadCart() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await getCartList()
    cartItems.value = (data?.items || []).map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      selected: Number(item.selected || 0),
      price: Number(item.price || 0),
      stock: Number(item.stock || 0),
      subtotal: Number(item.subtotal || 0),
      updating: false,
      selecting: false,
    }))
    cartStore.setCount(
      cartItems.value.reduce((sum, item) => sum + (item.quantity || 0), 0),
    )
  } catch (e) {
    loadError.value = e.message || '购物车加载失败'
    cartItems.value = []
  } finally {
    loading.value = false
  }
}

async function changeQuantity(item, delta) {
  if (item.invalid || item.updating) return

  const next = item.quantity + delta
  if (next < 1) {
    ElMessage.warning('数量不能少于 1 件')
    return
  }
  if (next > item.stock) {
    ElMessage.warning(`库存仅剩 ${item.stock} 件`)
    return
  }

  const previous = item.quantity
  item.updating = true
  item.quantity = next
  try {
    await updateCartQuantity(item.cartItemId, next)
    cartStore.setCount(cartStore.count + delta)
  } catch (e) {
    item.quantity = previous
    ElMessage.error(e.message || '修改数量失败')
  } finally {
    item.updating = false
  }
}

async function toggleSelected(item, checked) {
  if (item.invalid || item.selecting) return

  const previous = item.selected
  item.selected = checked ? 1 : 0
  item.selecting = true
  try {
    await updateCartSelected(item.cartItemId, checked)
  } catch (e) {
    item.selected = previous
    ElMessage.error(e.message || '更新勾选状态失败')
  } finally {
    item.selecting = false
  }
}

async function toggleSelectAll(checked) {
  if (selectAllLoading.value) return

  selectAllLoading.value = true
  const snapshot = cartItems.value.map((item) => item.selected)
  validItems.value.forEach((item) => {
    item.selected = checked ? 1 : 0
  })

  try {
    await selectAllCart(checked)
  } catch (e) {
    cartItems.value.forEach((item, index) => {
      item.selected = snapshot[index]
    })
    ElMessage.error(e.message || '全选失败')
  } finally {
    selectAllLoading.value = false
  }
}

async function handleRemove(item) {
  try {
    await ElMessageBox.confirm(`确定从购物车删除「${item.productName}」吗？`, '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await removeCartItem(item.cartItemId)
    ElMessage.success('已删除')
    await loadCart()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

async function handleClear() {
  if (cartItems.value.length === 0) return

  try {
    await ElMessageBox.confirm('确定清空购物车吗？', '提示', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
    clearing.value = true
    await clearCart()
    ElMessage.success('购物车已清空')
    await loadCart()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e.message || '清空失败')
    }
  } finally {
    clearing.value = false
  }
}

function handleCheckout() {
  const ids = selectedValidItems.value
    .map((item) => item.cartItemId)
    .filter((id) => id !== null && id !== undefined)

  if (ids.length === 0) {
    ElMessage.warning('请先勾选要结算的商品')
    return
  }

  router.push({
    path: '/order/confirm',
    query: { cartItemIds: ids.join(',') },
  })
}

onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.replace({ path: '/login', query: { redirect: '/cart' } })
    return
  }
  loadCart()
})
</script>

<template>
  <div class="cart-page">
    <header class="cart-header">
      <div>
        <h1 class="cart-title">购物车</h1>
        <p class="cart-subtitle">{{ totalQuantity }} 件商品</p>
      </div>
      <button
        v-if="cartItems.length > 0"
        class="clear-btn"
        :disabled="clearing"
        @click="handleClear"
      >
        {{ clearing ? '清空中...' : '清空购物车' }}
      </button>
    </header>

    <div v-if="loading" class="state-card">
      <div class="loading-spinner"></div>
      <p class="state-text">正在加载购物车...</p>
    </div>

    <div v-else-if="loadError" class="state-card">
      <p class="state-text error-text">{{ loadError }}</p>
      <button class="primary-btn" @click="loadCart">重新加载</button>
    </div>

    <div v-else-if="cartItems.length === 0" class="state-card empty-card">
      <div class="empty-icon">🛒</div>
      <p class="empty-title">购物车空空如也</p>
      <p class="empty-desc">去首页挑几件喜欢的商品吧</p>
      <button class="primary-btn" @click="router.push('/')">去逛逛</button>
    </div>

    <div v-else class="cart-list">
      <div
        v-for="item in cartItems"
        :key="item.cartItemId"
        class="cart-item"
        :class="{ 'is-invalid': item.invalid }"
      >
        <div class="check-wrap">
          <el-checkbox
            :model-value="!item.invalid && item.selected === 1"
            :disabled="item.invalid || item.selecting"
            @change="(checked) => toggleSelected(item, checked)"
          />
        </div>

        <div class="item-cover">
          <img
            v-if="getImageUrl(item.cover)"
            :src="getImageUrl(item.cover)"
            :alt="item.productName"
          />
          <div v-else class="cover-placeholder">商品</div>
        </div>

        <div class="item-main">
          <div class="item-top">
            <h2 class="item-name">{{ item.productName }}</h2>
            <button class="delete-btn" @click="handleRemove(item)">删除</button>
          </div>

          <p class="item-sku">{{ item.skuInfo || '默认规格' }}</p>
          <p v-if="item.invalid" class="invalid-tip">{{ item.invalidReason }}</p>

          <div class="item-bottom">
            <span class="item-price">¥{{ formatPrice(item.price) }}</span>

            <div class="qty-control">
              <button
                class="qty-btn"
                :disabled="item.invalid || item.updating || item.quantity <= 1"
                @click="changeQuantity(item, -1)"
              >
                -
              </button>
              <span class="qty-value">{{ item.quantity }}</span>
              <button
                class="qty-btn"
                :disabled="item.invalid || item.updating || item.quantity >= item.stock"
                @click="changeQuantity(item, 1)"
              >
                +
              </button>
            </div>

            <span class="item-subtotal">
              小计 <strong>¥{{ formatPrice(item.price * item.quantity) }}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && !loadError && cartItems.length > 0" class="cart-footer">
      <div class="footer-left">
        <el-checkbox
          :model-value="allSelected"
          :indeterminate="partiallySelected"
          :disabled="validItems.length === 0 || selectAllLoading"
          @change="toggleSelectAll"
        >
          全选
        </el-checkbox>
        <span class="selected-tip">
          已选 {{ selectedValidItems.length }} 项，共 {{ selectedQuantity }} 件
        </span>
      </div>

      <div class="footer-right">
        <div class="total-box">
          <span class="total-label">合计</span>
          <span class="total-amount">¥{{ formatPrice(selectedAmount) }}</span>
        </div>
        <button class="checkout-btn" :disabled="!canCheckout" @click="handleCheckout">
          去结算
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 8px 16px 120px;
}

/* ---- 页面标题 ---- */
.cart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 8px 16px;
}

.cart-title {
  font-size: 22px;
  font-weight: 700;
  color: #2d2d2d;
  margin: 0;
}

.cart-subtitle {
  font-size: 13px;
  color: #999;
  margin: 4px 0 0;
}

.clear-btn {
  border: none;
  background: transparent;
  color: #999;
  font-size: 13px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all 0.2s;
}

.clear-btn:hover:not(:disabled) {
  color: #ff4d4f;
  background: #fff1f0;
}

.clear-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ---- 状态卡片 ---- */
.state-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 18px;
  padding: 56px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #999;
}

.state-text {
  font-size: 14px;
  margin: 0;
}

.error-text {
  color: #ff4d4f;
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

.empty-icon {
  font-size: 56px;
}

.empty-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.empty-desc {
  font-size: 13px;
  color: #999;
  margin: 0 0 8px;
}

.primary-btn {
  border: none;
  border-radius: 999px;
  padding: 10px 32px;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* ---- 购物车列表 ---- */
.cart-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cart-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 18px;
  transition:
    box-shadow 0.2s,
    opacity 0.2s;
}

.cart-item:hover {
  box-shadow: 0 6px 20px rgba(16, 24, 40, 0.06);
}

.cart-item.is-invalid {
  background: #fffafa;
  opacity: 0.78;
}

.check-wrap {
  padding-top: 28px;
  flex-shrink: 0;
}

.item-cover {
  width: 88px;
  height: 88px;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(135deg, #fff5f0, #ffe8d6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-cover img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cover-placeholder {
  font-size: 13px;
  color: #b8a99f;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #2d2d2d;
  margin: 0;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.delete-btn {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  transition: color 0.2s;
}

.delete-btn:hover {
  color: #ff4d4f;
}

.item-sku {
  font-size: 12px;
  color: #999;
  margin: 6px 0 0;
  word-break: break-all;
}

.invalid-tip {
  font-size: 12px;
  color: #ff4d4f;
  margin: 6px 0 0;
}

.item-bottom {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.item-price {
  font-size: 17px;
  font-weight: 700;
  color: #ff6b35;
}

.qty-control {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: #f8f6f3;
  border-radius: 999px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #f0f0f0;
  border-radius: 50%;
  background: #fff;
  color: #ff6b35;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.qty-btn:hover:not(:disabled) {
  border-color: #ff6b35;
}

.qty-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.qty-value {
  width: 34px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.item-subtotal {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}

.item-subtotal strong {
  font-size: 14px;
  color: #333;
}

/* ---- 底部结算栏 ---- */
.cart-footer {
  position: sticky;
  bottom: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding: 14px 18px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 18px;
  box-shadow: 0 12px 32px rgba(16, 24, 40, 0.1);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.selected-tip {
  font-size: 12px;
  color: #999;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.total-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.total-label {
  font-size: 12px;
  color: #999;
}

.total-amount {
  font-size: 21px;
  font-weight: 700;
  color: #ff6b35;
  line-height: 1.2;
}

.checkout-btn {
  height: 44px;
  padding: 0 34px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 6px 16px rgba(255, 107, 53, 0.28);
}

.checkout-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(255, 107, 53, 0.36);
}

.checkout-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .cart-page {
    padding: 4px 12px 140px;
  }

  .cart-item {
    gap: 10px;
    padding: 12px;
  }

  .check-wrap {
    padding-top: 30px;
  }

  .item-cover {
    width: 68px;
    height: 68px;
    border-radius: 12px;
  }

  .item-bottom {
    gap: 10px;
  }

  .item-subtotal {
    width: 100%;
    margin-left: 0;
    text-align: right;
  }

  .cart-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .footer-left,
  .footer-right {
    justify-content: space-between;
  }

  .checkout-btn {
    flex: 1;
  }
}
</style>
