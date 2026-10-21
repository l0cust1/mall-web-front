<script setup>
import { ref, onMounted, reactive, h } from 'vue'
import {
  loadProductList,
  deleteProduct,
  updateCommendType,
  updateProductStatus,

  updateProductRemark,
  loadProductSkus,
  updateProductSkuStock,
  updateProductPrice

} from '@/api/sysProduct'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import {
  Search,
  Plus,
  View,
  Pointer,
  Sell,
  Edit,
  Delete,
  ChatDotRound,
  Picture
} from '@element-plus/icons-vue'

const router = useRouter()
const loading = ref(false)
const productList = ref([])
const total = ref(0)
const skuDialogVisible = ref(false)
const skuList = ref([])
const skuTableLoading = ref(false)
const currentProduct = ref(null)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  productName: '',
  status: '',
  CommendType: ''
})

const fetchProductList = async () => {
  loading.value = true
  try {
    const data = await loadProductList(queryParams)
    productList.value = data.records
    total.value = data.total
  } catch (err) {
    console.error('获取商品列表失败:', err)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryParams.pageNum = 1
  fetchProductList()
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认要删除商品 "${row.productName}" 吗？`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteProduct(row.productId)
    ElMessage.success('删除成功')
    fetchProductList()
  } catch (err) {
    if (err !== 'cancel') console.error('删除失败:', err)
  }
}

const handleUpdateCommend = async (row) => {
  const newCommendType = row.commendType === 1 ? 0 : 1
  try {
    await updateCommendType({
      productId: row.productId,
      commendType: newCommendType
    })
    ElMessage.success(newCommendType === 1 ? '已推荐' : '取消推荐成功')
    fetchProductList()
  } catch (err) {
    console.error('修改推荐状态失败:', err)
  }
}

const handleUpdateStatus = async (row) => {
  const newStatus = row.status === 1 ? 0 : 1
  try {
    await updateProductStatus({
      productId: row.productId,
      status: newStatus
    })
    ElMessage.success(newStatus === 1 ? '上架成功' : '下架成功')
    fetchProductList()
  } catch (err) {
    console.error('修改上下架状态失败:', err)
  }
}

const handleUpdateStock = async (row) => {
  await handleViewSkuStock(row)
}

const handleUpdateRemark = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入备注内容', '修改备注', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: row.remark || ''
    })
    await updateProductRemark({
      productId: row.productId,
      remark: value
    })
    ElMessage.success('修改备注成功')
    fetchProductList()
  } catch (err) {
    if (err !== 'cancel') console.error('修改备注失败:', err)
  }
}

const handleUpdatePrice = async (row) => {
  try {
    await ElMessageBox({
      title: '修改价格区间',
      message: () => h('div', { style: 'display: flex; flex-direction: column; gap: 12px;' }, [
        h('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, [
          h('label', { style: 'font-size: 14px; color: #606266;' }, '最低价'),
          h('input', {
            value: row.minPrice ?? '',
            type: 'number',
            style: 'width: 100%; padding: 8px 10px; border: 1px solid #dcdfe6; border-radius: 4px;',
            onInput: (event) => {
              row._tempMinPrice = event.target.value
            }
          })
        ]),
        h('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, [
          h('label', { style: 'font-size: 14px; color: #606266;' }, '最高价'),
          h('input', {
            value: row.maxPrice ?? '',
            type: 'number',
            style: 'width: 100%; padding: 8px 10px; border: 1px solid #dcdfe6; border-radius: 4px;',
            onInput: (event) => {
              row._tempMaxPrice = event.target.value
            }
          })
        ])
      ]),
      showCancelButton: true,
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })

    const min = Number(row._tempMinPrice ?? row.minPrice ?? '')
    const max = Number(row._tempMaxPrice ?? row.maxPrice ?? '')

    if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || max < 0) {
      ElMessage.error('请输入合法的价格')
      return
    }

    if (min > max) {
      ElMessage.error('最低价不能大于最高价')
      return
    }

    const priceData = { minPrice: min, maxPrice: max }

    await updateProductPrice(row.productId, priceData)

    ElMessage.success('价格更新成功')
    fetchProductList()
  } catch (err) {
    if (err !== 'cancel') console.error('修改价格失败:', err)
  }
}

const handleViewSkuStock = async (row) => {
  currentProduct.value = row
  skuTableLoading.value = true
  try {
    const data = await loadProductSkus(row.productId)
    skuList.value = Array.isArray(data) ? data.map(sku => {
      if (!sku._values && sku.propertyValueIds) {
        sku._values = sku.propertyValueIds.split(',')
      }
      return sku
    }) : []

    if (!skuList.value.length) {
      ElMessage.info('当前商品暂无 SKU 数据')
    }
    skuDialogVisible.value = true
  } catch (err) {
    console.error('加载 SKU 库存失败:', err)
  } finally {
    skuTableLoading.value = false
  }
}

const handleSaveSkuStock = async () => {
  if (!currentProduct.value) return
  try {
    await updateProductSkuStock({
      productId: currentProduct.value.productId,
      skus: skuList.value.map(sku => ({
        skuId: sku.skuId,
        propertyValueIds: sku.propertyValueIds,
        stock: sku.stock
      }))
    })
    ElMessage.success('SKU 库存保存成功')
    skuDialogVisible.value = false
    fetchProductList()
  } catch (err) {
    console.error('保存 SKU 库存失败:', err)
  }
}

const handlePageChange = (val) => {
  queryParams.pageNum = val
  fetchProductList()
}

onMounted(() => {
  fetchProductList()
})
</script>

<template>
  <div class="product-container">
    <div class="breadcrumb">商品 / 商品管理</div>

    <!-- Search Bar -->
    <el-card class="search-card">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="用户昵称">
          <el-input v-model="queryParams.productName" placeholder="输入商品名称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 150px">
            <el-option label="下架" :value="0" />
            <el-option label="上架" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="推荐">
          <el-select v-model="queryParams.CommendType" placeholder="请选择推荐类型" clearable style="width: 150px">
            <el-option label="不推荐" :value="0" />
            <el-option label="推荐" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"><el-icon><Search /></el-icon>搜索</el-button>
          <el-button type="success" @click="router.push('/product/publish')"><el-icon><Plus /></el-icon>发布商品</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <el-card class="table-card">
      <el-table v-loading="loading" :data="productList" style="width: 100%">
        <el-table-column label="商品信息" min-width="300">
          <template #default="scope">
            <div class="product-info">
              <el-image
                class="product-img"
                :src=" scope.row.cover"
                fit="cover"
              >
                <template #error>
                  <div class="image-slot"><el-icon><Picture /></el-icon></div>
                </template>
              </el-image>
              <div class="info-text">
                <div class="product-name" :title="scope.row.productName">{{ scope.row.productName }}</div>
                <div class="product-id">ID: {{ scope.row.productId }}</div>
                <div class="product-category">分类: {{ scope.row.categoryName || '其他' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="价格区间" width="180" align="center">
          <template #default="scope">
            <div class="stock-cell">
              <span class="price-text">¥{{ scope.row.minPrice }} ~ ¥{{ scope.row.maxPrice }}</span>
              <el-icon class="edit-icon" @click="handleUpdatePrice(scope.row)"><Edit /></el-icon>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="总库存" width="120" align="center">
          <template #default="scope">
            <div class="stock-cell">
              <span>{{ scope.row.stock }}</span>
              <el-icon class="edit-icon" @click="handleUpdateStock(scope.row)"><Edit /></el-icon>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="skuCount" label="SKU数量" width="100" align="center" />

        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" effect="dark">
              {{ scope.row.status === 1 ? '已上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="推荐" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.commendType === 1 ? 'success' : 'danger'" effect="plain">
              {{ scope.row.commendType === 1 ? '已推荐' : '未推荐' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="scope">
            <div class="operation-buttons">
              <el-tooltip content="查看 SKU 库存" placement="top">
                <el-button link type="primary" :icon="View" @click="handleViewSkuStock(scope.row)" />
              </el-tooltip>
              <el-tooltip :content="scope.row.commendType === 1 ? '取消推荐' : '设为推荐'" placement="top">
                <el-button link type="primary" :icon="Pointer" @click="handleUpdateCommend(scope.row)" />
              </el-tooltip>
              <el-tooltip :content="scope.row.status === 1 ? '下架' : '上架'" placement="top">
                <el-button link type="primary" :icon="Sell" @click="handleUpdateStatus(scope.row)" />
              </el-tooltip>
              <el-tooltip content="修改备注" placement="top">
                <el-button link type="primary" :icon="ChatDotRound" @click="handleUpdateRemark(scope.row)" />
              </el-tooltip>
              <el-tooltip content="编辑" placement="top">
                <el-button link type="primary" :icon="Edit" @click="router.push(`/product/edit/${scope.row.productId}`)" />
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button link type="danger" :icon="Delete" @click="handleDelete(scope.row)" />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          :current-page="queryParams.pageNum"
          :page-size="queryParams.pageSize"
          layout="total, prev, pager, next, jumper"
          :total="total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="skuDialogVisible"
      width="760px"
      :before-close="() => { skuDialogVisible = false }"
      title="SKU 库存管理"
    >
      <div v-loading="skuTableLoading">
        <div v-if="!skuList.length" class="empty-sku-tip">当前商品暂无 SKU 数据</div>
        <el-table v-else :data="skuList" style="width: 100%" size="small">
          <el-table-column type="index" width="50" label="#" />
          <el-table-column label="规格" min-width="200">
            <template #default="scope">
              {{ scope.row._values ? scope.row._values.join(' / ') : scope.row.propertyValueIds }}
            </template>
          </el-table-column>
          <el-table-column prop="price" label="价格" width="120" align="center">
            <template #default="scope">
              ¥{{ scope.row.price?.toFixed ? scope.row.price.toFixed(2) : scope.row.price }}
            </template>
          </el-table-column>
          <el-table-column label="库存" width="140" align="center">
            <template #default="scope">
              <el-input-number v-model="scope.row.stock" :min="0" size="small" />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="skuDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveSkuStock">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.product-container {
  padding: 20px;
  background-color: #f0f2f5;
  min-height: 100%;
}

.breadcrumb {
  font-size: 13px;
  color: #909399;
  margin-bottom: 20px;
}

.search-card {
  margin-bottom: 20px;
}

.product-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-img {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  flex-shrink: 0;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-slot {
  font-size: 24px;
  color: #c0c4cc;
}

.info-text {
  flex: 1;
  overflow: hidden;
}

.product-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-id, .product-category {
  font-size: 12px;
  color: #909399;
}

.price-text {
  color: #f56c6c;
  font-weight: bold;
}

.stock-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.edit-icon {
  cursor: pointer;
  color: #409eff;
  font-size: 14px;
}

.edit-icon:hover {
  color: #66b1ff;
}

.operation-buttons {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table .cell) {
  padding: 8px 0;
}
</style>
