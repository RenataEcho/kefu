export type SchoolStatus = 'ENABLED' | 'DISABLED'

export interface SchoolListItem {
  id: number
  name: string
  /** 补充需求：门派负责人 */
  principalName: string
  /** 由旗下导师项目按名称去重聚合，非创建门派时写入 */
  schoolProjectCount: number
  mentorCount: number
  /** Story 3-5：门派下导师同步学员数合计 */
  totalStudents: number
  /** 门派下导师收益合计（展示为学员总收益） */
  totalRevenue: number
  /** 导师介绍（富文本 HTML） */
  introductionHtml: string
  status: SchoolStatus
  createdAt: string
}

export interface SchoolListQuery {
  page?: number
  pageSize?: number
  keyword?: string
}

export interface PaginatedSchools {
  items: SchoolListItem[]
  total: number
  page: number
  pageSize: number
}

export interface SchoolCreateBody {
  name: string
  principalName?: string
  introductionHtml?: string
}

export interface SchoolUpdateBody {
  name?: string
  status?: SchoolStatus
  principalName?: string
  introductionHtml?: string
}
