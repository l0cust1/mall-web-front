import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getCartCount } from '@/api/cart'
import { useAuthStore } from '@/stores/auth'

/**
 * 购物车全局状态
 * 主要维护导航栏角标数量
 */
export const useCartStore = defineStore('cart', () => {
  const count = ref(0)
  const loading = ref(false)

  /** 从后端刷新购物车数量 */
  async function refreshCount() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) {
      count.value = 0
      return
    }

    loading.value = true
    try {
      const data = await getCartCount()
      count.value = Number(data) || 0
    } catch (e) {
      // 401 由 axios 拦截器统一处理，这里只做角标归零
      count.value = 0
    } finally {
      loading.value = false
    }
  }

  /** 本地设置角标数量，避免额外请求 */
  function setCount(value) {
    count.value = Math.max(0, Number(value) || 0)
  }

  function clearCount() {
    count.value = 0
  }

  return { count, loading, refreshCount, setCount, clearCount }
})
