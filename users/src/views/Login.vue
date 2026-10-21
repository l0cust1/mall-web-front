<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = '请完整填写登录信息'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const success = await authStore.login(username.value, password.value)
    if (success) {
      ElMessage.success('登录成功')
      // 跳回之前要访问的页面，如果没有则回首页
      const redirect = route.query.redirect || '/'
      router.push(redirect)
    } else {
      error.value = authStore.error || '登录失败，请检查账号密码'
    }
  } catch (err) {
    error.value = err.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">🛒</div>
        <h1 class="login-title">EasyMall</h1>
        <p class="login-subtitle">欢迎回来，请登录你的账号</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            :disabled="loading"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            :disabled="loading"
            class="form-input"
          />
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>

        <button type="submit" :disabled="loading" class="login-btn">
          <span v-if="loading" class="loading-spinner"></span>
          <span>{{ loading ? '登录中...' : '登录' }}</span>
        </button>
      </form>

      <p class="register-hint">
        还没有账号？
        <button @click="router.push('/register')" class="register-link">去注册</button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8f6f3 0%, #fff5f0 50%, #ffe8d6 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 24px;
  padding: 40px 36px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  font-size: 48px;
  margin-bottom: 12px;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #2d2d2d;
  margin: 0 0 6px 0;
}

.login-subtitle {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #2d2d2d;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1.5px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  color: #2d2d2d;
  background: #f8f6f3;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #ff6b35;
  background: white;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.12);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input::placeholder {
  color: #bbb;
}

.form-error {
  background: #fff0f0;
  color: #e54545;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 10px;
  text-align: center;
}

.login-btn {
  height: 48px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.login-btn:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.35);
  transform: translateY(-1px);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.register-hint {
  text-align: center;
  margin: 24px 0 0 0;
  font-size: 14px;
  color: #999;
}

.register-link {
  background: none;
  border: none;
  color: #ff6b35;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}

.register-link:hover {
  text-decoration: underline;
}
</style>
