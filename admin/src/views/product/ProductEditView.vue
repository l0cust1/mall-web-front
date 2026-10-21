<script setup>
import { ref, onMounted, reactive, watch, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { publishProduct, getProductDetail } from '@/api/sysProduct'
import { loadCategoryTree } from '@/api/sysCategory'
import { loadPropertyTree } from '@/api/sysProductProperty'
import { uploadFile, deleteFile } from '@/api/file'
import { ElMessage } from 'element-plus'
import {
  Plus,
  Delete,
  Back,
  Close,
  Picture,
  ArrowDown,
  RefreshLeft,
  RefreshRight
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const categories = ref([])
const productId = route.params.id
const activeTab = ref('basic')
const isInitialLoad = ref(false)

const form = reactive({
  productId: productId || '',
  productName: '',
  productDesc: '',
  cover: '',
  coverList: [], // 用于前端显示和管理的多图列表
  categoryId: '',
  pCategoryId: '',
  status: 1,
  commendType: 0,
  remark: '',
  properties: [], // { propertyName, propertyValues: [{ propertyValue, propertyRemark, sort }] }
  skus: [] // { propertyValueIds, price, stock, sort, [_values] }
})

const rules = {
  productName: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

// 获取分类树
const fetchCategories = async () => {
  try {
    const data = await loadCategoryTree({ pageNum: 1, pageSize: 100 })
    categories.value = data.records
  } catch (err) {
    console.error('获取分类失败:', err)
  }
}

const handleCategoryChange = async (val) => {
  // 1. 设置父分类ID逻辑
  for (const cat of categories.value) {
    if (cat.categoryId === val) {
      form.pCategoryId = '0'
      break
    }
    if (cat.children) {
      const sub = cat.children.find(s => s.categoryId === val)
      if (sub) {
        form.pCategoryId = cat.categoryId
        break
      }
    }
  }

  // 2. 自动加载该分类下的属性规格
  if (val) {
    try {
      const data = await loadPropertyTree({ pageNum: 1, pageSize: 1000 })
      const propertyTree = data.records

      // 查找当前选中分类下的属性
      let targetCategory = null
      for (const level1 of propertyTree) {
        if (level1.nodeId === val) {
          targetCategory = level1
          break
        }
        if (level1.children) {
          targetCategory = level1.children.find(level2 => level2.nodeId === val)
          if (targetCategory) break
        }
      }

      if (targetCategory && targetCategory.children && targetCategory.children.length > 0) {
        // 将分类属性转换为商品属性结构
        // 只有当当前属性为空时才自动填充，避免覆盖用户已填写的
        if (form.properties.length === 0) {
          form.properties = targetCategory.children.map(prop => ({
            propertyName: prop.propertyName,
            propertyValues: [{ propertyValue: '', propertyRemark: '', sort: 1 }]
          }))
          ElMessage.success(`已自动加载 "${targetCategory.propertyName}" 的 ${targetCategory.children.length} 个规格属性`)
        }
      }
    } catch (err) {
      console.error('加载分类属性失败:', err)
    }
  }
}

// --- 图片上传 ---

const handleCustomUpload = async (options) => {
  const { file, onSuccess, onError } = options

  // 1. 立即实现本地预览，此时 form.cover 是一个 blob: 开头的本地地址
  const previewUrl = URL.createObjectURL(file)
  form.cover = previewUrl

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await uploadFile(formData)
    // 调用 onSuccess 会触发 handleUploadSuccess
    onSuccess(res)
  } catch (err) {
    // 上传失败时不立即清除 form.cover，保留预览图让用户知道哪张失败了，或者由用户决定是否清除
    console.error('图片上传失败:', err)
    ElMessage.error('图片上传到服务器失败，请重试')
    onError(err)
  }
}

const handleUploadSuccess = (res) => {
  console.log('图片上传原始返回:', res)
  let url = ''

  if (res && typeof res === 'object') {
    if (res.fileName) {
      url = res.fileName
    } else if (res.url) {
      url = res.url
    }
  } else if (typeof res === 'string') {
    url = res
  }

  if (url) {
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

    if (!url.startsWith('blob:')) {
      if (!url.startsWith('/')) {
        url = '/' + url
      }
      if (!url.startsWith('/api')) {
        url = '/api' + url
      }
    }

    // 多图处理：添加到列表
    form.coverList.push(url)
    ElMessage.success('图片上传成功')
  } else {
    console.error('解析失败，后端返回结构不匹配:', res)
    // 已根据用户要求去掉提示语
  }
}

const beforeUpload = (file) => {
  const isJPGorPNG = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPGorPNG) {
    ElMessage.error('上传图片只能是 JPG/PNG/WebP 格式!')
  }
  if (!isLt2M) {
    ElMessage.error('上传图片大小不能超过 2MB!')
  }
  return isJPGorPNG && isLt2M
}

// --- SKU 逻辑 ---

// 笛卡尔积算法
const cartesianProduct = (arrays) => {
  return arrays.reduce((a, b) => {
    return a.flatMap(d => b.map(e => [d, e].flat()))
  }, [[]])
}

// 自动生成 SKU
const generateSkus = () => {
  // 只有当属性名和至少一个属性值都不为空时，才参与组合
  const validProps = form.properties.filter(p => p.propertyName && p.propertyValues.some(v => v.propertyValue))

  if (validProps.length === 0) {
    form.skus = []
    return
  }

  const propValuesArray = validProps.map(p =>
    p.propertyValues
      .filter(v => v.propertyValue)
      .map(v => ({
        propertyName: p.propertyName,
        propertyValue: v.propertyValue,
        id: v.propertyValue
      }))
  )

  const product = cartesianProduct(propValuesArray)
  const oldSkusMap = new Map(form.skus.map(s => [s.propertyValueIds, s]))

  form.skus = product.map(items => {
    const combination = Array.isArray(items) ? items : [items]
    const ids = combination.map(c => c.id).join(',')
    const oldSku = oldSkusMap.get(ids)

    return {
      propertyValueIds: ids,
      price: oldSku ? oldSku.price : 150.00, // 参考图默认值
      stock: oldSku ? oldSku.stock : 100,    // 参考图默认值
      sort: 1,
      _values: combination.map(c => c.propertyValue)
    }
  })
}

// 获取参与组合的有效属性列（用于表头）
const validProperties = computed(() => {
  return form.properties.filter(p => p.propertyName && p.propertyValues.some(v => v.propertyValue))
})

// 监听属性变化，自动更新 SKU
watch(() => form.properties, () => {
  if (isInitialLoad.value) return
  generateSkus()
}, { deep: true, immediate: true })

const fetchProductDetail = async () => {
  if (!productId) return
  loading.value = true
  isInitialLoad.value = true
  try {
    const data = await getProductDetail(productId)
    console.log('加载商品详情:', data)

    // 基础信息填充
    form.productId = data.productId
    form.productName = data.productName
    form.productDesc = data.productDesc
    form.cover = data.cover || data.productCover
    // 加载详情时，将逗号分隔的 cover 字符串转为数组
    if (form.cover) {
      form.coverList = form.cover.split(',').filter(item => item)
    } else {
      form.coverList = []
    }
    form.categoryId = data.categoryId
    form.pCategoryId = data.pCategoryId
    form.status = data.status
    form.commendType = data.commendType
    form.remark = data.remark

    // 属性和 SKU 填充
    if (data.properties && data.properties.length > 0) {
      form.properties = data.properties
    }

    if (data.skus && data.skus.length > 0) {
      // 处理 SKU 的显示辅助字段 _values
      form.skus = data.skus.map(sku => {
        if (!sku._values && sku.propertyValueIds) {
          sku._values = sku.propertyValueIds.split(',')
        }
        return sku
      })
    }

    // 等待一个 tick 确保 watch 不会被触发
    await nextTick()
    isInitialLoad.value = false
  } catch (err) {
    console.error('获取商品详情失败:', err)
    ElMessage.error('获取商品详情失败')
    isInitialLoad.value = false
  } finally {
    loading.value = false
  }
}

const addProperty = () => {
  form.properties.push({
    propertyName: '',
    propertyValues: [{ propertyValue: '', propertyRemark: '', sort: 1 }]
  })
}

const removeProperty = (index) => {
  form.properties.splice(index, 1)
}

const addPropertyValue = (pIdx) => {
  form.properties[pIdx].propertyValues.push({
    propertyValue: '',
    propertyRemark: '',
    sort: form.properties[pIdx].propertyValues.length + 1
  })
}

const removePropertyValue = (pIdx, vIdx) => {
  form.properties[pIdx].propertyValues.splice(vIdx, 1)
}

const handleRemoveImage = async (index) => {
  const targetImageUrl = form.coverList[index]
  if (!targetImageUrl) return

  try {
    let fileName = targetImageUrl
    if (fileName.includes('/api/')) {
      fileName = fileName.split('/api/')[1]
    } else if (fileName.startsWith('/')) {
      fileName = fileName.substring(1)
    }

    await deleteFile({ fileName })
    form.coverList.splice(index, 1)
    ElMessage.success('图片删除成功')
  } catch (err) {
    console.error('删除图片失败:', err)
    form.coverList.splice(index, 1)
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        // 提交前，将数组转回逗号分隔的字符串
        form.cover = form.coverList.join(',')
        await publishProduct(form)
        ElMessage.success(productId ? '修改成功' : '发布成功')
        router.push('/product/list')
      } catch (err) {
        console.error('发布失败:', err)
      } finally {
        loading.value = false
      }
    }
  })
}

