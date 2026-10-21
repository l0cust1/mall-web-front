import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Category from '@/views/Category.vue'
import ProductDetail from '@/views/ProductDetail.vue'
import Cart from '@/views/Cart.vue'
import Profile from '@/views/Profile.vue'
import ProfileEdit from '@/views/ProfileEdit.vue'
import OrderDetail from '@/views/OrderDetail.vue'
import OrderConfirm from '@/views/OrderConfirm.vue'
import OrderCenter from '@/views/OrderCenter.vue'
import Login from '@/views/Login.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
    },
    {
      path: '/category',
      name: 'category',
      component: Category,
    },
    {
      path: '/productDetail/:id',
      name: 'ProductDetail',
      component: ProductDetail,
    },
    {
      path: '/cart',
      name: 'cart',
      component: Cart,
    },
    {
      path: '/profile',
      name: 'profile',
      component: Profile,
    },
    {
      path: '/profile/edit',
      name: 'profile-edit',
      component: ProfileEdit,
    },
    {
      path: '/order/confirm',
      name: 'order-confirm',
      component: OrderConfirm,
    },
    {
      path: '/orders',
      name: 'orders',
      component: OrderCenter,
    },
    {
      path: '/order/:id',
      name: 'order-detail',
      component: OrderDetail,
    },
  ],
})

export default router
