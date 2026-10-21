<template>
  <div class="product-detail-page">
    <div v-if="loading" class="loading-state">正在加载商品详情...</div>
    <div v-else>
      <div v-if="product" class="product-detail-container">
        <section class="detail-left">
          <div class="image-panel">
            <img :src="coverImage" :alt="product.productName || '商品封面'" />
          </div>
          <div class="basic-info-panel">
            <h2>商品详情</h2>
            <p class="product-desc">{{ product.productDesc || '暂无商品描述' }}</p>
          </div>
        </section>

        <section class="detail-right">
          <div class="title-row">
            <h1 class="product-title">{{ product.productName }}</h1>
            <div class="product-id">商品ID：{{ product.productId }}</div>
          </div>

          <div class="price-row">
            <div class="current-price">¥{{ selectedSkuPrice.toFixed(2) }}</div>
            <div v-if="selectedSku" class="sku-stock">库存：{{ selectedSku.stock }}</div>
          </div>

          <div class="sku-panel">
            <div class="sku-panel-title">规格选择</div>
            <div class="sku-options">
              <button
                v-for="sku in skuList"
                :key="sku.id"
                :class="[
                  'sku-option',
                  { active: sku.id === selectedSkuId, disabled: sku.stock <= 0 },
                ]"
                :disabled="sku.stock <= 0"
                @click="selectSku(sku.id)"
              >
                {{ formatSkuLabel(sku.propertyValueIds) }}
              </button>
            </div>
          </div>

          <div class="quantity-panel">
            <div class="panel-title">购买数量</div>
            <div class="quantity-control">
              <button class="qty-btn" @click="decreaseQuantity">-</button>
              <input
                type="number"
                v-model.number="quantity"
                min="1"
                :max="selectedSku?.stock || 999"
              />
              <button class="qty-btn" @click="increaseQuantity">+</button>
            </div>
            <div class="quantity-tip">最多可购买 {{ selectedSku?.stock ?? 0 }} 件</div>
          </div>

          <div class="action-panel">
            <button class="buy-now" @click="handleBuyNow">立即购买</button>
            <button class="add-cart" :disabled="addingToCart" @click="handleAddToCart">
              {{ addingToCart ? '加入中...' : '加入购物车' }}
            </button>
          </div>

          <div class="notes-panel">
            说明：商品价格随所选规格变化，加入购物车后可在购物车中统一结算。
          </div>
        </section>
      </div>

      <div v-else class="empty-state">商品不存在或已下架</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getProductDetail } from '@/api/product'
import { getConfirmGoods } from '@/api/order'
import { addCartItem } from '@/api/cart'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()
const productId = route.params.id
const product = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const selectedSkuId = ref('')
const quantity = ref(1)
const addingToCart = ref(false)

const getPropertyValueIdHash = (sku) => {
  if (!sku) return ''
  return sku.propertyValueIdHash ? String(sku.propertyValueIdHash) : ''
}

