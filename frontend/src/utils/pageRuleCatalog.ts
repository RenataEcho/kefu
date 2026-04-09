/**
 * 全站「菜单 / 页面」规则说明（供产品配置、前后端开发对齐）。
 * - 列表/工作台页的「查看规则说明」通过路由 name 自动匹配本目录的 key。
 * - 默认内容来自本文件；admin 在「规则配置说明」页的编辑会写入 localStorage 覆盖（见 `usePageRulesStore`）。
 * - 与 `fieldHelpCatalog.ts` 分工：字段级提示用 fieldHelp；页面级业务规则用本文件。
 */
export interface PageRuleSection {
  title: string
  /** 支持多行；勿写 HTML，纯文本即可 */
  body: string
}

export interface PageRuleEntry {
  /** 与侧栏菜单或页面含义一致，便于总览排序与检索 */
  menuTitle: string
  sections: PageRuleSection[]
}

const CATALOG: Record<string, PageRuleEntry> = {
  Dashboard: {
    menuTitle: '数据看板',
    sections: [
      {
        title: '口径与权限',
        body:
          '全局运营看板仅 admin / 审核员可见完整指标；一线客服为「我的建联」视图。导出报告受操作权限 dashboard:export 控制。',
      },
      {
        title: '前后端约定',
        body:
          '指标卡片与趋势数据以接口契约为准；Mock 阶段可对照架构文档中看板章节。日期筛选对客服视图可能被路由守卫清空。',
      },
    ],
  },
  Users: {
    menuTitle: '用户主档表',
    sections: [
      {
        title: '列表与筛选',
        body:
          '关键词模糊匹配昵称、手机、客服/导师名等；右豹编码须单独精确条件。付费状态与付费记录、项目收益字段口径需与支付模块一致。',
      },
      {
        title: '写入与删除',
        body:
          '新增/编辑走抽屉表单；删除需校验关联数据（Mock 可简化）。导出受 users:export 控制。',
      },
      {
        title: '迁移 Tab',
        body:
          '「历史迁移导入」与用户主档列表共用路由 Users；导入流程与数据迁移中心章节对齐。',
      },
    ],
  },
  UserDetail: {
    menuTitle: '用户详情',
    sections: [
      {
        title: '只读与编辑边界',
        body:
          '详情页展示主档快照；可编辑项以抽屉或内联按钮为准。右豹/飞书同步字段以后端同步策略为准。',
      },
    ],
  },
  Payments: {
    menuTitle: '付费记录',
    sections: [
      {
        title: '数据维护',
        body:
          '付费对接人须为「付费客服」类型；金额、时间、对接人必填语义与原型一致。批量导入模板字段勿擅自增删列。',
      },
      {
        title: '与用户主档',
        body:
          '付费记录变更应驱动或校验用户「付费状态」；具体联动规则以后端实现为准，前端展示以列表/详情接口为准。',
      },
    ],
  },
  MigrationHub: {
    menuTitle: '数据迁移',
    sections: [
      {
        title: '执行顺序',
        body:
          '建议：用户主档历史迁移 → 历史付费导入 → 批量补校验 → 查看验证报告。当前为纯前端 Mock，仅用于演示流程与文案。',
      },
      {
        title: '验收关注点',
        body:
          '补校验失败原因、无效编码列表、报告导出格式需与真实任务队列设计对齐后再接后端。',
      },
    ],
  },
  GroupAudits: {
    menuTitle: '入群审核',
    sections: [
      {
        title: 'SLA 与队列',
        body:
          '列表按 SLA 紧迫度排序；超时条目标红并在全局 Banner 提示。飞书 API 降级时走手动导入分支。',
      },
      {
        title: '操作语义',
        body:
          '通过/拒绝/挂起等状态迁移须与飞书侧回调一致；拒绝原因字段见审核表单 fieldHelp。',
      },
    ],
  },
  GroupAuditDetail: {
    menuTitle: '入群审核详情',
    sections: [
      {
        title: '详情页',
        body:
          '展示单条申请全量上下文；操作按钮与列表页权限一致。详情接口字段与列表行字段应对齐。',
      },
    ],
  },
  EntryAudits: {
    menuTitle: '录入审核',
    sections: [
      {
        title: '来源与规则',
        body:
          '用户主档录入来源：后台导入与用户扫码等；审核规则与入群审核 SLA 策略对齐（Mock）。',
      },
      {
        title: '处理动作',
        body:
          '通过写入主档、拒绝需原因；与 entry-audit API 契约一致。',
      },
    ],
  },
  EntryAuditDetail: {
    menuTitle: '录入审核详情',
    sections: [
      {
        title: '详情页',
        body:
          '单条录入审核上下文；操作与列表一致，需记录审计日志（NFR）。',
      },
    ],
  },
  SlaAlerts: {
    menuTitle: 'SLA 预警',
    sections: [
      {
        title: '可见性',
        body:
          '仅 admin 与审核员可访问路由；一线客服进入会 403。预警记录为通知发送历史 Mock。',
      },
      {
        title: '业务含义',
        body:
          '覆盖入群审核与录入审核超时预警；与 Banner 轮询数据源可后续统一。',
      },
    ],
  },
  Notifications: {
    menuTitle: '消息通知',
    sections: [
      {
        title: '记录类型',
        body:
          '待推送、失败重推等状态；筛选与重试操作以后端消息服务为准，当前为 Mock。',
      },
      {
        title: '接收人',
        body:
          '列表「接收人」区分用户 / 客服：用户侧展示飞书昵称等；客服侧展示客服档案名称。SLA 预警等场景多为客服接收。',
      },
    ],
  },
  LarkFriends: {
    menuTitle: '飞书好友管理',
    sections: [
      {
        title: '范围说明',
        body:
          '菜单标注「暂不做」：保留导航占位，规则与 OAuth Mock 流程以原型 §2.5 为准，实现前请勿依赖当前 Mock 行为。',
      },
    ],
  },
  CsManagement: {
    menuTitle: '客服管理',
    sections: [
      {
        title: '档案字段',
        body:
          '客服类型决定可选场景（如付费对接人）；企微二维码、飞书手机号为关键展示字段。',
      },
      {
        title: '与用户主档',
        body:
          '用户归属客服下拉数据来源于本列表启用客服；禁用客服历史数据展示策略以后端为准。',
      },
    ],
  },
  CsAgentDetail: {
    menuTitle: '客服详情',
    sections: [
      {
        title: '详情页',
        body:
          '只读展示档案与关联统计（若有）；编辑返回列表抽屉或独立表单以产品定义为准。',
      },
    ],
  },
  MentorManagement: {
    menuTitle: '导师管理',
    sections: [
      {
        title: '双 Tab',
        body:
          '「导师列表」与「导师类型」共用路由 MentorManagement；类型用于导师档案筛选与分类。',
      },
      {
        title: '归属',
        body:
          '导师须归属门派；与用户主档导师字段、门派统计联动。',
      },
    ],
  },
  MentorDetail: {
    menuTitle: '导师详情',
    sections: [
      {
        title: '详情页',
        body:
          '展示导师档案及第三方同步只读字段；编辑规则与列表一致。',
      },
    ],
  },
  SectManagement: {
    menuTitle: '门派管理',
    sections: [
      {
        title: '边界',
        body:
          '门派侧不提供导师归属操作，导师归属在导师管理中维护。门派项目数等统计口径需与报表一致。',
      },
    ],
  },
  SchoolDetail: {
    menuTitle: '门派详情',
    sections: [
      {
        title: '详情页',
        body:
          '展示门派基础信息与介绍；下级导师列表若存在应对接专门接口。',
      },
    ],
  },
  Rbac: {
    menuTitle: '角色管理',
    sections: [
      {
        title: '权限模型',
        body:
          '菜单权限、操作权限、敏感字段权限分层配置；变更后需重新登录或刷新权限缓存（实现相关）。',
      },
    ],
  },
  Accounts: {
    menuTitle: '账号管理',
    sections: [
      {
        title: '账号与角色',
        body:
          '登录账号唯一；分配角色决定菜单与操作。审核员属性影响审核菜单可见性。',
      },
      {
        title: '安全',
        body:
          '初始密码策略、重置流程以后端安全规范为准。',
      },
    ],
  },
  AuditLogs: {
    menuTitle: '操作日志',
    sections: [
      {
        title: '合规',
        body:
          '只读、不可删除或修改（NFR10）。筛选维度：业务表、操作类型、时间范围等。',
      },
    ],
  },
  ProfileSettings: {
    menuTitle: '个人设置',
    sections: [
      {
        title: '自助维护',
        body:
          '显示名、修改密码；登录账号与角色只读。密码复杂度策略见原型 §2.10。',
      },
    ],
  },
}

/** 配置文件路径提示（总览页展示） */
export const PAGE_RULE_CATALOG_FILE = 'frontend/src/utils/pageRuleCatalog.ts'

/** 代码内置默认规则（不含 admin 本地覆盖） */
export function getBasePageRule(routeName: string): PageRuleEntry | null {
  const e = CATALOG[routeName]
  return e ?? null
}

/** @deprecated 请使用 `usePageRulesStore().effectiveRule` 以包含本地覆盖；此处等价于 getBasePageRule */
export function getPageRule(routeName: string): PageRuleEntry | null {
  return getBasePageRule(routeName)
}

/** admin 总览：按菜单标题排序 */
export function listPageRulesOrdered(): { key: string; entry: PageRuleEntry }[] {
  return Object.entries(CATALOG)
    .map(([key, entry]) => ({ key, entry }))
    .sort((a, b) => a.entry.menuTitle.localeCompare(b.entry.menuTitle, 'zh-Hans-CN'))
}
