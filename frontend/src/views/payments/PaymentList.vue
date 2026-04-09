<template>
  <div class="payment-list-page">
    <PaymentDetailDrawer
      v-model:show="showDetailDrawer"
      :payment-id="detailPaymentId"
    />

    <n-modal
      v-model:show="showCreateModal"
      preset="card"
      title="新增付费记录"
      style="width: 440px"
      :mask-closable="false"
      @after-leave="resetCreateForm"
    >
      <n-form label-placement="top" class="pay-form">
        <n-form-item required>
          <template #label>
            <FormFieldHelpLabel label="右豹编码" catalog-key="payment.form.rightLeopardCode" />
          </template>
          <n-input
            v-model:value="createForm.rightLeopardCode"
            placeholder="与主档一致"
            class="mono-input"
          />
        </n-form-item>
        <n-form-item required>
          <template #label>
            <FormFieldHelpLabel label="付费金额" catalog-key="payment.form.amount" />
          </template>
          <n-input-number
            v-model:value="createForm.amount"
            :min="0"
            :precision="2"
            :show-button="false"
            placeholder="元"
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item required>
          <template #label>
            <FormFieldHelpLabel label="付费时间" catalog-key="payment.form.paymentTime" />
          </template>
          <n-date-picker
            v-model:value="createForm.paymentTime"
            type="datetime"
            clearable
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item v-if="hasFieldPermission('paymentContact')">
          <template #label>
            <FormFieldHelpLabel label="付费对接人" catalog-key="payment.form.contactPerson" />
          </template>
          <n-select
            v-model:value="createForm.contactPerson"
            :options="paidContactSelectOptions"
            placeholder="请选择付费客服"
            clearable
            filterable
            :consistent-menu-width="false"
          />
          <p v-if="!paidContactSelectOptions.length" class="field-hint muted">
            暂无「付费客服」可选，请先在客服管理中将客服类型设为付费客服。
          </p>
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer drawer-footer-bar drawer-footer-bar--modal">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="submitCreate">确认新增</n-button>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showEditModal"
      preset="card"
      title="修改付费记录"
      style="width: 440px"
      :mask-closable="false"
    >
      <template v-if="editTarget">
        <div class="readonly-code-line mono">{{ editTarget.rightLeopardCode }}</div>
        <p class="hint">右豹编码不可修改</p>
        <n-form label-placement="top" class="pay-form">
          <n-form-item v-if="hasFieldPermission('paymentAmount')" required>
            <template #label>
              <FormFieldHelpLabel label="付费金额" catalog-key="payment.form.amount" />
            </template>
            <n-input-number
              v-model:value="editForm.amount"
              :min="0"
              :precision="2"
              :show-button="false"
              style="width: 100%"
            />
          </n-form-item>
          <n-form-item required>
            <template #label>
              <FormFieldHelpLabel label="付费时间" catalog-key="payment.form.paymentTime" />
            </template>
            <n-date-picker
              v-model:value="editForm.paymentTime"
              type="datetime"
              clearable
              style="width: 100%"
            />
          </n-form-item>
          <n-form-item v-if="hasFieldPermission('paymentContact')">
            <template #label>
              <FormFieldHelpLabel label="付费对接人" catalog-key="payment.form.contactPerson" />
            </template>
            <n-select
              v-model:value="editForm.contactPerson"
              :options="paidContactSelectOptions"
              placeholder="请选择付费客服"
              clearable
              filterable
              :consistent-menu-width="false"
            />
            <p v-if="!paidContactSelectOptions.length" class="field-hint muted">
              暂无「付费客服」可选，请先在客服管理中将客服类型设为付费客服。
            </p>
          </n-form-item>
        </n-form>
      </template>
      <template #footer>
        <div class="modal-footer drawer-footer-bar drawer-footer-bar--modal">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="submitEdit">确认修改</n-button>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showDeleteModal"
      preset="card"
      title="确认删除付费记录"
      style="width: 400px"
      :mask-closable="false"
    >
      <p class="delete-desc">
        删除后该用户将恢复为普通用户，此操作不可撤销。
      </p>
      <template #footer>
        <div class="modal-footer drawer-footer-bar drawer-footer-bar--modal">
          <n-button @click="showDeleteModal = false">取消</n-button>
          <n-button type="error" :loading="deleting" @click="confirmDelete">确认删除</n-button>
        </div>
      </template>
    </n-modal>

    <input
      ref="importFileInputRef"
      type="file"
      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
      class="sr-only"
      @change="onImportFileChange"
    />

    <div class="page-header">
      <div class="header-left">
        <div class="page-title-row">
          <h2 class="page-title">付费记录</h2>
          <PageRuleHelpLink />
        </div>
        <span class="page-desc">手动维护付费信息，与用户主档「是否付费」联动（Mock）</span>
      </div>
      <div class="header-actions">
        <n-button v-if="canImport" quaternary @click="downloadPaymentImportTemplate">
          下载模板
        </n-button>
        <n-button v-if="canImport" :loading="importSubmitting" @click="openImportPicker">
          批量导入
        </n-button>
        <n-button
          v-if="canExport && mainTab === 'records'"
          secondary
          :loading="exporting"
          @click="handleExportPayments"
        >
          <template #icon>
            <n-icon :component="DownloadOutline" />
          </template>
          导出
        </n-button>
        <n-button
          v-if="hasOperationPermission('payments:create')"
          type="primary"
          @click="showCreateModal = true"
        >
          <template #icon>
            <n-icon :component="AddOutline" />
          </template>
          新增付费记录
        </n-button>
      </div>
    </div>

    <n-tabs v-model:value="mainTab" type="line" class="pay-main-tabs">
      <n-tab-pane name="records" tab="付费记录">
    <div class="filter-bar glass">
      <div class="filter-row filter-row--labeled">
        <div class="filter-cell">
          <FilterFieldLabel label="关键词" catalog-key="payment.filter.keyword" />
          <n-input
            v-model:value="paymentStore.query.keyword"
            placeholder="飞书昵称 / 对接人 / 录入人"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <n-icon :component="SearchOutline" />
            </template>
          </n-input>
        </div>
        <div class="filter-cell">
          <FilterFieldLabel label="右豹编码" catalog-key="payment.filter.rightLeopardCode" />
          <n-input
            v-model:value="paymentStore.query.rightLeopardCode"
            placeholder="精确匹配"
            clearable
            class="mono-filter"
            style="width: 160px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </div>
        <div class="filter-cell">
          <FilterFieldLabel label="付费日期" catalog-key="payment.filter.dateRange" />
          <n-date-picker
            v-model:value="dateRange"
            type="daterange"
            clearable
            style="width: 280px"
            @update:value="onDateRangeChange"
          />
        </div>
        <div v-if="hasFieldPermission('paymentContact')" class="filter-cell">
          <FilterFieldLabel label="付费对接人" catalog-key="payment.filter.contactPerson" />
          <n-select
            v-model:value="paymentStore.query.contactPerson"
            :options="contactOptions"
            placeholder="付费对接人"
            clearable
            filterable
            style="width: 160px"
            @update:value="handleSearch"
          />
        </div>
        <div class="filter-cell">
          <FilterFieldLabel label="录入人" catalog-key="payment.filter.createdBy" />
          <n-select
            v-model:value="paymentStore.query.createdBy"
            :options="creatorOptions"
            placeholder="录入人"
            clearable
            filterable
            style="width: 140px"
            @update:value="handleSearch"
          />
        </div>
        <div class="filter-actions">
          <n-button type="primary" @click="handleSearch">查询</n-button>
          <n-button secondary @click="handleReset">重置</n-button>
        </div>
      </div>
    </div>

    <div class="table-card glass">
      <div class="table-summary">
        <span class="summary-text">共 <strong>{{ paymentStore.total }}</strong> 条付费记录</span>
      </div>
      <n-data-table
        :columns="columns"
        :data="paymentStore.items"
        :loading="paymentStore.loading"
        :bordered="false"
        :row-key="(r) => r.id"
        :scroll-x="1100"
        :row-props="paymentRowProps"
      />
      <div class="pagination-bar">
        <n-pagination
          v-model:page="paymentStore.query.page"
          v-model:page-size="paymentStore.query.pageSize"
          :item-count="paymentStore.total"
          :page-sizes="[20, 50, 100]"
          show-size-picker
          show-quick-jumper
          :page-slot="7"
          @update:page="onPageChange"
          @update:page-size="onPageSizeChange"
        />
      </div>
    </div>
      </n-tab-pane>
      <n-tab-pane v-if="canImport" name="import" tab="导入记录">
        <PaymentImportRecordsTab :active="mainTab === 'import'" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { h, computed, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NDataTable,
  NDatePicker,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NTabs,
  NTabPane,
  useMessage,
} from 'naive-ui'
import {
  AddOutline,
  CreateOutline,
  DownloadOutline,
  SearchOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { usePaymentStore } from '@/stores/payment'
import { usePermission } from '@/composables/usePermission'
import type { PaymentRecordItem, UpdatePaymentDto } from '@/types/payment'
import { formatDate } from '@/utils/date'
import { dayjs } from '@/utils/date'
import PaymentDetailDrawer from './PaymentDetailDrawer.vue'
import PaymentImportRecordsTab from './PaymentImportRecordsTab.vue'
import FilterFieldLabel from '@/components/common/FilterFieldLabel.vue'
import FormFieldHelpLabel from '@/components/common/FormFieldHelpLabel.vue'
import PageRuleHelpLink from '@/components/common/PageRuleHelpLink.vue'
import { tableColTitle } from '@/utils/columnTitleHelp'
import { fetchCsAgents } from '@/api/csAgents'
import { startPaymentsExport } from '@/api/dataExport'
import { runExportWithPolling } from '@/composables/useAsyncDataExport'
import { downloadPaymentImportTemplate, parsePaymentImportFile } from '@/utils/paymentImportExcel'

const paymentStore = usePaymentStore()
const { hasOperationPermission, hasFieldPermission } = usePermission()
const message = useMessage()

const mainTab = ref<'records' | 'import'>('records')
const importFileInputRef = ref<HTMLInputElement | null>(null)
const importSubmitting = ref(false)
const exporting = ref(false)

const canImport = computed(() => hasOperationPermission('payments:import'))
const canExport = computed(() => hasOperationPermission('payments:export'))

const showDetailDrawer = ref(false)
const detailPaymentId = ref<number | null>(null)

const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const submitting = ref(false)
const deleting = ref(false)

const dateRange = ref<[number, number] | null>(null)

const paidAgentNames = ref<string[]>([])

const createForm = reactive({
  rightLeopardCode: '',
  amount: null as number | null,
  paymentTime: Date.now() as number | null,
  contactPerson: null as string | null,
})

const editTarget = ref<PaymentRecordItem | null>(null)
const editForm = reactive({
  amount: null as number | null,
  paymentTime: null as number | null,
  contactPerson: '' as string | null,
})

const deleteTargetId = ref<number | null>(null)

const paidContactSelectOptions = computed(() => {
  const set = new Set<string>()
  paidAgentNames.value.forEach((n) => set.add(n))
  paymentStore.listMeta.contactPersons.forEach((c) => set.add(c))
  return [...set].sort().map((c) => ({ label: c, value: c }))
})

const contactOptions = computed(() =>
  paymentStore.listMeta.contactPersons.map((c) => ({ label: c, value: c })),
)

const creatorOptions = computed(() =>
  paymentStore.listMeta.creators.map((c) => ({ label: c, value: c })),
)

function onDateRangeChange(v: [number, number] | null) {
  dateRange.value = v
  if (!v || v.length < 2) {
    paymentStore.query.startDate = null
    paymentStore.query.endDate = null
  } else {
    paymentStore.query.startDate = dayjs(v[0]).format('YYYY-MM-DD')
    paymentStore.query.endDate = dayjs(v[1]).format('YYYY-MM-DD')
  }
  handleSearch()
}

function paymentRowProps(row: PaymentRecordItem) {
  return {
    style: 'cursor: pointer',
    onClick: () => openDetail(row.id),
  }
}

function openDetail(id: number) {
  detailPaymentId.value = id
  showDetailDrawer.value = true
}

const columns = computed<DataTableColumns<PaymentRecordItem>>(() => {
  const cols: DataTableColumns<PaymentRecordItem> = [
    {
      title: tableColTitle('右豹编码', 'user.col.rightLeopardCode'),
      key: 'rightLeopardCode',
      width: 150,
      resizable: true,
      minWidth: 120,
      render(row) {
        return h(
          'span',
          { class: 'mono-cell', style: { fontFamily: '"JetBrains Mono", monospace' } },
          row.rightLeopardCode,
        )
      },
    },
    {
      title: tableColTitle('飞书昵称', 'payment.col.larkNickname'),
      key: 'larkNickname',
      width: 128,
      resizable: true,
      minWidth: 100,
      ellipsis: { tooltip: true },
      render(row) {
        return h('span', { style: { fontWeight: '500' } }, row.larkNickname)
      },
    },
  ]

  if (hasFieldPermission('paymentAmount')) {
    cols.push({
      title: tableColTitle('付费金额', 'payment.col.amount'),
      key: 'amount',
      width: 120,
      resizable: true,
      minWidth: 100,
      render(row) {
        return h(
          'span',
          { style: { color: 'var(--badge-green)', fontWeight: '500' } },
          `¥${row.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        )
      },
    })
  }

  cols.push({
    title: tableColTitle('付费时间', 'payment.col.paymentTime'),
    key: 'paymentTime',
    width: 168,
    resizable: true,
    minWidth: 150,
    render(row) {
      return h('span', { style: { color: 'var(--text-secondary)', fontSize: '13px' } }, formatDate(row.paymentTime))
    },
  })

  if (hasFieldPermission('paymentContact')) {
    cols.push({
      title: tableColTitle('付费对接人', 'payment.col.contact'),
      key: 'contactPerson',
      width: 120,
      resizable: true,
      minWidth: 100,
      render(row) {
        return row.contactPerson ?? '—'
      },
    })
  }

  cols.push({
    title: tableColTitle('录入人', 'payment.col.createdByName'),
    key: 'createdByName',
    width: 100,
    resizable: true,
    minWidth: 88,
    render(row) {
      return h('span', { style: { color: 'var(--text-secondary)' } }, row.createdByName)
    },
  })

  const canUpdate = hasOperationPermission('payments:update')
  const canDelete = hasOperationPermission('payments:delete')

  if (canUpdate || canDelete) {
    cols.push({
      title: tableColTitle('操作', 'payment.col.actions'),
      key: 'actions',
      width: canDelete ? 130 : 80,
      resizable: true,
      minWidth: 72,
      fixed: 'right',
      render(row) {
        const buttons = []
        if (canUpdate) {
          buttons.push(
            h(
              NButton,
              {
                size: 'small',
                quaternary: true,
                type: 'primary',
                onClick: (e: MouseEvent) => {
                  e.stopPropagation()
                  openEdit(row)
                },
              },
              { default: () => '编辑', icon: () => h(NIcon, { component: CreateOutline }) },
            ),
          )
        }
        if (canDelete) {
          buttons.push(
            h(
              NButton,
              {
                size: 'small',
                quaternary: true,
                type: 'error',
                onClick: (e: MouseEvent) => {
                  e.stopPropagation()
                  openDelete(row)
                },
              },
              { default: () => '删除', icon: () => h(NIcon, { component: TrashOutline }) },
            ),
          )
        }
        return h('div', { style: 'display:flex;gap:4px;align-items:center' }, buttons)
      },
    })
  }

  return cols
})

function openEdit(row: PaymentRecordItem) {
  editTarget.value = row
  editForm.amount = row.amount
  editForm.paymentTime = new Date(row.paymentTime).getTime()
  editForm.contactPerson = row.contactPerson
  showEditModal.value = true
}

function openDelete(row: PaymentRecordItem) {
  deleteTargetId.value = row.id
  showDeleteModal.value = true
}

function resetCreateForm() {
  createForm.rightLeopardCode = ''
  createForm.amount = null
  createForm.paymentTime = Date.now()
  createForm.contactPerson = null
}

async function loadPaidAgentNames() {
  try {
    const res = await fetchCsAgents({
      page: 1,
      pageSize: 500,
      keyword: '',
      status: null,
      agentType: 'PAID',
    })
    paidAgentNames.value = [...new Set(res.items.map((a) => a.name))].sort()
  } catch {
    paidAgentNames.value = []
  }
}

async function submitCreate() {
  const code = createForm.rightLeopardCode.trim()
  if (!code) {
    message.warning('请填写右豹编码')
    return
  }
  if (createForm.amount == null || createForm.amount < 0) {
    message.warning('请填写有效的付费金额')
    return
  }
  if (createForm.paymentTime == null) {
    message.warning('请选择付费时间')
    return
  }
  submitting.value = true
  try {
    await paymentStore.createPaymentRecord({
      rightLeopardCode: code,
      amount: createForm.amount,
      paymentTime: new Date(createForm.paymentTime).toISOString(),
      contactPerson: createForm.contactPerson?.trim() || undefined,
    })
    message.success('新增成功')
    showCreateModal.value = false
  } catch (e) {
    message.error(e instanceof Error ? e.message : '新增失败')
  } finally {
    submitting.value = false
  }
}

async function submitEdit() {
  if (!editTarget.value) return
  if (editForm.paymentTime == null) {
    message.warning('请选择付费时间')
    return
  }
  if (hasFieldPermission('paymentAmount') && (editForm.amount == null || editForm.amount < 0)) {
    message.warning('请填写有效的付费金额')
    return
  }
  submitting.value = true
  try {
    const dto: UpdatePaymentDto = {
      paymentTime: new Date(editForm.paymentTime).toISOString(),
      contactPerson: editForm.contactPerson,
    }
    if (hasFieldPermission('paymentAmount') && editForm.amount != null) {
      dto.amount = editForm.amount
    }
    await paymentStore.updatePaymentRecord(editTarget.value.id, dto)
    message.success('已保存')
    showEditModal.value = false
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    submitting.value = false
  }
}

async function confirmDelete() {
  if (deleteTargetId.value == null) return
  deleting.value = true
  try {
    await paymentStore.deletePaymentRecord(deleteTargetId.value)
    message.success('删除成功')
    showDeleteModal.value = false
    deleteTargetId.value = null
  } catch (e) {
    message.error(e instanceof Error ? e.message : '删除失败')
  } finally {
    deleting.value = false
  }
}

function handleSearch() {
  paymentStore.query.page = 1
  void paymentStore.loadPayments()
}

function handleReset() {
  paymentStore.resetQuery()
  dateRange.value = null
  void paymentStore.loadPayments()
}

function onPageChange(p: number) {
  paymentStore.query.page = p
  void paymentStore.loadPayments()
}

function onPageSizeChange(ps: number) {
  paymentStore.query.pageSize = ps
  paymentStore.query.page = 1
  void paymentStore.loadPayments()
}

function openImportPicker() {
  importFileInputRef.value?.click()
}

async function handleExportPayments() {
  exporting.value = true
  try {
    await runExportWithPolling({
      start: () =>
        startPaymentsExport({
          keyword: paymentStore.query.keyword || undefined,
          rightLeopardCode: String(paymentStore.query.rightLeopardCode ?? '').trim() || undefined,
          startDate: paymentStore.query.startDate,
          endDate: paymentStore.query.endDate,
          userId: paymentStore.query.userId,
          contactPerson: paymentStore.query.contactPerson,
          createdBy: paymentStore.query.createdBy,
        }),
      message,
      rowEstimate: paymentStore.total,
    })
  } catch (e) {
    message.error(e instanceof Error ? e.message : '导出失败')
  } finally {
    exporting.value = false
  }
}

async function onImportFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const { rows, error: parseErr } = await parsePaymentImportFile(file)
  if (parseErr) {
    message.error(parseErr)
    return
  }
  if (rows.length === 0) {
    message.warning('未解析到有效数据行')
    return
  }

  importSubmitting.value = true
  try {
    await paymentStore.submitImport({ fileName: file.name, rows })
    message.success('已提交导入，处理完成后可在「导入记录」中查看结果')
    mainTab.value = 'import'
  } catch (e) {
    message.error(e instanceof Error ? e.message : '导入提交失败')
  } finally {
    importSubmitting.value = false
  }
}

onMounted(() => {
  void loadPaidAgentNames()
  void paymentStore.loadPayments()
})
</script>

<style scoped>
.payment-list-page {
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

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-bar {
  border-radius: var(--radius-lg);
  padding: 16px 20px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.table-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-summary {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-subtle);
}

.summary-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.summary-text strong {
  color: var(--text-primary);
  font-weight: 600;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.pay-form {
  margin-top: 8px;
}

.readonly-code-line {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.hint {
  margin: 4px 0 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.delete-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

:deep(.mono-input .n-input__input-el) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

:deep(.n-data-table-tr:hover .n-data-table-td) {
  background: rgba(99, 102, 241, 0.06) !important;
}

.pay-main-tabs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pay-main-tabs :deep(.n-tabs-nav) {
  margin-bottom: 0;
}

.field-hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.45;
}

.field-hint.muted {
  color: var(--text-muted);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
