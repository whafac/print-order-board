# 제작비 산출 기능 - JSON 구조 적합성 분석

## 1. 현재 JSON 구조 (추가 내지 포함)

```json
{
  "media_id": "book001",
  "media_name": "책자명",
  "trim_size": "212×280",
  "cover_type": "하드커버",
  "cover_paper": "아르떼210g",
  "cover_print": "양면8도",
  "inner_pages": "60p",
  "inner_paper": "네오스타100g",
  "inner_print": "양면8도",
  "binding": "무선제본",
  "finishing": "표지 바니쉬코팅",
  "packaging_delivery": "개별포장",
  "file_rule": "",
  "additional_inner_pages": [
    {
      "type": "면지",
      "pages": "4",
      "paper": "아르떼210g(울트라화이트)",
      "print": "양면8도컬러"
    },
    {
      "type": "엽서",
      "pages": "2",
      "paper": "스노우120g",
      "print": "단면4도컬러"
    }
  ]
}
```

## 2. 제작비 산출 로직 예시

### 2.1 데이터 파싱 및 접근

```typescript
interface AdditionalInnerPage {
  type: string;      // 면지, 엽서, 별지 등
  pages: string;      // 페이지 수
  paper: string;      // 용지 정보
  print: string;      // 인쇄 방법
}

interface SpecSnapshot {
  // 기본 필드
  cover_type: string;
  cover_paper: string;
  cover_print: string;
  inner_pages: string;
  inner_paper: string;
  inner_print: string;
  binding: string;
  finishing: string;
  packaging_delivery: string;
  
  // 추가 내지 (배열)
  additional_inner_pages?: AdditionalInnerPage[];
}

function calculateCost(specSnapshot: string, qty: number): number {
  const spec: SpecSnapshot = JSON.parse(specSnapshot);
  
  let totalCost = 0;
  
  // 1. 표지 비용 계산
  totalCost += calculateCoverCost(
    spec.cover_type,
    spec.cover_paper,
    spec.cover_print,
    qty
  );
  
  // 2. 기본 내지 비용 계산
  const innerPageCount = parsePageCount(spec.inner_pages); // "60p" -> 60
  totalCost += calculateInnerCost(
    innerPageCount,
    spec.inner_paper,
    spec.inner_print,
    qty
  );
  
  // 3. 추가 내지 비용 계산 (배열 반복 처리)
  if (spec.additional_inner_pages && spec.additional_inner_pages.length > 0) {
    spec.additional_inner_pages.forEach((additional) => {
      const pageCount = parseInt(additional.pages) || 0;
      totalCost += calculateAdditionalInnerCost(
        additional.type,      // 면지, 엽서 등
        pageCount,
        additional.paper,
        additional.print,
        qty
      );
    });
  }
  
  // 4. 제본 비용
  totalCost += calculateBindingCost(spec.binding, qty);
  
  // 5. 후가공 비용
  totalCost += calculateFinishingCost(spec.finishing, qty);
  
  // 6. 포장/납품 비용
  totalCost += calculatePackagingCost(spec.packaging_delivery, qty);
  
  return totalCost;
}
```

## 3. JSON 구조의 장점 (제작비 산출 관점)

### ✅ 3.1 명확한 데이터 접근
- **표지/기본 내지**: 평면적 구조로 `spec.cover_paper`, `spec.inner_pages` 등 직접 접근
- **추가 내지**: 배열 구조로 `spec.additional_inner_pages[0].type` 등 명확한 접근

### ✅ 3.2 반복 처리 용이
```typescript
// 추가 내지 배열을 순회하며 각각 비용 계산
spec.additional_inner_pages?.forEach((item) => {
  // 각 항목별로 독립적인 비용 계산 가능
  const cost = calculateItemCost(item.type, item.pages, item.paper, item.print);
  totalCost += cost;
});
```

### ✅ 3.3 유연한 데이터 처리
- **0개 추가 내지**: `additional_inner_pages`가 없거나 빈 배열 → 비용 0
- **N개 추가 내지**: 배열 길이만큼 반복 처리
- **각 항목별 다른 계산**: `type`에 따라 다른 비용 계산 로직 적용 가능

