<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElDialog, ElInput, ElInputNumber, ElMessage, ElTag } from 'element-plus'
import { addCartItem } from '@/api/cart'
import { getProductDetail } from '@/api/product'
import { getConfirmGoods } from '@/api/order'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  product: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'close'])
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

const skuList = ref([])
const detailData = ref(null)
const loading = ref(false)
const addingToCart = ref(false)
const state = reactive({
  selectedSpecs: {},
  selectedSkuId: '',
  quantity: 1,
  note: '',
})

const getImageUrl = (image) => {
  if (!image) return ''
  if (image.startsWith('http')) return image
  return `http://localhost:6050${image}`
}

const buildMockSkuList = (product) => {
  const basePrice = Number(product?.price ?? product?.minPrice ?? product?.lowPrice ?? 0)
  const baseOriginal = Number(
    product?.originalPrice ?? product?.maxPrice ?? product?.highPrice ?? basePrice + 30,
  )
  const stockBase = Number(product?.stock ?? 24)

  return [
    {
      id: `${product?.productId || product?.id || 'sku'}-1`,
      price: basePrice,
      originalPrice: baseOriginal,
      stock: Math.max(1, stockBase),
      specs: { 颜色: '默认', 尺寸: '标准', 版本: '标配' },
    },
    {
      id: `${product?.productId || product?.id || 'sku'}-2`,
      price: basePrice + 15,
      originalPrice: baseOriginal + 20,
      stock: Math.max(1, Math.floor(stockBase / 2)),
      specs: { 颜色: '深蓝', 尺寸: '标准', 版本: '套餐' },
    },
    {
      id: `${product?.productId || product?.id || 'sku'}-3`,
      price: basePrice + 30,
      originalPrice: baseOriginal + 40,
      stock: 0,
      specs: { 颜色: '银灰', 尺寸: '大码', 版本: '豪华' },
    },
  ]
}

const resolveSkuSpecs = (item) => {
  if (item?.specs && Object.keys(item.specs).length) return item.specs
  if (item?.spec) return item.spec
  if (item?.propertyValueIds) {
    return { 规格: String(item.propertyValueIds).split(',').join(' / ') }
  }
  return { 规格: '默认规格' }
}

const buildSkuList = (product) => {
  if (Array.isArray(product?.skuList) && product.skuList.length) {
    return product.skuList.map((item) => ({
      ...item,
      id: item.id || item.skuId || `${product?.productId || product?.id || 'sku'}-${Math.random()}`,
      price: Number(item.price ?? item.salePrice ?? product?.price ?? 0),
      originalPrice: Number(
        item.originalPrice ?? item.originPrice ?? product?.originalPrice ?? item.price ?? 0,
      ),
      stock: Number(item.stock ?? item.inventory ?? 0),
      specs: resolveSkuSpecs(item),
    }))
  }

  if (Array.isArray(product?.skus) && product.skus.length) {
    return product.skus.map((item) => ({
      ...item,
      id: item.id || item.skuId || `${product?.productId || product?.id || 'sku'}-${Math.random()}`,
      price: Number(item.price ?? item.salePrice ?? product?.price ?? 0),
      originalPrice: Number(
        item.originalPrice ?? item.originPrice ?? product?.originalPrice ?? item.price ?? 0,
      ),
      stock: Number(item.stock ?? item.inventory ?? 0),
      specs: resolveSkuSpecs(item),
    }))
  }

  return buildMockSkuList(product)
}

const specGroups = computed(() => {
  const groups = {}
  skuList.value.forEach((sku) => {
    Object.entries(sku.specs || {}).forEach(([name, value]) => {
      if (!groups[name]) groups[name] = new Set()
      groups[name].add(String(value))
    })
  })

  return Object.entries(groups).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }))
})

const selectedSku = computed(() => {
  return skuList.value.find((item) => item.id === state.selectedSkuId) || null
})

const currentProduct = computed(() => detailData.value || props.product || {})
const currentPrice = computed(() =>
  Number(
    selectedSku.value?.price ?? currentProduct.value?.price ?? currentProduct.value?.minPrice ?? 0,
  ),
)
const currentOriginalPrice = computed(() =>
  Number(
    selectedSku.value?.originalPrice ??
      currentProduct.value?.originalPrice ??
      currentProduct.value?.price ??
      currentPrice.value,
  ),
)
const stock = computed(() => Number(selectedSku.value?.stock ?? 0))
const selectedSpecText = computed(() => {
  const values = Object.values(state.selectedSpecs || {}).filter(Boolean)
  return values.length ? values.join(' / ') : '请选择规格'
})
const totalPrice = computed(() => currentPrice.value * state.quantity)
const productName = computed(
  () => currentProduct.value?.productName || currentProduct.value?.name || '商品',
)
const productImage = computed(
  () =>
    currentProduct.value?.productImageSrc ||
    currentProduct.value?.productImage ||
    currentProduct.value?.coverSrc ||
    currentProduct.value?.cover ||
    '',
)

