<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { DailyStatus, EntryForm } from '../types'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  source: EntryForm
}>()

const emit = defineEmits<{
  close: []
  save: [payload: EntryForm]
}>()

const form = reactive<EntryForm>({ ...props.source })

watch(
  () => props.source,
  (next) => {
    Object.assign(form, next)
  },
  { deep: true, immediate: true },
)

const assigneeOptions = ['김경은', '김지연', '장소영', '정인애', '박세은', '김미정']
const statuses: DailyStatus[] = ['휴일', '재택']
const srTypeOptions = ['업무문의', '단순작업', '자료작성', '디자인-퍼블리싱-신규', '디자인-퍼블리싱-수정']
const requestTypeOptions = ['디자인시안요청서', '업무연락', '메일', '전화', '메신저', '기타']
const divisionNameOptions = [
  '공통',
  '중앙홀딩스',
  '콘텐트리중앙',
  '중앙일보',
  '타운보드중앙',
  '중앙일보M&P',
  '딜리박스중앙',
  '중앙일보S',
  '미디어프린팅넷',
  '차이나랩',
  '중앙일보USA',
  'ATL중앙일보',
  'JTBC',
  'SAY',
  'JTBC미디어컴',
  'JTBC미디어텍',
  '스튜디오 제이앤에스',
  '스토리웹',
  'SLL',
  '필름몬스터',
  'BA엔터테인먼트',
  '스튜디오버드',
  '스튜디오슬램',
  '언코어',
  '앤솔로지스튜디오',
  '스튜디오피닉스',
  '클라이맥스스튜디오',
  '프로덕션에이치',
  '하이지음스튜디오',
  'JTBC디스커버리',
  'JTBC플러스',
  'PSI',
  'JTBC Sports',
  'JTBC중앙',
  '메가박스중앙',
  '플레이타임중앙',
  '휘닉스 호텔&리조트',
  '중앙리조트투자',
  'HLL',
  '써브라임',
  '어문연구소',
  '중앙JUMP',
  '미디어디자인',
  '중앙일보신협',
  '드림트러스트',
  '커넥트중앙',
  '러너블 주식회사',
  '중앙피앤아이',
  '중앙화동재단',
  '아름지기재단',
  '위스타트',
  '협력회사',
  '기타',
]

const submit = () => {
  emit('save', { ...form })
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <section class="modal-card">
      <header class="modal-head">
        <h2>{{ mode === 'create' ? '업무 등록' : '업무 수정' }}</h2>
        <button class="btn btn-ghost" @click="emit('close')">닫기</button>
      </header>

      <div class="modal-body">
        <div class="form-grid three">
          <label>
            작성자
            <select v-model="form.assignee">
              <option v-for="assignee in assigneeOptions" :key="assignee" :value="assignee">{{ assignee }}</option>
            </select>
          </label>
          <!-- <label>
            소속
            <input v-model="form.department" type="text" />
          </label> -->
          <label>
            날짜
            <input v-model="form.date" type="date" />
          </label>
          <label>
            내일 근무상태
            <select v-model="form.workStatus">
              <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
            </select>
          </label>
        </div>

        <div class="sr-box">
          <h3>SR 정보</h3>
          <div class="form-grid three">
            <!-- <label>
              SR ID
              <input v-model="form.srId" type="text" />
            </label> -->
            <label>
              SR 유형
              <select v-model="form.srType">
                <option v-for="srType in srTypeOptions" :key="srType" :value="srType">{{ srType }}</option>
              </select>
            </label>
            <label>
              접수방식
              <select v-model="form.requestType">
                <option v-for="requestType in requestTypeOptions" :key="requestType" :value="requestType">{{ requestType }}</option>
              </select>
            </label>
            <label>
              문서번호
              <input v-model="form.documentNo" type="text" />
            </label>
            <label>
              계열사명
              <select v-model="form.divisionName">
                <option v-for="divisionName in divisionNameOptions" :key="divisionName" :value="divisionName">{{ divisionName }}</option>
              </select>
            </label>
            <label>
              대상시스템
              <input v-model="form.targetSystem" type="text" />
            </label>
            <label>
              프로젝트명
              <input v-model="form.projectName" type="text" />
            </label>
            <label>
              요청자
              <input v-model="form.requester" type="text" />
            </label>
            <label>
              요청일자
              <input v-model="form.requestDate" type="date" />
            </label>
            <label>
              목표완료일
              <input v-model="form.targetEndDate" type="date" />
            </label>
            <label>
              작업시작일
              <input v-model="form.startDate" type="date" />
            </label>
            <label>
              작업완료일
              <input v-model="form.endDate" type="date" />
            </label>
            <label>
              투입공수(M/H)
              <input v-model.number="form.effortMh" type="number" min="0" step="0.5" />
            </label>
          </div>

          <label>
            처리내용
            <textarea v-model="form.detail" rows="4" placeholder="처리내용을 입력하세요." />
          </label>
        </div>
      </div>

      <footer class="modal-foot">
        <button class="btn" @click="submit">저장</button>
        <button class="btn btn-outline" @click="emit('close')">취소</button>
      </footer>
    </section>
  </div>
</template>
