<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getHomeAggregate } from '@/api/home'
import api from '@/utils/api'
import PurchaseDialog from '@/components/PurchaseDialog.vue'

const router = useRouter()
const searchQuery = ref('')
const loading = ref(false)
const selectedProduct = ref(null)
const showPurchaseDialog = ref(false)

const carouselList = ref([])
const categories = ref([])
const recommendProducts = ref([])
const recommendGroups = ref([])
const seckill = ref({ startTime: 0, endTime: 0, products: [] })
const browseHistory = ref([])
const currentCarouselIndex = ref(0)

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

const formatPrice = (value) => {
  const num = Number(value || 0)
  return isNaN(num) ? '0.00' : num.toFixed(2)
}

const recommendTypeConfig = [
  { value: 1, label: '热门推荐' },
  { value: 2, label: '新品' },
  { value: 3, label: '精品' },
]

const buildRecommendGroups = (list) => {
  return recommendTypeConfig.map((item) => ({
    ...item,
    products: (list || []).filter(
      (product) =>
        Number(
          product.recommendType ??
            product.recommend_type ??
            product.type ??
            product.commendType ??
            0,
        ) === item.value,
    ),
  }))
}

const loadHomeData = async () => {
  loading.value = true
  try {
    const data = await getHomeAggregate()
    carouselList.value = await enrichImages(data?.carousels || [], 'imageUrl')
    categories.value = (data?.categories || []).map((item, index) => ({
      id: item.categoryId || index + 1,
      categoryId: item.categoryId,
      name: item.categoryName,
      icon: ['📚', '💻', '👕', '🍎', '🏡', '🏀'][index % 6],
      desc: item.categoryName,
    }))
    const enrichedRecommendProducts = await enrichImages(
      data?.recommendProducts || [],
      'productImage',
    )
    recommendProducts.value = enrichedRecommendProducts
    recommendGroups.value = buildRecommendGroups(enrichedRecommendProducts)
    const seckillProducts = await enrichImages(data?.seckill?.products || [], 'productImage')
    seckill.value = {
      ...(data?.seckill || { startTime: 0, endTime: 0, products: [] }),
      products: seckillProducts,
    }
    browseHistory.value = await enrichImages(data?.browseHistory || [], 'productImage')
  } catch (error) {
    console.error('加载首页数据失败:', error)
  } finally {
    loading.value = false
  }
}

function onSearch() {
  console.log('搜索词：', searchQuery.value)
}

function onAiShopping() {
  console.log('点击 AI 智能购物按钮')
}

function openPurchase(product) {
  const productId = product?.productId || product?.id
  if (!productId) return
  router.push({ name: 'ProductDetail', params: { id: productId } })
}

function closePurchase() {
  selectedProduct.value = null
  showPurchaseDialog.value = false
}

function formatSales(sales) {
  const count = Number(sales || 0)
  if (count <= 0) return '暂无销量'
  return count + '人购买'
}

let carouselTimer = null

function startCarouselAutoPlay() {
  if (carouselTimer || carouselList.value.length <= 1) return
  carouselTimer = window.setInterval(() => {
    currentCarouselIndex.value = (currentCarouselIndex.value + 1) % carouselList.value.length
  }, 4000)
}

function stopCarouselAutoPlay() {
  if (carouselTimer) {
    window.clearInterval(carouselTimer)
    carouselTimer = null
  }
}

onMounted(() => {
  loadHomeData()
})

function goToCarousel(index) {
  currentCarouselIndex.value = index
}

function prevCarousel() {
  if (!carouselList.value.length) return
  currentCarouselIndex.value =
    (currentCarouselIndex.value - 1 + carouselList.value.length) % carouselList.value.length
}

function nextCarousel() {
  if (!carouselList.value.length) return
  currentCarouselIndex.value = (currentCarouselIndex.value + 1) % carouselList.value.length
}
</script>