const isOptionAvailable = (groupName, optionValue) => {
  return skuList.value.some((sku) => {
    if (sku.stock <= 0) return false
    const matched = Object.entries(state.selectedSpecs).every(([key, value]) => {
      if (key === groupName) return true
      return sku.specs?.[key] === value
    })
    return matched && sku.specs?.[groupName] === optionValue
  })
}

const currentProductId = computed(() => props.product?.productId || props.product?.id || '')

const resetState = () => {
  skuList.value = buildSkuList(currentProduct.value)
  state.quantity = 1
  state.note = ''
  state.selectedSpecs = {}
  state.selectedSkuId = ''

  const defaults = {}
  specGroups.value.forEach((group) => {
    const firstAvailable =
      group.values.find((value) => isOptionAvailable(group.name, value)) || group.values[0]
    if (firstAvailable) defaults[group.name] = firstAvailable
  })

  state.selectedSpecs = defaults
  const matchedSku = skuList.value.find((sku) =>
    Object.entries(defaults).every(([key, value]) => sku.specs?.[key] === value),
  )
  state.selectedSkuId = matchedSku?.id || skuList.value[0]?.id || ''
}

const loadProductDetails = async (id) => {
  if (!id) return
  loading.value = true
  try {
    const data = await getProductDetail(id)
    detailData.value = data
  } catch (error) {
    console.error('拉取商品详情失败:', error)
    detailData.value = null
  } finally {
    loading.value = false
    resetState()
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      loadProductDetails(currentProductId.value)
    }
  },
)

watch(currentProductId, (id) => {
  if (props.modelValue && id) {
    loadProductDetails(id)
  }
})

const closeDialog = () => {
  emit('update:modelValue', false)
  emit('close')
  resetState()
  detailData.value = null
}

const handleSpecChange = (groupName, optionValue) => {
  state.selectedSpecs[groupName] = optionValue
  const matchedSku = skuList.value.find((sku) =>
    Object.entries(state.selectedSpecs).every(([key, value]) => sku.specs?.[key] === value),
  )
  state.selectedSkuId = matchedSku?.id || ''

  if (!state.selectedSkuId) {
    ElMessage.warning('当前组合暂时不可选，请换个规格')
  }
}

const increaseQuantity = () => {
  if (state.quantity >= stock.value) {
    ElMessage.warning(`库存仅剩 ${stock.value} 件`)
    return
  }
  state.quantity += 1
}

const decreaseQuantity = () => {
  if (state.quantity <= 1) {
    ElMessage.warning('至少购买 1 件')
    return
  }
  state.quantity -= 1
}

const validateSelection = () => {
  if (!selectedSku.value) {
    ElMessage.warning('请先选择规格')
    return false
  }

  if (state.quantity < 1) {
    ElMessage.warning('购买数量不能小于 1')
    return false
  }

  if (state.quantity > stock.value) {
    ElMessage.warning(`当前规格库存仅剩 ${stock.value} 件`)
    return false
  }

  return true
}

const handleBuyNow = async () => {
  if (!validateSelection()) return

  const propertyValueIdHash = selectedSku.value?.propertyValueIdHash
    ? String(selectedSku.value.propertyValueIdHash)
    : ''

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

  closeDialog()
  router.push({
    path: '/order/confirm',
    query: {
      productId: props.product?.productId || props.product?.id,
      skuId: selectedSku.value?.id,
      propertyValueIdHash,
      propertyValueIds: selectedSku.value?.propertyValueIds,
      quantity: state.quantity,
      note: state.note,
      productName: productName.value,
      skuName: Object.values(state.selectedSpecs).join(' / '),
      price: currentPrice.value,
    },
  })
}

