<template>
  <n-modal
    :show="showBlocked"
    preset="dialog"
    type="warning"
    title="无法删除用户主档"
    :closable="true"
    positive-text="关闭"
    @update:show="emit('update:showBlocked', $event)"
    @positive-click="emit('update:showBlocked', false)"
  >
    <template #default>
      <div class="delete-modal-content">
        <p class="delete-modal-desc">
          该用户存在以下关联数据，请先解除关联后再删除：
        </p>
        <ul class="assoc-list">
          <li v-if="deleteTargetDetail && deleteTargetDetail.groupAuditsCount > 0">
            入群审核记录 <strong>{{ deleteTargetDetail.groupAuditsCount }}</strong> 条
          </li>
          <li v-if="deleteTargetDetail && deleteTargetDetail.paymentRecordsCount > 0">
            付费记录 <strong>{{ deleteTargetDetail.paymentRecordsCount }}</strong> 条
          </li>
        </ul>
      </div>
    </template>
  </n-modal>

  <n-modal
    :show="showConfirm"
    preset="dialog"
    type="error"
    title="确认删除用户主档"
    :positive-text="deleting ? '删除中…' : '确认删除'"
    negative-text="取消"
    :positive-button-props="{ type: 'error', loading: deleting, disabled: deleting }"
    :closable="!deleting"
    :mask-closable="!deleting"
    @update:show="emit('update:showConfirm', $event)"
    @positive-click="emit('confirm-delete')"
    @negative-click="emit('update:showConfirm', false)"
  >
    <template #default>
      <div class="delete-modal-content">
        <p class="delete-modal-desc">
          删除后该用户所有基础档案信息将被永久移除，此操作不可撤销。
        </p>
        <div v-if="deleteTargetUser" class="delete-target-info">
          <span class="delete-target-code">{{ deleteTargetUser.rightLeopardCode }}</span>
          <span class="delete-target-name">{{ deleteTargetUser.larkNickname }}</span>
        </div>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { NModal } from 'naive-ui'
import type { UserListItem, UserDetail } from '@/types/user'

defineProps<{
  showBlocked: boolean
  showConfirm: boolean
  deleting: boolean
  deleteTargetUser: UserListItem | null
  deleteTargetDetail: UserDetail | null
}>()

const emit = defineEmits<{
  'update:showBlocked': [value: boolean]
  'update:showConfirm': [value: boolean]
  'confirm-delete': []
}>()
</script>

<style scoped>
.delete-modal-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.delete-modal-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.assoc-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.assoc-list li {
  font-size: 14px;
  color: var(--text-primary);
}

.assoc-list li strong {
  color: #f87171;
  font-weight: 600;
}

.delete-target-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.15);
}

.delete-target-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.delete-target-name {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
