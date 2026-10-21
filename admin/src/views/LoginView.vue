<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCheckCode, login } from '@/api/account'
import { ElMessage } from 'element-plus'

const router = useRouter()
const account = ref('')
const password = ref('')
const checkCode = ref('')
const checkCodeKey = ref('')
const checkCodeImg = ref('')
const loading = ref(false)
const error = ref('')

const fetchCheckCode = async () => {
  try {
    const data = await getCheckCode()
    checkCodeKey.value = data.checkCodeKey
    checkCodeImg.value = data.checkCode
  } catch (err) {
    console.error('获取验证码失败:', err)
    ElMessage.error('获取验证码失败，请稍后重试')
  }
}

const handleLogin = async () => {
  if (!account.value || !password.value || !checkCode.value) {
    error.value = '请完整填写登录信息'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const token = await login({
      account: account.value,
      password: password.value,
      checkCode: checkCode.value,
      checkCodeKey: checkCodeKey.value
    })

    // 登录成功，保存 token (token 已经是返回的 data 字符串)
    localStorage.setItem('user_token', token)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (err) {
    error.value = err.message || '登录失败，请检查账号信息'
    fetchCheckCode() // 登录失败刷新验证码
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCheckCode()
})
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h2>EasyMall 管理后台</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-item">
          <label for="account">账号</label>
          <input
            id="account"
            v-model="account"
            type="text"
            placeholder="请输入账号"
            :disabled="loading"
          />
        </div>
        <div class="form-item">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            :disabled="loading"
          />
        </div>
        <div class="form-item">
          <label for="checkCode">验证码</label>
          <div class="check-code-container">
            <input
              id="checkCode"
              v-model="checkCode"
              type="text"
              placeholder="请输入验证码"
              :disabled="loading"
              class="check-code-input"
            />
            <div class="check-code-img" @click="fetchCheckCode">
              <img v-if="checkCodeImg" :src="checkCodeImg" alt="验证码" />
              <span v-else>加载中...</span>
            </div>
          </div>
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
        <button type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f7fa;
}

.login-card {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #303133;
}

.form-item {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #606266;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: #409eff;
}

.check-code-container {
  display: flex;
  gap: 10px;
}

.check-code-input {
  flex: 1;
}

.check-code-img {
  width: 120px;
  height: 42px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafc;
  overflow: hidden;
}

.check-code-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

button {
  width: 100%;
  padding: 12px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
  margin-top: 10px;
}

button:hover {
  background-color: #66b1ff;
}

button:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}

.error-message {
  color: #f56c6c;
  font-size: 14px;
  margin-bottom: 15px;
  text-align: center;
}
</style>
