# 제작 의뢰 관리 (print-order-board)

6자리 PIN으로만 접근하는 초경량 제작의뢰 앱. 데이터는 Google Sheets에 저장됩니다.

## 기능

- **PIN 인증**: 진입 시 6자리 PIN 입력 → 7일 유지 쿠키 발급
- **진행 리스트**: 월/상태/출력실/매체 필터, 요약 카드(이번 달 전체, 납기 7일 이내, 검수완료)
- **의뢰 상세**: 기본정보·제작사양(스냅샷)·상태 변경(수정자 이름 로컬 저장)
- **새 의뢰**: 매체 선택 시 사양 자동 표시 → 제출 시 `jobs_raw`에 `spec_snapshot` 포함 저장

## 환경 설정

1. `.env.example`을 복사해 `.env.local` 생성
2. PIN 해시 생성 후 `TEAM_PIN_HASH` 설정:
   ```bash
   node scripts/gen-pin-hash.js 123456
   ```
3. `AUTH_TOKEN_SECRET`: 32자 이상 랜덤 문자열
4. Google Cloud에서 서비스 계정 생성 → Sheets API 사용 설정 → JSON 키에서 이메일·비공개 키 복사  
   시트 공유: 해당 서비스 계정 이메일에 **편집자** 권한 부여

## Google 시트 구조

동일 스프레드시트에 **탭 2개** 필요.

### 1) spec_master (매체 기본 사양)

| media_id | media_name | default_vendor | trim_size | pages | cover_paper | inner_paper | print_color | binding | finishing | packaging_delivery | file_rule |
|----------|------------|----------------|-----------|-------|-------------|-------------|-------------|---------|-----------|-------------------|-----------|

첫 행은 헤더, 두 번째 행부터 데이터.

### 2) jobs_raw (의뢰 원장)

| job_id | created_at | requester_name | media_id | media_name | vendor | due_date | qty | file_link | changes_note | status | spec_snapshot | last_updated_at | last_updated_by |
|--------|------------|----------------|----------|------------|--------|----------|-----|-----------|--------------|--------|---------------|-----------------|-----------------|

첫 행은 헤더. 앱이 새 의뢰 시 행을 추가하고, `job_id`는 `YYYYMMDD-HHMMSS-XXXX` 형식으로 자동 생성.

## 로컬 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속 후 PIN 입력.

## Vercel 배포

1. 저장소 연결 후 배포
2. 환경 변수 설정:
   - `TEAM_PIN_HASH`
   - `AUTH_TOKEN_SECRET`
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (줄바꿈은 `\n` 그대로 한 줄로)
   - (선택) `RATE_LIMIT_PER_MINUTE=60`

## 기술 스택

- Next.js (App Router) + TypeScript + Tailwind CSS
- 인증: bcrypt(PIN 비교) + JWT(HttpOnly 쿠키)
- 데이터: Google Sheets API (googleapis)
- Rate limit: IP 기준 분당 N회
- Honeypot: PIN 폼 봇 방지
