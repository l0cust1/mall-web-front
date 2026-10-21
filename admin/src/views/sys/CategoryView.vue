<script setup>
import { ref, onMounted, reactive } from 'vue'
import { loadCategoryTree, addCategory, updateCategory, deleteCategory, getCategoryDetail } from '@/api/sysCategory'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const categoryList = ref([])
const total = ref(0)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  categoryName: '',
  pcategoryId: '0' // 对应后端字段 pcategoryId
})

// 弹窗相关
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref(null)
const form = reactive({
  categoryId: '',
  categoryName: '',
  pcategoryId: '0', // 对应后端字段 pcategoryId
  sort: 1
})

const rules = {
  categoryName: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  sort: [{ required: true, message: '请输入排序号', trigger: 'blur' }]
}

const fetchCategoryTree = async () => {
  loading.value = true
  try {
    const data = await loadCategoryTree(queryParams)
    categoryList.value = data.records
    total.value = data.total
  } catch (err) {
    console.error('获取分类树失败:', err)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryParams.pageNum = 1
  fetchCategoryTree()
}

const handleReset = () => {
  queryParams.categoryName = ''
  queryParams.pcategoryId = '0'
  handleSearch()
}

const resetForm = () => {
  form.categoryId = ''
  form.categoryName = ''
  form.pcategoryId = '0'
  form.sort = 1
  if (formRef.value) formRef.value.resetFields()
}

const handleAdd = (row) => {
  resetForm()
  if (row) {
    form.pcategoryId = row.categoryId
    dialogTitle.value = `新增 "${row.categoryName}" 的子分类`
  } else {
    form.pcategoryId = '0'
    dialogTitle.value = '新增一级分类'
  }
  dialogVisible.value = true
}

const handleEdit = async (row) => {
  resetForm()
  dialogTitle.value = '编辑分类'
  try {
    const data = await getCategoryDetail(row.categoryId)
    Object.assign(form, data)
    dialogVisible.value = true
  } catch (err) {
    console.error('获取详情失败:', err)
  }
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (form.categoryId) {
          // 修改逻辑
          await updateCategory(form.categoryId, { ...form })
          ElMessage.success('修改成功')
        } else {
          // 新增逻辑：根据 pcategoryId 和 sort 拼接生成 categoryId
          const currentPId = String(form.pcategoryId || '0')
          const currentSort = form.sort || 0

          let generatedId = ''
          if (currentPId === '0' || !currentPId) {
            // 一级分类：sort 补齐 3 位 (如 001)
            generatedId = String(currentSort).padStart(3, '0')
          } else {
            // 二级/三级分类：pcategoryId + sort 补齐 2 位 (如 00101)
            generatedId = currentPId + String(currentSort).padStart(2, '0')
          }

          console.log('提交数据详情:', {
            pcategoryId: currentPId,
            sort: currentSort,
            generatedId: generatedId
          })

          await addCategory({
            ...form,
            categoryId: generatedId
          })
          ElMessage.success('新增成功')
        }
        dialogVisible.value = false
        fetchCategoryTree()
      } catch (err) {
        console.error('保存失败:', err)
      }
    } else {
      console.warn('表单校验未通过')
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认要删除分类 "${row.categoryName}" 及其子分类吗？`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'danger'
    })
    await deleteCategory(row.categoryId)
    ElMessage.success('删除成功')
    fetchCategoryTree()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
    }
  }
}

onMounted(() => {
  fetchCategoryTree()
})
</script>

<template>
  <div class="category-container">
    <el-card class="search-card">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="分类名称">
          <el-input v-model="queryParams.categoryName" placeholder="请输入分类名称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"><el-icon><Search /></el-icon>查询</el-button>
          <el-button @click="handleReset"><el-icon><Refresh /></el-icon>重置</el-button>
          <el-button type="success" @click="handleAdd()"><el-icon><Plus /></el-icon>新增一级分类</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="categoryList"
        row-key="categoryId"
        border
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column prop="categoryName" label="分类名称" min-width="180" />
        <el-table-column prop="categoryId" label="分类ID" width="120" align="center" />
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="级别" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.pcategoryId === '0' ? '' : 'success'">
              {{ scope.row.pcategoryId === '0' ? '父类' : '子类' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right" align="center">
          <template #default="scope">
            <el-button size="small" type="primary" link @click="handleAdd(scope.row)">
              <el-icon><Plus /></el-icon>添加子类
            </el-button>
            <el-button size="small" type="primary" link @click="handleEdit(scope.row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button size="small" type="danger" link @click="handleDelete(scope.row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="分类名称" prop="categoryName">
          <el-input v-model="form.categoryName" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="1" />
        </el-form-item>
        <el-form-item v-if="form.pcategoryId !== '0'" label="父分类ID">
          <el-input v-model="form.pcategoryId" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.category-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.table-card {
  flex: 1;
}
</style>