onMounted(() => {
  fetchCategories()
  if (productId) {
    fetchProductDetail()
  }
})
</script>

<template>
  <div class="product-publish-container">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="main-form">
      <!-- Top Bar -->
      <div class="top-bar">
        <div class="top-bar-left">
          <el-button link :icon="Back" native-type="button" @click="router.push('/product/list')">返回列表</el-button>
          <span style="margin: 0 15px; color: #dcdfe6">|</span>
          <span style="font-weight: bold; font-size: 16px">{{ productId ? '编辑商品' : '发布商品' }}</span>
        </div>
        <div class="nav-tabs">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="1. 基础信息" name="basic" />
            <el-tab-pane label="2. 商品规格" name="sku" />
          </el-tabs>
        </div>
        <div class="top-bar-right">
          <el-button native-type="button" @click="router.push('/product/list')">取消</el-button>
          <el-button type="primary" :loading="loading" native-type="button" @click="handleSubmit">保存商品</el-button>
        </div>
      </div>
      <!-- 基础信息 Tab -->
      <div v-show="activeTab === 'basic'" class="tab-content">
        <div class="form-item-group">
          <label class="custom-label">商品图片 (第一张为主图，最多5张)</label>
          <div class="image-upload-list">
            <!-- 已上传图片预览列表 -->
            <div v-for="(img, index) in form.coverList" :key="index" class="image-preview-wrapper">
              <img :src="img" class="cover-img" />
              <div class="image-actions">
                <el-icon class="delete-icon" @click="handleRemoveImage(index)"><Delete /></el-icon>
              </div>
              <div v-if="index === 0" class="main-tag">主图</div>
            </div>

            <!-- 上传按钮：只有当图片数量小于5时显示 -->
            <el-upload
              v-if="form.coverList.length < 5"
              class="cover-uploader"
              action="#"
              :show-file-list="false"
              :http-request="handleCustomUpload"
              :on-success="handleUploadSuccess"
              :before-upload="beforeUpload"
            >
              <div class="image-placeholder">
                <el-icon><Plus /></el-icon>
                <div class="upload-text">上传</div>
              </div>
            </el-upload>
          </div>
          <div class="tip">建议尺寸: 800*800，可上传多张图片展示商品细节</div>
        </div>

        <el-form-item label="商品名称" prop="productName">
          <el-input v-model="form.productName" placeholder="请输入商品名称" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择" @change="handleCategoryChange" style="width: 400px">
            <el-option-group v-for="group in categories" :key="group.categoryId" :label="group.categoryName">
              <el-option v-for="item in group.children" :key="item.categoryId" :label="item.categoryName" :value="item.categoryId" />
            </el-option-group>
          </el-select>
        </el-form-item>

        <el-form-item label="商品描述">
          <div class="editor-placeholder">
            <!-- 模拟富文本编辑器样式 -->
            <div class="editor-toolbar">
              <el-icon><RefreshLeft /></el-icon>
              <el-icon><RefreshRight /></el-icon>
              <span class="separator">|</span>
              <span class="bold">B</span>
              <span class="italic">I</span>
              <span class="underline">U</span>
            </div>
            <el-input
              v-model="form.productDesc"
              type="textarea"
              :rows="15"
              placeholder="请输入商品详细描述..."
              resize="none"
            />
          </div>
        </el-form-item>
      </div>

      <!-- SKU信息 Tab -->
      <div v-show="activeTab === 'sku'" class="tab-content sku-tab">
        <div class="sku-layout">
          <!-- Left: Properties -->
          <div class="sku-left">
            <div v-for="(prop, pIdx) in form.properties" :key="pIdx" class="prop-card">
              <div class="prop-card-header">
                <el-input v-model="prop.propertyName" placeholder="属性名称" class="prop-name-input" />
                <div class="prop-actions">
                  <el-button link :icon="Plus" native-type="button" @click="addPropertyValue(pIdx)" />
                  <el-button link :icon="Delete" native-type="button" @click="removeProperty(pIdx)" />
                </div>
              </div>

              <div class="prop-values-list">
                <div v-for="(val, vIdx) in prop.propertyValues" :key="vIdx" class="value-row">
                  <span class="idx">{{ vIdx + 1 }}.</span>
                  <div class="img-box"><el-icon><Picture /></el-icon></div>
                  <el-input v-model="val.propertyValue" placeholder="名称" class="val-input" />
                  <el-input v-model="val.propertyRemark" placeholder="备注 (可选)" class="remark-input" />
                  <el-button link :icon="Delete" native-type="button" @click="removePropertyValue(pIdx, vIdx)" />
                </div>
              </div>
            </div>

            <el-button type="primary" plain native-type="button" @click="addProperty" style="width: 100%; margin-top: 10px">
              添加属性 (如: 颜色, 尺码)
            </el-button>
          </div>

          <!-- Right: SKU Table -->
          <div class="sku-right">
            <el-table :data="form.skus" style="width: 100%" class="sku-table">
              <el-table-column label="#" type="index" width="50" align="center" />

              <!-- 动态生成属性列：只展示有值的属性 -->
              <el-table-column
                v-for="(prop, index) in validProperties"
                :key="index"
                :label="prop.propertyName"
              >
                <template #default="scope">
                  {{ scope.row._values[index] }}
                </template>
              </el-table-column>

              <el-table-column label="价格" width="160">
                <template #default="scope">
                  <el-input-number
                    v-model="scope.row.price"
                    :precision="2"
                    :step="1"
                    size="small"
                    class="custom-number-input"
                  />
                </template>
              </el-table-column>

              <el-table-column label="库存" width="140">
                <template #default="scope">
                  <el-input-number
                    v-model="scope.row.stock"
                    :min="0"
                    size="small"
                    class="custom-number-input"
                  />
                </template>
              </el-table-column>

              <el-table-column label="操作" width="60" align="center">
                <template #default="scope">
                  <el-button link :icon="Delete" native-type="button" @click="form.skus.splice(scope.$index, 1)" />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.product-publish-container {
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid #e4e7ed;
  height: 50px;
  flex-shrink: 0;
}

