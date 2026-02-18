# 제작업체 다중 계정 및 푸시 알림 개발안

## 1. 개요

현재 단일 PIN 인증 시스템을 확장하여 제작업체별 다중 계정 지원 및 푸시 알림 기능을 추가합니다.

## 2. 요구사항 정리

### 2.1 계정 관리
- **관리자 계정**: 기존 PIN (모든 의뢰서 확인 가능)
- **제작업체 계정**: 업체별 고유 PIN (해당 업체에 할당된 의뢰서만 확인)
- **의뢰자 계정**: 기존과 동일 (모든 의뢰서 확인 가능)

### 2.2 데이터 필터링
- 제작업체 로그인 시: `vendor` 필드가 해당 업체명과 일치하는 의뢰서만 표시
- 관리자/의뢰자 로그인 시: 모든 의뢰서 표시

### 2.3 제작업체 관리
- 제작업체 추가/수정/삭제 기능
- Google Sheets에 `vendors` 시트 생성하여 관리

### 2.4 푸시 알림
- 의뢰서 접수 시 해당 제작업체에게 알림 전송
- 카카오톡 단톡방 또는 더 효율적인 방법 제안

### 2.5 단가 관리
- 제작업체별로 다른 단가 적용 가능
- 제작비용 계산 시 해당 업체의 단가 사용

## 3. 데이터 구조 설계

### 3.1 Google Sheets: `vendors` 시트 (신규)

| vendor_id | vendor_name | pin_hash | pin_hash_b64 | kakao_chat_url | webhook_url | is_active | created_at | updated_at |
|-----------|-------------|----------|--------------|----------------|-------------|-----------|------------|------------|
| cream | 크림팩토리 | $2b$10$... | base64... | https://... | https://... | TRUE | 2026-02-18 | 2026-02-18 |
| sky | 스카이인디고 | $2b$10$... | base64... | https://... | https://... | TRUE | 2026-02-18 | 2026-02-18 |

**설명:**
- `vendor_id`: 고유 식별자 (영문, 소문자, 하이픈 허용)
- `vendor_name`: 표시명 (한글 가능)
- `pin_hash`: bcrypt 해시된 PIN
- `pin_hash_b64`: base64 인코딩된 해시 (환경변수에 저장 시 특수문자 문제 방지)
- `kakao_chat_url`: 카카오톡 단톡방 링크 (선택)
- `webhook_url`: 웹훅 URL (선택, 푸시 알림용)
- `is_active`: 활성화 여부

### 3.2 Google Sheets: `vendor_pricing` 시트 (신규)

| vendor_id | item_type | item_name | unit_price | unit | notes |
|-----------|-----------|-----------|------------|------|-------|
| cream | page | 표지 | 300 | 페이지 | A4 기준 |
| cream | page | 내지 | 300 | 페이지 | A4 기준 |
| cream | binding | 무선제본 | 2000 | 권 | - |
| cream | binding | 중철제본 | 1500 | 권 | - |
| cream | finishing | 코팅 | 500 | 페이지 | 단면 기준 |
| cream | finishing | 에폭시 | 120000 | 건 | - |
| sky | page | 표지 | 280 | 페이지 | A4 기준 |
| sky | page | 내지 | 280 | 페이지 | A4 기준 |

**설명:**
- `item_type`: 항목 유형 (page, binding, finishing)
- `item_name`: 항목명 (표지, 내지, 무선제본 등)
- `unit_price`: 단가
- `unit`: 단위 (페이지, 권, 건 등)
- 기본값: 크림팩토리 단가 (현재 사용 중인 단가)

### 3.3 인증 토큰 확장

현재 토큰 페이로드:
```json
{
  "sub": "pin-auth"
}
```

확장된 토큰 페이로드:
```json
{
  "sub": "pin-auth",
  "role": "admin" | "vendor" | "requester",
  "vendor_id": "cream" | null  // vendor 역할일 때만
}
```

## 4. 구현 계획

### 4.1 인증 시스템 확장

#### 4.1.1 `/api/auth/pin` 수정
- PIN 입력 시:
  1. 관리자 PIN 해시 확인 (기존 로직)
  2. 실패 시 `vendors` 시트에서 업체별 PIN 확인
  3. 일치하는 업체가 있으면 해당 업체 정보로 토큰 생성
  4. 토큰에 `role`과 `vendor_id` 포함

