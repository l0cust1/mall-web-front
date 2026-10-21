<script setup>
import { ref, onMounted, reactive } from 'vue'
import { loadUserList, updateUserStatus } from '@/api/sysUser'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const userList = ref([])
const total = ref(0)

// 响应后端 SysUserQuery 结构
const queryParams = reactive({
  pageNum: 1,
  pageSize: 15,
  nickname: '',
  status: ''
})

const fetchUserList = async () => {
  loading.value = true
  try {
    const data = await loadUserList(queryParams)
    // 响应后端分页数据结构
    userList.value = data.records
    total.value = data.total
    queryParams.pageNum = data.current
    queryParams.pageSize = data.size
  } catch (err) {
    console.error('获取用户列表失败:', err)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryParams.pageNum = 1
  fetchUserList()
}

const handleReset = () => {
  queryParams.nickname = ''
  queryParams.status = ''
  handleSearch()
}

const handleStatusChange = async (row) => {
  const targetStatus = row.status // 当前 switch 切换后的值
  const originalStatus = targetStatus === 1 ? 0 : 1
  const text = targetStatus === 1 ? '启用' : '禁用'
  
  try {
    await ElMessageBox.confirm(`确认要${text}用户 "${row.nickname || row.userName}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await updateUserStatus({
      userId: row.userId,
      status: targetStatus
    })
    
    ElMessage.success(`${text}成功`)
  } catch (err) {
    // 恢复原状态
    row.status = originalStatus
    if (err !== 'cancel') {
      console.error('更新状态失败:', err)
    }
  }
}

const handlePageChange = (val) => {
  queryParams.pageNum = val
  fetchUserList()
}

const handleSizeChange = (val) => {
  queryParams.pageSize = val
  fetchUserList()
}

onMounted(() => {
  fetchUserList()
})
</script>

<template>
  <div class="user-container">
    <el-card class="search-card">
      <el-form :inline="true" :model="queryParams" class="demo-form-inline">
        <el-form-item label="昵称">
          <el-input v-model="queryParams.nickname" placeholder="请输入昵称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="用户状态" clearable style="width: 120px">
            <el-option label="正常" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"><el-icon><Search /></el-icon>查询</el-button>
          <el-button @click="handleReset"><el-icon><Refresh /></el-icon>重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>系统用户列表</span>
        </div>
      </template>

      <el-table v-loading="loading" :data="userList" border style="width: 100%">
        <el-table-column prop="userId" label="用户ID" width="180" align="center" />
        <el-table-column prop="userName" label="账号" width="150" />
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-switch
              v-model="scope.row.status"
              :active-value="1"
              :inactive-value="0"
              @change="handleStatusChange(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="scope">
            <el-button size="small" type="primary" link>查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[15, 30, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.user-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-card {
  margin-bottom: 0;
}

.table-card {
  flex: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