const handleAddToCart = async () => {
  if (!validateSelection()) return

  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    closeDialog()
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  if (addingToCart.value) return

  const propertyValueIdHash = selectedSku.value?.propertyValueIdHash
    ? String(selectedSku.value.propertyValueIdHash)
    : ''

  addingToCart.value = true
  try {
    await addCartItem({
      productId: currentProduct.value?.productId || currentProduct.value?.id,
      skuId: selectedSku.value?.id,
      propertyValueIdHash,
      quantity: state.quantity,
    })
    ElMessage.success('已加入购物车')
    cartStore.refreshCount()
    closeDialog()
  } catch (error) {
    ElMessage.error(error.message || '加入购物车失败，请稍后重试')
  } finally {
    addingToCart.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    width="750px"
    center
    destroy-on-close
    :show-close="true"
    :close-on-click-modal="true"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="closeDialog"
  >
    <div class="purchase-dialog">
      <div class="product-block">
        <img v-if="productImage" :src="productImage" class="product-thumb" />
        <div v-else class="product-thumb placeholder">🛍️</div>
        <div class="product-info">
          <div class="product-name">{{ productName }}</div>
          <div class="price-row">
            <span class="current-price">¥{{ currentPrice.toFixed(2) }}</span>
            <span class="original-price">¥{{ currentOriginalPrice.toFixed(2) }}</span>
          </div>
          <div class="stock-tip">库存 {{ stock }} 件</div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">规格选择</div>
        <div v-for="group in specGroups" :key="group.name" class="spec-group">
          <div class="spec-label">{{ group.name }}</div>
          <div class="spec-options">
            <el-button
              v-for="option in group.values"
              :key="`${group.name}-${option}`"
              size="small"
              :type="state.selectedSpecs[group.name] === option ? 'primary' : 'default'"
              :disabled="!isOptionAvailable(group.name, option)"
              class="spec-button"
              @click="handleSpecChange(group.name, option)"
            >
              {{ option }}
            </el-button>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">购买数量</div>
        <div class="quantity-row">
          <el-button text class="qty-btn" @click="decreaseQuantity">-</el-button>
          <el-input-number
            v-model="state.quantity"
            :min="1"
            :max="stock"
            controls-position="right"
          />
          <el-button text class="qty-btn" @click="increaseQuantity">+</el-button>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">配送信息</div>
        <div class="info-list">
          <div class="info-item"><span>运费</span><strong>包邮</strong></div>
          <div class="info-item"><span>发货地</span><strong>上海</strong></div>
          <div class="info-item"><span>预计发货</span><strong>24小时内发货</strong></div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">订单备注</div>
        <el-input
          v-model="state.note"
          type="textarea"
          :rows="3"
          maxlength="100"
          show-word-limit
          placeholder="可选，最多 100 字"
        />
      </div>
    </div>

    <template #footer>
      <div class="footer-bar">
        <div class="summary">
          <div class="summary-price">¥{{ totalPrice.toFixed(2) }}</div>
          <div class="summary-meta">
            <span>{{ selectedSpecText }}</span>
            <el-tag size="small" effect="plain">{{ state.quantity }}件</el-tag>
          </div>
        </div>
        <div class="footer-actions">
          <el-button class="action-btn buy-btn" type="primary" @click="handleBuyNow"
            >立即购买</el-button
          >
          <el-button
            class="action-btn cart-btn"
            type="danger"
            :loading="addingToCart"
            @click="handleAddToCart"
            >加入购物车</el-button
          >
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.purchase-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 4px;
}

.product-block {
  display: flex;
  gap: 14px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
}

.product-thumb {
  width: 88px;
  height: 88px;
  border-radius: 10px;
  object-fit: cover;
  background: #f5f7fa;
}

.product-thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.product-name {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.current-price {
  font-size: 20px;
  font-weight: 700;
  color: #e53935;
}

.original-price {
  font-size: 13px;
  color: #9ca3af;
  text-decoration: line-through;
}

.stock-tip {
  font-size: 12px;
  color: #6b7280;
}

.section-card {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  background: #fff;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 10px;
}

.spec-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.spec-label {
  font-size: 13px;
  color: #6b7280;
}

.spec-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.spec-button {
  border-radius: 999px;
}

.quantity-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-btn {
  font-size: 20px;
  color: #409eff;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6b7280;
}

.footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-price {
  font-size: 20px;
  font-weight: 700;
  color: #e53935;
}

.summary-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  min-width: 116px;
}

.buy-btn {
  background: linear-gradient(135deg, #409eff 0%, #2b80e5 100%);
  border: none;
}

.cart-btn {
  background: linear-gradient(135deg, #f56c6c 0%, #e53935 100%);
  border: none;
}
</style>
