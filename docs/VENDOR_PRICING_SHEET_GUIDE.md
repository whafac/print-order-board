# vendor_pricing 시트 컬럼별 입력 가이드

## 시트 구조

**시트명**: `vendor_pricing`

**컬럼 구조** (첫 번째 행은 헤더):

| 컬럼 | A | B | C | D | E | F |
|------|---|---|---|---|---|---|
| 헤더 | vendor_id | item_type | item_name | unit_price | unit | notes |

---

## 컬럼별 설명 및 입력 값

### A열: `vendor_id`
- **의미**: 제작업체 고유 ID (vendors 시트의 vendor_id와 연결)
- **타입**: 텍스트
- **예시**: `cream`, `sky`
- **입력 규칙**: 
  - 영문 소문자, 하이픈 허용
  - vendors 시트에 등록된 vendor_id와 정확히 일치해야 함

### B열: `item_type`
- **의미**: 항목 유형 분류
- **타입**: 텍스트
- **가능한 값**: 
  - `page` (페이지 관련)
  - `binding` (제본 관련)
  - `finishing` (후가공 관련)
- **입력 규칙**: 위 3가지 중 하나만 사용

### C열: `item_name`
- **의미**: 항목명 (구체적인 항목 이름)
- **타입**: 텍스트
- **가능한 값**:
  - **item_type = "page"**일 때: `표지`, `내지`, `추가내지`
  - **item_type = "binding"**일 때: `무선제본`, `중철제본`
  - **item_type = "finishing"**일 때: `코팅`, `에폭시`
- **입력 규칙**: 
  - 한글 사용 가능
  - 코드에서 문자열 매칭에 사용되므로 정확한 이름 사용 (예: "무선제본", "중철제본")

### D열: `unit_price`
- **의미**: 단가 (1단위당 가격)
- **타입**: 숫자
- **예시**: `300`, `2000`, `1500`, `500`, `120000`
- **입력 규칙**: 
  - 숫자만 입력 (원 단위)
  - 소수점 없음

### E열: `unit`
- **의미**: 단위 (unit_price가 적용되는 단위)
- **타입**: 텍스트
- **가능한 값**:
  - `페이지` (page 타입)
  - `권` (binding 타입)
  - `건` (finishing 타입 중 에폭시)
  - `페이지` (finishing 타입 중 코팅)
- **입력 규칙**: 한글 사용

### F열: `notes`
- **의미**: 비고 (선택 사항)
- **타입**: 텍스트
- **예시**: `A4 기준`, `단면 기준`, `양면 기준`
- **입력 규칙**: 
  - 선택 사항이므로 비워둬도 됨
  - 참고 정보만 기록

---

## 크림팩토리 초기 데이터 (현재 사용 중인 단가)

| vendor_id | item_type | item_name | unit_price | unit | notes |
|-----------|-----------|-----------|------------|------|-------|
| cream | page | 표지 | 300 | 페이지 | A4 기준 |
| cream | page | 내지 | 300 | 페이지 | A4 기준 |
| cream | page | 추가내지 | 300 | 페이지 | A4 기준 |
| cream | binding | 무선제본 | 2000 | 권 | - |
| cream | binding | 중철제본 | 1500 | 권 | - |
| cream | finishing | 코팅 | 500 | 페이지 | 단면 기준 (2페이지) |
| cream | finishing | 에폭시 | 120000 | 건 | - |

**참고**: 
- 코팅은 단면 기준 2페이지(표1, 표4), 양면일 경우 4페이지로 계산됨
- 에폭시는 수량과 관계없이 건당 120,000원

---

## 스카이인디고 예시 데이터 (다른 단가 적용 시)

