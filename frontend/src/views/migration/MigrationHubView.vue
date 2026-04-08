<template>
  <div class="migration-hub">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">数据迁移</h2>
        <span class="page-desc">历史用户主档与付费入库、补校验与迁移验证报告（纯前端 Mock）</span>
      </div>
    </div>

    <n-alert type="info" class="hub-alert" :bordered="false">
      建议顺序：① 完成「用户主档」历史迁移 → ② 导入「历史付费记录」→ ③ 启动批量补校验并在此查看验证报告与无效记录处理。
    </n-alert>

    <n-tabs v-model:value="activeTab" type="line" class="hub-tabs">
      <n-tab-pane
        v-if="canUserMigration"
        name="users"
        tab="用户主档"
        display-directive="show:lazy"
      >
        <UserMigrationImportTab />
      </n-tab-pane>
      <n-tab-pane
        v-if="canPaymentMigration"
        name="payments"
        tab="付费记录"
        display-directive="show:lazy"
      >
        <MigrationPaymentImportTab />
      </n-tab-pane>
      <n-tab-pane
        v-if="canReverifyPanel"
        name="report"
        tab="验证报告"
        display-directive="show:lazy"
      >
        <MigrationReverifyTab />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NAlert, NTabs, NTabPane } from 'naive-ui'
import { usePermission } from '@/composables/usePermission'
import UserMigrationImportTab from '@/views/users/UserMigrationImportTab.vue'
import MigrationPaymentImportTab from './MigrationPaymentImportTab.vue'
import MigrationReverifyTab from './MigrationReverifyTab.vue'

const { hasOperationPermission } = usePermission()

const canUserMigration = computed(() => hasOperationPermission('users:migration:import'))
const canPaymentMigration = computed(() => hasOperationPermission('payments:migration:import'))
const canReverifyPanel = computed(
  () => hasOperationPermission('migration:reverify') || hasOperationPermission('users:migration:import'),
)

const activeTab = ref('users')

watch(
  [canUserMigration, canPaymentMigration, canReverifyPanel],
  () => {
    const order = ['users', 'payments', 'report'] as const
    const vis = {
      users: canUserMigration.value,
      payments: canPaymentMigration.value,
      report: canReverifyPanel.value,
    }
    if (!vis[activeTab.value as keyof typeof vis]) {
      const next = order.find((k) => vis[k])
      if (next) activeTab.value = next
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.migration-hub {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.page-desc {
  font-size: 13px;
  color: var(--text-muted);
}

.hub-alert {
  border-radius: var(--radius-lg);
}

.hub-tabs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-tabs :deep(.n-tabs-nav) {
  margin-bottom: 0;
}
</style>
