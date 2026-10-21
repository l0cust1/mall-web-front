<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { getMyInfo } from '@/api/auth'
import { getAddressList, deleteUserAddress, addUserAddress, updateUserAddress } from '@/api/adress'
import { ElMessage } from 'element-plus'

const router = useRouter()

const userInfo = ref(null)
const addresses = ref([])
const loading = ref(true)
const error = ref('')
const deletingAddressId = ref(null)
// 3. 表单DOM引用，用于表单校验
const formRef = ref(null)
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const editingAddressId = ref(null)
const addressForm = reactive({
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  district: '',
  detailAddress: '',
  isDefault: 0,
})

const rules = {
  receiverName: [
    { required: true, message: '请填写收货人姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' },
  ],
  receiverPhone: [
    { required: true, message: '请填写手机号码', trigger: 'blur' },
    { pattern: /^1[3456789]\d{9}$/, message: '请填写正确的手机号码', trigger: 'blur' },
  ],
}

// 6. 提交按钮loading，防止重复点击
const submitLoading = ref(false)
const editFormRef = ref(null)
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

// 9. 新增地址提交核心方法
const submitAddAddress = async () => {
  if (!formRef.value) return
  submitLoading.value = true

  // 改用回调方式校验，校验失败不会抛异常
  formRef.value.validate(async (valid) => {
    // 校验不通过直接终止逻辑
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

// 编辑地址相关方法
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

function getImageUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return BACKEND_URL + url
}

const genderLabel = { 0: '女', 1: '男', 3: '未知' }

function maskPhone(phone) {
  if (!phone) return '未绑定'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 排序：默认地址在最前
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
  } catch (e) {
    console.warn('地址列表加载失败:', e.message)
  }
}

async function handleDeleteAddress(addr) {
  if (!addr?.addressId) return
  if (!window.confirm('确定删除这条收货地址吗？')) return

  deletingAddressId.value = addr.addressId
  try {
    await deleteUserAddress(addr.addressId)
    await loadAddresses()
  } catch (e) {
    window.alert(e.message || '删除失败')
  } finally {
    deletingAddressId.value = null
  }
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await getMyInfo()
    userInfo.value = data
    await loadAddresses()
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})

function goEdit() {
  router.push('/profile/edit')
}
</script>