#### 4.1.2 `lib/auth.ts` 확장
- `createAuthToken(role: string, vendorId?: string)` 함수 수정
- `verifyAuthToken`에서 토큰에서 역할 정보 추출
- `getUserRole()`, `getVendorId()` 헬퍼 함수 추가

### 4.2 제작업체 관리 기능

#### 4.2.1 Google Sheets API 확장
- `lib/sheets.ts`에 `VendorRow` 인터페이스 추가
- `getVendors()`, `getVendorById()`, `createVendor()`, `updateVendor()`, `deleteVendor()` 함수 추가

#### 4.2.2 API 라우트 추가
- `/api/vendors` (GET, POST)
- `/api/vendors/[vendor_id]` (GET, PATCH, DELETE)
- `/api/vendors/[vendor_id]/pricing` (GET, POST, PATCH)

#### 4.2.3 관리 페이지 추가
- `/vendors` 페이지 (제작업체 목록)
- `/vendors/new` 페이지 (제작업체 추가)
- `/vendors/[vendor_id]` 페이지 (제작업체 수정)

### 4.3 필터링 로직

#### 4.3.1 `lib/sheets.ts` 수정
- `getJobs()` 함수에 `userRole`과 `vendorId` 파라미터 추가
- `vendor` 역할일 때: `vendor` 필드가 `vendorId`와 일치하는 항목만 반환
- `admin` 또는 `requester` 역할일 때: 모든 항목 반환

#### 4.3.2 `ListPageClient.tsx` 수정
- API 호출 시 현재 사용자 역할 정보 전달
- 필터링은 서버 측에서 처리

### 4.4 단가 관리 시스템

#### 4.4.1 `lib/sheets.ts` 수정
- `calculateProductionCostFromSpec()` 함수에 `vendorId` 파라미터 추가
- `vendorId`가 있으면 `vendor_pricing` 시트에서 단가 조회
- 없으면 기본 단가 사용 (크림팩토리 단가)

#### 4.4.2 `NewOrderClient.tsx` 수정
- 제작금액 계산 시 현재 로그인한 사용자의 `vendorId` 전달
- 의뢰서 제출 시 `vendor` 필드에 선택된 업체 저장

### 4.5 푸시 알림 시스템

#### 4.5.1 알림 방법 비교

**옵션 1: 카카오톡 단톡방 링크**
- 장점: 구현 간단, 사용자 친화적
- 단점: 수동 클릭 필요, 자동화 어려움

**옵션 2: 카카오톡 비즈니스 API**
- 장점: 자동 메시지 전송 가능
- 단점: API 승인 필요, 비용 발생 가능

**옵션 3: 웹훅 (Webhook)**
- 장점: 유연성 높음, 다양한 서비스 연동 가능
- 단점: 외부 서비스 설정 필요

**옵션 4: 이메일 알림**
- 장점: 구현 간단, 무료
- 단점: 즉시성 낮음

**추천: 웹훅 + 카카오톡 단톡방 링크 병행**
- 웹훅으로 자동화 가능한 서비스 연동 (예: Slack, Discord, Telegram)
- 카카오톡 단톡방 링크는 `vendors` 시트에 저장하여 수동 알림용으로 제공

#### 4.5.2 구현 방법

**방법 A: Google Apps Script (추천)**
- Google Sheets에 Apps Script 추가
- `onEdit` 트리거로 새 행 추가 감지
- 해당 업체의 `webhook_url`로 HTTP POST 요청
- 장점: Google Sheets와 통합, 추가 서버 불필요
- 단점: Apps Script 작성 필요

**방법 B: Vercel Cron Job**
- Vercel Cron으로 주기적으로 새 의뢰서 확인
- 변경사항 감지 시 웹훅 호출
- 장점: 서버리스, 확장성 좋음
- 단점: 실시간성 낮음 (최소 1분 간격)

**방법 C: API Route에서 직접 호출**
- `/api/jobs` POST 핸들러에서 의뢰서 생성 후 즉시 웹훅 호출
- 장점: 실시간 알림
- 단점: API 응답 시간 증가 가능

**추천: 방법 C (API Route에서 직접 호출)**
- 실시간 알림 제공
- 비동기 처리로 응답 시간 영향 최소화