<template>
  <div>
    <!-- ====== 搜索区 ====== -->
    <div class="flex items-center gap-3 px-6 md:px-10 py-4 bg-white">
      <div class="flex-1 relative">
        <input
          v-model="searchQuery"
          @keyup.enter="onSearch"
          type="text"
          placeholder="搜索商品"
          class="w-full h-11 md:h-12 pl-12 pr-5 rounded-xl bg-[#F5F5F5] text-sm md:text-base text-[#2D2D2D] placeholder-gray-400 border-none outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:bg-white transition-all"
        />
        <svg
          class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <button
        @click="onAiShopping"
        class="shrink-0 h-11 md:h-12 px-5 md:px-7 rounded-xl text-sm md:text-base font-medium text-white bg-gradient-to-r from-[#FF6B35] via-[#FF8C5A] to-[#FF6B35] hover:from-[#e55a2b] hover:via-[#ff7a45] hover:to-[#e55a2b] shadow-md hover:shadow-lg transition-all duration-300 active:scale-95"
      >
        <span class="flex items-center gap-2">
          <span class="text-lg">✨</span>
          <span>AI 智能购物</span>
        </span>
      </button>
    </div>

    <!-- ====== 分类入口 ====== -->
    <section class="px-6 md:px-10 py-5 bg-white mt-1">
      <div class="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 md:gap-x-4 md:gap-y-0">
        <div
          v-for="cat in categories"
          :key="cat.id"
          @click="
            router.push({
              path: '/category',
              query: { id: cat.categoryId || cat.id, name: cat.name },
            })
          "
          class="flex flex-col items-center gap-1 py-3 px-3 md:px-5 rounded-2xl hover:bg-[#FFF5F0] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 min-w-[72px]"
        >
          <span class="text-2xl md:text-3xl">{{ cat.icon }}</span>
          <span class="text-xs md:text-sm font-medium text-[#2D2D2D] whitespace-nowrap">{{
            cat.name
          }}</span>
          <span class="text-[10px] md:text-xs text-gray-400 -mt-0.5 whitespace-nowrap">{{
            cat.desc
          }}</span>
        </div>
      </div>
    </section>

    <!-- ====== Banner ====== -->
    <section class="px-6 md:px-10 mt-4">
      <div v-if="carouselList.length" class="overflow-hidden rounded-2xl shadow-md relative">
        <div class="carousel-shell relative overflow-hidden">
          <div
            v-for="(item, index) in carouselList"
            :key="`${item.id}-${item.imageUrl || ''}`"
            class="absolute inset-0 transition-all duration-700"
            :class="index === currentCarouselIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'"
          >
            <img
              :src="item.imageUrlSrc || getImageUrl(item.imageUrl)"
              :alt="item.title"
              class="w-full h-full object-cover"
            />
          </div>
        </div>
        <button
          @click="prevCarousel"
          class="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
        >
          ‹
        </button>
        <button
          @click="nextCarousel"
          class="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
        >
          ›
        </button>
        <div class="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          <button
            v-for="(item, index) in carouselList"
            :key="`dot-${item.id}`"
            class="h-2.5 w-2.5 rounded-full transition-all"
            :class="index === currentCarouselIndex ? 'bg-white scale-125' : 'bg-white/60'"
            @click="goToCarousel(index)"
          />
        </div>
      </div>
      <div
        v-else
        class="w-full h-40 md:h-56 lg:h-64 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] flex items-center justify-center shadow-md relative overflow-hidden group cursor-pointer"
      >
        <div
          class="absolute -top-8 -left-8 w-28 h-28 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-700"
        ></div>
        <div
          class="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-700 delay-100"
        ></div>
        <div
          class="absolute top-6 right-16 w-8 h-8 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-700 delay-200"
        ></div>
        <span class="text-white/80 text-xl md:text-2xl lg:text-3xl font-medium tracking-widest"
          >Banner 占位</span
        >
      </div>
    </section>

    <!-- ====== 秒杀专区 ====== -->
    <section v-if="seckill.products?.length" class="px-6 md:px-10 mt-7">
      <div class="flex items-baseline justify-between mb-4">
        <div>
          <h2 class="text-xl md:text-2xl font-bold text-[#2D2D2D]">限时秒杀</h2>
          <p class="text-xs md:text-sm text-gray-400 mt-1">抢购中</p>
        </div>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
        <div
          v-for="item in seckill.products"
          :key="item.id"
          class="bg-white rounded-xl p-3 border border-[#F0F0F0]"
        >
          <img
            :src="item.productImageSrc || getImageUrl(item.productImage)"
            class="w-full h-28 object-cover rounded-lg"
          />
          <div class="mt-3 font-medium text-[#2D2D2D] line-clamp-2">{{ item.productName }}</div>
          <div class="mt-2 flex items-center gap-2">
            <span class="text-[#FF6B35] font-semibold">¥{{ formatPrice(item.seckillPrice) }}</span>
            <span class="text-xs text-gray-400 line-through"
              >¥{{ formatPrice(item.originalPrice) }}</span
            >
          </div>
          <div class="mt-2 text-xs text-gray-500">
            库存 {{ item.remainingStock }}/{{ item.totalStock }}
          </div>
        </div>
      </div>
    </section>

    <!-- ====== 推荐商品 ====== -->
    <section class="px-6 md:px-10 mt-7 pb-8 space-y-8">
      <div v-for="group in recommendGroups" :key="group.value" class="space-y-4">
        <div class="flex items-baseline justify-between">
          <div>
            <h2 class="text-xl md:text-2xl font-bold text-[#2D2D2D]">{{ group.label }}</h2>
            <p class="text-xs md:text-sm text-gray-400 mt-1">✨ 精选好货</p>
          </div>
        </div>
        <div
          v-if="group.products.length"
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5"
        >
          <div
            v-for="product in group.products"
            :key="product.id"
            @click="openPurchase(product)"
            class="bg-white rounded-xl overflow-hidden border border-[#F0F0F0] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
          >
            <img
              :src="product.productImageSrc || getImageUrl(product.productImage)"
              class="w-full aspect-square object-cover bg-[#FFF5F0]"
            />
            <div class="p-3 md:p-4">
              <h3
                class="text-sm md:text-base font-medium text-[#2D2D2D] leading-5 md:leading-6 line-clamp-2 min-h-[2.5rem] md:min-h-[3rem]"
              >
                {{ product.productName }}
              </h3>
              <div class="mt-2 flex items-baseline gap-0.5">
                <span class="text-xs text-[#FF6B35] font-semibold">¥</span>
                <span class="text-lg md:text-xl font-bold text-[#FF6B35]">{{
                  formatPrice(product.price)
                }}</span>
              </div>
              <p class="mt-1.5 text-xs text-gray-400">{{ formatSales(product.sales || 0) }}</p>
            </div>
          </div>
        </div>
        <div
          v-else
          class="text-center text-sm text-gray-400 py-6 rounded-xl border border-dashed border-[#F0F0F0] bg-white"
        >
          暂无{{ group.label }}商品
        </div>
      </div>
    </section>

    <!-- ====== 浏览历史 ====== -->
    <section v-if="browseHistory.length" class="px-6 md:px-10 pb-8">
      <div class="flex items-baseline justify-between mb-4">
        <div>
          <h2 class="text-xl md:text-2xl font-bold text-[#2D2D2D]">浏览历史</h2>
          <p class="text-xs md:text-sm text-gray-400 mt-1">最近看过</p>
        </div>
      </div>
      <div class="space-y-3">
        <div
          v-for="item in browseHistory"
          :key="item.productId"
          class="flex items-center gap-3 rounded-xl bg-white p-3 border border-[#F0F0F0]"
        >
          <img
            :src="item.productImageSrc || getImageUrl(item.productImage)"
            class="w-16 h-16 rounded-lg object-cover"
          />
          <div class="flex-1">
            <div class="font-medium text-[#2D2D2D]">{{ item.productName }}</div>
            <div class="mt-1 text-sm text-[#FF6B35] font-semibold">
              ¥{{ formatPrice(item.price) }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <PurchaseDialog
      v-model="showPurchaseDialog"
      :product="selectedProduct"
      @close="closePurchase"
    />
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.carousel-shell {
  width: 100%;
  height: 22rem;
}

@media (min-width: 768px) {
  .carousel-shell {
    height: 24rem;
  }
}

@media (min-width: 1024px) {
  .carousel-shell {
    height: 28rem;
  }
}
</style>
