import axios from 'axios'
import request, { get, post, patch } from '@/api/request'
import type {
  CsAgentDetail,
  CsAgentListItem,
  CsAgentListQuery,
  CreateCsAgentDto,
  PaginatedCsAgents,
  UpdateCsAgentDto,
} from '@/types/csAgent'

export function fetchCsAgents(query: CsAgentListQuery): Promise<PaginatedCsAgents> {
  const params: Record<string, string | number> = {
    page: query.page,
    pageSize: query.pageSize,
  }
  if (query.keyword) params.keyword = query.keyword
  if (query.status) params.status = query.status
  if (query.agentType) params.agentType = query.agentType
  if (query.authorized) params.authorized = 'true'
  return get<PaginatedCsAgents>('/cs-agents', { params })
}

export function fetchCsAgentDetail(id: number): Promise<CsAgentDetail> {
  return get<CsAgentDetail>(`/cs-agents/${id}`)
}

export function createCsAgent(dto: CreateCsAgentDto): Promise<CsAgentListItem> {
  return post<CsAgentListItem>('/cs-agents', dto)
}

export function updateCsAgent(id: number, dto: UpdateCsAgentDto): Promise<CsAgentListItem> {
  return patch<CsAgentListItem>(`/cs-agents/${id}`, dto)
}

/** 删除失败（如 code 10003）时抛出带接口 message 的 Error */
export async function deleteCsAgent(id: number): Promise<void> {
  try {
    await request.delete(`/cs-agents/${id}`)
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.data && typeof e.response.data === 'object') {
      const d = e.response.data as { message?: string }
      if (d.message) throw new Error(d.message)
    }
    throw e instanceof Error ? e : new Error('删除失败')
  }
}
