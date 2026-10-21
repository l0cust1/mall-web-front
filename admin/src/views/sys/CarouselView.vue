<script setup>
import { ref, reactive, onMounted } from 'vue'
import { loadCarouselList, addCarousel, updateCarousel, deleteCarousel, clearCarouselCache } from '@/api/sysCarousel'
import { uploadFile } from '@/api/file'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const total = ref(0)
const carouselList = ref([])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  title: ''
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref(null)
const form = reactive({
  id: 0,
  title: '',
  imageUrl: '',
  linkUrl: '',
  linkType: 0,
  linkId: 0,
  sortOrder: 100,
  status: 1
})

const rules = {
  title: [{ required: true, message: '请输入轮播图标题', trigger: 'blur' }],
  imageUrl: [{ required: true, message: '请选择图片地址', trigger: 'blur' }],
  sortOrder: [{ required: true, message: '请输入排序', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const carouselTypes = [
  { label: '无', value: 0 },
  { label: '外链', value: 1 },
  { label: '商品', value: 2 },
  { label: '分类', value: 3 }
]

const fetchCarouselList = async () => {
  loading.value = true
  try {
    const data = await loadCarouselList(queryParams)
    if (data && data.records) {
      carouselList.value = data.records
      total.value = data.total || data.records.length
    } else if (Array.isArray(data)) {
      carouselList.value = data
      total.value = data.length
    } else {
      carouselList.value = []
      total.value = 0
    }
  } catch (err) {
    console.error('获取轮播图列表失败:', err)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryParams.pageNum = 1
  fetchCarouselList()
}

const handleReset = () => {
  queryParams.title = ''
  queryParams.pageNum = 1
  fetchCarouselList()
}

const resetForm = () => {
  form.id = 0
  form.title = ''
  form.imageUrl = ''
  form.linkUrl = ''
  form.linkType = 0
  form.linkId = 0
  form.sortOrder = 100
  form.status = 1
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增轮播图'
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, {
    id: row.id,
    title: row.title || '',
    imageUrl: row.imageUrl || '',
    linkUrl: row.linkUrl || '',
    linkType: row.linkType ?? 0,
    linkId: row.linkId ?? 0,
    sortOrder: row.sortOrder ?? 100,
    status: row.status ?? 1
  })
  dialogTitle.value = '编辑轮播图'
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      if (form.id && form.id !== 0) {
        await updateCarousel({ ...form })
        ElMessage.success('修改成功')
      } else {
        await addCarousel({ ...form })
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
      fetchCarouselList()
    } catch (err) {
      console.error('保存失败:', err)
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除轮播图 “${row.title}” 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteCarousel(row.id)
    ElMessage.success('删除成功')
    fetchCarouselList()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
    }
  }
}

const handleClearCache = async () => {
  try {
    await clearCarouselCache()
    ElMessage.success('轮播图缓存已清除')
  } catch (err) {
    console.error('清除缓存失败:', err)
  }
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
    ElMessage.error('图片上传失败，请重试')
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

  form.imageUrl = url
  ElMessage.success('图片上传成功，已自动填充图片地址')
}

const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isImage) {
    ElMessage.error('仅支持图片上传')
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB')
  }
  return isImage && isLt5M
}

const handlePageChange = (page) => {
  queryParams.pageNum = page
  fetchCarouselList()
}

onMounted(() => {
  fetchCarouselList()
})
</script>

<template>
  <div class="carousel-container">
    <div class="breadcrumb">首页管理 / 轮播图管理</div>

    <el-card class="search-card">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="标题">
          <el-input v-model="queryParams.title" placeholder="请输入轮播标题" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="handleAdd">新增轮播</el-button>
          <el-button type="warning" @click="handleClearCache">清除缓存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="carouselList" row-key="id" border>
        <el-table-column prop="id" label="ID" width="90" align="center" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column label="图片" width="180" align="center">
          <template #default="{ row }">
            <el-image style="width: 120px; height: 60px" :src="row.imageUrl" fit="cover" />
          </template>
        </el-table-column>
        <el-table-column prop="linkType" label="跳转类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">
              {{ carouselTypes.find(item => item.value === row.linkType)?.label || '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="linkUrl" label="链接地址" min-width="220" />
        <el-table-column prop="linkId" label="链接ID" width="120" align="center" />
        <el-table-column prop="sortOrder" label="排序" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="120" align="center">
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="620px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="110px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="上传图片" prop="imageUrl">
          <div class="upload-row">
            <el-upload
              action="#"
              :show-file-list="false"
              :http-request="handleCustomUpload"
              :on-success="handleUploadSuccess"
              :before-upload="beforeUpload"
            >
              <el-button type="primary" size="small">上传图片</el-button>
            </el-upload>
            <el-input v-model="form.imageUrl" readonly placeholder="图片上传后自动填充地址" style="flex: 1" />
          </div>
          <div v-if="form.imageUrl" class="image-preview">
            <el-image :src="form.imageUrl" style="width: 160px; height: 90px; margin-top: 10px" fit="cover" />
          </div>
        </el-form-item>
        <el-form-item label="跳转类型" prop="linkType">
          <el-select v-model="form.linkType" placeholder="请选择类型">
            <el-option v-for="item in carouselTypes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="链接地址">
          <el-input v-model="form.linkUrl" placeholder="外链地址/页面路径" />
        </el-form-item>
        <el-form-item label="链接ID">
          <el-input-number v-model="form.linkId" :min="0" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.carousel-container {
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
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
