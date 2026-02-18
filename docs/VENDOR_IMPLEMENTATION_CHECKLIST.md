# 제작업체 다중 계정 구현 체크리스트 (푸시 알림 제외)

## ✅ 구현 가능 항목 확인

| 항목 | 구현 가능 여부 | 비고 |
|------|---------------|------|
| 1. 제작업체별 PIN 로그인 | ✅ 가능 | vendors 시트에서 PIN 해시 확인 |
| 2. 제작업체는 자신의 의뢰서만 확인 | ✅ 가능 | **vendor_id** 컬럼으로 필터링 (상세: GOOGLE_SHEET_VENDOR_ID_SETUP.md) |
| 3. 제작업체 관리 기능 (추가/수정/삭제) | ✅ 가능 | vendors 시트 CRUD |
| 4. 단가 관리 (업체별 다른 단가) | ✅ 가능 | vendor_pricing 시트 사용 |
| 5. 푸시 알림 | ⏸️ 보류 | Make 등으로 나중에 구현 |

---

## 📋 Google Sheets에 추가해야 할 사항

### 1. `vendors` 시트 생성 (신규)

**시트명**: `vendors`

**컬럼 구조** (첫 번째 행은 헤더):

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| vendor_id | 텍스트 | 고유 식별자 (영문 소문자, 하이픈 허용) | `cream` |
| vendor_name | 텍스트 | 표시명 (한글 가능) | `크림팩토리` |
| pin_hash | 텍스트 | bcrypt 해시된 PIN (선택, pin_hash_b64 우선 사용) | `$2b$10$...` |
| pin_hash_b64 | 텍스트 | base64 인코딩된 PIN 해시 (권장) | `base64...` |
| is_active | 텍스트 | 활성화 여부 (`TRUE` / `FALSE`) | `TRUE` |
| created_at | 텍스트 | 생성일시 (ISO 8601 형식) | `2026-02-18T00:00:00+09:00` |
| updated_at | 텍스트 | 수정일시 (ISO 8601 형식) | `2026-02-18T00:00:00+09:00` |

**초기 데이터 예시** (크림팩토리):

```
vendor_id: cream
vendor_name: 크림팩토리
pin_hash: (비워두기)
pin_hash_b64: (PIN 생성 후 입력)
is_active: TRUE
created_at: 2026-02-18T00:00:00+09:00
updated_at: 2026-02-18T00:00:00+09:00
```

**PIN 해시 생성 방법**:
```bash
# 프로젝트 루트에서 실행
node scripts/gen-pin-hash.js 123456
# 출력된 TEAM_PIN_HASH_B64 값을 pin_hash_b64 컬럼에 입력
```

---

### 2. `vendor_pricing` 시트 생성 (신규)

**시트명**: `vendor_pricing`

**컬럼 구조** (첫 번째 행은 헤더):

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| vendor_id | 텍스트 | 제작업체 ID (vendors 시트의 vendor_id와 연결) | `cream` |
| item_type | 텍스트 | 항목 유형 (`page`, `binding`, `finishing`) | `page` |
| item_name | 텍스트 | 항목명 | `표지` |
| unit_price | 숫자 | 단가 | `300` |
| unit | 텍스트 | 단위 | `페이지` |
| notes | 텍스트 | 비고 (선택) | `A4 기준` |

**초기 데이터 예시** (크림팩토리 - 현재 사용 중인 단가):

```
vendor_id: cream
item_type: page
item_name: 표지
unit_price: 300
unit: 페이지
notes: A4 기준

vendor_id: cream
item_type: page
item_name: 내지
unit_price: 300
unit: 페이지
notes: A4 기준

vendor_id: cream
item_type: binding
item_name: 무선제본
unit_price: 2000
unit: 권
notes: (비워두기)

vendor_id: cream
item_type: binding
item_name: 중철제본
unit_price: 1500
unit: 권
notes: (비워두기)

vendor_id: cream
item_type: finishing
item_name: 코팅
unit_price: 500
unit: 페이지
notes: 단면 기준

vendor_id: cream
item_type: finishing
item_name: 에폭시
unit_price: 120000
unit: 건
notes: (비워두기)
```