const BACKEND_URL = 'http://localhost:6050'
const getImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${BACKEND_URL}${url}`
}

const skuList = computed(() => {
  return Array.isArray(product.value?.skus) ? product.value.skus : []
})

const selectedSku = computed(() => {
  return skuList.value.find((sku) => sku.id === selectedSkuId.value) || skuList.value[0] || null
})

const selectedSkuPrice = computed(() => {
  return Number(selectedSku.value?.price ?? 0)
})

const coverImage = computed(() => {
  return getImageUrl(
    product.value?.cover || product.value?.productImage || product.value?.imageUrl || '',
  )
})

const selectSku = (skuId) => {
  const sku = skuList.value.find((item) => item.id === skuId)
  if (!sku || sku.stock <= 0) {
    ElMessage.warning('当前规格不可用，请选择其他规格')
    return
  }
  selectedSkuId.value = skuId
  if (quantity.value > sku.stock) {
    quantity.value = sku.stock
  }
}

const formatSkuLabel = (value) => {
  if (!value) return '默认规格'
  return String(value).split(',').join(' / ')
}

const decreaseQuantity = () => {
  if (quantity.value <= 1) {
    ElMessage.warning('购买数量不能少于 1 件')
    return
  }
  quantity.value -= 1
}

const increaseQuantity = () => {
  if (!selectedSku.value) return
  if (quantity.value >= selectedSku.value.stock) {
    ElMessage.warning(`库存仅剩 ${selectedSku.value.stock} 件`)
    return
  }
  quantity.value += 1
}

const handleBuyNow = async () => {
  if (!selectedSku.value) {
    ElMessage.warning('请先选择规格')
    return
  }
  if (quantity.value < 1 || quantity.value > selectedSku.value.stock) {
    ElMessage.warning('请确认购买数量')
    return
  }

  const propertyValueIdHash = getPropertyValueIdHash(selectedSku.value)
  if (!propertyValueIdHash) {
    ElMessage.error('无法获取当前规格标识，请稍后重试')
    return
  }

  try {
    await getConfirmGoods(propertyValueIdHash)
  } catch (error) {
    ElMessage.error(error.message || '获取确认商品信息失败')
    return
  }

  router.push({
    path: '/order/confirm',
    query: {
      productId: product.value?.productId || product.value?.id,
      skuId: selectedSku.value.id,
      propertyValueIdHash,
      propertyValueIds: selectedSku.value.propertyValueIds,
      quantity: quantity.value,
      productName: product.value?.productName || product.value?.name || '',
      skuLabel: formatSkuLabel(selectedSku.value.propertyValueIds),
      price: selectedSkuPrice.value,
    },
  })
}

const handleAddToCart = async () => {
  if (!selectedSku.value) {
    ElMessage.warning('请先选择规格')
    return
  }
  if (quantity.value < 1) {
    ElMessage.warning('购买数量不能少于 1 件')
    return
  }
  if (quantity.value > selectedSku.value.stock) {
    ElMessage.warning(`库存仅剩 ${selectedSku.value.stock} 件`)
    return
  }
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (addingToCart.value) return

  addingToCart.value = true
  try {
    await addCartItem({
      productId: product.value?.productId || product.value?.id,
      skuId: selectedSku.value.id,
      propertyValueIdHash: getPropertyValueIdHash(selectedSku.value),
      quantity: quantity.value,
    })
    ElMessage.success('已加入购物车')
    cartStore.refreshCount()
  } catch (error) {
    ElMessage.error(error.message || '加入购物车失败')
  } finally {
    addingToCart.value = false
  }
}

const loadProduct = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await getProductDetail(productId)
    product.value = data
    if (skuList.value.length) {
      selectedSkuId.value = skuList.value[0].id
    }
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '加载商品详情失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadProduct)
</script>

<style scoped>
.product-detail-page {
  padding: 24px;
  min-height: calc(100vh - 80px);
  background: #f6f6f6;
}
.product-detail-container {
  display: flex;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.detail-left,
.detail-right {
  padding: 24px;
}
.detail-left {
  flex: 0 0 520px;
  border-right: 1px solid #f0f0f0;
}
.detail-right {
  flex: 1;
}
.image-panel {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.image-panel img {
  width: 100%;
  height: auto;
  max-height: 520px;
  object-fit: contain;
  border-radius: 12px;
}
.basic-info-panel {
  margin-top: 24px;
}
.basic-info-panel h2 {
  margin-bottom: 12px;
  font-size: 20px;
  color: #333;
}
.product-desc {
  line-height: 1.8;
  color: #666;
}
.title-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}
.product-title {
  font-size: 28px;
  line-height: 1.2;
  color: #333;
}
.product-id {
  color: #999;
  font-size: 14px;
}
.price-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.current-price {
  color: #e4393c;
  font-size: 32px;
  font-weight: 700;
}
.sku-stock {
  color: #666;
  font-size: 14px;
}
.sku-panel,
.quantity-panel,
.notes-panel {
  background: #fbfbfb;
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 18px;
}
.sku-panel-title,
.panel-title {
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;
}
.sku-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.sku-option {
  border: 1px solid #dcdcdc;
  background: #fff;
  color: #333;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.sku-option.active {
  border-color: #f60;
  color: #f60;
  background: #fff7f0;
}
.sku-option.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.quantity-control {
  display: flex;
  align-items: center;
  gap: 10px;
}
.qty-btn {
  width: 38px;
  height: 38px;
  border: 1px solid #dcdcdc;
  background: #fff;
  color: #333;
  border-radius: 8px;
  cursor: pointer;
}
.quantity-control input {
  width: 84px;
  height: 38px;
  text-align: center;
  border: 1px solid #dcdcdc;
  border-radius: 8px;
}
.quantity-tip {
  margin-top: 8px;
  color: #999;
  font-size: 12px;
}
.action-panel {
  display: flex;
  gap: 14px;
  margin: 22px 0;
}
.buy-now,
.add-cart {
  flex: 1;
  height: 52px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.buy-now {
  background: linear-gradient(90deg, #ff7a14 0%, #ff4d4f 100%);
  color: #fff;
}
.add-cart {
  background: #fff;
  color: #333;
  border: 1px solid #dcdcdc;
}
.add-cart:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.notes-panel {
  color: #666;
  font-size: 14px;
}
.loading-state,
.empty-state {
  padding: 60px;
  text-align: center;
  color: #999;
  font-size: 16px;
}
</style>
