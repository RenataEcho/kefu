<template>
  <n-drawer
    :show="show"
    :width="480"
    placement="right"
    @update:show="(v: boolean) => emit('update:show', v)"
  >
    <n-drawer-content closable title="付费记录详情" :native-scrollbar="false">
      <n-spin :show="loading">
        <div v-if="detail" class="detail-wrap">
          <dl class="kv">
            <dt>右豹编码</dt>
            <dd class="mono">{{ detail.rightLeopardCode }}</dd>
            <dt>飞书昵称</dt>
            <dd>{{ detail.larkNickname }}</dd>
            <dt>付费金额</dt>
            <dd v-if="hasFieldPermission('paymentAmount')">
              ¥{{ detail.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </dd>
            <dd v-else class="muted">无权限查看</dd>
            <dt>付费时间</dt>
            <dd>{{ formatDate(detail.paymentTime) }}</dd>
            <dt>付费对接人</dt>
            <dd v-if="hasFieldPermission('paymentContact')">
              {{ detail.contactPerson || '—' }}
            </dd>
            <dd v-else class="muted">无权限查看</dd>
            <dt>录入人</dt>
            <dd>{{ detail.createdByName }}</dd>
            <dt>录入时间</dt>
            <dd>{{ formatDate(detail.createdAt) }}</dd>
          </dl>
          <div class="audit-block">
            <div class="audit-label">操作日志</div>
            <AuditLogTable
              table-name="payment_records"
              :record-id="detail.id"
            />
          </div>
        </div>
      </n-spin>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NDrawer, NDrawerContent, NSpin } from 'naive-ui'
import { usePermission } from '@/composables/usePermission'
import { fetchPayment } from '@/api/payments'
import type { PaymentRecordItem } from '@/types/payment'
import { formatDate } from '@/utils/date'
import AuditLogTable from '@/components/common/AuditLogTable.vue'

const props = defineProps<{
  show: boolean
  paymentId: number | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const { hasFieldPermission } = usePermission()

const loading = ref(false)
const detail = ref<PaymentRecordItem | null>(null)

watch(
  () => [props.show, props.paymentId] as const,
  async ([open, id]) => {
    if (!open || id == null) {
      detail.value = null
      return
    }
    loading.value = true
    try {
      detail.value = await fetchPayment(id)
    } catch {
      detail.value = null
    } finally {
      loading.value = false
    }
  },
)
</script>

<style scoped>
.detail-wrap {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.kv {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 8px 16px;
  margin: 0;
  font-size: 14px;
}

.kv dt {
  margin: 0;
  color: var(--text-muted);
  font-weight: 500;
}

.kv dd {
  margin: 0;
  color: var(--text-primary);
}

.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.muted {
  color: var(--text-muted);
}

.audit-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.audit-block {
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}
</style>
