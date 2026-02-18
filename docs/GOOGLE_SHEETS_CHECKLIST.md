# Google Sheets 시트 체크리스트

## 현재 코드에서 사용하는 시트 목록

코드(`src/lib/sheets.ts`)에서 사용하는 시트는 다음과 같습니다:

### 1. ✅ `spec_master` (기존 시트)
- **용도**: 매체별 제작사양 관리
- **상태**: 기존에 있음
- **컬럼**: media_id, media_name, default_vendor, trim_size, cover_type, cover_paper, cover_print, inner_pages, inner_paper, inner_print, binding, finishing, packaging_delivery, file_rule, additional_inner_pages

### 2. ⚠️ `jobs_raw` (기존 시트 - 수정 필요)
- **용도**: 의뢰서 데이터 저장
- **상태**: 기존에 있으나 **vendor_id 컬럼 추가 필요**
- **현재 컬럼**: A~Q (job_id, created_at, requester_name, media_id, media_name, vendor, due_date, qty, file_link, changes_note, status, spec_snapshot, last_updated_at, last_updated_by, order_type, type_spec_snapshot, production_cost)
- **추가 필요**: **R열에 `vendor_id` 컬럼 추가**
  - 헤더: `vendor_id`
  - 기존 데이터: vendor(출력실명)에 따라 vendor_id 매핑 필요
  - 예: "크림팩토리" → `cream`, "스카이인디고" → `sky`
- **상세 가이드**: `docs/GOOGLE_SHEET_VENDOR_ID_SETUP.md` 참고

### 3. ✅ `vendors` (신규 시트)
- **용도**: 제작업체 정보 관리
- **상태**: 이미 추가됨 (사용자가 생성함)
- **컬럼**: vendor_id, vendor_name, pin_hash, pin_hash_b64, is_active, created_at, updated_at
- **확인 사항**: 
  - 헤더가 올바르게 입력되었는지 확인
  - 크림팩토리, 스카이인디고 데이터가 입력되었는지 확인

### 4. ✅ `vendor_pricing` (신규 시트)
- **용도**: 제작업체별 단가 관리
- **상태**: 이미 추가됨 (사용자가 생성함)
- **컬럼**: vendor_id, item_type, item_name, unit_price, unit, notes
- **확인 사항**:
  - 헤더가 올바르게 입력되었는지 확인
  - 크림팩토리 단가 데이터가 입력되었는지 확인

---

## ⚠️ 확인 필요 사항

### 1. `jobs_raw` 시트에 `vendor_id` 컬럼 추가 여부

**현재 코드는 `jobs_raw` 시트의 A:R 범위를 읽습니다.**

- **R열에 `vendor_id` 헤더가 있는지 확인**
- **기존 데이터의 R열에 vendor_id 값이 채워져 있는지 확인**

**확인 방법:**
1. Google Sheets에서 `jobs_raw` 시트 열기
2. R1 셀에 `vendor_id` 헤더가 있는지 확인
3. R2부터 기존 데이터 행에 vendor_id 값이 있는지 확인

**없다면 추가해야 합니다:**
- R1에 `vendor_id` 헤더 입력
- 기존 데이터의 R열에 vendor_id 값 채우기
  - F열(vendor)이 "크림팩토리" → R열에 `cream`
  - F열(vendor)이 "스카이인디고" → R열에 `sky`
  - 수식 사용 가능: `=IF(F2="크림팩토리","cream",IF(F2="스카이인디고","sky",""))`

**상세 가이드**: `docs/GOOGLE_SHEET_VENDOR_ID_SETUP.md` 참고

---

## 📋 전체 체크리스트

### 필수 시트 (모두 있어야 함)
- [x] `spec_master` - 기존 시트
- [ ] `jobs_raw` - **R열에 vendor_id 컬럼 추가 필요**
- [x] `vendors` - 신규 시트 (이미 추가됨)
- [x] `vendor_pricing` - 신규 시트 (이미 추가됨)

### 각 시트별 확인 사항

#### `vendors` 시트
- [x] 시트 생성됨
- [ ] 헤더 행 확인 (vendor_id, vendor_name, pin_hash_b64, is_active)
- [ ] 크림팩토리 데이터 입력됨
- [ ] 스카이인디고 데이터 입력됨 (선택사항)

#### `vendor_pricing` 시트
- [x] 시트 생성됨
- [ ] 헤더 행 확인 (vendor_id, item_type, item_name, unit_price, unit, notes)
- [ ] 크림팩토리 단가 데이터 입력됨
  - 표지, 내지, 추가내지 (item_type: page)
  - 무선제본, 중철제본 (item_type: binding)
  - 코팅, 에폭시 (item_type: finishing)

#### `jobs_raw` 시트
- [x] 시트 존재함
- [ ] **R열에 vendor_id 헤더 추가됨**
- [ ] **기존 데이터의 R열에 vendor_id 값 채워짐**

---

## 🚨 중요: `jobs_raw` 시트 수정 필요

**현재 코드는 `jobs_raw` 시트의 R열(vendor_id)을 읽고 저장합니다.**

만약 R열이 없다면:
1. 제작업체 필터링이 제대로 작동하지 않을 수 있습니다
2. 새 의뢰서 저장 시 vendor_id가 저장되지 않을 수 있습니다

**반드시 R열을 추가하고 기존 데이터를 채워야 합니다.**

---

## 다음 단계

1. `jobs_raw` 시트에 R열 `vendor_id` 추가 확인
2. 기존 데이터의 R열에 vendor_id 값 채우기
3. 모든 시트가 준비되면 테스트 진행
