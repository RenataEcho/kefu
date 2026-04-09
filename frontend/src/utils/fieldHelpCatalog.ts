/**
 * 全站字段说明（与 prototype-spec / 补充需求对齐）。
 * 表单、筛选区、表格列通过 catalogKey 引用，便于统一维护与逐步补全。
 */
export interface FieldHelpEntry {
  title?: string
  hint: string
}

const CATALOG: Record<string, FieldHelpEntry> = {
  // ─── 用户主档 · 筛选 ─────────────────────────────────────
  'user.filter.keyword': {
    hint: '按飞书昵称、手机号、所属客服/导师名称等模糊搜索；右豹编码请使用单独条件精确查询。',
  },
  'user.filter.rightLeopardCode': {
    hint: '与用户主档右豹编码完全一致匹配（大小写不敏感）；不包含在关键词模糊搜索中。',
  },
  'user.filter.isPaid': {
    hint: '付费学员：已产生付费记录的用户；普通用户：未付费或未标记为学员。',
  },
  'user.filter.agent': {
    hint: '用户主档当前归属的客服；用于运营按客服维度查看名下用户。',
  },
  'user.filter.school': {
    hint: '用户归属的门派组织，与导师体系联动。',
  },
  'user.filter.codeVerify': {
    hint: '右豹编码校验状态：已验证、待验证、编码无效、校验未响应等。',
  },
  // ─── 用户主档 · 表单（新增/编辑抽屉）──────────────────────
  'user.form.rightLeopardCode': {
    hint: '与右豹侧一致的唯一业务编码；创建后通常不可随意修改。',
  },
  'user.form.rightLeopardId': {
    hint: '右豹用户 ID，可与编码一起在审核、同步场景核对。',
  },
  'user.form.larkId': {
    hint: '飞书开放平台用户标识，用于与飞书通讯录、通知联动。',
  },
  'user.form.larkPhone': {
    hint: '飞书账号绑定的手机号；选填，需符合大陆 11 位格式。',
  },
  'user.form.larkNickname': {
    hint: '飞书展示昵称，列表与检索中主要展示名称。',
  },
  'user.form.agentId': {
    hint: '当前跟进客服；影响用户主档归属与统计口径。',
  },
  'user.form.mentorId': {
    hint: '业务归属导师；与门派、收益数据联动。',
  },
  'user.form.schoolId': {
    hint: '组织维度归属；需与导师所属门派等业务规则一致。',
  },
  // ─── 用户主档 · 列表列 ───────────────────────────────────
  'user.col.rightLeopardCode': {
    title: '右豹编码',
    hint: '用户在右豹侧的唯一业务编码，用于与同步、审核、付费等模块关联。',
  },
  'user.col.larkNickname': {
    title: '飞书昵称',
    hint: '飞书通讯录展示名；可与飞书用户 ID 在详情中对照查看。',
  },
  'user.col.actionStats10d': {
    title: '近10天动作数',
    hint: '与入群审核列表同列：统计周期内的关键词、回填、订单与收益类动作次数，用于评估活跃度；编码未验证通过时展示为 0（Mock）。',
  },
  'user.col.agent': {
    title: '所属客服',
    hint: '当前负责跟进的客服人员，可在编辑抽屉中调整归属。',
  },
  'user.col.mentor': {
    title: '所属导师',
    hint: '用户归属的导师；与门派、项目收益等数据联动。',
  },
  'user.col.school': {
    title: '所属门派',
    hint: '组织维度归属，便于按门派统计与管理。',
  },
  'user.col.isPaid': {
    title: '付费状态',
    hint: '是否已标记为付费学员；与付费记录、项目收益等一致。',
  },
  'user.col.projectRevenue': {
    title: '项目收益',
    hint: '用户在项目维度下的收益汇总（补充需求：包含已结算和未结算收益）。',
  },
  'user.col.codeVerifyStatus': {
    title: '编码校验状态',
    hint: '右豹编码与校验服务交互结果；待验证时可发起同步或等待异步结果。',
  },
  'user.col.createdAt': {
    title: '录入时间',
    hint: '用户主档首次写入系统的时间。',
  },
  'user.col.actions': {
    hint: '编辑将打开侧拉抽屉；删除受数据关联与权限控制。',
  },
  // ─── 付费记录 · 筛选 ─────────────────────────────────────
  'payment.filter.keyword': {
    hint: '按飞书昵称、付费对接人、录入人等模糊筛选；右豹编码请使用单独条件精确查询。',
  },
  'payment.filter.rightLeopardCode': {
    hint: '与主档右豹编码完全一致匹配（大小写不敏感）。',
  },
  'payment.filter.dateRange': {
    hint: '按付费发生日期区间过滤；与列表导出口径一致。',
  },
  'payment.filter.contactPerson': {
    hint: '付费对接人须为「付费客服」类型账号，与付费记录归属一致。',
  },
  'payment.filter.createdBy': {
    hint: '本条记录在系统内的人工录入操作者（非右豹侧用户）。',
  },
  // ─── 付费记录 · 列 ───────────────────────────────────────
  'payment.col.amount': {
    title: '金额',
    hint: '单笔付费金额；导出与权限受字段权限控制。',
  },
  'payment.col.contact': {
    title: '付费对接人',
    hint: '「付费客服」类型客服中选择，保证归属一致。',
  },
  'payment.col.larkNickname': {
    title: '飞书昵称',
    hint: '付费记录关联用户主档上的飞书展示名。',
  },
  'payment.col.paymentTime': {
    title: '付费时间',
    hint: '用户实际完成付费的时间点；与报表按日汇总一致。',
  },
  'payment.col.createdByName': {
    title: '录入人',
    hint: '在系统中创建或最后维护该条付费记录的操作账号名称。',
  },
  'payment.col.actions': {
    hint: '编辑、删除等；删除后可能影响用户「付费学员」状态（Mock 联动）。',
  },
  // ─── 付费记录 · 表单（新增/编辑弹窗）──────────────────────
  'payment.form.rightLeopardCode': {
    hint: '须与用户主档中已有右豹编码一致，否则无法关联用户。',
  },
  'payment.form.amount': {
    hint: '人民币金额，保留两位小数；受字段权限「付费金额」控制是否可见可编。',
  },
  'payment.form.paymentTime': {
    hint: '业务意义上的付费完成时间，可与对账单据日期对齐。',
  },
  'payment.form.contactPerson': {
    hint: '下拉仅展示客服类型为「付费客服」的账号。',
  },
  // ─── 导入 · 行 / 批次（付费/迁移等共用口径）────────────────
  'import.row.rowNumber': {
    title: '行号',
    hint: 'Excel 物理行号，便于在源文件中定位问题行。',
  },
  'import.row.rightLeopardCode': {
    title: '右豹编码',
    hint: '导入行中的右豹编码；须与主档或模板校验规则一致。',
  },
  'import.row.amount': {
    title: '付费金额',
    hint: '导入行解析出的金额；预检失败时在此行展示错误原因。',
  },
  'import.row.paymentTime': {
    title: '付费时间',
    hint: '模板中付费时间列解析结果。',
  },
  'import.row.contact': {
    title: '对接人',
    hint: '模板中的付费对接人文本，将映射为系统内付费客服。',
  },
  'import.row.failReason': {
    title: '失败原因',
    hint: '本地预检或落库接口返回的错误摘要。',
  },
  'import.batch.batchNo': {
    title: '批次号',
    hint: '单次导入任务的唯一编号，用于追踪与对账。',
  },
  'import.batch.importedAt': {
    title: '导入时间',
    hint: '该批次提交解析/落库的时间。',
  },
  'import.batch.operator': {
    title: '操作人',
    hint: '发起导入的系统账号。',
  },
  'import.batch.fileName': {
    title: '文件名',
    hint: '用户上传的原始 Excel 文件名。',
  },
  'import.batch.totalCount': {
    title: '总行数',
    hint: '含表头外数据行的总数（口径以模板说明为准）。',
  },
  'import.batch.localPassCount': {
    title: '本地预检通过',
    hint: '在前端/网关完成的格式与关联性校验通过行数。',
  },
  'import.batch.apiPassCount': {
    title: '落库成功',
    hint: '已成功写入业务库的行数。',
  },
  'import.batch.failCount': {
    title: '失败行数',
    hint: '预检或落库失败的行数；可在失败明细中逐行查看。',
  },
  'import.batch.status': {
    title: '状态',
    hint: '批次整体状态：处理中、已完成、部分失败等。',
  },
  // ─── 用户迁移导入 Tab ───────────────────────────────────
  'migration.userImport.batchNo': {
    title: '批次号',
    hint: '用户主档迁移导入批次标识。',
  },
  'migration.userImport.fileName': {
    title: '文件名',
    hint: '迁移 Excel 文件名。',
  },
  'migration.userImport.status': {
    title: '状态',
    hint: '该批次解析与落库状态。',
  },
  'migration.userImport.counts': {
    title: '成功 / 失败 / 待验证',
    hint: '成功写入、失败行数、待右豹校验行数汇总。',
  },
  'migration.userImport.importedAt': {
    title: '导入时间',
    hint: '批次完成或最近更新时间。',
  },
  // ─── 迁移 · 重新校验 ─────────────────────────────────────
  'migration.reverify.newCode': {
    hint: '为待验证用户指定新的右豹编码后触发重新校验（Mock）。',
  },
  'migration.reverify.col.code': {
    title: '右豹编码',
    hint: '当前主档中的右豹编码。',
  },
  'migration.reverify.col.larkNickname': {
    title: '飞书昵称',
    hint: '用户飞书展示名。',
  },
  'migration.reverify.col.retain': {
    title: '保留标记',
    hint: '迁移场景下是否保留该条待处理记录的策略标记。',
  },
  'migration.reverify.col.actions': {
    hint: '发起重校验或查看详情。',
  },
  // ─── 客服 / 导师 / 门派 ───────────────────────────────────
  'cs.filter.keyword': {
    hint: '按客服名称模糊搜索。',
  },
  'cs.filter.status': {
    hint: '启用：可选作归属；禁用：不可再分配给新用户。',
  },
  'cs.filter.agentType': {
    hint: '普通客服 / 付费客服；付费客服会出现在付费对接人下拉中。',
  },
  'cs.col.entryFormUrl': {
    title: '信息录入专属码',
    hint: '带客服 ID 的录入链接与二维码，供外部扫码填报；链接勿手工改参数。',
  },
  'cs.col.name': {
    title: '客服名称',
    hint: '对外展示名称，出现在用户归属、下拉选项等位置。',
  },
  'cs.col.agentType': {
    title: '客服类型',
    hint: '普通客服 / 付费客服；付费类型会进入付费对接人候选列表。',
  },
  'cs.col.feishuPhone': {
    title: '飞书手机号',
    hint: '与飞书账号绑定的手机号，用于联系与授权状态展示。',
  },
  'cs.col.wxQrcode': {
    title: '企微二维码',
    hint: '用户添加企业微信时扫描的客服二维码图片。',
  },
  'cs.col.linkedUsers': {
    title: '关联用户数',
    hint: '当前归属到该客服的用户主档数量；大于 0 时不可删除客服。',
  },
  'cs.col.actions': {
    hint: '启用/禁用、编辑、删除；删除受关联用户数约束。',
  },
  'cs.form.name': {
    hint: '展示在归属、下拉与对外物料中，建议与真实称呼一致。',
  },
  'cs.form.agentType': {
    hint: '付费客服会进入付费记录「对接人」候选；变更类型可能影响历史数据展示。',
  },
  'cs.form.feishuPhone': {
    hint: '选填；填写时需为大陆 11 位手机号格式。',
  },
  'cs.form.wxQrcode': {
    hint: 'jpg/png，单张，≤5MB；用于 C 端扫码加企微。',
  },
  'mentor.filter.keyword': {
    hint: '按导师名称模糊搜索。',
  },
  'mentor.filter.schoolId': {
    hint: '按所属门派过滤；与导师列表、详情联动。',
  },
  'mentor.form.name': {
    hint: '1～64 字；对外与报表中展示的导师名称。',
  },
  'mentor.form.schoolId': {
    hint: '每个导师必须归属一个门派；影响用户主档可选导师范围。',
  },
  'mentor.form.mentorTypeId': {
    hint: '类型在「导师类型」菜单维护；禁用类型仅已关联数据可见。',
  },
  'mentor.form.feishuPhone': {
    hint: '选填；用于联系与展示，需符合 11 位手机号规则。',
  },
  'mentor.form.introductionHtml': {
    hint: '富文本：支持标题、列表、加粗、链接、图片上传、YouTube 嵌入与演示用视频占位。存 HTML；正式环境需后端白名单与对象存储。',
  },
  'mentor.form.status': {
    hint: '禁用后不可再分配给新用户；已关联数据保留。',
  },
  'mentor.col.name': {
    title: '导师名称',
    hint: '导师对外名称；点击进入详情页。',
  },
  'mentor.col.schoolName': {
    title: '所属门派',
    hint: '导师归属的组织；与用户主档门派维度一致。',
  },
  'mentor.col.mentorTypeName': {
    title: '导师类型',
    hint: '分类标签，在导师类型菜单配置。',
  },
  'mentor.col.feishuPhone': {
    title: '飞书手机号',
    hint: '导师侧登记的手机号，选填。',
  },
  'mentor.col.studentCount': {
    title: '学员数',
    hint: '当前归属该导师的学员用户数量（Mock 统计）。',
  },
  'mentor.col.projectCount': {
    title: '负责项目数',
    hint: '第三方同步的负责项目条数；可点击在侧拉查看项目明细。',
  },
  'mentor.col.totalRevenue': {
    title: '总收益',
    hint: '该导师下学员相关收益汇总（Mock）。',
  },
  'mentor.col.lastSyncedAt': {
    title: '最后同步',
    hint: '最近一次从第三方同步导师统计字段的时间。',
  },
  'mentor.col.actions': {
    hint: '编辑、启用/禁用、删除；删除受名下学员数限制。',
  },
  'school.filter.keyword': {
    hint: '按门派名称模糊搜索。',
  },
  'school.form.name': {
    hint: '门派在系统中的唯一展示名；1～64 字。',
  },
  'school.form.principalName': {
    hint: '业务负责人姓名，用于组织内联系与权责。',
  },
  'school.form.schoolProjectCount': {
    hint: '由本门派旗下导师的项目信息按项目名称去重统计得出，新建/编辑门派时不可手动填写。',
  },
  'school.form.introductionHtml': {
    hint: '富文本门派介绍；与导师介绍相同编辑器能力，存 HTML。',
  },
  'school.form.status': {
    hint: '禁用后门派不再出现在部分下拉中；已关联导师需先调整归属。',
  },
  'school.col.name': {
    title: '门派名称',
    hint: '组织顶层单元名称。',
  },
  'school.col.principalName': {
    title: '门派负责人',
    hint: '业务负责人。',
  },
  'school.col.schoolProjectCount': {
    title: '门派项目数',
    hint: '汇总本门派导师名下项目并按项目名称去重后的数量；不在新增或编辑门派时人工录入。',
  },
  'school.col.mentorCount': {
    title: '导师数量',
    hint: '归属该门派的导师人数。',
  },
  'school.col.studentTotalCount': {
    title: '学员总数',
    hint: '该门派下学员用户汇总（Mock）。',
  },
  'school.col.studentTotalRevenue': {
    title: '学员总收益',
    hint: '门派维度学员收益汇总（Mock）。',
  },
  'school.col.actions': {
    hint: '编辑、启用/禁用、删除；删除受门下导师数限制。',
  },
  'school.detail.col.mentorName': {
    title: '导师名称',
    hint: '归属本门派的导师。',
  },
  'school.detail.col.studentCount': {
    title: '学员数',
    hint: '该导师名下学员数。',
  },
  'school.detail.col.studentTotalRevenue': {
    title: '学员总收益',
    hint: '该导师名下学员收益汇总。',
  },
  'school.detail.col.lastSyncedAt': {
    title: '最后同步',
    hint: '统计数据最近同步时间。',
  },
  'mentorType.form.name': {
    hint: '在导师表单中作为下拉展示；勿与已有类型重名。',
  },
  'mentorType.form.status': {
    hint: '禁用后不可选作新导师的类型；已关联导师仍显示原类型。',
  },
  'mentorType.col.name': {
    title: '类型名称',
    hint: '导师分类显示名。',
  },
  'mentorType.col.addedAt': {
    title: '添加时间',
    hint: '该类型首次创建时间。',
  },
  'mentorType.col.status': {
    title: '状态',
    hint: '启用 / 禁用。',
  },
  'mentorType.col.actions': {
    hint: '编辑、删除；若仍被导师引用则不可删除（Mock 规则）。',
  },
  'mentor.col.type': {
    title: '导师类型',
    hint: '在「导师管理 → 导师类型」中维护的可选分类。',
  },
  'org.col.schoolLeader': {
    title: '门派负责人',
    hint: '该门派业务负责人，用于联系与权责划分。',
  },
  // ─── 项目/收益明细表（导师/用户详情等共用）────────────────
  'stats.col.projectName': {
    title: '项目名称',
    hint: '第三方项目或业务线名称。',
  },
  'stats.col.businessCategory': {
    title: '业务大类',
    hint: '项目所属业务分类，用于统计切片。',
  },
  'stats.col.allocationPeriod': {
    title: '分配周期',
    hint: '平台将导师与该项目下的收益/动作统计归属到该时间段内；展示为起止日期闭区间，格式 YYYY.MM.DD~YYYY.MM.DD。列表中的题词、回填、订单与收益数字均在该周期内汇总（Mock 按项目生成示例区间）。',
  },
  'stats.col.inscriptionCount': {
    title: '题词数量',
    hint: '统计规则：所选周期（如导师项目表的「分配周期」或看板所选日期范围）内题词次数；仅品牌类项目有值，含审核中与已通过。导师详情与用户主档项目表口径一致。',
  },
  'stats.col.backfillCount': {
    title: '回填数量',
    hint: '统计规则：同上周期内回填次数；仅品牌类项目有值，含审核中与已通过。',
  },
  'stats.col.orderCount': {
    title: '订单数量',
    hint: '统计规则：同上周期内关联订单数，含已结算与未结算订单。',
  },
  'stats.col.settledRevenue': {
    title: '已结算收益',
    hint: '统计规则：同上周期内已完成结算、可计入已得收益的金额汇总。',
  },
  'stats.col.pendingRevenue': {
    title: '待结算收益',
    hint: '统计规则：同上周期内已发生但尚未完成结算的金额汇总。',
  },
  // ─── 导师详情 · 学员表 ───────────────────────────────────
  'mentor.detail.student.code': {
    title: '右豹编码',
    hint: '学员右豹编码。',
  },
  'mentor.detail.student.larkNickname': {
    title: '飞书昵称',
    hint: '学员飞书昵称。',
  },
  'mentor.detail.student.isPaid': {
    title: '是否付费',
    hint: '该学员付费状态标记。',
  },
  'mentor.detail.student.bindingPeriod': {
    title: '绑定周期',
    hint: '学员与该导师绑定关系的有效区间（起止日期闭区间）；展示格式 YYYY.MM.DD~YYYY.MM.DD。与主档「录入时间」不同：此处表示业务归属时段，变更绑定会调整区间（Mock 由学员主档创建日推导示例起止）。',
  },
  'mentor.detail.student.actions': {
    hint: '跳转用户详情等操作。',
  },
  // ─── 数据看板 · 指标与区块（运营口径）──────────────────────
  'dashboard.metric.paidUserCount': {
    title: '付费用户',
    hint: '统计规则：用户主档中标记为「付费学员」且在统计时点仍有效的用户数。趋势「较上期」为与上一段同等长度日期范围对比的环比变化（Mock）。',
  },
  'dashboard.metric.regularUserCount': {
    title: '普通用户',
    hint: '统计规则：主档中未标记为付费学员的用户数；与付费用户互斥汇总主档规模。趋势为环比（Mock）。',
  },
  'dashboard.metric.monthlyConnections': {
    title: '本月建联',
    hint: '统计规则：当前自然月内完成「建联」动作的用户人次（以主档归属客服为准）；副文案「共 N 名客服」为有权参与建联统计的客服账号数。与顶部日期筛选器联动时，按所选范围重算（Mock 与路由日期参数同步）。',
  },
  'dashboard.metric.slaComplianceRate': {
    title: 'SLA 达标率',
    hint: '统计规则：在统计周期内，审核/处理类工单在 SLA 截止前完成的比例；目标阈值由配置决定，展示为百分比。未达标单会进入 SLA 预警列表。',
  },
  'dashboard.metric.periodNewConnections': {
    title: '本月新增建联',
    hint: '统计规则：当前登录客服在本月（或所选周期）内新完成建联的用户数；仅个人看板可见。',
  },
  'dashboard.metric.totalHistoricalConnections': {
    title: '历史累计建联',
    hint: '统计规则：该客服历史上曾建联过的用户去重累计；不随当月筛选清零。',
  },
  'dashboard.metric.periodPaymentConversions': {
    title: '本期付费转化',
    hint: '统计规则：所选周期内由该客服跟进并标记为付费转化的用户数；受字段权限控制是否展示。',
  },
  'dashboard.panel.funnel': {
    title: '转化漏斗',
    hint: '统计规则：按运营配置的多步转化链路逐层汇总人数；每层人数为进入该步的累计。悬浮可见较上一步转化率及相对首步占比。数据可来自服务端缓存，刷新频率见面板底部提示。',
  },
  'dashboard.panel.agentConnections': {
    title: '客服本期建联',
    hint: '统计规则：与顶部日期范围一致，按客服维度统计期内新增建联用户数排名。均值线为全员算术平均；条形长度为相对展示用比例，非第二坐标轴绝对值。',
  },
  'dashboard.panel.schoolOverview': {
    title: '门派概览',
    hint: '统计规则：各门派下导师数、学员数、收益汇总为第三方/主档同步后的快照；点击卡片进入门派详情。列表为 Top 展示，完整数据在门派管理查看。',
  },
  'dashboard.panel.mentorOverview': {
    title: '导师概览',
    hint: '统计规则：导师维度展示其名下学员数、负责项目数及收益汇总（与导师详情页口径一致）；点击进导师详情。列表为 Top 展示。',
  },
  'dashboard.panel.connectionTrend30d': {
    title: '近30天每日建联趋势',
    hint: '统计规则：横轴为最近 30 个自然日，纵轴为当日该客服完成建联的用户数（按日去重或按次，以后台配置为准；Mock 为按日汇总）。',
  },
  // ─── 用户详情 · 操作日志 ─────────────────────────────────
  'user.detail.audit.time': {
    title: '操作时间',
    hint: '该条审计日志记录时间。',
  },
  'user.detail.audit.operator': {
    title: '操作人',
    hint: '执行操作的系统账号。',
  },
  'user.detail.audit.type': {
    title: '操作类型',
    hint: '创建、更新、删除等业务动作分类。',
  },
  'user.detail.audit.field': {
    title: '变更字段',
    hint: '被修改的字段 API 名或展示名。',
  },
  'user.detail.audit.old': {
    title: '变更前值',
    hint: '修改前的值快照。',
  },
  'user.detail.audit.new': {
    title: '变更后值',
    hint: '修改后的值快照。',
  },
  // ─── 审核工作台 ───────────────────────────────────────────
  'audit.col.status': {
    title: '状态',
    hint: '当前审核流程节点：待处理、处理中、已通过、已拒绝、已归档等。',
  },
  'audit.col.nickname': {
    title: '申请人飞书昵称',
    hint: '发起入群或录入申请时对应的飞书展示名。',
  },
  'audit.col.actionStats': {
    title: '近10天动作数',
    hint: '统计周期内的关键词、回填、订单与收益类动作次数，用于评估活跃度。',
  },
  'audit.col.youbaoCode': {
    title: '右豹编码',
    hint: '申请人右豹侧编码，用于与用户主档、通知、收益等模块关联。',
  },
  'audit.col.applyTime': {
    title: '申请时间',
    hint: '用户提交申请的时间；与等待时长、SLA 计算相关。',
  },
  'audit.col.wait': {
    title: '等待时长',
    hint: '自申请以来的等待时间；超过 SLA 将标红并进入预警列表。',
  },
  'audit.col.archiveType': {
    title: '归档类型',
    hint: '归档原因分类，例如重复申请、无效材料等。',
  },
  'audit.col.sla': {
    title: 'SLA 状态',
    hint: '相对截止时间的剩余或已超时状态；超时将出现在 SLA 预警列表。',
  },
  'audit.col.reviewer': {
    title: '处理人',
    hint: '最近一次审核操作的责任人。',
  },
  'audit.col.actions': {
    hint: '通过、拒绝等操作；受审核权限控制。',
  },
  'audit.form.rejectReason': {
    hint: '拒绝时必填；会展示给申请人或写入通知文案（Mock）。',
  },
  'entry.col.screenshots': {
    title: '截图',
    hint: '录入审核需核对编码截图与证件截图；点击可预览大图。',
  },
  'entry.col.agent': {
    title: '所属客服',
    hint: '提交录入申请时所关联的客服账号。',
  },
  'entry.col.youbaoId': {
    title: '右豹 ID',
    hint: '右豹侧用户唯一 ID，与编码共同用于核对身份。',
  },
  'entry.col.codeScreenshot': {
    title: '编码截图',
    hint: '用户上传的右豹编码界面截图，供审核比对。',
  },
  'entry.col.idScreenshot': {
    title: 'ID 截图',
    hint: '用户上传的右豹 ID 或证件相关截图。',
  },
  'entry.col.applyTime': {
    title: '申请时间',
    hint: '录入申请提交时间；与等待时长、SLA 联动。',
  },
  'entry.col.timeout': {
    title: '超时状态',
    hint: '是否已超过处理时限；与 SLA 预警一致。',
  },
  'entry.col.auditStatus': {
    title: '审核状态',
    hint: '当前审核结论：待处理、已通过、已拒绝等。',
  },
  'entry.col.waitDuration': {
    title: '等待时长',
    hint: '自申请提交起至当前的处理等待时间，用于 SLA 展示。',
  },
  'entry.col.actions': {
    hint: '详情、通过、拒绝；受审核权限与当前状态约束。',
  },
  'audit.detail.col.time': {
    title: '操作时间',
    hint: '审核流或操作日志时间。',
  },
  'audit.detail.col.operator': {
    title: '操作人',
    hint: '执行操作的账号。',
  },
  'audit.detail.col.actionType': {
    title: '操作类型',
    hint: '通过、拒绝、备注等类型。',
  },
  'audit.detail.col.content': {
    title: '操作内容',
    hint: '摘要或备注正文。',
  },
  // ─── SLA / 消息通知 ──────────────────────────────────────
  'sla.filter.auditType': {
    hint: '按入群审核 / 录入审核过滤 SLA 预警历史。',
  },
  'sla.filter.assignedAgentName': {
    hint: '按用户主档所属客服名称子串匹配（录入审核为记录上的所属客服；入群审核由右豹编码反查主档）。',
  },
  'sla.filter.rightLeopardCode': {
    hint: '右豹编码精确匹配（大小写不敏感）。',
  },
  'sla.col.alertAt': {
    title: '预警时间',
    hint: '系统生成或发送该 SLA 预警的时间。',
  },
  'sla.col.auditType': {
    title: '审核类型',
    hint: '入群审核与录入审核分流展示；点击可跳转对应详情。',
  },
  'sla.col.recordId': {
    title: '关联记录 ID',
    hint: '对应审核单在业务库中的主键，用于排查。',
  },
  'sla.col.applicantOrAgent': {
    title: '申请人/所属客服',
    hint: '入群场景多为申请人；录入场景可能展示所属客服。',
  },
  'sla.col.youbaoCode': {
    title: '右豹编码',
    hint: '关联用户的右豹编码。',
  },
  'sla.col.actionStats': {
    title: '近10天动作数',
    hint: '与审核工作台列表口径一致。',
  },
  'sla.col.alertType': {
    title: '预警类型',
    hint: '即将超时、已超时等分类。',
  },
  'sla.col.sendStatus': {
    title: '发送状态',
    hint: '通知是否已成功投递渠道。',
  },
  'notify.filter.rightLeopardCode': {
    hint: '按右豹编码精确匹配通知关联用户（大小写不敏感）。',
  },
  'notify.filter.scene': {
    hint: '按业务场景过滤，如审核结果、SLA 提醒等。',
  },
  'notify.filter.channel': {
    hint: '飞书、短信等投递渠道。',
  },
  'notify.filter.pushStatus': {
    hint: '待发送、已推送、推送失败等。',
  },
  'notify.filter.auditType': {
    hint: '入群审核或录入审核关联的通知。',
  },
  'notify.filter.recipientType': {
    hint: '接收人为用户（如飞书昵称侧）或客服（展示客服档案名称）；SLA 类通知多为客服接收。',
  },
  'notify.col.time': {
    title: '通知时间',
    hint: '该条通知记录生成或发送时间。',
  },
  'notify.col.youbaoCode': {
    title: '右豹编码',
    hint: '通知关联用户编码。',
  },
  'notify.col.recipient': {
    title: '接收人',
    hint: '该条推送的目标：用户或客服；为客服时展示客服名称，为用户时展示用户侧展示名（如飞书昵称）。',
  },
  'notify.col.auditType': {
    title: '审核类型',
    hint: '该通知关联的审核业务类型，便于筛选与排查。',
  },
  'notify.col.scene': {
    title: '通知场景',
    hint: '业务场景编码或名称，如审核结果、SLA 提醒等。',
  },
  'notify.col.channel': {
    title: '渠道',
    hint: '飞书、短信等投递渠道。',
  },
  'notify.col.pushStatus': {
    title: '推送状态',
    hint: '成功、失败、重试中等。',
  },
  'notify.col.failReason': {
    title: '失败原因',
    hint: '渠道返回或系统判定的失败说明。',
  },
  'notify.col.actions': {
    hint: '重试、查看详情等。',
  },
  // ─── 飞书好友 ────────────────────────────────────────────
  'lark.col.youbaoCode': {
    title: '右豹编码',
    hint: '待加好友用户的右豹编码。',
  },
  'lark.col.larkNickname': {
    title: '飞书昵称',
    hint: '飞书侧展示名。',
  },
  'lark.col.groupAudit': {
    title: '入群状态',
    hint: '与入群审核单关联的状态摘要。',
  },
  'lark.col.actionStats': {
    title: '近10天动作',
    hint: '与审核列表口径一致的活跃度指标。',
  },
  'lark.col.friendRequest': {
    title: '好友申请',
    hint: '当前好友申请流程状态。',
  },
  'lark.col.applyTime': {
    title: '申请时间',
    hint: '好友申请发起时间。',
  },
  'lark.col.originalApplyTime': {
    title: '原申请时间',
    hint: '首次申请时间（重试列表）。',
  },
  'lark.col.rejectedAt': {
    title: '被拒绝时间',
    hint: '最近一次被拒绝的时间。',
  },
  'lark.col.rejectCount': {
    title: '次数',
    hint: '被拒绝或重试次数统计。',
  },
  'lark.col.actions': {
    hint: '发起申请、重新发起等。',
  },
  'lark.modal.confirmTitle': {
    hint: '向飞书重新发起好友申请前的确认说明。',
  },
  // ─── 账号与 RBAC ─────────────────────────────────────────
  'account.form.loginId': {
    hint: '登录唯一标识；创建后不可修改。',
  },
  'account.form.name': {
    hint: '界面展示用名称，可与真实姓名或花名一致。',
  },
  'account.form.password': {
    hint: '新建账号时的初始密码；请符合安全策略（Mock 仅长度校验）。',
  },
  'account.form.roleId': {
    hint: '决定菜单与数据权限的角色集合。',
  },
  'account.form.reviewerAttrs': {
    hint: '审核员专属属性：可处理入群/录入等审核队列。',
  },
  'account.col.loginId': {
    title: '登录账号',
    hint: '用于登录系统的 ID。',
  },
  'account.col.name': {
    title: '账号名称',
    hint: '显示名。',
  },
  'account.col.password': {
    title: '登录密码',
    hint: '掩码展示；实际不可从列表还原明文。',
  },
  'account.col.role': {
    title: '当前角色',
    hint: '主角色或角色组展示。',
  },
  'account.col.reviewer': {
    title: '审核员',
    hint: '是否具备审核员能力。',
  },
  'account.col.actions': {
    hint: '编辑、重置密码、启用/禁用等。',
  },
  'rbac.form.roleName': {
    hint: '角色在授权配置中的名称。',
  },
  'rbac.form.department': {
    hint: '组织维度，用于角色分组展示（Mock）。',
  },
  'rbac.col.name': {
    title: '角色名称',
    hint: '权限模板名称，用于分配给账号。',
  },
  'rbac.col.department': {
    title: '所属部门',
    hint: '组织维度分组，便于管理大量角色（Mock）。',
  },
  'rbac.col.memberCount': {
    title: '角色人数',
    hint: '当前绑定该角色的账号数量。',
  },
  'rbac.col.createdAt': {
    title: '创建时间',
    hint: '角色首次创建时间。',
  },
  'rbac.col.actions': {
    hint: '配置权限、编辑、删除等。',
  },
  // ─── 审计日志（全局）────────────────────────────────────
  'auditlog.filter.table': {
    hint: '按被变更的业务表过滤。',
  },
  'auditlog.filter.action': {
    hint: '按操作类型过滤：创建、更新、删除等。',
  },
  'auditlog.filter.dateRange': {
    hint: '按操作发生日期区间过滤。',
  },
  'auditlog.col.time': {
    title: '操作时间',
    hint: '记录写入审计表的时间。',
  },
  'auditlog.col.operator': {
    title: '操作人',
    hint: '系统登录账号。',
  },
  'auditlog.col.table': {
    title: '操作表',
    hint: '被变更的业务表标识。',
  },
  'auditlog.col.action': {
    title: '操作类型',
    hint: '增删改、审核、导入导出等。',
  },
  'auditlog.col.recordId': {
    title: '记录 ID',
    hint: '业务主键，用于跳转详情。',
  },
  // ─── 客服详情 · 操作日志 ─────────────────────────────────
  'cs.detail.audit.time': {
    title: '操作时间',
    hint: '该客服档案变更时间。',
  },
  'cs.detail.audit.operator': {
    title: '操作人',
    hint: '执行变更的账号。',
  },
  'cs.detail.audit.actionType': {
    title: '操作类型',
    hint: '创建、更新等。',
  },
  'cs.detail.audit.field': {
    title: '变更字段',
    hint: '被修改字段名。',
  },
  'cs.detail.audit.old': {
    title: '变更前值',
    hint: '修改前快照。',
  },
  'cs.detail.audit.new': {
    title: '变更后值',
    hint: '修改后快照。',
  },
  // ─── 登录 / 个人设置 ────────────────────────────────────
  'login.form.loginId': {
    hint: '与管理员分配账号一致。',
  },
  'login.form.password': {
    hint: '区分大小写；连续失败可能触发锁定（Mock 可未实现）。',
  },
  'profile.form.displayName': {
    hint: '当前账号在系统内的展示名称。',
  },
  'profile.form.loginId': {
    hint: '只读；登录标识。',
  },
  'profile.form.role': {
    hint: '只读；当前生效角色。',
  },
  'profile.form.currentPassword': {
    hint: '修改密码时用于校验身份。',
  },
  'profile.form.newPassword': {
    hint: '新密码需符合复杂度策略。',
  },
  'profile.form.confirmPassword': {
    hint: '须与新密码一致。',
  },
  // ─── 通用 ────────────────────────────────────────────────
  'common.createdAt': {
    title: '创建时间',
    hint: '记录首次写入时间。',
  },
  'common.updatedAt': {
    title: '更新时间',
    hint: '最近一次变更时间。',
  },
  'common.status': {
    title: '状态',
    hint: '业务启用/禁用或流程状态，具体含义以当前列表为准。',
  },
  'common.actions': {
    hint: '行级操作入口；具体按钮受操作权限控制。',
  },
}

export function getFieldHelp(key: string): FieldHelpEntry | null {
  const e = CATALOG[key]
  return e ? e : null
}
