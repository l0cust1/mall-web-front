<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({ nickname: '', avatarUrl: '' })

onMounted(() => {
  const saved = localStorage.getItem('profile_edit')
  if (saved) Object.assign(form, JSON.parse(saved))
})

function save() {
  localStorage.setItem('profile_edit', JSON.stringify({ ...form }))
  localStorage.setItem('profile_nick', form.nickname)
  localStorage.setItem('profile_avatar', form.avatarUrl)
  router.back()
}

function handleAvatar(e) {
  const f = e.target.files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    form.avatarUrl = ev.target.result
  }
  reader.readAsDataURL(f)
}
</script>

<template>
  <div class="p-4 space-y-6">
    <div class="bg-white rounded-2xl p-4 space-y-4">
      <h2 class="text-lg font-semibold">编辑个人信息</h2>
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
          <img v-if="form.avatarUrl" :src="form.avatarUrl" class="w-full h-full object-cover" />
        </div>
        <div>
          <label class="text-sm text-gray-600">头像</label>
          <input type="file" accept="image/*" @change="handleAvatar" class="mt-2" />
        </div>
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">昵称</label>
        <input v-model="form.nickname" class="w-full h-11 px-3 rounded-xl bg-[#F5F5F5]" />
      </div>

      <div class="flex gap-3 justify-end">
        <button @click="router.back()" class="px-4 py-2 rounded-xl border">取消</button>
        <button @click="save" class="px-4 py-2 rounded-xl bg-[#FF6B35] text-white">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rounded-2xl {
  border-radius: 16px;
}
</style>
