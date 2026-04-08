import { del, get, patch, post } from '@/api/request'

export type MentorTypeStatus = 'ENABLED' | 'DISABLED'

export interface MentorTypeDto {
  id: number
  name: string
  createdAt: string
  status: MentorTypeStatus
}

/** 与 Mock /schools 列表一致：分页包裹 */
interface MentorTypesPage {
  items: MentorTypeDto[]
  total: number
  page: number
  pageSize: number
}

export async function fetchMentorTypes(): Promise<MentorTypeDto[]> {
  const data = await get<MentorTypesPage>('/mentor-types')
  return Array.isArray(data?.items) ? data.items : []
}

export function createMentorType(body: {
  name: string
  status?: MentorTypeStatus
}): Promise<MentorTypeDto> {
  return post<MentorTypeDto>('/mentor-types', body)
}

export function updateMentorType(
  id: number,
  body: { name?: string; status?: MentorTypeStatus },
): Promise<MentorTypeDto> {
  return patch<MentorTypeDto>(`/mentor-types/${id}`, body)
}

export function deleteMentorType(id: number): Promise<null> {
  return del<null>(`/mentor-types/${id}`)
}
