# 제작업체 등록 가이드

## 현재 상태

**현재는 Google Sheets에서 수동으로 등록해야 합니다.**

관리자 UI에서 업체를 추가/수정하는 기능은 아직 구현되지 않았습니다. 향후 구현 예정입니다.

---

## 📋 새로운 업체 등록 프로세스

### 1단계: PIN 번호 생성

터미널에서 새로운 PIN 번호의 해시를 생성합니다.

```bash
cd /Users/hoon/projects/print-order-board
node scripts/gen-pin-hash.js [6자리 PIN번호]
```

**예시:**
```bash
node scripts/gen-pin-hash.js 111111
```

**출력 예시:**
```
TEAM_PIN_HASH=$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUV
# .env에서 $ 문자가 깨지면 아래 사용:
TEAM_PIN_HASH_B64=JDJiJDEwJGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MTIzNDU2Nzg5MEFCQ0RFRkdISUpLTE1OT1BRUlNU
```

**중요:** `TEAM_PIN_HASH_B64=` 뒤의 값만 복사합니다 (예: `JDJiJDE0JGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MTIzNDU2Nzg5MEFCQ0RFRkdISUpLTE1OT1BRUlNU`)

---

### 2단계: Google Sheets에 업체 정보 입력

#### 2.1 `vendors` 시트에 업체 추가

1. Google Sheets의 `vendors` 시트 열기
2. 마지막 행 다음에 새 행 추가
3. 다음 정보 입력:

| 컬럼 | 값 | 설명 |
|------|-----|------|
| `vendor_id` | 예: `newvendor` | 고유 식별자 (영문 소문자, 하이픈 허용) |
| `vendor_name` | 예: `신규업체` | 표시명 (한글 가능) |
| `pin_hash_b64` | 1단계에서 생성한 해시 값 | PIN 해시 (base64) |
| `is_active` | `TRUE` | 활성화 여부 (`TRUE` 또는 `FALSE`) |
| `created_at` | `2026-02-18T00:00:00+09:00` | 생성일시 (ISO 8601 형식) |
| `updated_at` | `2026-02-18T00:00:00+09:00` | 수정일시 (ISO 8601 형식) |

**예시:**
```
vendor_id: newvendor
vendor_name: 신규업체
pin_hash_b64: JDJiJDE0JGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MTIzNDU2Nzg5MEFCQ0RFRkdISUpLTE1OT1BRUlNU
is_active: TRUE
created_at: 2026-02-18T00:00:00+09:00
updated_at: 2026-02-18T00:00:00+09:00
```

**주의사항:**
- `vendor_id`는 고유해야 합니다 (중복 불가)
- `pin_hash_b64` 값은 공백이나 줄바꿈 없이 입력해야 합니다
- `is_active`가 `FALSE`이면 로그인이 불가능합니다

---

#### 2.2 `vendor_pricing` 시트에 단가 정보 입력

1. Google Sheets의 `vendor_pricing` 시트 열기
2. 해당 업체의 단가 정보를 행 단위로 추가

**필수 항목:**

| vendor_id | item_type | item_name | unit_price | unit | notes |
|-----------|-----------|-----------|------------|------|-------|
| `newvendor` | `page` | `표지` | `300` | `페이지` | `A4 기준` |
| `newvendor` | `page` | `내지` | `300` | `페이지` | `A4 기준` |
| `newvendor` | `page` | `추가내지` | `300` | `페이지` | `A4 기준` |
| `newvendor` | `binding` | `무선제본` | `2000` | `권` | `-` |
| `newvendor` | `binding` | `중철제본` | `1500` | `권` | `-` |
| `newvendor` | `finishing` | `코팅` | `500` | `페이지` | `단면 기준 (2페이지)` |
| `newvendor` | `finishing` | `에폭시` | `120000` | `건` | `-` |