### ✅ 3.4 타입 안정성
```typescript
// TypeScript 인터페이스로 타입 안정성 확보
interface AdditionalInnerPage {
  type: string;
  pages: string;
  paper: string;
  print: string;
}

// 컴파일 타임에 타입 체크 가능
function calculateAdditionalCost(item: AdditionalInnerPage): number {
  // item.type, item.pages 등 자동완성 및 타입 체크
}
```

## 4. 제작비 산출 시나리오별 처리

### 시나리오 1: 추가 내지 없음
```json
{
  "inner_pages": "60p",
  "inner_paper": "네오스타100g",
  "inner_print": "양면8도"
  // additional_inner_pages 없음
}
```
**처리**: `spec.additional_inner_pages`가 없으므로 기본 내지 비용만 계산

### 시나리오 2: 추가 내지 1개
```json
{
  "inner_pages": "60p",
  "additional_inner_pages": [
    {"type": "면지", "pages": "4", "paper": "...", "print": "..."}
  ]
}
```
**처리**: 기본 내지 비용 + 면지 비용 계산

### 시나리오 3: 추가 내지 여러 개
```json
{
  "inner_pages": "60p",
  "additional_inner_pages": [
    {"type": "면지", "pages": "4", ...},
    {"type": "엽서", "pages": "2", ...},
    {"type": "별지", "pages": "8", ...}
  ]
}
```
**처리**: 기본 내지 비용 + 면지 비용 + 엽서 비용 + 별지 비용 계산

## 5. 제작비 산출 함수 예시 (구현 가능성)

```typescript
// 제작비 산출 유틸리티 함수
export function calculateProductionCost(
  specSnapshot: string,
  qty: number
): ProductionCostBreakdown {
  const spec: SpecSnapshot = JSON.parse(specSnapshot);
  
  const breakdown: ProductionCostBreakdown = {
    cover: 0,
    inner: 0,
    additionalInner: [],
    binding: 0,
    finishing: 0,
    packaging: 0,
    total: 0
  };
  
  // 표지 비용
  breakdown.cover = calculateCoverCost(
    spec.cover_type,
    spec.cover_paper,
    spec.cover_print,
    qty
  );
  
  // 기본 내지 비용
  breakdown.inner = calculateInnerCost(
    parsePageCount(spec.inner_pages),
    spec.inner_paper,
    spec.inner_print,
    qty
  );
  
  // 추가 내지 비용 (배열 처리)
  if (spec.additional_inner_pages) {
    spec.additional_inner_pages.forEach((item, index) => {
      const cost = calculateAdditionalInnerCost(
        item.type,
        parseInt(item.pages) || 0,
        item.paper,
        item.print,
        qty
      );
      breakdown.additionalInner.push({
        type: item.type,
        pages: item.pages,
        cost: cost
      });
    });
  }
  
  // 제본, 후가공, 포장 비용
  breakdown.binding = calculateBindingCost(spec.binding, qty);
  breakdown.finishing = calculateFinishingCost(spec.finishing, qty);
  breakdown.packaging = calculatePackagingCost(spec.packaging_delivery, qty);
  
  // 총합 계산
  breakdown.total = 
    breakdown.cover +
    breakdown.inner +
    breakdown.additionalInner.reduce((sum, item) => sum + item.cost, 0) +
    breakdown.binding +
    breakdown.finishing +
    breakdown.packaging;
  
  return breakdown;
}
```

## 6. 결론

### ✅ JSON 구조는 제작비 산출에 적합합니다

**이유:**
1. **명확한 데이터 구조**: 표지/기본 내지는 평면적, 추가 내지는 배열로 구분
2. **반복 처리 용이**: 배열 구조로 `forEach` 등으로 쉽게 순회 가능
3. **유연한 데이터 처리**: 0개~N개 추가 내지 모두 처리 가능
4. **타입 안정성**: TypeScript 인터페이스로 타입 체크 가능
5. **확장성**: 나중에 추가 내지 항목에 필드 추가 시에도 구조 유지

**제작비 산출 시 고려사항:**
- `additional_inner_pages`가 없을 수 있으므로 옵셔널 체이닝(`?.`) 사용
- 빈 배열 체크로 불필요한 반복 방지
- 각 추가 내지 항목의 `type`에 따라 다른 비용 계산 로직 적용 가능

**구현 시 권장사항:**
- TypeScript 인터페이스 정의로 타입 안정성 확보
- 각 비용 계산 함수를 분리하여 유지보수성 향상
- 추가 내지 배열을 순회하는 로직을 별도 함수로 분리
