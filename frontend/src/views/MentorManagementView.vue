<template>
  <div class="mentor-mgmt-view">
    <n-tabs v-model:value="activeTab" type="line" animated class="mgmt-tabs">
      <n-tab-pane name="mentors" tab="导师列表">
        <MentorList />
      </n-tab-pane>
      <n-tab-pane name="types" tab="导师类型">
        <MentorTypeList />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NTabs, NTabPane } from 'naive-ui'
import MentorList from '@/views/organization/MentorList.vue'
import MentorTypeList from '@/views/organization/MentorTypeList.vue'

const activeTab = ref('mentors')
</script>

<style scoped>
.mentor-mgmt-view {
  min-height: 100%;
}

.mgmt-tabs :deep(.n-tabs-nav) {
  padding: 0 24px;
  margin-bottom: 0;
}

.mgmt-tabs :deep(.n-tab-pane) {
  padding-top: 0;
}
</style>
