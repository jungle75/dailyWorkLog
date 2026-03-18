# API Contract

`VITE_API_BASE_URL` 기준으로 아래 엔드포인트를 호출합니다.

## 1) 작성자 목록
- `GET /work-entries/assignees`
- response: `string[]`

## 2) 일일 목록 조회
- `GET /work-entries?date=YYYY-MM-DD&assignee=홍길동`
- `assignee`는 선택값이며, `전체`일 때는 전송하지 않습니다.
- response: `WorkEntry[]`

## 3) 다운로드 목록 조회
- `GET /work-entries/download?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&assignee=홍길동`
- response: `WorkEntry[]`

## 4) 단건 조회
- `GET /work-entries/:id`
- response: `WorkEntry`

## 5) 등록
- `POST /work-entries`
- request body: `Omit<WorkEntry, "id">`
- response: `WorkEntry`

## 6) 수정
- `PUT /work-entries/:id`
- request body: `Omit<WorkEntry, "id">`
- response: `WorkEntry`

## WorkEntry shape
```json
{
  "id": "1",
  "date": "2026-03-17",
  "assignee": "김솔잎",
  "department": "UX기획팀",
  "workStatus": "정상출근",
  "srId": "UXSP-2603-0001",
  "srType": "프로젝트",
  "requestType": "개발요청서",
  "documentNo": "-",
  "projectName": "SaaS CLM 구축",
  "divisionName": "공통",
  "targetSystem": "SaaS CLM 구축",
  "requester": "김솔잎",
  "requestDate": "2026-03-07",
  "targetEndDate": "2026-03-07",
  "startDate": "2026-03-07",
  "effortMh": 1,
  "endDate": "2026-03-07",
  "detail": "CLM 기획 회의 참석"
}
```

## Fallback 동작
- `VITE_API_USE_LOCAL_FALLBACK=true`이면 API 연결 실패 시 브라우저 `localStorage`로 동작합니다.
- 실제 API만 강제하려면 `VITE_API_USE_LOCAL_FALLBACK=false`로 설정하세요.
