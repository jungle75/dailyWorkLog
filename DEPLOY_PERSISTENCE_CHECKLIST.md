# 데이터 영구 보관 체크리스트 (Render + Supabase)

이 문서는 `일일 업무등록` 데이터가 서버 재시작/재배포 후에도 유지되도록 설정하는 절차입니다.

## 1) 현재 상태 확인

1. Render 설정에서 `DATA_FILE=/tmp/work-entries.json` 사용 여부 확인  
   참고: [render.yaml](/C:/ai-study/dailyWorkLog-1/render.yaml:21)
2. 현재 `tmp` 경로는 재시작/재배포 시 초기화될 수 있다는 점 확인
3. 목표를 "파일 저장"이 아니라 "외부 DB 영구 저장"으로 확정

## 2) Supabase 테이블 준비

1. Supabase 프로젝트 생성(이미 있으면 생략)
2. SQL Editor에서 아래 파일 실행  
   [schema.sql](/C:/ai-study/dailyWorkLog-1/server/supabase/schema.sql:1)
3. `work_entries` 테이블 생성 확인

## 3) Supabase 키 준비

1. Supabase `Project URL` 확인 (`SUPABASE_URL`)
2. Supabase `service_role` 키 확인 (`SUPABASE_SERVICE_ROLE_KEY`)
3. 키 유출 방지를 위해 절대 코드에 하드코딩하지 않기

## 4) Render 환경변수 설정

1. Render 서비스 환경변수에 다음 값 설정
2. `API_BASE_PATH=/api`
3. `CORS_ORIGIN=https://jungle75.github.io,http://localhost:5173`  
   필요 시 실제 프론트 도메인 추가
4. `SUPABASE_URL=<Supabase Project URL>`
5. `SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role key>`
6. `SUPABASE_TABLE=work_entries`
7. `DATA_FILE`는 남아 있어도 무방하지만, Supabase가 설정되면 서버는 Supabase 모드로 동작  
   참고: [index.mjs](/C:/ai-study/dailyWorkLog-1/server/index.mjs:19), [index.mjs](/C:/ai-study/dailyWorkLog-1/server/index.mjs:262)

## 5) 프론트 환경변수 설정

1. GitHub Actions Variables 또는 배포 환경에 아래 설정
2. `VITE_API_BASE_URL=https://<render-service>.onrender.com/api`
3. `VITE_API_USE_LOCAL_FALLBACK=false`  
   참고: [.env.example](/C:/ai-study/dailyWorkLog-1/.env.example:9)

## 6) 배포 후 동작 검증

1. API 헬스 체크
2. `GET https://<render-service>.onrender.com/api/work-entries/assignees` 호출
3. 업무등록 화면에서 샘플 1건 등록
4. 서버 재배포(또는 재시작) 실행
5. 같은 날짜/작성자 조건으로 재조회하여 데이터 유지 확인

## 7) 운영 점검 항목

1. Render 로그에 `DATA_MODE=supabase` 출력 확인  
   참고: [index.mjs](/C:/ai-study/dailyWorkLog-1/server/index.mjs:350)
2. 조회/등록 실패 시 CORS 설정 우선 점검
3. 로컬 테스트 시에도 가능하면 백엔드 API 모드로 테스트 (`VITE_API_USE_LOCAL_FALLBACK=false`)

## 8) 선택 사항 (기존 데이터 이전)

1. 기존 로컬/파일 데이터가 있으면 JSON 내보내기
2. 간단한 이관 스크립트로 `POST /work-entries` 일괄 업로드
3. 이관 후 표본 데이터 개수/기간 비교 검증