**다른 업체 추가 예시** (스카이인디고):

```
vendor_id: sky
item_type: page
item_name: 표지
unit_price: 280
unit: 페이지
notes: A4 기준

vendor_id: sky
item_type: page
item_name: 내지
unit_price: 280
unit: 페이지
notes: A4 기준

... (나머지 항목도 동일하게 추가)
```

---

## 🔧 Google Sheets 설정 체크리스트

### Step 1: 시트 생성
- [ ] `vendors` 시트 생성
- [ ] `vendor_pricing` 시트 생성
- [ ] 각 시트의 첫 번째 행에 헤더 입력

### Step 2: 초기 데이터 입력
- [ ] 크림팩토리 PIN 생성 및 `vendors` 시트에 입력
  - `vendor_id`: `cream`
  - `vendor_name`: `크림팩토리`
  - `pin_hash_b64`: (PIN 해시 생성 후 입력)
  - `is_active`: `TRUE`
- [ ] 크림팩토리 단가를 `vendor_pricing` 시트에 입력 (위 예시 참고)

### Step 3: 권한 확인
- [ ] Google 서비스 계정 이메일에 `vendors` 시트 **편집자** 권한 부여
- [ ] Google 서비스 계정 이메일에 `vendor_pricing` 시트 **편집자** 권한 부여

### Step 4: jobs_raw에 vendor_id 컬럼 추가 (vendor_id 방식 사용 시)
- [ ] `jobs_raw` 시트 **R열**에 **vendor_id** 헤더 추가
- [ ] 기존 데이터 행의 R열에 vendor_id 채우기 (예: vendor가 "크림팩토리" → vendor_id `cream`)
- [ ] 상세 절차: **docs/GOOGLE_SHEET_VENDOR_ID_SETUP.md** 참고

### Step 5: 기존 시트 확인
- [ ] `jobs_raw` 시트의 `vendor` 컬럼이 제대로 있는지 확인
- [ ] 기존 의뢰서들의 `vendor` / `vendor_id` 값이 vendors 시트와 일치하는지 확인

---

## 📝 추가로 필요한 사항

### 1. 환경 변수 (기존 유지)
- `TEAM_PIN_HASH` 또는 `TEAM_PIN_HASH_B64`: 관리자 PIN (기존 유지)
- `GOOGLE_SHEET_ID`: Google 스프레드시트 ID (기존 유지)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: 서비스 계정 이메일 (기존 유지)
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: 서비스 계정 키 (기존 유지)
- `AUTH_TOKEN_SECRET`: 토큰 시크릿 (기존 유지)

**변경 없음** - 기존 환경 변수 그대로 사용

### 2. 코드 변경 사항 (구현 시)

#### 2.1 인증 시스템 확장
- `src/lib/auth.ts`: 토큰에 `role`, `vendor_id` 포함
- `src/app/api/auth/pin/route.ts`: 다중 PIN 확인 로직 추가

#### 2.2 Google Sheets API 확장
- `src/lib/sheets.ts`: 
  - `VendorRow` 인터페이스 추가
  - `getVendors()`, `getVendorById()`, `createVendor()` 등 함수 추가
  - `getJobs()` 함수에 필터링 로직 추가
  - `calculateProductionCostFromSpec()` 함수에 `vendorId` 파라미터 추가

#### 2.3 API 라우트 추가
- `src/app/api/vendors/route.ts`: 제작업체 목록 조회/생성
- `src/app/api/vendors/[vendor_id]/route.ts`: 제작업체 조회/수정/삭제
- `src/app/api/vendors/[vendor_id]/pricing/route.ts`: 단가 관리

