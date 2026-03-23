<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { loadAssignees, queryDownloadRows } from '../composables/useWorkEntries'
import type { DownloadFilters, WorkEntry } from '../types'

const today = new Date().toISOString().slice(0, 10)

const makeDefault = (): DownloadFilters => ({
  startDate: today.slice(0, 8) + '01',
  endDate: today,
  assignee: '전체',
})

const assigneeOptions = ref<string[]>(['전체'])
const draftFilter = ref<DownloadFilters>(makeDefault())
const rows = ref<WorkEntry[]>([])
const loading = ref(false)
const errorMessage = ref('')

const columns = [
  'No',
  'SR ID',
  'SR유형',
  '접수방식',
  '문서번호',
  '프로젝트명',
  '계열사명',
  '대상시스템',
  '요청자',
  '요청일자',
  '목표완료일',
  '처리담당자',
  '작업시작일',
  '투입공수(M/H)',
  '작업완료일',
  '처리내용',
]

const refreshAssignees = async () => {
  try {
    assigneeOptions.value = await loadAssignees()
    if (!assigneeOptions.value.includes(draftFilter.value.assignee)) {
      draftFilter.value.assignee = '전체'
    }
  } catch (error) {
    console.error(error)
    assigneeOptions.value = ['전체']
  }
}

const applyFilter = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    rows.value = await queryDownloadRows(draftFilter.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '다운로드 조회 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}

const toCsvLine = (fields: Array<string | number>) => {
  return fields
    .map((field) => {
      const text = String(field ?? '')
      const escaped = text.replaceAll('"', '""')
      return `"${escaped}"`
    })
    .join(',')
}

const downloadCsv = () => {
  const header = toCsvLine(columns)
  const body = rows.value.map((row, index) =>
    toCsvLine([
      index + 1,
      row.srId,
      row.srType,
      row.requestType,
      row.documentNo,
      row.projectName,
      row.divisionName,
      row.targetSystem,
      row.requester,
      row.requestDate,
      row.targetEndDate,
      row.assignee,
      row.startDate,
      row.effortMh,
      row.endDate,
      row.detail,
    ]),
  )

  const csv = [header, ...body].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `SR관리대장_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const asRow = (entry: WorkEntry, index: number) => ({
  no: index + 1,
  ...entry,
})

onMounted(async () => {
  await refreshAssignees()
  await applyFilter()
})
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h2>SR관리대장</h2>
      <RouterLink to="/daily" class="btn btn-outline">목록으로</RouterLink>
    </header>

    <div class="filter-row">
      <div class="filter-item">
        <label>
          시작일
          <input v-model="draftFilter.startDate" type="date" />
        </label>
        <label>
          종료일
          <input v-model="draftFilter.endDate" type="date" />
        </label>
        <label>
          작성자
          <select v-model="draftFilter.assignee">
            <option v-for="name in assigneeOptions" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
        <button class="btn" :disabled="loading" @click="applyFilter">조회</button>
      </div>
      
      <button class="btn btn-outline" :disabled="loading || rows.length === 0" @click="downloadCsv">엑셀 다운로드</button>
    </div>

    <p class="summary">총 {{ rows.length }}건</p>
    <p v-if="loading" class="summary">데이터를 불러오는 중입니다...</p>
    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th v-for="col in columns" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows.map(asRow)" :key="row.id">
            <td>{{ row.no }}</td>
            <td>{{ row.srId }}</td>
            <td>{{ row.srType }}</td>
            <td>{{ row.requestType }}</td>
            <td>{{ row.documentNo }}</td>
            <td>{{ row.projectName }}</td>
            <td>{{ row.divisionName }}</td>
            <td>{{ row.targetSystem }}</td>
            <td>{{ row.requester }}</td>
            <td>{{ row.requestDate }}</td>
            <td>{{ row.targetEndDate }}</td>
            <td>{{ row.assignee }}</td>
            <td>{{ row.startDate }}</td>
            <td>{{ row.effortMh }}</td>
            <td>{{ row.endDate }}</td>
            <td>{{ row.detail }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
