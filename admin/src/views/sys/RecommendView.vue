<script setup>
import { ref, reactive, onMounted } from 'vue'
import { loadRecommendListAll, addRecommend, updateRecommend, deleteRecommend, clearRecommendCache } from '@/api/sysRecommend'
import { loadProductList } from '@/api/sysProduct'
import { uploadFile } from '@/api/file'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const total = ref(0)
const recommendList = ref([])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  productName: '',
  recommendType: '',
  status: ''
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref(null)
const selectableProducts = ref([])
const selectedProductId = ref('')
const productSelectLoading = ref(false)
const form = reactive({
  id: '',
  productId: '',
  productName: '',
  productImage: '',
  price: 0,
  originalPrice: 0,
  recommendType: 1,
  sortOrder: 10,
  status: 1,
  createTime: '',
  updateTime: ''
})

const rules = {
  productId: [{ required: true, message: '请输入商品ID', trigger: 'blur' }],
  productName: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  productImage: [{ required: true, message: '请上传商品图片', trigger: 'blur' }],
  price: [{ required: true, message: '请输入售价', trigger: 'blur' }],
  originalPrice: [{ required: true, message: '请输入原价', trigger: 'blur' }],
  recommendType: [{ required: true, message: '请选择推荐类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const recommendTypes = [
  { label: '热门推荐', value: 1 },
  { label: '新品', value: 2 },
  { label: '精品推荐', value: 3 }
]

const handleSearch = () => {
  queryParams.pageNum = 1
  fetchRecommendListAll()
}

const handleReset = () => {
  queryParams.productName = ''
  queryParams.recommendType = ''
  queryParams.status = ''
  queryParams.pageNum = 1
  fetchRecommendListAll()
}

const fetchRecommendListAll = async () => {
  loading.value = true
  try {
    const data = await loadRecommendListAll()
    if (data && data.records) {
      recommendList.value = data.records
      total.value = data.total || data.records.length
    } else if (Array.isArray(data)) {
      recommendList.value = data
      total.value = data.length
    } else {
      recommendList.value = []
      total.value = 0
    }
  } catch (err) {
    console.error('获取推荐商品列表失败:', err)
  } finally {
    loading.value = false
  }
}

const resolveProductImage = (product) => {
  if (!product) return ''
  return product.cover || product.productCover || product.image || product.productImage || product.coverList?.[0] || ''
}

const fetchSelectableProducts = async () => {
  productSelectLoading.value = true
  try {
    const data = await loadProductList({
      pageNum: 1,
      pageSize: 100,
      productName: '',
      status: '',
      CommendType: ''
    })
    const records = data?.records || []
    selectableProducts.value = records.map(item => ({
      ...item,
      _label: `${item.productName || '未知商品'}（ID:${item.productId}）`
    }))
  } catch (err) {
    console.error('获取商品列表失败:', err)
  } finally {
    productSelectLoading.value = false
  }
}

const handleSelectProduct = (productId) => {
  if (!productId) {
    form.productId = ''
    form.productName = ''
    form.productImage = ''
    form.price = 0
    form.originalPrice = 0
    return
  }

  const product = selectableProducts.value.find(item => String(item.productId) === String(productId))
  if (!product) return

  form.productId = String(product.productId)
  form.productName = product.productName
  form.productImage = resolveProductImage(product)
  form.price = product.minPrice || product.price || 0
  form.originalPrice = product.maxPrice || product.price || product.minPrice || 0
}

const resetForm = () => {
  form.id = ''
  form.productId = ''
  form.productName = ''
  form.productImage = ''
  form.price = 0
  form.originalPrice = 0
  form.recommendType = 1
  form.sortOrder = 10
  form.status = 1
  form.createTime = ''
  form.updateTime = ''
  selectedProductId.value = ''
  if (formRef.value) formRef.value.resetFields()
}

const handleAdd = async () => {
  resetForm()
  await fetchSelectableProducts()
  dialogTitle.value = '新增推荐商品'
  dialogVisible.value = true
}

const handleEdit = async (row) => {
  await fetchSelectableProducts()
  Object.assign(form, {
    id: String(row.id),
    productId: String(row.productId),
    productName: row.productName,
    productImage: row.productImage,
    price: row.price,
    originalPrice: row.originalPrice,
    recommendType: row.recommendType,
    sortOrder: row.sortOrder,
    status: row.status
  })
  selectedProductId.value = String(row.productId)
  dialogTitle.value = '编辑推荐商品'
  dialogVisible.value = true
}

const handleCustomUpload = async (options) => {
  const { file, onSuccess, onError } = options
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await uploadFile(formData)
    onSuccess(res)
  } catch (err) {
    console.error('上传图片失败:', err)
    ElMessage.error('商品图片上传失败，请重试')
    onError(err)
  }
}

const handleUploadSuccess = (res) => {
  let url = ''
  if (res && typeof res === 'object') {
    url = res.fileName || res.url || ''
  } else if (typeof res === 'string') {
    url = res
  }
  if (!url) {
    ElMessage.error('图片上传返回地址无效')
    return
  }
  url = url.replace(/\\/g, '/')
  if (url.startsWith('http')) {
    try {
      const urlObj = new URL(url)
      url = urlObj.pathname
    } catch (e) {
      const lastSlashIndex = url.lastIndexOf('/')
      url = url.substring(lastSlashIndex)
    }
  }
  if (!url.startsWith('/')) {
    url = '/' + url
  }
  if (!url.startsWith('/api')) {
    url = '/api' + url
  }
  form.productImage = url
  ElMessage.success('图片上传成功，已自动填充图片地址')
}

const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isImage) ElMessage.error('仅支持图片上传')
  if (!isLt5M) ElMessage.error('图片大小不能超过 5MB')
  return isImage && isLt5M
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      if (form.id) {
        await updateRecommend({ ...form })
        ElMessage.success('修改成功')
      } else {
        await addRecommend({ ...form })
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
      fetchRecommendListAll()
    } catch (err) {
      console.error('保存失败:', err)
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除推荐商品 “${row.productName}” 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteRecommend(row.id)
    ElMessage.success('删除成功')
    fetchRecommendListAll()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
    }
  }
}

