<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const order = ref(null)

async function load() {
  // 使用模拟数据（接口未就绪）
  await new Promise((r) => setTimeout(r, 400))
  order.value = {
    id,
    createdAt: '2026-07-02 12:00',
    status: 'pending_payment',
    total: 199.9,
    items: [{ id: 1, name: '示例商品', price: 199.9, spec: '默认' }],
  }
}

onMounted(load)
</script>

<template>
  <div class="p-4">
    <button @click="router.back()" class="text-sm text-gray-500 mb-3">← 返回</button>
    <div v-if="order" class="bg-white rounded-2xl p-4 border border-[#F0F0F0]">
      <div class="flex items-center justify-between mb-3">
        <div>订单号：{{ order.id }}</div>
        <div class="text-sm text-gray-400">{{ order.createdAt }}</div>
      </div>
      <div class="space-y-2">
        <div v-for="it in order.items" :key="it.id" class="flex items-center gap-3">
          <div class="w-16 h-16 bg-gray-100 rounded-md"></div>
          <div class="flex-1">
            <div class="font-medium">{{ it.name }}</div>
            <div class="text-xs text-gray-400">{{ it.spec }} · ¥{{ it.price }}</div>
          </div>
        </div>
      </div>
      <div class="mt-4 flex items-center justify-between">
        <div class="text-sm text-gray-400">状态：{{ order.status }}</div>
        <div class="text-lg font-semibold">实付 ¥{{ order.total }}</div>
      </div>
    </div>
    <div v-else class="text-center text-gray-400">正在加载...</div>
  </div>
</template>

<style scoped>
.rounded-2xl {
  border-radius: 16px;
}
</style>