| vendor_id | item_type | item_name | unit_price | unit | notes |
|-----------|-----------|-----------|------------|------|-------|
| sky | page | 표지 | 280 | 페이지 | A4 기준 |
| sky | page | 내지 | 280 | 페이지 | A4 기준 |
| sky | page | 추가내지 | 280 | 페이지 | A4 기준 |
| sky | binding | 무선제본 | 1800 | 권 | - |
| sky | binding | 중철제본 | 1300 | 권 | - |
| sky | finishing | 코팅 | 450 | 페이지 | 단면 기준 (2페이지) |
| sky | finishing | 에폭시 | 110000 | 건 | - |

---

## 입력 시 주의사항

### 1. item_name 매칭 규칙
코드에서 다음과 같이 매칭하므로, 정확한 이름을 사용해야 합니다:

- **제본**: `binding.includes("무선제본")` → item_name은 **"무선제본"** 정확히
- **제본**: `binding.includes("중철제본")` → item_name은 **"중철제본"** 정확히
- **후가공**: `finishing.includes("에폭시")` → item_name은 **"에폭시"** 정확히
- **후가공**: `finishing.includes("코팅")` 또는 `finishing.includes("라미네이팅")` → item_name은 **"코팅"**으로 통일 (코팅/라미네이팅 모두 동일 단가)

### 2. 필수 항목
각 제작업체마다 최소한 다음 항목은 입력해야 합니다:
- 표지 (page)
- 내지 (page)
- 무선제본 (binding)
- 중철제본 (binding)
- 코팅 (finishing)
- 에폭시 (finishing)

### 3. 추가 내지
- `item_name`을 **"추가내지"**로 별도 입력하거나
- 또는 "내지"와 동일한 단가를 사용하도록 코드에서 처리 가능
- 현재 코드에서는 내지와 동일하게 300원/페이지 적용

### 4. 코팅/라미네이팅 통합
- 현재 코드에서는 "코팅", "라미네이팅", "라미테이팅" 모두 동일한 단가(500원/페이지) 적용
- 따라서 `item_name`은 **"코팅"** 하나만 등록하면 됨
- 코드에서 `finishing.includes("코팅") || finishing.includes("라미네이팅")`로 매칭

---

## Google Sheets 입력 예시 (복사-붙여넣기용)

### 크림팩토리 (첫 번째 행은 헤더, 2행부터 데이터)

```
vendor_id	item_type	item_name	unit_price	unit	notes
cream	page	표지	300	페이지	A4 기준
cream	page	내지	300	페이지	A4 기준
cream	page	추가내지	300	페이지	A4 기준
cream	binding	무선제본	2000	권	
cream	binding	중철제본	1500	권	
cream	finishing	코팅	500	페이지	단면 기준 (2페이지)
cream	finishing	에폭시	120000	건	
```

**입력 방법**:
1. 위 텍스트를 복사
2. Google Sheets의 `vendor_pricing` 시트에 붙여넣기
3. 탭(`\t`)으로 구분되어 자동으로 컬럼별로 입력됨

---

## 데이터 검증 체크리스트

- [ ] 각 제작업체(vendor_id)마다 최소 6개 항목(표지, 내지, 무선제본, 중철제본, 코팅, 에폭시) 입력
- [ ] vendor_id가 vendors 시트에 등록된 값과 일치하는지 확인
- [ ] item_type은 `page`, `binding`, `finishing` 중 하나만 사용
- [ ] item_name은 코드에서 사용하는 정확한 이름 사용 (무선제본, 중철제본, 코팅, 에폭시)
- [ ] unit_price는 숫자만 입력 (원 단위)
- [ ] unit은 한글로 입력 (페이지, 권, 건)

---

## 향후 확장 가능성

필요 시 추가할 수 있는 항목:
- `item_type: "finishing"`, `item_name: "박"`, `unit_price: XXX`, `unit: "건"`
- `item_type: "finishing"`, `item_name: "형압"`, `unit_price: XXX`, `unit: "건"`
- 기타 후가공 항목들

현재는 코팅과 에폭시만 등록해도 기본 기능은 동작합니다.