<template>
  <div>
    <!-- 加载状态 -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-gray-400">
      <svg
        class="animate-spin h-8 w-8 mb-3 text-[#FF6B35]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        ></path>
      </svg>
      <span class="text-sm">加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-20 text-gray-400">
      <span class="text-4xl mb-3">😵</span>
      <p class="text-sm mb-4">{{ error }}</p>
      <button
        @click="router.go(0)"
        class="px-5 h-10 rounded-xl bg-[#FF6B35] text-white text-sm shadow-md hover:shadow-lg transition-all"
      >
        重新加载
      </button>
    </div>

    <!-- 个人信息 -->
    <div v-else-if="userInfo" class="px-6 md:px-10 py-6">
      <!-- 个人资料卡片 -->
      <div
        class="bg-gradient-to-br from-[#FFF5F0] to-[#FFE8D6] rounded-2xl p-6 flex items-center gap-5 shadow-sm"
      >
        <div
          class="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] flex items-center justify-center text-2xl md:text-3xl text-white shadow-md shrink-0"
        >
          <img
            v-if="userInfo.avatar"
            :src="getImageUrl(userInfo.avatar)"
            class="w-full h-full object-cover"
          />
          <span v-else>{{
            (userInfo.nickname || userInfo.username || 'U').charAt(0).toUpperCase()
          }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-lg md:text-xl font-bold text-[#2D2D2D] truncate">
            {{ userInfo.nickname || userInfo.username || '用户' }}
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            <span class="inline-block mr-3">{{
              genderLabel[userInfo.gender] || '未设置性别'
            }}</span>
            <span v-if="userInfo.phone">📱 {{ maskPhone(userInfo.phone) }}</span>
          </p>
        </div>
        <button
          @click="goEdit"
          class="shrink-0 px-4 h-9 rounded-xl text-sm font-medium text-[#FF6B35] bg-white/80 hover:bg-white shadow-sm transition-all"
        >
          编辑资料
        </button>
      </div>

      <!-- 信息详情 -->
      <div
        class="mt-6 bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden"
      >
        <div class="flex items-center justify-between px-5 py-4">
          <div class="flex items-center gap-3">
            <span class="text-lg">👤</span>
            <div>
              <p class="text-xs text-gray-400">用户名</p>
              <p class="text-sm font-medium text-[#2D2D2D] mt-0.5">
                {{ userInfo.username || '-' }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between px-5 py-4">
          <div class="flex items-center gap-3">
            <span class="text-lg">📛</span>
            <div>
              <p class="text-xs text-gray-400">昵称</p>
              <p class="text-sm font-medium text-[#2D2D2D] mt-0.5">
                {{ userInfo.nickname || '未设置' }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between px-5 py-4">
          <div class="flex items-center gap-3">
            <span class="text-lg">⚧️</span>
            <div>
              <p class="text-xs text-gray-400">性别</p>
              <p class="text-sm font-medium text-[#2D2D2D] mt-0.5">
                {{ genderLabel[userInfo.gender] || '未设置' }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between px-5 py-4">
          <div class="flex items-center gap-3">
            <span class="text-lg">📱</span>
            <div>
              <p class="text-xs text-gray-400">手机号</p>
              <p class="text-sm font-medium text-[#2D2D2D] mt-0.5">
                {{ maskPhone(userInfo.phone) }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between px-5 py-4">
          <div class="flex items-center gap-3">
            <span class="text-lg">✉️</span>
            <div>
              <p class="text-xs text-gray-400">邮箱</p>
              <p class="text-sm font-medium text-[#2D2D2D] mt-0.5">
                {{ userInfo.email || '未绑定' }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between px-5 py-4">
          <div class="flex items-center gap-3">
            <span class="text-lg">🆔</span>
            <div>
              <p class="text-xs text-gray-400">用户 ID</p>
              <p class="text-sm font-medium text-[#2D2D2D] mt-0.5">{{ userInfo.userId || '-' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 地址列表 -->
      <div class="mt-8">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-lg">📍</span>
          <h3 class="text-base font-bold text-[#2D2D2D]">收货地址</h3>
          <span class="text-xs text-gray-400 ml-1">({{ addresses.length }}个)</span>
          <el-button type="primary" @click="showAddDialog = true">添加</el-button>
          <el-dialog v-model="showAddDialog" title="添加收货地址">
            <el-form :model="addressForm" :rules="rules" ref="formRef" label-width="80px">
              <el-form-item label="收货人" prop="receiverName"
                >">
                <el-input
                  v-model="addressForm.receiverName"
                  placeholder="请输入收货人姓名"
                ></el-input>
              </el-form-item>
              <el-form-item label="手机号" prop="receiverPhone">
                <el-input
                  v-model="addressForm.receiverPhone"
                  placeholder="请输入收货人手机号"
                ></el-input>
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
                <el-input
                  v-model="addressForm.detailAddress"
                  placeholder="请输入详细地址"
                ></el-input>
              </el-form-item>
              <el-form-item label="默认地址">
                <el-switch v-model="addressForm.isDefault" active-value="1" inactive-value="0" />
              </el-form-item>
            </el-form>
            <template #footer>
              <!-- 取消按钮：关闭弹窗 -->
              <el-button @click="showAddDialog = false">取消</el-button>
              <!-- 你的提交按钮 -->
              <el-button type="primary" @click="submitAddAddress" :loading="submitLoading"
                >确定添加</el-button
              >
            </template>
          </el-dialog>
          <el-dialog v-model="showEditDialog" title="编辑收货地址">
            <el-form :model="editAddressForm" :rules="rules" ref="editFormRef" label-width="80px">
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
                <el-input
                  v-model="editAddressForm.detailAddress"
                  placeholder="请输入详细地址"
                ></el-input>
              </el-form-item>
              <el-form-item label="默认地址">
                <el-switch
                  v-model="editAddressForm.isDefault"
                  active-value="1"
                  inactive-value="0"
                />
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="cancelEditAddress">取消</el-button>
              <el-button type="primary" @click="submitEditAddress" :loading="submitLoading"
                >确定更新</el-button
              >
            </template>
          </el-dialog>
        </div>

        <div
          v-if="addresses.length === 0"
          class="bg-white rounded-xl border border-dashed border-gray-200 py-10 text-center"
        >
          <p class="text-gray-400 text-sm">暂无收货地址</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="addr in sortedAddresses"
            :key="addr.addressId"
            class="bg-white rounded-xl border border-gray-100 p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-semibold text-[#2D2D2D]">{{ addr.receiverName }}</span>
                  <span class="text-sm text-gray-500">{{ addr.receiverPhone }}</span>
                  <span
                    v-if="addr.isDefault"
                    class="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FF6B35] text-white font-medium"
                  >
                    默认
                  </span>
                </div>
                <p class="text-xs text-gray-400 mt-2 leading-relaxed">
                  {{ formatAddress(addr) }}
                </p>
                <div class="flex items-center gap-4 mt-3">
                  <button
                    type="button"
                    class="text-sm text-[#FF6B35] hover:text-[#FF8C5A]"
                    @click="openEditDialog(addr)"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    class="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
                    :disabled="deletingAddressId === addr.addressId"
                    @click="handleDeleteAddress(addr)"
                  >
                    {{ deletingAddressId === addr.addressId ? '删除中...' : '删除' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
