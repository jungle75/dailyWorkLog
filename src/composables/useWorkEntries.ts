import type { DailyCard, DownloadFilters, EntryForm, WorkEntry } from '../types'
import { toWorkEntryPayload, workEntriesApi } from '../api/workEntriesApi'

export const createDefaultForm = (date: string): EntryForm => ({
  date,
  assignee: '김경은',
  department: 'UX기획팀',
  workStatus: '휴일',
  srId: '',
  srType: '업무문의',
  requestType: '디자인시안요청서',
  documentNo: '-',
  projectName: '',
  divisionName: '공통',
  targetSystem: '',
  requester: '',
  requestDate: date,
  targetEndDate: date,
  startDate: date,
  effortMh: 1,
  endDate: date,
  detail: '',
})

export const toEntryForm = (entry: WorkEntry): EntryForm => ({
  date: entry.date,
  assignee: entry.assignee,
  department: entry.department,
  workStatus: entry.workStatus,
  srId: entry.srId,
  srType: entry.srType,
  requestType: entry.requestType,
  documentNo: entry.documentNo,
  projectName: entry.projectName,
  divisionName: entry.divisionName,
  targetSystem: entry.targetSystem,
  requester: entry.requester,
  requestDate: entry.requestDate,
  targetEndDate: entry.targetEndDate,
  startDate: entry.startDate,
  effortMh: entry.effortMh,
  endDate: entry.endDate,
  detail: entry.detail,
})

export const loadAssignees = async (): Promise<string[]> => {
  return workEntriesApi.getAssignees()
}

const toDailyCards = (entries: WorkEntry[]): DailyCard[] => {
  const grouped = new Map<string, DailyCard>()

  entries.forEach((entry) => {
    const key = `${entry.assignee}|${entry.department}`
    const current = grouped.get(key)

    if (current) {
      current.entries.push(entry)
      return
    }

    grouped.set(key, {
      assignee: entry.assignee,
      department: entry.department,
      workStatus: entry.workStatus,
      entries: [entry],
    })
  })

  return Array.from(grouped.values()).sort((a, b) => a.assignee.localeCompare(b.assignee, 'ko'))
}

export const queryDailyCards = async (date: string, assignee = '전체'): Promise<DailyCard[]> => {
  const entries = await workEntriesApi.getDailyEntries({ date, assignee })
  return toDailyCards(entries)
}

export const queryDownloadRows = async (filters: DownloadFilters): Promise<WorkEntry[]> => {
  return workEntriesApi.getDownloadEntries(filters)
}

export const getEntryById = async (id: string): Promise<WorkEntry | null> => {
  return workEntriesApi.getEntry(id)
}

export const upsertEntry = async (form: EntryForm, id?: string): Promise<WorkEntry> => {
  const payload = toWorkEntryPayload(form)
  if (id) {
    return workEntriesApi.updateEntry(id, payload)
  }
  return workEntriesApi.createEntry(payload)
}
