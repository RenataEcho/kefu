import { del, get, patch, post } from '@/api/request'
import type {
  MentorCreateBody,
  MentorDetail,
  MentorListQuery,
  MentorListItem,
  MentorUpdateBody,
  PaginatedMentorProjects,
  PaginatedMentorStudents,
  PaginatedMentors,
} from '@/types/mentor'

export function fetchMentors(query: MentorListQuery): Promise<PaginatedMentors> {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
  }
  if (query.keyword?.trim()) params.keyword = query.keyword.trim()
  if (query.schoolId != null && query.schoolId !== 0) {
    params.schoolId = query.schoolId
  }
  if (query.authorized) params.authorized = 'true'
  return get<PaginatedMentors>('/mentors', { params })
}

export function fetchMentorDetail(id: number): Promise<MentorDetail> {
  return get<MentorDetail>(`/mentors/${id}`)
}

export function postMentorSync(id: number): Promise<{ status: 'queued' }> {
  return post<{ status: 'queued' }>(`/mentors/${id}/sync`, {})
}

export function fetchMentorStudents(
  id: number,
  query: { page?: number; pageSize?: number },
): Promise<PaginatedMentorStudents> {
  return get<PaginatedMentorStudents>(`/mentors/${id}/students`, {
    params: { page: query.page ?? 1, pageSize: query.pageSize ?? 20 },
  })
}

export function fetchMentorProjects(id: number): Promise<PaginatedMentorProjects> {
  return get<PaginatedMentorProjects>(`/mentors/${id}/projects`)
}

export function createMentor(body: MentorCreateBody): Promise<MentorListItem> {
  return post<MentorListItem>('/mentors', body)
}

export function updateMentor(id: number, body: MentorUpdateBody): Promise<MentorListItem> {
  return patch<MentorListItem>(`/mentors/${id}`, body)
}

export function deleteMentor(id: number): Promise<null> {
  return del<null>(`/mentors/${id}`)
}
