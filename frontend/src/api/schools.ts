import { del, get, patch, post } from '@/api/request'
import type { PaginatedMentors } from '@/types/mentor'
import type {
  PaginatedSchools,
  SchoolCreateBody,
  SchoolListQuery,
  SchoolListItem,
  SchoolUpdateBody,
} from '@/types/school'

export function fetchSchools(query: SchoolListQuery): Promise<PaginatedSchools> {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
  }
  if (query.keyword?.trim()) params.keyword = query.keyword.trim()
  return get<PaginatedSchools>('/schools', { params })
}

/** 下拉选项：仅 id + name */
export function fetchSchoolOptions(): Promise<{ id: number; name: string }[]> {
  return get<{ id: number; name: string }[]>('/schools/options')
}

export function createSchool(body: SchoolCreateBody): Promise<SchoolListItem> {
  return post<SchoolListItem>('/schools', body)
}

export function updateSchool(id: number, body: SchoolUpdateBody): Promise<SchoolListItem> {
  return patch<SchoolListItem>(`/schools/${id}`, body)
}

export function deleteSchool(id: number): Promise<null> {
  return del<null>(`/schools/${id}`)
}

export function fetchSchoolDetail(id: number): Promise<SchoolListItem> {
  return get<SchoolListItem>(`/schools/${id}`)
}

export function fetchSchoolMentors(
  id: number,
  query: { page?: number; pageSize?: number },
): Promise<PaginatedMentors> {
  return get<PaginatedMentors>(`/schools/${id}/mentors`, {
    params: { page: query.page ?? 1, pageSize: query.pageSize ?? 100 },
  })
}
