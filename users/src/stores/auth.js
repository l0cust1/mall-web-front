import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '@/api/auth'

/**
 * 用户认证 Store
 *
 * 职责：
 * - 管理用户登录状态（是否已登录、用户信息、accessToken）
 * - 提供 login / register / logout 方法
 * - 登录成功后 accessToken 持久化到 localStorage，刷新页面不丢失
 */
export const useAuthStore = defineStore('auth', () => {
  // ---- 状态 ----

  /** 登录成功后 accessToken */
  const token = ref(localStorage.getItem('accessToken') || '')

  /** 当前登录的用户信息（可从登录返回值持久化） */
  const user = ref(JSON.parse(localStorage.getItem('easymall_user') || 'null'))

  /** 加载状态，防止重复提交 */
  const loading = ref(false)

  /** 错误信息 */
  const error = ref('')

  // ---- 计算属性 ----

  /** 是否已登录 */
  const isLoggedIn = computed(() => !!token.value)

  // ---- 操作方法 ----

  /**
   * 登录
   * @param {string} username
   * @param {string} password
   * @returns {Promise<boolean>} 是否登录成功
   */
  async function login(username, password) {
    loading.value = true
    error.value = ''
    try {
      const res = await apiLogin(username, password)
      // 后端返回 { accessToken, userId, username, nickname, avatar }
      token.value = res.accessToken
      user.value = {
        id: res.userId,
        username: res.username,
        nickname: res.nickname,
        avatar: res.avatar,
      }
      // 持久化 accessToken
      localStorage.setItem('accessToken', res.accessToken)
      localStorage.setItem('easymall_user', JSON.stringify(user.value))
      return true
    } catch (e) {
      error.value = e.message || '登录失败，请重试'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 注册
   */
  async function register(username, password, phone, code) {
    loading.value = true
    error.value = ''
    try {
      const res = await apiRegister(username, password, phone, code)
      token.value = res.accessToken
      user.value = {
        id: res.userId,
        username: res.username,
        nickname: res.nickname,
        avatar: res.avatar,
      }
      localStorage.setItem('accessToken', res.accessToken)
      localStorage.setItem('easymall_user', JSON.stringify(user.value))
      return true
    } catch (e) {
      error.value = e.message || '注册失败，请重试'
      return false
    } finally {
      loading.value = false
    }
  }

  /** 退出登录 */
  async function logout() {
    try {
      await apiLogout()
    } catch (e) {
      console.warn('退出接口调用失败：', e)
    }
    token.value = ''
    user.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('easymall_user')
  }

  return {
    token,
    user,
    loading,
    error,
    isLoggedIn,
    login,
    register,
    logout,
  }
})
