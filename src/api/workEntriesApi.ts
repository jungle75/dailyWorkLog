import type { DownloadFilters, EntryForm, WorkEntry } from '../types'
import { seedEntries } from '../data/seed'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 10000)
const API_USE_LOCAL_FALLBACK = (import.meta.env.VITE_API_USE_LOCAL_FALLBACK ?? 'true') !== 'false'
const STORAGE_KEY = 'worksheet-vue-work-entries'

interface DailyQuery {
  date: string
  assignee: string
}

interface WorkEntryPayload extends Omit<WorkEntry, 'id'> {}

export interface WorkEntriesApi {
  getAssignees: () => Promise<string[]>
  getDailyEntries: (query: DailyQuery) => Promise<WorkEntry[]>
  getDownloadEntries: (filters: DownloadFilters) => Promise<WorkEntry[]>
  getEntry: (id: string) => Promise<WorkEntry | null>
  createEntry: (payload: WorkEntryPayload) => Promise<WorkEntry>
  updateEntry: (id: string, payload: WorkEntryPayload) => Promise<WorkEntry>
}

const makeId = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

const normalizeAssignee = (assignee: string) => (assignee === '전체' ? '' : assignee)

const toPayload = (form: EntryForm): WorkEntryPayload => ({
  date: form.date,
  assignee: form.assignee,
  department: form.department,
  workStatus: form.workStatus,
  srId: form.srId,
  srType: form.srType,
  requestType: form.requestType,
  documentNo: form.documentNo,
  projectName: form.projectName,
  divisionName: form.divisionName,
  targetSystem: form.targetSystem,
  requester: form.requester,
  requestDate: form.requestDate,
  targetEndDate: form.targetEndDate,
  startDate: form.startDate,
  effortMh: Number(form.effortMh),
  endDate: form.endDate,
  detail: form.detail,
})

const readStorage = (): WorkEntry[] => {
  if (typeof window === 'undefined') return [...seedEntries]
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedEntries))
    return [...seedEntries]
  }

  try {
    const parsed = JSON.parse(raw) as WorkEntry[]
    if (Array.isArray(parsed)) return parsed
    return [...seedEntries]
  } catch {
    return [...seedEntries]
  }
}

const writeStorage = (entries: WorkEntry[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

const filterByDaily = (entries: WorkEntry[], query: DailyQuery): WorkEntry[] => {
  const assignee = normalizeAssignee(query.assignee)
  return entries
    .filter((entry) => {
      const matchDate = entry.date === query.date
      const matchAssignee = !assignee || entry.assignee === assignee
      return matchDate && matchAssignee
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

const filterByRange = (entries: WorkEntry[], filters: DownloadFilters): WorkEntry[] => {
  const assignee = normalizeAssignee(filters.assignee)
  return entries
    .filter((entry) => {
      const date = entry.date
      const matchFrom = !filters.startDate || date >= filters.startDate
      const matchTo = !filters.endDate || date <= filters.endDate
      const matchAssignee = !assignee || entry.assignee === assignee
      return matchFrom && matchTo && matchAssignee
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

const localApi: WorkEntriesApi = {
  async getAssignees() {
    const names = new Set(readStorage().map((item) => item.assignee))
    return ['전체', ...Array.from(names).sort((a, b) => a.localeCompare(b, 'ko'))]
  },

  async getDailyEntries(query) {
    return filterByDaily(readStorage(), query)
  },

  async getDownloadEntries(filters) {
    return filterByRange(readStorage(), filters)
  },

  async getEntry(id) {
    return readStorage().find((item) => item.id === id) ?? null
  },

  async createEntry(payload) {
    const next: WorkEntry = { id: makeId(), ...payload }
    const current = readStorage()
    current.unshift(next)
    writeStorage(current)
    return next
  },

  async updateEntry(id, payload) {
    const current = readStorage()
    const index = current.findIndex((item) => item.id === id)
    if (index < 0) {
      throw new Error('수정 대상 업무를 찾을 수 없습니다.')
    }

    const updated: WorkEntry = { id, ...payload }
    current[index] = updated
    writeStorage(current)
    return updated
  },
}

const buildQuery = (query: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })
  const text = params.toString()
  return text ? `?${text}` : ''
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL이 설정되지 않았습니다.')
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `API 요청 실패 (${res.status})`)
    }

    if (res.status === 204) {
      return undefined as T
    }

    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

const remoteApi: WorkEntriesApi = {
  async getAssignees() {
    return request<string[]>('/work-entries/assignees')
  },

  async getDailyEntries(query) {
    return request<WorkEntry[]>(`/work-entries${buildQuery({ date: query.date, assignee: normalizeAssignee(query.assignee) })}`)
  },

  async getDownloadEntries(filters) {
    return request<WorkEntry[]>(
      `/work-entries/download${buildQuery({
        startDate: filters.startDate,
        endDate: filters.endDate,
        assignee: normalizeAssignee(filters.assignee),
      })}`,
    )
  },

  async getEntry(id) {
    return request<WorkEntry>(`/work-entries/${id}`)
  },

  async createEntry(payload) {
    return request<WorkEntry>('/work-entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateEntry(id, payload) {
    return request<WorkEntry>(`/work-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
}

const withFallback = async <T>(task: () => Promise<T>, fallbackTask: () => Promise<T>) => {
  if (!API_BASE_URL) {
    if (API_USE_LOCAL_FALLBACK) {
      return fallbackTask()
    }
    throw new Error('VITE_API_BASE_URL이 설정되지 않았습니다.')
  }

  try {
    return await task()
  } catch (error) {
    if (!API_USE_LOCAL_FALLBACK) {
      throw error
    }

    console.warn('[API fallback]', error)
    return fallbackTask()
  }
}

export const workEntriesApi: WorkEntriesApi = {
  getAssignees: () => withFallback(() => remoteApi.getAssignees(), () => localApi.getAssignees()),
  getDailyEntries: (query) => withFallback(() => remoteApi.getDailyEntries(query), () => localApi.getDailyEntries(query)),
  getDownloadEntries: (filters) =>
    withFallback(() => remoteApi.getDownloadEntries(filters), () => localApi.getDownloadEntries(filters)),
  getEntry: (id) => withFallback(() => remoteApi.getEntry(id), () => localApi.getEntry(id)),
  createEntry: (payload) => withFallback(() => remoteApi.createEntry(payload), () => localApi.createEntry(payload)),
  updateEntry: (id, payload) => withFallback(() => remoteApi.updateEntry(id, payload), () => localApi.updateEntry(id, payload)),
}

export const toWorkEntryPayload = toPayload