#### 4.5.3 웹훅 호출 구현
- `lib/notifications.ts` 신규 파일 생성
- `sendVendorNotification(vendorId: string, job: JobRow)` 함수
- 해당 업체의 `webhook_url`로 POST 요청
- 페이로드: 의뢰서 정보 (job_id, media_name, due_date 등)

## 5. 파일 구조

```
src/
├── lib/
│   ├── auth.ts (수정: 역할 정보 추가)
│   ├── sheets.ts (수정: 제작업체 관리, 필터링, 단가 조회)
│   └── notifications.ts (신규: 웹훅 알림)
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── pin/route.ts (수정: 다중 PIN 확인)
│   │   ├── vendors/
│   │   │   ├── route.ts (신규: GET, POST)
│   │   │   ├── [vendor_id]/
│   │   │   │   └── route.ts (신규: GET, PATCH, DELETE)
│   │   │   └── [vendor_id]/pricing/
│   │   │       └── route.ts (신규: 단가 관리)
│   │   └── jobs/
│   │       └── route.ts (수정: 필터링, 알림 호출)
│   └── vendors/
│       ├── page.tsx (신규: 제작업체 목록)
│       ├── new/
│       │   └── page.tsx (신규: 제작업체 추가)
│       └── [vendor_id]/
│           └── page.tsx (신규: 제작업체 수정)
└── components/
    ├── ListPageClient.tsx (수정: 역할 기반 필터링)
    ├── NewOrderClient.tsx (수정: 단가 계산)
    └── VendorsPageClient.tsx (신규: 제작업체 관리 UI)
```

## 6. 마이그레이션 계획

### 6.1 Google Sheets 준비
1. `vendors` 시트 생성
2. `vendor_pricing` 시트 생성
3. 크림팩토리 기본 데이터 입력 (PIN 해시, 단가)

### 6.2 코드 배포 순서
1. Phase 1: 인증 시스템 확장 (역할 정보 추가)
2. Phase 2: 제작업체 관리 기능
3. Phase 3: 필터링 로직 적용
4. Phase 4: 단가 관리 시스템
5. Phase 5: 푸시 알림 시스템

### 6.3 하위 호환성
- 기존 관리자 PIN은 계속 작동
- `role`이 없는 토큰은 `admin`으로 간주 (하위 호환)
- 기본 단가가 없으면 크림팩토리 단가 사용

## 7. 보안 고려사항

1. **PIN 해시**: bcrypt 사용 유지 (salt rounds 10)
2. **토큰 검증**: 모든 API 라우트에서 역할 확인
3. **권한 체크**: 제작업체는 자신의 데이터만 접근 가능
4. **Rate Limiting**: PIN 시도 횟수 제한 유지

## 8. 테스트 계획

1. **인증 테스트**
   - 관리자 PIN 로그인
   - 제작업체 PIN 로그인
   - 잘못된 PIN 거부

2. **필터링 테스트**
   - 제작업체 계정으로 로그인 시 자신의 의뢰서만 표시
   - 관리자 계정으로 로그인 시 모든 의뢰서 표시

3. **단가 테스트**
   - 제작업체별로 다른 단가 적용 확인
   - 기본 단가 폴백 확인

4. **알림 테스트**
   - 새 의뢰서 생성 시 해당 업체에게 알림 전송 확인

## 9. 향후 확장 가능성

1. **제작업체 대시보드**: 업체별 통계, 차트
2. **알림 설정**: 업체별 알림 방식 선택 (웹훅, 이메일 등)
3. **단가 히스토리**: 단가 변경 이력 추적
4. **다중 언어 지원**: 업체별 언어 설정

## 10. 구현 우선순위

1. **High Priority**
   - 인증 시스템 확장
   - 제작업체 관리 기능
   - 필터링 로직

2. **Medium Priority**
   - 단가 관리 시스템
   - 푸시 알림 (웹훅)

3. **Low Priority**
   - 카카오톡 연동
   - 대시보드 확장

## 11. 예상 작업 시간

- Phase 1 (인증 시스템): 4-6시간
- Phase 2 (제작업체 관리): 6-8시간
- Phase 3 (필터링): 2-3시간
- Phase 4 (단가 관리): 4-6시간
- Phase 5 (푸시 알림): 3-4시간

**총 예상 시간**: 19-27시간
