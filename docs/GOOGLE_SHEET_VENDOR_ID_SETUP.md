# Google 시트 vendor_id 방식 수정 가이드

## 개요

제작업체를 **vendor_id**로 관리하려면 `jobs_raw` 시트에 **vendor_id** 컬럼을 추가하고, 기존 데이터를 채워 넣으면 됩니다.

---

## 1. jobs_raw 시트 수정

### 1.1 현재 컬럼 구조 (참고)

| 컬럼 | A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q |
|------|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 헤더 | job_id | created_at | requester_name | media_id | media_name | **vendor** | due_date | qty | file_link | changes_note | status | spec_snapshot | last_updated_at | last_updated_by | order_type | type_spec_snapshot | production_cost |

### 1.2 추가할 컬럼

**R열(18번째 컬럼)**에 **vendor_id**를 추가합니다.

- **위치**: 맨 오른쪽 끝 (production_cost 다음)
- **헤더**: `vendor_id`
- **의미**: 제작업체 고유 ID (예: `cream`, `sky`). 로그인·필터링·단가 조회 시 이 값으로 매칭합니다.

### 1.3 구글 시트에서 할 작업

1. **jobs_raw** 시트를 연다.
2. **R열(또는 Q열 오른쪽 열)**을 추가한다.
   - 이미 열이 있다면: R1 셀에 헤더만 입력하면 됨.
   - 열이 없다면: 시트 끝에 열을 하나 삽입한 뒤 R1에 `vendor_id` 입력.
3. **1행(R1)**에 헤더 입력:
   ```
   vendor_id
   ```
4. **2행부터(기존 데이터 행)** R열에 값을 채운다 (아래 “기존 데이터 채우기” 참고).

---

## 2. 기존 데이터에 vendor_id 채우기

이미 있는 의뢰 데이터는 **vendor(출력실)** 값에 따라 **vendor_id**를 넣으면 됩니다.

### 2.1 매핑 규칙

| vendor (F열) 값 | vendor_id (R열)에 넣을 값 |
|-----------------|---------------------------|
| 크림팩토리 | `cream` |
| 스카이인디고 | `sky` |
| (그 외 사용 중인 출력실명) | vendors 시트에 등록한 해당 업체의 vendor_id |

### 2.2 채우기 방법

**방법 A: 수동 입력**
- F열이 "크림팩토리"인 행 → R열에 `cream` 입력
- F열이 "스카이인디고"인 행 → R열에 `sky` 입력
- 나머지 출력실도 vendors 시트의 vendor_id와 1:1로 맞춰 입력

**방법 B: 수식으로 한 번에**
- R2 셀에 아래 수식 입력 후, 아래로 끌어서 채우기:
  ```
  =IF(F2="크림팩토리","cream",IF(F2="스카이인디고","sky",""))
  ```
- 출력실이 더 있으면 `IF`를 이어서 추가:
  ```
  =IF(F2="크림팩토리","cream",IF(F2="스카이인디고","sky",IF(F2="다른업체명","다른_id","")))
  ```
- 수식 채우기가 끝나면, R열 전체를 **복사 → 값만 붙여넣기**해서 수식을 제거해 두어도 됩니다.

**방법 C: 빈 칸으로 두기**
- R열이 비어 있으면, 앱에서 “vendor(이름)으로 매칭” 등 **폴백 로직**을 둘 수 있습니다. (구현 시 선택 사항)

---

## 3. 수정 후 jobs_raw 최종 구조

| 컬럼 | A | B | ... | F | G | ... | Q | **R** |
|------|---|---|-----|---|---|---|-----|------|
| 헤더 | job_id | created_at | ... | vendor | due_date | ... | production_cost | **vendor_id** |
| 예시 | 20260218-... | 2026-02-18... | ... | 크림팩토리 | 2026-02-25 | ... | 69960 | **cream** |

- **vendor (F열)**: 그대로 둠. 화면에 “크림팩토리”처럼 **이름**으로 표시할 때 사용.
- **vendor_id (R열)**: 로그인한 제작업체와 비교·필터링·단가 조회용으로 사용.

---

## 4. spec_master 시트 (선택)

매체별 “기본 출력실”은 현재 **default_vendor**(이름) 한 개만 있습니다.

- **옵션 1 (권장)**: spec_master는 그대로 두고, 앱에서만 처리  
  - “출력실” 선택 시: vendors 목록을 보여 주고, 선택값의 **vendor_id**와 **vendor_name**을 함께 저장  
  - 새 의뢰 저장 시: `vendor` = vendor_name, `vendor_id` = vendor_id 로 jobs_raw에 기록  
  - 기존 default_vendor(이름)는 “기본 선택값”으로만 쓰고, 실제 저장 시에는 선택된 업체의 vendor_id를 R열에 넣음  

- **옵션 2**: spec_master에 **default_vendor_id** 컬럼 추가  
  - 예: D열 default_vendor, E열 default_vendor_id  
  - 매체별로 기본 제작업체를 vendor_id로 지정하고, 새 의뢰 시 이 값을 기본값으로 사용  

지금은 **옵션 1**만 해도 vendor_id 방식으로 충분히 관리 가능합니다. spec_master 수정은 나중에 필요하면 추가하면 됩니다.

---

## 5. 체크리스트

- [ ] jobs_raw 시트에 **R열** 추가
- [ ] R1에 헤더 **vendor_id** 입력
- [ ] 기존 모든 데이터 행의 R열에 **vendor_id** 채우기 (크림팩토리 → `cream` 등)
- [ ] vendors 시트에 등록한 **vendor_id**와 R열 값이 일치하는지 확인
- [ ] (선택) spec_master는 그대로 두고, 앱에서 vendor_id/vendor_name 매핑 처리

이렇게 수정하면, 이후 앱에서는 **vendor_id**만으로 제작업체 로그인·의뢰 목록 필터·단가 조회를 일관되게 할 수 있습니다.
