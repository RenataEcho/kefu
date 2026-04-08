export type MentorStatus = 'ENABLED' | 'DISABLED'

/** 导师/用户侧项目明细业务大类（补充需求） */
export type ProjectBusinessCategory =
  | '推文'
  | '短剧'
  | '游戏'
  | '应用'
  | '海外故事'
  | '海外短剧'
  | '端原生'
  | '版权'
  | '商单'
  | '融合'
  | 'MCN'
  | '快手'

export interface MentorProjectRow {
  projectName: string
  businessCategory: ProjectBusinessCategory | string
  keywordCount: number
  backfillCount: number
  orderCount: number
  settledRevenueYuan: number
  pendingRevenueYuan: number
}

export interface MentorListItem {
  id: number
  name: string
  schoolId: number
  schoolName: string
  /** 导师类型（补充需求） */
  mentorTypeId: number
  mentorTypeName: string
  /** 飞书手机号 */
  feishuPhone: string
  /** 关联学员（用户主档） */
  studentCount: number
  syncedStudentCount: number
  /** 负责项目数 */
  projectCount: number
  totalRevenue: number
  lastSyncedAt: string | null
  status: MentorStatus
  createdAt: string
  revenueDetail: { period: string; amountYuan: number }[]
  /** 列表接口可选携带，供编辑抽屉预填 */
  introductionHtml?: string
}

export interface MentorListQuery {
  page?: number
  pageSize?: number
  keyword?: string
  schoolId?: number | null
  /** Story 8-3：仅飞书 OAuth 未过期的导师 */
  authorized?: boolean
}

export interface PaginatedMentors {
  items: MentorListItem[]
  total: number
  page: number
  pageSize: number
}

/** Story 3-4/3-5 导师详情 */
export interface MentorDetail extends MentorListItem {
  mentorApiDegraded: boolean
  /** 导师介绍（富文本 HTML，Mock） */
  introductionHtml: string
}

export interface MentorStudentRow {
  id: number
  rightLeopardCode: string
  larkNickname: string
  isPaid: boolean
  createdAt: string
  keywordCount: number
  backfillCount: number
  orderCount: number
  settledRevenueYuan: number
  pendingRevenueYuan: number
}

export interface PaginatedMentorStudents {
  items: MentorStudentRow[]
  total: number
  page: number
  pageSize: number
}

export interface MentorCreateBody {
  name: string
  schoolId: number
  mentorTypeId: number
  feishuPhone?: string
  introductionHtml?: string
}

export interface MentorUpdateBody {
  name?: string
  schoolId?: number
  status?: MentorStatus
  mentorTypeId?: number
  feishuPhone?: string
  introductionHtml?: string
}

export interface PaginatedMentorProjects {
  items: MentorProjectRow[]
  total: number
}
