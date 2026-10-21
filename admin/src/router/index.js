import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layout/MainLayout.vue'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import UserView from '../views/sys/UserView.vue'
import CategoryView from '../views/sys/CategoryView.vue'
import PropertyView from '../views/sys/PropertyView.vue'
import CarouselView from '../views/sys/CarouselView.vue'
import RecommendView from '../views/sys/RecommendView.vue'
import ProductListView from '../views/product/ProductListView.vue'
import ProductEditView from '../views/product/ProductEditView.vue'
import OrderListView from '../views/order/OrderListView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
          meta: { title: '首页概览' }
        },
        {
          path: 'order/list',
          name: 'orderList',
          component: OrderListView,
          meta: { title: '订单管理' }
        },
        {
          path: 'sys/user',
          name: 'sysUser',
          component: UserView,
          meta: { title: '用户管理' }
        },
        {
          path: 'sys/category',
          name: 'sysCategory',
          component: CategoryView,
          meta: { title: '分类管理' }
        },
        {
          path: 'sys/property',
          name: 'sysProperty',
          component: PropertyView,
          meta: { title: '属性管理' }
        },
        {
          path: 'sys/carousel',
          name: 'sysCarousel',
          component: CarouselView,
          meta: { title: '轮播图管理' }
        },
        {
          path: 'sys/recommend',
          name: 'sysRecommend',
          component: RecommendView,
          meta: { title: '推荐商品管理' }
        },
        {
          path: 'product/list',
          name: 'productList',
          component: ProductListView,
          meta: { title: '商品管理' }
        },
        {
          path: 'product/publish',
          name: 'productPublish',
          component: ProductEditView,
          meta: { title: '发布商品' }
        },
        {
          path: 'product/edit/:id',
          name: 'productEdit',
          component: ProductEditView,
          meta: { title: '编辑商品' }
        }
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
  ],
})

router.beforeEach((to, from) => {
  const isAuthenticated = localStorage.getItem('user_token')
  if (to.name !== 'login' && !isAuthenticated) {
    return { name: 'login' }
  }
  if (to.name === 'login' && isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
