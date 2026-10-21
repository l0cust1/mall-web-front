<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// 一次性引入两个接口方法
import { getFirstLevelCategories, getSubCategoryWithProduct } from '@/api/category'
import api from '@/utils/api'
import PurchaseDialog from '@/components/PurchaseDialog.vue'

// 一级分类列表
const firstCategoryList = ref([])
// 当前选中的一级分类ID
const selectedCategory = ref('')
// 当前一级下的二级分类+商品
const subCategoryList = ref([])

// 将所有子分类的商品合并成一个数组，方便在下方统一展示
const displayProducts = computed(() => {
  return subCategoryList.value.flatMap((s) => s.products || [])
})
// 加载状态
const loading = ref(false)
const selectedProduct = ref(null)
const showPurchaseDialog = ref(false)

const route = useRoute()
const router = useRouter()

// 图片加载支持（仿 Home.vue）
const BACKEND_URL = 'http://localhost:6050'
const imageObjectUrls = new Map()

function getImageUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return BACKEND_URL + url
}

async function loadImageWithAuth(url) {
  const normalizedUrl = getImageUrl(url)
  if (!normalizedUrl) return ''

  const cached = imageObjectUrls.get(normalizedUrl)
  if (cached) return cached

  try {
    const response = await api.get(normalizedUrl, {
      responseType: 'blob',
      headers: { Accept: 'image/*' },
    })

    const blob = response?.data
    if (blob instanceof Blob && blob.size > 0) {
      const objectUrl = URL.createObjectURL(blob)
      imageObjectUrls.set(normalizedUrl, objectUrl)
      return objectUrl
    }
  } catch (error) {
    console.warn('图片加载失败:', error)
  }

  return normalizedUrl
}

async function enrichImages(list, fieldName) {
  if (!Array.isArray(list)) return []
  const result = []
  for (const item of list) {
    const imageUrl = item?.[fieldName] || ''
    const resolvedImage = await loadImageWithAuth(imageUrl)
    result.push({ ...item, [`${fieldName}Src`]: resolvedImage })
  }
  return result
}

// 页面初始化：加载所有一级分类
const loadFirstCategory = async () => {
  loading.value = true
  try {
    const res = await getFirstLevelCategories()
    // 方式1：后端直接返回数组 List<CategoryVO> 无外层包装
    firstCategoryList.value = res.data

    // 方式2：如果后端统一用 ApiResult 包装，用下面这段
    // if (res.data.code === 200) {
    //   firstCategoryList.value = res.data.data
    // }

    // 如果路由带有 query.id，则使用该 id 作为当前选中项（来自 Home 页面跳转）
    const qid = route?.query?.id ? String(route.query.id) : ''
    if (qid) {
      selectedCategory.value = qid
      loadSubData(selectedCategory.value)
    } else if (firstCategoryList.value.length > 0) {
      // 默认选中第一个一级分类，自动加载对应二级+商品
      selectedCategory.value = firstCategoryList.value[0].categoryId
      loadSubData(selectedCategory.value)
    }
  } catch (err) {
    console.error('获取一级分类失败：', err)
  } finally {
    loading.value = false
  }
}

// 根据一级分类ID加载二级分类+商品
const loadSubData = async (pid) => {
  loading.value = true
  try {
    const res = await getSubCategoryWithProduct(pid)
    if (res.data.code === 200) {
      // 将二级分类数据赋值并异步丰富商品图片
      const data = res.data.data || []
      for (const sub of data) {
        sub.products = await enrichImages(sub.products || [], 'cover')
      }
      subCategoryList.value = data
    }
  } catch (err) {
    console.error('加载二级分类及商品失败：', err)
  } finally {
    loading.value = false
  }
}

// 切换一级分类触发
const handleCategoryChange = () => {
  loadSubData(selectedCategory.value)
}

const openPurchase = (product) => {
  const productId = product?.productId || product?.id
  if (!productId) return
  router.push({ name: 'ProductDetail', params: { id: productId } })
}

const closePurchase = () => {
  selectedProduct.value = null
  showPurchaseDialog.value = false
}

// 初始化执行
loadFirstCategory()
</script>

<template>
  <div v-loading="loading" class="category-page">
    <div class="top-cats">
      <div
        v-for="item in firstCategoryList"
        :key="item.categoryId"
        :class="['top-cat', { active: item.categoryId === selectedCategory }]"
        @click="
          () => {
            selectedCategory = item.categoryId
            handleCategoryChange()
          }
        "
      >
        {{ item.categoryName }}
      </div>
    </div>

    <div class="prod-grid">
      <div
        v-for="prod in displayProducts"
        :key="prod.productId"
        class="product-card"
        @click="openPurchase(prod)"
      >
        <img :src="prod.coverSrc || getImageUrl(prod.cover)" alt="" class="thumb" />
        <div class="prod-info">
          <div class="prod-name">{{ prod.productName }}</div>
          <div class="prod-desc">{{ prod.productDesc }}</div>
          <div class="prod-price">¥{{ prod.minPrice }}</div>
        </div>
      </div>
      <div v-if="!displayProducts.length" class="empty">暂无商品</div>
    </div>

    <PurchaseDialog
      v-model="showPurchaseDialog"
      :product="selectedProduct"
      @close="closePurchase"
    />
  </div>
</template>

<style scoped>
.category-page {
  padding: 16px;
  background: #faf7f4;
}
.top-cats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px;
  background: #fff;
  border: 1px solid #eee;
}
.top-cat {
  padding: 8px 14px;
  background: #fafafa;
  border-radius: 4px;
  color: #666;
  cursor: pointer;
}
.top-cat.active {
  background: #409eff;
  color: #fff;
}
.prod-grid {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.product-card {
  width: 220px;
  border: 1px solid #f0f0f0;
  padding: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.product-card .thumb {
  width: 100%;
  height: 140px;
  object-fit: cover;
  margin-bottom: 8px;
}
.prod-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.prod-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}
.prod-desc {
  flex: 1;
  color: #888;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.prod-price {
  color: #f56c6c;
  margin-top: 8px;
  font-weight: 700;
}
.empty {
  color: #999;
  padding: 24px;
  background: #fff;
  border: 1px dashed #eee;
}
</style>
