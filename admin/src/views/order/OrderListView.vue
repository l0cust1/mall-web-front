<script setup>
import { ref, onMounted, reactive } from 'vue'
import { Search, Refresh, Picture } from '@element-plus/icons-vue'
import { loadOrderList, orderDelivery } from '@/api/sysOrder'
import { ElMessage, ElMessageBox } from 'element-plus'

// 查询参数
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  productName: '',
  orderStatus: null
})

const orderList = ref([])
const total = ref(0)
const loading = ref(false)

// 加载数据
const handleQuery = async () => {
  loading.value = true
  try {
    const res = await loadOrderList(queryParams)
    console.log('订单列表原始响应:', res)

    // 1. 兼容多种分页数据结构 (MyBatis Plus IPage vs 常见 List)
    if (res && typeof res === 'object') {
      // 深度兼容处理：有些返回可能在 res.data.data 或 res.data.records
      const data = res.data || res
      orderList.value = data.records || data.list || data.data || (Array.isArray(data) ? data : [])
      total.value = data.total || data.totalCount || (Array.isArray(data) ? data.length : 0)
    } else if (Array.isArray(res)) {
      orderList.value = res
      total.value = res.length
    } else {
      orderList.value = []
      total.value = 0
    }

    // 2. 字段兼容性处理 (根据后端真实数据结构)
    orderList.value = orderList.value.map(order => ({
      ...order,
      // 订单号：orderId
      displaySn: order.orderId || '未知单号',
      // 订单 ID
      orderId: order.orderId,
      // 订单状态：orderStatus
      status: order.orderStatus !== undefined ? order.orderStatus : 1,
      // 下单时间：orderTime (格式化处理)
      displayTime: order.orderTime ? order.orderTime.replace('T', ' ') : '',
      // 买家信息：buyerInfo
      displayBuyer: order.buyerInfo || '匿名用户',
      // 买家备注：buyerRemark
      displayRemark: order.buyerRemark || '',
      // 实付款金额：payAmount
      displayPayAmount: order.payAmount || 0,
      // 商品列表：items
      items: (order.items || []).map(item => ({
        ...item,
        // 商品图片：productCover
        displayPic: item.productCover || '',
        // 商品名称：productName
        displayName: item.productName || '未知商品',
        // 规格信息：skuInfo
        displayAttr: item.skuInfo || '无规格',
        // 单价：price
        displayPrice: item.price || 0,
        // 数量：quantity
        displayQty: item.quantity || 0
      }))
    }))

    console.log('处理后的订单列表:', orderList.value)
  } catch (err) {
    console.error('加载订单列表失败:', err)
  } finally {
    loading.value = false
  }
}

// 重置查询
const resetQuery = () => {
  queryParams.productName = ''
  queryParams.orderStatus = null
  queryParams.pageNum = 1
  handleQuery()
}

// 状态文本映射
const getStatusText = (status) => {
  const map = {
    0: '已删除',
    1: '待付款',
    2: '已付款待发货',
    3: '已发货',
    4: '已完成',
    5: '交易取消',
    6: '交易关闭',
    7: '已退款交易关闭'
  }
  return map[status] || '未知状态'
}

// 状态样式映射
const getStatusClass = (status) => {
  const map = {
    0: 'status-deleted',
    1: 'status-pending',
    2: 'status-paid',
    3: 'status-shipped',
    4: 'status-completed',
    5: 'status-cancelled',
    6: 'status-closed',
    7: 'status-refunded'
  }
  return map[status] || ''
}

// 发货逻辑
const deliveryVisible = ref(false)
const deliveryForm = reactive({
  orderId: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  senderName: '商城发货中心', // 默认发件人
  senderPhone: '400-123-4567',
  senderAddress: '重庆市渝北区某某电商园',
  expressCompany: '',
  expressNo: ''
})

const handleDelivery = (order) => {
  deliveryForm.orderId = order.orderId

  // 尝试解析 buyerInfo: "刘十二 13800138010 重庆市渝中区xxx路10号"
  if (order.buyerInfo) {
    const infoParts = order.buyerInfo.split(' ')
    if (infoParts.length >= 3) {
      deliveryForm.receiverName = infoParts[0]
      deliveryForm.receiverPhone = infoParts[1]
      deliveryForm.receiverAddress = infoParts.slice(2).join(' ')
    } else {
      deliveryForm.receiverName = order.buyerInfo
      deliveryForm.receiverPhone = ''
      deliveryForm.receiverAddress = ''
    }
  }

  deliveryForm.expressCompany = ''
  deliveryForm.expressNo = ''
  deliveryVisible.value = true
}

