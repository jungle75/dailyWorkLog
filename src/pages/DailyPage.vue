<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import WorkEntryModal from '../components/WorkEntryModal.vue'
import { createDefaultForm, getEntryById, queryDailyCards, toEntryForm, upsertEntry } from '../composables/useWorkEntries'
import type { DailyCard, EntryForm } from '../types'

const today = new Date().toISOString().slice(0, 10)

const draftFilter = ref({
  date: today,
})

const cards = ref<DailyCard[]>([])
const loading = ref(false)
const errorMessage = ref('')

const totalCount = computed(() => cards.value.reduce((sum, card) => sum + card.entries.length, 0))

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingId = ref<string | null>(null)
const modalForm = ref<EntryForm>(createDefaultForm(today))

const statusClass = (status: string) => {
  if (status === '정상출근') return 'badge badge-success'
  if (status === '휴가' || status === '휴일') return 'badge badge-warning'
  if (status === '출장' || status === '재택') return 'badge badge-primary'
  return 'badge'
}

const applyFilter = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    cards.value = await queryDailyCards(draftFilter.value.date)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '목록 조회 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  modalMode.value = 'create'
  editingId.value = null
  modalForm.value = createDefaultForm(draftFilter.value.date)
  modalOpen.value = true
}

const openEdit = async (id: string) => {
  loading.value = true
  errorMessage.value = ''

  try {
    const entry = await getEntryById(id)
    if (!entry) {
      window.alert('수정할 데이터를 찾을 수 없습니다.')
      return
    }

    modalMode.value = 'edit'
    editingId.value = id
    modalForm.value = toEntryForm(entry)
    modalOpen.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '상세 조회 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}

const onSave = async (payload: EntryForm) => {
  loading.value = true
  errorMessage.value = ''

  try {
    await upsertEntry(payload, editingId.value ?? undefined)
    modalOpen.value = false
    await applyFilter()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await applyFilter()
})
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h2>일일 업무 목록</h2>
      <div class="button-row">
        <RouterLink to="/download" class="btn btn-outline">SR관리대장 다운로드</RouterLink>
        <button class="btn" @click="openCreate">업무 등록</button>
      </div>
    </header>

    <div class="filter-row">
      <label>
        <input v-model="draftFilter.date" type="date" />
      </label>
      <button class="btn" :disabled="loading" @click="applyFilter">조회</button>
    </div>

    <p class="summary">총 {{ totalCount }}건</p>
    <p v-if="loading" class="summary">데이터를 불러오는 중입니다...</p>
    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

    <div v-if="!loading && cards.length" class="card-list">
      <article v-for="card in cards" :key="`${card.assignee}-${card.department}`" class="work-card">
        <div class="work-card-header">
          <div>
            <h3>{{ card.assignee }}</h3>
            <p>{{ card.department }}</p>
          </div>
          <span :class="statusClass(card.workStatus)">{{ card.workStatus }}</span>
        </div>

        <div class="task-list">
          <div v-for="entry in card.entries" :key="entry.id" class="task-item">
            <div class="task-head">
              <h4>{{ entry.detail }}</h4>
              <button class="btn btn-outline mini" :disabled="loading" @click="openEdit(entry.id)">수정</button>
            </div>
            <p>{{ entry.srType }} · {{ entry.projectName }} · {{ entry.targetSystem }}</p>
            <small>
              SR ID {{ entry.srId }} · {{ entry.startDate }} ~ {{ entry.endDate }} · {{ entry.effortMh }}H
            </small>
          </div>
        </div>
      </article>
    </div>

    <p v-else-if="!loading" class="empty">조건에 맞는 데이터가 없습니다.</p>
  </section>

  <WorkEntryModal :open="modalOpen" :mode="modalMode" :source="modalForm" @close="modalOpen = false" @save="onSave" />
</template>