#### 2.4 UI 컴포넌트 추가/수정
- `src/components/VendorsPageClient.tsx`: 제작업체 관리 페이지 (신규)
- `src/components/ListPageClient.tsx`: 필터링 로직 적용
- `src/components/NewOrderClient.tsx`: 단가 계산 시 `vendorId` 전달

### 3. 마이그레이션 고려사항

#### 3.1 vendor_id 방식 사용 시 (권장)
- `jobs_raw`에 **vendor_id** 컬럼(R열) 추가
- 필터링·단가 조회는 **vendor_id**로만 수행 (vendors.vendor_id와 매칭)
- `vendor` 컬럼은 화면 표시용(업체명)으로 유지
- 상세: **docs/GOOGLE_SHEET_VENDOR_ID_SETUP.md**

#### 3.2 기본 단가 설정
- 현재 사용 중인 단가가 크림팩토리 기준이므로, `vendor_pricing` 시트에 크림팩토리 단가를 먼저 입력
- 다른 업체 추가 시 해당 업체의 단가 입력

#### 3.3 하위 호환성
- 기존 관리자 PIN은 계속 작동 (`role` 없으면 `admin`으로 간주)
- `vendor_pricing`에 데이터가 없으면 크림팩토리 단가 사용 (기본값)

---

## 🚀 구현 순서 제안

### Phase 1: Google Sheets 준비 (수동 작업)
1. `vendors` 시트 생성 및 헤더 입력
2. `vendor_pricing` 시트 생성 및 헤더 입력
3. 크림팩토리 PIN 생성 및 `vendors` 시트에 입력
4. 크림팩토리 단가를 `vendor_pricing` 시트에 입력

### Phase 2: 인증 시스템 확장
1. `lib/auth.ts` 수정 (역할 정보 추가)
2. `api/auth/pin/route.ts` 수정 (다중 PIN 확인)
3. 테스트: 관리자 PIN, 제작업체 PIN 로그인 확인

### Phase 3: 제작업체 관리 기능
1. `lib/sheets.ts`에 제작업체 관련 함수 추가
2. `/api/vendors` API 라우트 생성
3. `/vendors` 관리 페이지 생성
4. 테스트: 제작업체 추가/수정/삭제

### Phase 4: 필터링 로직
1. `lib/sheets.ts`의 `getJobs()` 함수에 필터링 추가
2. `ListPageClient.tsx` 수정
3. 테스트: 제작업체 계정으로 로그인 시 자신의 의뢰서만 표시

### Phase 5: 단가 관리 시스템
1. `lib/sheets.ts`에 단가 조회 함수 추가
2. `calculateProductionCostFromSpec()` 함수 수정
3. `NewOrderClient.tsx` 수정
4. 테스트: 제작업체별로 다른 단가 적용 확인

---

## ⚠️ 주의사항

1. **PIN 보안**: PIN 해시는 절대 공개하지 말 것
2. **vendor_id 일관성**: `vendors` 시트의 `vendor_id`와 `jobs_raw`의 `vendor` 값이 일치해야 함
   - 예: `vendor_id`가 `cream`이면, `jobs_raw`의 `vendor`는 `크림팩토리` (vendor_name과 매칭)
   - 또는 `vendor_id`를 `jobs_raw`에도 저장하는 방식으로 변경 고려
3. **기본 단가**: `vendor_pricing`에 데이터가 없으면 크림팩토리 단가 사용 (폴백)
4. **권한**: Google 서비스 계정이 새 시트에 접근할 수 있도록 권한 부여 필수

---

## 📌 다음 단계

1. Google Sheets에 `vendors`, `vendor_pricing` 시트 생성
2. 크림팩토리 초기 데이터 입력
3. 구현 시작 (Phase 2부터 순차적으로 진행)

준비가 완료되면 알려주시면 구현을 시작하겠습니다!