const submitDelivery = async () => {
  if (!deliveryForm.expressCompany || !deliveryForm.expressNo || !deliveryForm.receiverName || !deliveryForm.receiverPhone || !deliveryForm.receiverAddress) {
    ElMessage.warning('请填写完整的发货及收件信息')
    return
  }
  try {
    await orderDelivery(deliveryForm)
    ElMessage.success('发货成功')
    deliveryVisible.value = false
    handleQuery()
  } catch (err) {
    console.error('发货失败:', err)
  }
}

onMounted(() => {
  handleQuery()
})
</script>

<template>
  <div class="order-list-container">
    <!-- 搜索栏 -->
    <div class="search-bar card">
      <el-form :inline="true" :model="queryParams" size="default">
        <el-form-item label="商品名称">
          <el-input v-model="queryParams.productName" placeholder="输入商品名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.orderStatus" placeholder="请选择状态" clearable style="width: 160px" @change="handleQuery">
            <el-option label="待付款" :value="1" />
            <el-option label="待发货" :value="2" />
            <el-option label="已发货" :value="3" />
            <el-option label="已完成" :value="4" />
            <el-option label="交易取消" :value="5" />
            <el-option label="交易关闭" :value="6" />
            <el-option label="已退款" :value="7" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 订单列表 -->
    <div class="order-list" v-loading="loading">
      <div v-if="orderList.length === 0" class="empty-tip card">
        暂无订单数据
      </div>
      <div v-for="(order, index) in orderList" :key="order.orderId || index" class="order-item card">
        <!-- 订单头部 -->
        <div class="order-header">
          <div class="header-left">
            <span class="order-time">{{ order.displayTime }}</span>
            <span class="order-sn">订单号: {{ order.displaySn }}</span>
            <span class="buyer-info">买家信息:{{ order.displayBuyer }}</span>
          </div>
          <div class="header-right">
            <span :class="['status-text', getStatusClass(order.status)]">
              {{ getStatusText(order.status) }}
            </span>
          </div>
        </div>

        <!-- 订单内容 -->
        <div class="order-content">
          <template v-if="order.items && order.items.length > 0">
            <div v-for="(item, itemIndex) in order.items" :key="itemIndex" class="product-row">
              <div class="product-main">
                <el-image :src="'/api/' + item.productCover" class="product-img" fit="cover">
                  <template #error>
                    <div class="image-slot">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div class="product-info">
                  <div class="product-name">{{ item.displayName }}</div>
                  <div class="product-attr">{{ item.displayAttr }}</div>
                  <div class="buyer-remark">
                    <span class="remark-label">买家备注：</span>
                    <span class="remark-content" :class="{ 'no-remark': !order.displayRemark }">
                      {{ order.displayRemark || '暂无' }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="product-price">
                <div class="price-val">¥{{ (item.displayPrice).toFixed(2) }}</div>
                <div class="price-qty">x{{ item.displayQty }}</div>
              </div>
              <div class="order-payment" v-if="itemIndex === 0">
                <span class="pay-label">实付款</span>
                <span class="pay-val">¥{{ (order.displayPayAmount).toFixed(2) }}</span>
              </div>
              <div class="order-payment empty" v-else></div>
            </div>
          </template>
          <!-- 无商品项时的兜底显示 -->
          <div v-else class="product-row no-items">
            <div class="product-main">
              <div class="product-info">
                <div class="product-name" style="color: #909399;">该订单暂无商品详情</div>
                <div class="buyer-remark">
                  <span class="remark-label">买家备注：</span>
                  <span class="remark-content">{{ order.displayRemark || '暂无' }}</span>
                </div>
              </div>
            </div>
            <div class="order-payment">
              <span class="pay-label">实付款</span>
              <span class="pay-val">¥{{ (order.displayPayAmount).toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- 订单操作 (如果是待发货状态) -->
        <div class="order-footer" v-if="order.status === 2">
          <el-button type="primary" size="small" @click="handleDelivery(order)">去发货</el-button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-container card">
      <el-pagination
        v-model:current-page="queryParams.pageNum"
        v-model:page-size="queryParams.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleQuery"
        @current-change="handleQuery"
      />
    </div>

    <!-- 发货弹窗 -->
    <el-dialog v-model="deliveryVisible" title="订单发货" width="600px">
      <el-form :model="deliveryForm" label-width="100px" size="default">
        <el-divider content-position="left">收件人信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="收件人">
              <el-input v-model="deliveryForm.receiverName" placeholder="收件人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收件电话">
              <el-input v-model="deliveryForm.receiverPhone" placeholder="收件人电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="收货地址">
          <el-input v-model="deliveryForm.receiverAddress" type="textarea" placeholder="详细收货地址" />
        </el-form-item>

        <el-divider content-position="left">发件人信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发件人">
              <el-input v-model="deliveryForm.senderName" placeholder="发件人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发件电话">
              <el-input v-model="deliveryForm.senderPhone" placeholder="发件人电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="发货地址">
          <el-input v-model="deliveryForm.senderAddress" placeholder="发货地址" />
        </el-form-item>

        <el-divider content-position="left">物流信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物流公司">
              <el-select v-model="deliveryForm.expressCompany" placeholder="请选择快递公司" style="width: 100%">
                <el-option label="顺丰快递" value="顺丰快递" />
                <el-option label="圆通快递" value="圆通快递" />
                <el-option label="中通快递" value="中通快递" />
                <el-option label="申通快递" value="申通快递" />
                <el-option label="韵达快递" value="韵达快递" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物流单号">
              <el-input v-model="deliveryForm.expressNo" placeholder="请输入物流单号" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="deliveryVisible = false">取消</el-button>
        <el-button type="primary" @click="submitDelivery">确定发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.order-list-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.card {
  background: #fff;
  border-radius: 4px;
  padding: 15px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.search-bar {
  padding-bottom: 0;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.order-item {
  padding: 0;
  overflow: hidden;
}

.order-header {
  background-color: #f0f0f0;
  padding: 8px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
  font-size: 13px;
  color: #666;
}

.header-left {
  display: flex;
  gap: 20px;
}

.order-time {
  margin-right: 10px;
}

.order-sn {
  margin-right: 10px;
}

.status-text {
  font-weight: normal;
  font-size: 13px;
}

.status-pending { color: #e6a23c; } /* 待付款 */
.status-paid { color: #409eff; }    /* 已付款待发货 */
.status-shipped { color: #409eff; } /* 已发货 */
.status-completed { color: #67c23a; } /* 已完成 */
.status-cancelled { color: #e6a23c; } /* 交易取消 */
.status-closed { color: #909399; }    /* 交易关闭 */
.status-deleted { color: #f56c6c; }   /* 已删除 */
.status-refunded { color: #909399; }  /* 已退款 */

.order-content {
  padding: 10px 15px;
}

.product-row {
  display: flex;
  align-items: flex-start;
  padding: 10px 0;
}

.product-row + .product-row {
  border-top: 1px solid #f5f5f5;
}

.product-main {
  flex: 1;
  display: flex;
  gap: 15px;
}

.product-img {
  width: 70px;
  height: 70px;
  border-radius: 4px;
  flex-shrink: 0;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 24px;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 500px;
}

.product-name {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
  margin-bottom: 2px;
}

.product-attr {
  font-size: 12px;
  color: #999;
}

.buyer-remark {
  margin-top: 6px;
  font-size: 12px;
}

.remark-label {
  color: #ff6b6b;
}

.remark-content {
  color: #ff6b6b;
}

.remark-content.no-remark {
  color: #ff6b6b;
}

.product-price {
  width: 100px;
  text-align: right;
  padding-right: 20px;
}

.price-val {
  font-size: 14px;
  color: #cf4444;
  font-weight: bold;
}

.price-qty {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.order-payment {
  width: 150px;
  text-align: right;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: baseline;
  gap: 8px;
}

.order-payment.empty {
  visibility: hidden;
}

.pay-label {
  font-size: 13px;
  color: #333;
}

.pay-val {
  font-size: 14px;
  color: #cf4444;
  font-weight: bold;
}

.order-footer {
  padding: 10px 15px;
  background-color: #fff;
  border-top: 1px solid #f2f6fc;
  display: flex;
  justify-content: flex-end;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
}

.empty-tip {
  text-align: center;
  color: #909399;
  padding: 40px;
}
</style>
