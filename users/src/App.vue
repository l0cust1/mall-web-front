<script setup>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

onMounted(() => {
  cartStore.refreshCount()
})

watch(
  () => authStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      cartStore.refreshCount()
    } else {
      cartStore.clearCount()
    }
  },
)
</script>

<template>
  <div class="min-h-screen bg-[#F8F6F3]">
    <div class="w-full max-w-[1200px] mx-auto min-h-screen bg-white relative pb-16">
      <header
        class="flex items-center justify-between px-6 md:px-10 py-4 bg-white border-b border-gray-100 sticky top-0 z-50"
      >
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/')"
            class="flex items-center gap-2 text-sm font-bold text-[#2D2D2D] hover:text-[#FF6B35] transition-colors"
          >
            <span class="text-xl">🏠</span>
            <span>首页</span>
          </button>
        </div>
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/orders')"
            class="flex items-center gap-2 text-sm text-gray-500 hover:text-[#FF6B35] transition-colors"
          >
            <span class="text-xl">📋</span>
            <span class="hidden sm:inline">订单</span>
          </button>
          <button
            @click="router.push('/cart')"
            class="cart-entry flex items-center gap-2 text-sm text-gray-500 hover:text-[#FF6B35] transition-colors"
          >
            <span class="text-xl">🛒</span>
            <span class="hidden sm:inline">购物车</span>
            <span v-if="cartStore.count > 0" class="cart-badge">
              {{ cartStore.count > 99 ? '99+' : cartStore.count }}
            </span>
          </button>
          <button
            @click="router.push('/profile')"
            class="flex items-center gap-2 text-sm text-gray-500 hover:text-[#FF6B35] transition-colors"
          >
            <span class="text-xl">👤</span>
            <span class="hidden sm:inline">我的</span>
          </button>
        </div>
      </header>

      <main class="pt-4">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.cart-entry {
  position: relative;
}

.cart-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ff4d4f;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(255, 77, 79, 0.35);
  pointer-events: none;
}
</style>