.nav-tabs {
  height: 50px;
}
:deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
}
:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.main-form {
  flex: 1;
  padding: 20px;
}

.tab-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* 基础信息样式 */
.image-upload-list {
  display: flex;
  gap: 15px;
  margin: 10px 0;
}
.image-preview-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
}
.image-preview-wrapper:hover .image-actions {
  opacity: 1;
}
.image-actions {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s;
  border-radius: 4px;
}
.delete-icon {
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}
.delete-icon:hover {
  color: #f56c6c;
}
.main-tag {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(103, 194, 58, 0.8);
  color: #fff;
  font-size: 12px;
  text-align: center;
  padding: 2px 0;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}
.upload-text {
  font-size: 12px;
  margin-top: 4px;
}
.cover-uploader {
  width: 100px;
  height: 100px;
}
.cover-img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
}
.image-placeholder {
  width: 100px;
  height: 100px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #c0c4cc;
  cursor: pointer;
}
.image-placeholder.disabled {
  cursor: not-allowed;
  background-color: #f5f7fa;
}
.image-placeholder:hover {
  border-color: #409eff;
}
.custom-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  display: block;
}
.tip {
  font-size: 12px;
  color: #909399;
}

.editor-placeholder {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
.editor-toolbar {
  padding: 8px 15px;
  border-bottom: 1px solid #dcdfe6;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  gap: 15px;
  color: #606266;
}
.separator { color: #dcdfe6; }
.bold { font-weight: bold; }
.italic { font-style: italic; }
.underline { text-decoration: underline; }

/* SKU 布局样式 */
.sku-tab {
  max-width: 100%;
}
.sku-layout {
  display: flex;
  gap: 0;
  height: 600px; /* 固定高度或者让其自适应内容 */
  border-top: 1px solid #f0f0f0;
}
.sku-left {
  width: 350px;
  flex-shrink: 0;
  border-right: 1px solid #f0f0f0;
  padding: 20px;
  overflow-y: auto;
}
.sku-right {
  flex: 1;
  overflow-y: auto;
  padding: 10px 20px;
}

/* 左侧卡片样式还原 */
.prop-card {
  border: none;
  margin-bottom: 30px;
  background-color: transparent;
}
.prop-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 10px 0;
  border-bottom: none;
  background-color: transparent;
}
.prop-name-input {
  font-weight: bold;
  font-size: 14px;
}
:deep(.prop-name-input .el-input__wrapper) {
  padding: 0;
  background-color: transparent;
  box-shadow: none !important;
}

.prop-values-list {
  padding: 0;
}
.value-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.idx { width: 15px; font-size: 13px; color: #999; }
.img-box {
  width: 36px;
  height: 36px;
  border: 1px solid #eee;
  background-color: #f9f9f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #ddd;
  border-radius: 4px;
  cursor: pointer;
}
.val-input { width: 120px; }
.remark-input { flex: 1; }
:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #eee inset !important;
}

/* 右侧表格样式还原 */
:deep(.sku-table .el-table__header th) {
  background-color: #fcfcfc !important;
  color: #666;
  font-weight: normal;
  border-bottom: 1px solid #f0f0f0;
}
:deep(.sku-table .el-table__row td) {
  padding: 12px 0;
  border-bottom: 1px solid #f9f9f9;
}

/* 自定义数字输入框样式 */
.custom-number-input {
  width: 110px;
}
:deep(.custom-number-input .el-input-number__decrease),
:deep(.custom-number-input .el-input-number__increase) {
  background-color: #f5f5f5;
  border: 1px solid #eee;
  width: 28px;
}
:deep(.custom-number-input .el-input__wrapper) {
  padding: 0 30px !important;
}
</style>
