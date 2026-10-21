<script setup>
// 首页概览逻辑
</script>

<template>
  <div class="home-content">
    <div class="welcome-card">
      <h1>欢迎使用 EasyMall 管理系统</h1>
      <p>这里是您的首页概览。</p>
      <div class="stats-grid">
        <div class="stat-item">
          <h3>今日订单</h3>
          <div class="value">128</div>
        </div>
        <div class="stat-item">
          <h3>今日销售额</h3>
          <div class="value">¥12,840</div>
        </div>
        <div class="stat-item">
          <h3>新增用户</h3>
          <div class="value">45</div>
        </div>
        <div class="stat-item">
          <h3>库存预警</h3>
          <div class="value warning">12</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-card {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

h1 {
  margin-top: 0;
  color: #303133;
}

p {
  color: #909399;
  margin-bottom: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-item {
  padding: 20px;
  background: #f9fafc;
  border-radius: 8px;
  text-align: center;
}

.stat-item h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #606266;
}

.stat-item .value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-item .value.warning {
  color: #f56c6c;
}
</style>
