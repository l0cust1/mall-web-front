<script setup>
import { ref, onMounted, reactive } from 'vue'
import { loadPropertyTree, updateProperty, addProperty, deleteProperty } from '@/api/sysProductProperty'
import { Plus, Close, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const propertyList = ref([])
const total = ref(0)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 100 // 加载更多以展示完整树
})

// 弹窗相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const form = reactive({
  propertyId: '',
  categoryId: '',
  propertyName: '',
  coverType: 0 // 0-不包含，1-包含
})

const rules = {
  propertyName: [
    { required: true, message: '请输入SKU属性名称', trigger: 'blur' },
    { max: 30, message: '长度在 30 个字符以内', trigger: 'blur' }
  ],
  coverType: [{ required: true, message: '请选择是否包含图片', trigger: 'change' }]
}

const fetchPropertyTree = async () => {
  loading.value = true
  try {
    const data = await loadPropertyTree(queryParams)
    propertyList.value = data.records
    total.value = data.total
  } catch (err) {
    console.error('获取属性树失败:', err)
  } finally {
    loading.value = false
  }
}

const handleAdd = (category) => {
  isEdit.value = false
  form.propertyId = ''
  form.categoryId = category.categoryId
  form.propertyName = ''
  form.coverType = 0
  dialogVisible.value = true
}

const handleEdit = (property) => {
  isEdit.value = true
  form.propertyId = property.propertyId
  form.categoryId = property.categoryId
  form.propertyName = property.propertyName
  form.coverType = property.coverType || 0
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEdit.value) {
          await updateProperty(form.propertyId, {
            propertyId: form.propertyId,
            propertyName: form.propertyName,
            coverType: form.coverType
          })
          ElMessage.success('修改成功')
        } else {
          await addProperty({
            categoryId: form.categoryId,
            propertyName: form.propertyName,
            coverType: form.coverType
          })
          ElMessage.success('新增成功')
        }
        dialogVisible.value = false
        fetchPropertyTree()
      } catch (err) {
        console.error(isEdit.value ? '修改失败:' : '新增失败:', err)
      }
    }
  })
}

const handleDelete = async (property) => {
  try {
    await ElMessageBox.confirm(`确认要删除属性 "${property.propertyName}" 吗？`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteProperty(property.propertyId)
    ElMessage.success('删除成功')
    fetchPropertyTree()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
    }
  }
}

onMounted(() => {
  fetchPropertyTree()
})
</script>

<template>
  <div class="property-container">
    <div class="breadcrumb">商品 / 商品属性</div>

    <div v-loading="loading" class="property-list">
      <!-- Level 1: Category Groups -->
      <div v-for="level1 in propertyList" :key="level1.nodeId" class="category-group">
        <div class="group-header">
          <el-icon class="arrow-icon"><ArrowDown /></el-icon>
          <span class="group-title">{{ level1.propertyName }}</span>
        </div>

        <!-- Level 2: Sub-categories -->
        <div v-for="level2 in level1.children" :key="level2.nodeId" class="property-row">
          <div class="row-left">
            <span class="sub-title">{{ level2.propertyName }}</span>
          </div>

          <div class="row-center">
            <!-- Level 3: Properties as Tags -->
            <div class="tag-container">
              <el-tag
                v-for="level3 in level2.children"
                :key="level3.propertyId"
                class="property-tag"
                closable
                round
                effect="plain"
                @click="handleEdit(level3)"
                @close.stop="handleDelete(level3)"
              >
                {{ level3.propertyName }}
                <template v-if="level3.coverType === 1">(含图)</template>
              </el-tag>
            </div>
          </div>

          <div class="row-right">
            <el-tooltip content="新增SKU属性" placement="top">
              <el-button class="add-btn" circle size="small" @click="handleAdd(level2)">
                <el-icon><Plus /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑属性弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑属性' : '新增属性'"
      width="600px"
      class="edit-dialog"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="SKU属性名称" prop="propertyName">
          <el-input
            v-model="form.propertyName"
            placeholder="请输入SKU属性名称，比如颜色"
            maxlength="30"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="是否包含图片" prop="coverType">
          <el-radio-group v-model="form.coverType">
            <el-radio :label="1">包含</el-radio>
            <el-radio :label="0">不包含</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* ... 保持原有样式不变 ... */
.property-container {
  padding: 20px;
  background-color: #fff;
  min-height: 100%;
}

.breadcrumb {
  font-size: 13px;
  color: #909399;
  margin-bottom: 30px;
}

.property-list {
  max-width: 1000px;
}

.category-group {
  margin-bottom: 25px;
}

.group-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding-left: 5px;
}

.arrow-icon {
  font-size: 14px;
  color: #c0c4cc;
  margin-right: 8px;
}

.group-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.property-row {
  display: flex;
  align-items: center;
  padding: 12px 0 12px 40px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.property-row:hover {
  background-color: #f5f7fa;
}

.row-left {
  width: 150px;
  flex-shrink: 0;
}

.sub-title {
  font-size: 14px;
  color: #606266;
}

.row-center {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  padding: 0 20px;
}

.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.property-tag {
  background-color: #ecf5ff;
  border-color: #d9ecff;
  color: #409eff;
  height: 28px;
  padding: 0 12px;
  cursor: pointer;
}

:deep(.el-tag .el-tag__close) {
  color: #409eff;
}

:deep(.el-tag .el-tag__close:hover) {
  background-color: #409eff;
  color: #fff;
}

.row-right {
  width: 100px;
  display: flex;
  justify-content: flex-end;
  padding-right: 20px;
}

.add-btn {
  color: #909399;
  border-color: #dcdfe6;
}

.add-btn:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background-color: #ecf5ff;
}

/* 弹窗样式调整 */
:deep(.edit-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.edit-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 500;
}

:deep(.edit-dialog .el-dialog__body) {
  padding: 30px 20px;
}

.dialog-footer {
  text-align: right;
}

/* 必填星号颜色 */
:deep(.el-form-item.is-required:not(.is-no-asterisk) > .el-form-item__label:before) {
  color: #f56c6c;
}
</style>
