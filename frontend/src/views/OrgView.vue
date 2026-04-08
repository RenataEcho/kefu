<template>
  <div class="view-placeholder">
    <div class="placeholder-content">
      <div class="placeholder-icon-wrap">
        <svg width="24" height="24" fill="var(--text-muted)" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"/></svg>
      </div>
      <div class="placeholder-title">组织管理</div>
      <div class="placeholder-desc">此页面将在后续步骤中完善</div>
    </div>
  </div>
</template>

<script setup lang="ts" />

<style scoped>
.view-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
  flex-direction: column;
  gap: 16px;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.placeholder-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--card-inner-bg);
  border: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.placeholder-desc {
  font-size: 13px;
  color: var(--text-muted);
}
</style>