**주의사항:**
- `item_name`은 정확히 일치해야 합니다 (대소문자 구분)
- `item_type`은 `page`, `binding`, `finishing` 중 하나여야 합니다
- 단가가 입력되지 않으면 기본값(크림팩토리 단가)이 사용됩니다

---

### 3단계: 로그인 테스트

1. 생성한 PIN 번호로 로그인 시도
2. 해당 업체의 의뢰서만 표시되는지 확인
3. 상단에 업체명이 표시되는지 확인

---

## 🔄 업체 정보 수정

### PIN 번호 변경

1. 새로운 PIN 번호로 해시 생성 (1단계 참조)
2. Google Sheets의 `vendors` 시트에서 해당 업체 행의 `pin_hash_b64` 컬럼 수정
3. `updated_at` 컬럼도 현재 시간으로 업데이트

### 업체명 변경

1. Google Sheets의 `vendors` 시트에서 `vendor_name` 컬럼 수정
2. `updated_at` 컬럼도 현재 시간으로 업데이트

**주의:** `vendor_id`는 변경하지 마세요. 변경 시 기존 데이터와 연결이 끊어집니다.

---

## 🚫 업체 비활성화

업체를 일시적으로 비활성화하려면:

1. Google Sheets의 `vendors` 시트에서 해당 업체 행의 `is_active` 컬럼을 `FALSE`로 변경
2. `updated_at` 컬럼도 현재 시간으로 업데이트

비활성화된 업체는 로그인이 불가능합니다.

---

## 📝 전체 예시: "스카이인디고" 업체 추가

### 1. PIN 해시 생성
```bash
node scripts/gen-pin-hash.js 222222
```

출력:
```
TEAM_PIN_HASH_B64=JDJiJDE0JEd0Z2J6WVdwYzBqTXAxbk9tUDNLaC5rdFVMaE80VFE5NnFYMVliMHFheS9CTkxnWXA1Y3RX
```

### 2. vendors 시트에 추가
```
vendor_id: sky
vendor_name: 스카이인디고
pin_hash_b64: JDJiJDE0JEd0Z2J6WVdwYzBqTXAxbk9tUDNLaC5rdFVMaE80VFE5NnFYMVliMHFheS9CTkxnWXA1Y3RX
is_active: TRUE
created_at: 2026-02-18T00:00:00+09:00
updated_at: 2026-02-18T00:00:00+09:00
```

### 3. vendor_pricing 시트에 단가 추가
(크림팩토리와 동일한 단가를 사용하는 경우)
- 기존 크림팩토리 행들을 복사
- `vendor_id` 컬럼만 `sky`로 변경

---

## ⚠️ 주의사항

1. **PIN 번호 보안**
   - PIN 번호는 안전하게 보관하세요
   - 해시는 복호화할 수 없지만, PIN 번호 자체는 분실 시 재생성 필요

2. **vendor_id 고유성**
   - `vendor_id`는 고유해야 합니다
   - 중복되면 예상치 못한 동작이 발생할 수 있습니다

3. **단가 정보**
   - `vendor_pricing` 시트에 단가가 없으면 기본값이 사용됩니다
   - 제작비용 계산이 정확하지 않을 수 있으므로 반드시 단가를 입력하세요

4. **데이터 일관성**
   - `vendors` 시트와 `vendor_pricing` 시트의 `vendor_id`가 일치해야 합니다
   - `jobs_raw` 시트의 `vendor` 컬럼과 `vendor_id` 컬럼도 일치해야 합니다

---

## 🔮 향후 개선 계획

관리자 UI에서 업체를 추가/수정할 수 있는 기능을 구현할 예정입니다:
- `/vendors` 페이지: 제작업체 목록 조회
- `/vendors/new` 페이지: 제작업체 추가 (PIN 해시 자동 생성)
- `/vendors/[vendor_id]` 페이지: 제작업체 수정
- 단가 관리 UI

이 기능이 구현되면 Google Sheets에서 직접 수정할 필요가 없어집니다.
