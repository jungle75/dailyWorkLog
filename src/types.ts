export type DailyStatus = '정상출근' | '휴가' | '출장' | '휴일' | '재택'

export interface WorkEntry {
  id: string
  date: string
  assignee: string
  department: string
  workStatus: DailyStatus
  srId: string
  srType: string
  requestType: string
  documentNo: string
  projectName: string
  divisionName: string
  targetSystem: string
  requester: string
  requestDate: string
  targetEndDate: string
  startDate: string
  effortMh: number
  endDate: string
  detail: string
}

export interface DailyCard {
  assignee: string
  department: string
  workStatus: DailyStatus
  entries: WorkEntry[]
}

export interface DownloadFilters {
  startDate: string
  endDate: string
  assignee: string
}

export interface EntryForm {
  date: string
  assignee: string
  department: string
  workStatus: DailyStatus
  srId: string
  srType: string
  requestType: string
  documentNo: string
  projectName: string
  divisionName: string
  targetSystem: string
  requester: string
  requestDate: string
  targetEndDate: string
  startDate: string
  effortMh: number
  endDate: string
  detail: string
}