const handleClearCache = async () => {
  try {
    await clearRecommendCache()
    ElMessage.success('推荐商品缓存已清除')
  } catch (err) {
    console.error('清除缓存失败:', err)
  }
}

const handlePageChange = (page) => {
  queryParams.pageNum = page
  fetchRecommendList()
}

onMounted(() => {
  fetchRecommendListAll()
})
</script>

<template>
  <div class="recommend-container">
    <div class="breadcrumb">首页管理 / 推荐商品管理</div>

    <el-card class="search-card">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="商品名称">
          <el-input v-model="queryParams.productName" placeholder="请输入商品名称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="推荐类型">
          <el-select v-model="queryParams.recommendType" placeholder="请选择" clearable style="width: 160px">
            <el-option v-for="item in recommendTypes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="请选择" clearable style="width: 160px">
            <el-option label="禁用" :value="0" />
            <el-option label="启用" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="info" @click="fetchRecommendListAll">全部推荐</el-button>
          <el-button type="success" @click="handleAdd">新增推荐商品</el-button>
          <el-button type="warning" @click="handleClearCache">清除缓存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="recommendList" row-key="id" border>
        <el-table-column prop="id" label="ID" width="90" align="center" />
        <el-table-column prop="productId" label="商品ID" width="100" align="center" />
        <el-table-column prop="productName" label="商品名称" min-width="200" />
        <el-table-column label="商品图片" width="180" align="center">
          <template #default="{ row }">
            <el-image style="width: 120px; height: 60px" :src="row.productImage" fit="cover" />
          </template>
        </el-table-column>
        <el-table-column prop="price" label="售价" width="120" align="center" />
        <el-table-column prop="originalPrice" label="原价" width="120" align="center" />
        <el-table-column prop="recommendType" label="推荐类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">
              {{ recommendTypes.find(item => item.value === row.recommendType)?.label || '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" effect="dark">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="720px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="选择商品" prop="productId">
          <el-select
            v-model="selectedProductId"
            filterable
            clearable
            placeholder="请选择商品"
            style="width: 100%"
            :loading="productSelectLoading"
            @change="handleSelectProduct"
          >
            <el-option
              v-for="item in selectableProducts"
              :key="item.productId"
              :label="item._label"
              :value="item.productId"
            />
          </el-select>
          <div class="selected-product-tip">从现有商品列表中选择后，商品信息会自动填充。</div>
        </el-form-item>
        <el-form-item label="商品ID">
          <el-input-number v-model="form.productId" :min="0" style="width: 100%" disabled />
        </el-form-item>
        <el-form-item label="商品名称" prop="productName">
          <el-input v-model="form.productName" placeholder="选择商品后自动填充" readonly />
        </el-form-item>
        <el-form-item label="商品图片" prop="productImage">
          <div v-if="form.productImage" class="image-preview">
            <el-image :src="form.productImage" style="width: 180px; height: 90px; margin-top: 10px" fit="cover" />
          </div>
          <div v-else class="empty-image-tip">选择商品后自动填充图片</div>
        </el-form-item>
        <el-form-item label="售价" prop="price">
          <el-input-number v-model="form.price" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="原价" prop="originalPrice">
          <el-input-number v-model="form.originalPrice" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="推荐类型" prop="recommendType">
          <el-select v-model="form.recommendType" placeholder="请选择">
            <el-option v-for="item in recommendTypes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.recommend-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.breadcrumb {
  font-size: 14px;
  color: #909399;
}
.table-card {
  padding: 20px;
}
.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}
.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.image-preview {
  margin-top: 10px;
}
.selected-product-tip {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
}
.empty-image-tip {
  color: #909399;
  font-size: 13px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
