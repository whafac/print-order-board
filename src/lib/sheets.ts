import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SPEC_SHEET = "spec_master";
const JOBS_SHEET = "jobs_raw";
const VENDORS_SHEET = "vendors";
const VENDOR_PRICING_SHEET = "vendor_pricing";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Google service account env not set");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export interface SpecRow {
  media_id: string;
  media_name: string;
  default_vendor: string;
  trim_size: string;
  cover_type: string;
  cover_paper: string;
  cover_print: string;
  inner_pages: string;
  inner_paper: string;
  inner_print: string;
  binding: string;
  finishing: string;
  packaging_delivery: string;
  file_rule: string;
  additional_inner_pages: string; // JSON 문자열로 저장
  // 하위 호환: 기존 데이터용
  pages?: string;
  print_color?: string;
}

const SPEC_HEADERS: (keyof SpecRow)[] = [
  "media_id", "media_name", "default_vendor", "trim_size", "cover_type",
  "cover_paper", "cover_print", "inner_pages", "inner_paper", "inner_print",
  "binding", "finishing", "packaging_delivery", "file_rule", "additional_inner_pages",
];

export interface JobRow {
  job_id: string;
  created_at: string;
  requester_name: string;
  media_id: string;
  media_name: string;
  vendor: string;
  due_date: string;
  qty: string;
  file_link: string;
  changes_note: string;
  status: string;
  spec_snapshot: string;
  last_updated_at: string;
  last_updated_by: string;
  order_type: string;
  type_spec_snapshot: string;
  production_cost?: string;
  vendor_id?: string; // vendor_id 방식 사용 시
}

export interface VendorRow {
  vendor_id: string;
  vendor_name: string;
  pin?: string; // PIN 평문 (관리자 확인용)
  pin_hash?: string;
  pin_hash_b64?: string;
  is_active: string; // "TRUE" | "FALSE"
  created_at?: string;
  updated_at?: string;
}

export interface VendorPricingRow {
  vendor_id: string;
  item_type: string; // "page" | "binding" | "finishing"
  item_name: string;
  unit_price: number;
  unit: string;
  notes?: string;
}

const JOB_HEADERS: (keyof JobRow)[] = [
  "job_id", "created_at", "requester_name", "media_id", "media_name",
  "vendor", "due_date", "qty", "file_link", "changes_note", "status",
  "spec_snapshot", "last_updated_at", "last_updated_by",
  "order_type", "type_spec_snapshot", "production_cost", "vendor_id",
];

const VENDOR_HEADERS: (keyof VendorRow)[] = [
  "vendor_id", "vendor_name", "pin", "pin_hash", "pin_hash_b64", "is_active", "created_at", "updated_at",
];

const VENDOR_PRICING_HEADERS: (keyof VendorPricingRow)[] = [
  "vendor_id", "item_type", "item_name", "unit_price", "unit", "notes",
];

function rowToSpecByHeader(row: string[], header: string[]): SpecRow {
  const o: Record<string, string> = {};
  const getVal = (name: string): string => {
    const col = headerCol(header, name);
    return col >= 0 ? (row[col] ?? "").toString().trim() : "";
  };
  o.media_id = getVal("media_id");
  o.media_name = getVal("media_name");
  o.default_vendor = getVal("default_vendor");
  o.trim_size = getVal("trim_size");
  o.cover_type = getVal("cover_type");
  o.cover_paper = getVal("cover_paper");
  o.cover_print = getVal("cover_print") || getVal("print_color");
  o.inner_pages = getVal("inner_pages") || getVal("pages");
  o.inner_paper = getVal("inner_paper");
  o.inner_print = getVal("inner_print") || getVal("print_color");
  o.binding = getVal("binding");
  o.finishing = getVal("finishing");
  o.packaging_delivery = getVal("packaging_delivery");
  o.file_rule = getVal("file_rule");
  o.additional_inner_pages = getVal("additional_inner_pages") || "";
  return o as unknown as SpecRow;
}

function rowToSpec(row: string[]): SpecRow {
  const o: Record<string, string> = {};
  SPEC_HEADERS.forEach((h, i) => { o[h] = row[i] ?? ""; });
  return o as unknown as SpecRow;
}

function rowToJob(row: string[]): JobRow {
  const o: Record<string, string> = {};
  JOB_HEADERS.forEach((h, i) => { o[h] = row[i] ?? ""; });
  return o as unknown as JobRow;
}

function rowToJobByHeader(row: string[], header: string[]): JobRow {
  const o: Record<string, string> = {};
  JOB_HEADERS.forEach((key) => {
    const col = headerCol(header, key);
    o[key] = col >= 0 ? (row[col] ?? "").toString().trim() : "";
  });
  return o as unknown as JobRow;
}

function rowToVendor(row: string[]): VendorRow {
  const o: Record<string, string> = {};
  VENDOR_HEADERS.forEach((h, i) => { o[h] = row[i] ?? ""; });
  return o as unknown as VendorRow;
}

function rowToVendorByHeader(row: string[], header: string[]): VendorRow {
  const o: Record<string, string> = {};
  VENDOR_HEADERS.forEach((key) => {
    const col = headerCol(header, key);
    o[key] = col >= 0 ? (row[col] ?? "").toString().trim() : "";
  });
  return o as unknown as VendorRow;
}

function rowToVendorPricing(row: string[]): VendorPricingRow {
  const o: Record<string, string | number> = {};
  VENDOR_PRICING_HEADERS.forEach((h, i) => {
    const val = row[i] ?? "";
    if (h === "unit_price") {
      o[h] = parseFloat(String(val)) || 0;
    } else {
      o[h] = String(val).trim();
    }
  });
  return o as unknown as VendorPricingRow;
}

function rowToVendorPricingByHeader(row: string[], header: string[]): VendorPricingRow {
  const o: Record<string, string | number> = {};
  VENDOR_PRICING_HEADERS.forEach((key) => {
    const col = headerCol(header, key);
    const val = col >= 0 ? (row[col] ?? "").toString().trim() : "";
    if (key === "unit_price") {
      o[key] = parseFloat(val) || 0;
    } else {
      o[key] = val;
    }
  });
  return o as unknown as VendorPricingRow;
}

// 낱장 제작금액 계산 (동기) - appendJob, API PATCH에서 사용
export function calculateSheetProductionCost(typeSpecJson: string): number | null {
  try {
    const typeSpec = JSON.parse(typeSpecJson) as Record<string, unknown>;
    const kindsCount = Math.max(1, parseInt(String(typeSpec.kinds_count || "1"), 10) || 1);
    const sheetsPerKind = Math.max(1, parseInt(String(typeSpec.sheets_per_kind || "1"), 10) || 1);
    const totalSheets = kindsCount * sheetsPerKind;
    const printCost = totalSheets * 300;
    let finishingCost = 0;
    const finishing = String(typeSpec.finishing || "").toLowerCase().trim();
    const printSide = String(typeSpec.print_side || "양면");
    if (!finishing.startsWith("없음") && finishing !== "") {
      if (finishing.includes("에폭시")) {
        finishingCost = 120000 * kindsCount;
      } else if (
        finishing.includes("코팅") ||
        finishing.includes("라미네이팅") ||
        finishing.includes("라미테이팅")
      ) {
        let coatingSheets = totalSheets;
        if (printSide === "양면") coatingSheets = totalSheets * 2;
        finishingCost = coatingSheets * 500;
      }
    }
    const subtotal = printCost + finishingCost;
    const vat = Math.floor(subtotal * 0.1);
    return subtotal + vat;
  } catch {
    return null;
  }
}

// 제작금액 계산 함수 (책자만)
export async function calculateProductionCostFromSpec(
  spec: Record<string, unknown>,
  qty: string,
  vendorId?: string
): Promise<number | null> {
  // 책자가 아니면 null 반환
  const orderType = String(spec.order_type || "");
  if (orderType !== "book") return null;

  // 페이지 수 추출 함수
  function extractPageCount(pageStr: string | undefined): number {
    if (!pageStr) return 0;
    const match = String(pageStr).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // 수량 추출
  const qtyNum = parseInt(qty.trim(), 10) || 1;

  // 단가 조회 함수 (vendorId가 있으면 vendor_pricing에서 조회, 없으면 기본값)
  async function getPrice(itemType: "page" | "binding" | "finishing", itemName: string, defaultValue: number): Promise<number> {
    if (vendorId) {
      const price = await getVendorPrice(vendorId, itemType, itemName);
      if (price !== null) return price;
    }
    return defaultValue;
  }

  // 표지 페이지 수 계산
  const coverPrint = String(spec.cover_print || spec.print_color || "");
  const coverPageCount = coverPrint.includes("단면") ? 2 : 4;
  const coverPrice = await getPrice("page", "표지", 300);
  const coverCost = coverPageCount * coverPrice * qtyNum;

  // 내지 페이지 수 계산
  const innerPages = String(spec.inner_pages || spec.pages || "");
  const innerPageCount = extractPageCount(innerPages);
  const innerPrice = await getPrice("page", "내지", 300);
  const innerCost = innerPageCount * innerPrice * qtyNum;

  // 추가 내지 비용 계산
  let additionalInnerCost = 0;
  const additionalPages = spec.additional_inner_pages;
  if (Array.isArray(additionalPages)) {
    const additionalPrice = await getPrice("page", "추가내지", 300);
    (additionalPages as Record<string, unknown>[]).forEach((item) => {
      const pageCount = extractPageCount(String(item.pages || ""));
      additionalInnerCost += pageCount * additionalPrice * qtyNum;
    });
  }

  // 제본 비용
  const binding = String(spec.binding || "");
  let bindingCost = 0;
  if (binding.includes("무선제본")) {
    const wirelessPrice = await getPrice("binding", "무선제본", 2000);
    bindingCost = wirelessPrice * qtyNum;
  } else if (binding.includes("중철제본")) {
    const saddlePrice = await getPrice("binding", "중철제본", 1500);
    bindingCost = saddlePrice * qtyNum;
  }

  // 후가공 비용
  const finishing = String(spec.finishing || "");
  const finishingLower = finishing.toLowerCase().trim();
  let finishingCost = 0;
  if (finishingLower.startsWith("없음") || finishingLower === "") {
    finishingCost = 0;
  } else if (finishingLower.includes("에폭시")) {
    const epoxyPrice = await getPrice("finishing", "에폭시", 120000);
    finishingCost = epoxyPrice;
  } else if (
    finishingLower.includes("코팅") ||
    finishingLower.includes("라미네이팅") ||
    finishingLower.includes("라미테이팅")
  ) {
    let coatingPageCount = 2;
    if (finishingLower.includes("양면")) {
      coatingPageCount = 4;
    }
    const coatingPrice = await getPrice("finishing", "코팅", 500);
    finishingCost = coatingPageCount * coatingPrice * qtyNum;
  }

  // 총 제작금액
  const subtotal = coverCost + innerCost + additionalInnerCost + bindingCost + finishingCost;
  const vat = Math.floor(subtotal * 0.1);
  const total = subtotal + vat;

  return total;
}

async function getSheets() {
  if (!SHEET_ID) throw new Error("GOOGLE_SHEET_ID not set");
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, sheetId: SHEET_ID };
}

const specCache: { data: SpecRow[]; at: number } = { data: [], at: 0 };
const CACHE_TTL = 60 * 1000;

function specDataStart(rows: string[][]): number {
  if (rows.length === 0) return 0;
  const first = rows[0] ?? [];
  return headerCol(first, "media_id") >= 0 ? 1 : 0;
}

export async function getSpecList(): Promise<SpecRow[]> {
  const now = Date.now();
  if (specCache.data.length && now - specCache.at < CACHE_TTL) {
    return specCache.data;
  }
  const { sheets, sheetId } = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SPEC_SHEET}!A:O`,
  });
  const rows = res.data.values ?? [];
  const start = specDataStart(rows);
  const header = rows[0] ?? [];
  const hasHeader = start === 1;
  const list: SpecRow[] = [];
  for (let i = start; i < rows.length; i++) {
    list.push(hasHeader ? rowToSpecByHeader(rows[i] ?? [], header) : rowToSpec(rows[i] ?? []));
  }
  specCache.data = list;
  specCache.at = now;
  return list;
}

export async function getSpecByMediaId(mediaId: string): Promise<SpecRow | null> {
  const list = await getSpecList();
  return list.find((s) => s.media_id === mediaId) ?? null;
}

function specToRow(s: SpecRow): string[] {
  return SPEC_HEADERS.map((h) => s[h] ?? "");
}

function clearSpecCache() {
  specCache.data = [];
  specCache.at = 0;
}

export async function appendSpec(spec: SpecRow): Promise<void> {
  const { sheets, sheetId } = await getSheets();
  const row = specToRow(spec);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${SPEC_SHEET}!A:O`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
  clearSpecCache();
}

export async function updateSpecByMediaId(mediaId: string, updates: Partial<SpecRow>): Promise<boolean> {
  const { sheets, sheetId } = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SPEC_SHEET}!A:O`,
  });
  const rows = res.data.values ?? [];
  if (rows.length < 1) return false;
  const header = rows[0] ?? [];
  const mediaIdColIdx = headerCol(header, "media_id");
  const mediaIdCol = mediaIdColIdx >= 0 ? mediaIdColIdx : 0;
  const dataStart = mediaIdColIdx >= 0 ? 1 : 0;
  const needle = normalizeCell(mediaId);
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (normalizeCell(row[mediaIdCol]) !== needle) continue;
    const current = headerCol(header, "media_id") >= 0 ? rowToSpecByHeader(row, header) : rowToSpec(row);
    const merged: SpecRow = { ...current, ...updates };
    const newRow = specToRow(merged);
    const range = `${SPEC_SHEET}!A${i + 1}:O${i + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });
    clearSpecCache();
    return true;
  }
  return false;
}

function jobId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const r = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${y}${m}${d}-${h}${min}${s}-${r}`;
}

function toKoreaTimeString(date: Date): string {
  // UTC 시간을 KST(+09:00)로 변환
  const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로 변환
  const kstTime = new Date(date.getTime() + kstOffset);
  
  // UTC 기준으로 포맷팅 (KST 시간대 정보는 +09:00으로 표시)
  const y = kstTime.getUTCFullYear();
  const m = String(kstTime.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kstTime.getUTCDate()).padStart(2, "0");
  const h = String(kstTime.getUTCHours()).padStart(2, "0");
  const min = String(kstTime.getUTCMinutes()).padStart(2, "0");
  const s = String(kstTime.getUTCSeconds()).padStart(2, "0");
  const ms = String(kstTime.getUTCMilliseconds()).padStart(3, "0");
  return `${y}-${m}-${d}T${h}:${min}:${s}.${ms}+09:00`;
}

export async function appendJob(row: Omit<JobRow, "job_id" | "created_at" | "last_updated_at">): Promise<string> {
  const id = jobId();
  const now = new Date();
  const created = toKoreaTimeString(now);
  const lastUpdated = created;
  
  // 제작금액 계산 (책자 및 낱장)
  let productionCost: string = "";
  if (row.order_type === "sheet" && row.type_spec_snapshot) {
    const cost = calculateSheetProductionCost(row.type_spec_snapshot);
    if (cost !== null) productionCost = String(cost);
  } else if (row.order_type === "book" && row.spec_snapshot) {
    try {
      const spec = JSON.parse(row.spec_snapshot);
      spec.order_type = row.order_type;
      const cost = await calculateProductionCostFromSpec(spec, row.qty, row.vendor_id);
      if (cost !== null) productionCost = String(cost);
    } catch {
      // JSON 파싱 실패 시 무시
    }
  }
  
  const newRow: string[] = [
    id, created, row.requester_name, row.media_id, row.media_name,
    row.vendor, row.due_date, row.qty, row.file_link, row.changes_note,
    row.status ?? "접수", row.spec_snapshot, lastUpdated, row.last_updated_by ?? "",
    row.order_type ?? "", row.type_spec_snapshot ?? "", productionCost, row.vendor_id ?? "",
  ];
  const { sheets, sheetId } = await getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${JOBS_SHEET}!A:R`, // vendor_id 컬럼 포함
    });
    const rows = res.data.values ?? [];
    const nextRow = rows.length + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${JOBS_SHEET}!A${nextRow}:R${nextRow}`, // vendor_id 컬럼 포함
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });
    console.log(`Job created: ${id} (row ${nextRow})`);
    return id;
  } catch (e) {
    console.error(`Failed to append job to ${JOBS_SHEET}:`, e);
    throw e;
  }
}

function norm(s: string): string {
  return String(s ?? "").toLowerCase().trim().replace(/\s+/g, "_");
}
function headerCol(header: string[], name: string): number {
  const n = norm(name);
  return header.findIndex((c) => norm(c) === n);
}

function jobsDataStart(rows: string[][]): number {
  if (rows.length === 0) return 0;
  const first = rows[0] ?? [];
  return headerCol(first, "job_id") !== -1 ? 1 : 0;
}

export async function getJobs(filters: {
  month?: string;
  status?: string;
  vendor?: string;
  vendor_id?: string; // 제작업체 필터링용
  media_id?: string;
  q?: string;
}): Promise<JobRow[]> {
  const { sheets, sheetId } = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${JOBS_SHEET}!A:R`, // vendor_id 컬럼 포함
  });
  const rows = res.data.values ?? [];
  const start = jobsDataStart(rows);
  const header = rows[0] ?? [];
  const hasHeader = start === 1;
  let list: JobRow[] = [];
  for (let i = start; i < rows.length; i++) {
    const row = rows[i] ?? [];
    list.push(hasHeader ? rowToJobByHeader(row, header) : rowToJob(row));
  }

  if (filters.month) {
    const [y, m] = filters.month.split("-");
    list = list.filter((j) => {
      const raw = (j.created_at ?? "").toString().trim();
      const datePart = raw.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(datePart)) return datePart === `${y}-${m}`;
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime()))
        return parsed.getFullYear() === Number(y) && parsed.getMonth() + 1 === Number(m);
      return false;
    });
  }
  if (filters.status) list = list.filter((j) => j.status === filters.status);
  if (filters.vendor) list = list.filter((j) => j.vendor === filters.vendor);
  if (filters.vendor_id) {
    // vendor_id로 필터링
    list = list.filter((j) => {
      // vendor_id 컬럼이 있으면 그것으로 매칭
      if (j.vendor_id) return j.vendor_id === filters.vendor_id;
      // 없으면 vendor 이름으로 매칭 (하위 호환을 위해 vendors 시트에서 조회)
      // 이 부분은 getVendors 함수가 정의된 후에 동적으로 처리
      return false; // 일단 vendor_id 컬럼이 없으면 제외 (나중에 개선 가능)
    });
  }
  if (filters.media_id) list = list.filter((j) => j.media_id === filters.media_id);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (j) =>
        j.job_id.toLowerCase().includes(q) ||
        j.requester_name.toLowerCase().includes(q) ||
        j.media_name.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  return list;
}

function normalizeCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\uFEFF/g, "")
    .trim();
}

export async function getJobById(jobId: string): Promise<JobRow | null> {
  const needle = normalizeCell(jobId);
  const maxRetries = 2;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { sheets, sheetId } = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${JOBS_SHEET}!A:R`, // vendor_id 컬럼 포함
  });
  const rows = res.data.values ?? [];
  if (rows.length === 0) {
      if (attempt === maxRetries - 1)
        console.error(`[getJobById] jobs_raw sheet is empty or doesn't exist`);
      else await new Promise((r) => setTimeout(r, 800));
      continue;
    }

    const header = rows[0] ?? [];
    const hasHeader = headerCol(header, "job_id") >= 0;
    for (let i = hasHeader ? 1 : 0; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const firstCell = normalizeCell(row[0]);
      if (firstCell === needle) {
        return hasHeader ? rowToJobByHeader(row, header) : rowToJob(row);
      }
    }

    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 800));
    } else {
      console.warn(
        `[getJobById] Job not found. jobId=${jobId} rows=${rows.length} firstRowA=${normalizeCell((rows[0] ?? [])[0])}`
      );
    }
  }
  return null;
}

const JOB_CONTENT_KEYS: (keyof JobRow)[] = [
  "requester_name", "media_id", "media_name", "vendor", "due_date", "qty",
  "file_link", "changes_note", "spec_snapshot", "type_spec_snapshot",
  "status", "last_updated_by", "production_cost",
];

export async function updateJobContent(jobId: string, updates: Partial<JobRow>): Promise<boolean> {
  const { sheets, sheetId } = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${JOBS_SHEET}!A:R`,
  });
  const rows = res.data.values ?? [];
  if (rows.length === 0) return false;
  const header = rows[0] ?? [];
  const hasHeader = headerCol(header, "job_id") !== -1;
  const jobIdCol = hasHeader ? headerCol(header, "job_id") : 0;
  const dataStart = hasHeader ? 1 : 0;
  const needle = normalizeCell(jobId);

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (normalizeCell(row[jobIdCol]) !== needle) continue;

    const numCols = Math.max(header.length, 18);
    const newRow: string[] = Array.from({ length: numCols }, (_, c) =>
      c < row.length ? String(row[c] ?? "") : ""
    );

    const lastUpdatedAtCol = headerCol(header, "last_updated_at");
    if (lastUpdatedAtCol >= 0) newRow[lastUpdatedAtCol] = new Date().toISOString();

    for (const key of JOB_CONTENT_KEYS) {
      if (updates[key] === undefined) continue;
      const col = headerCol(header, key);
      if (col >= 0) newRow[col] = String(updates[key] ?? "");
    }

    const range = `${JOBS_SHEET}!A${i + 1}:R${i + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });
    return true;
  }
  return false;
}

export async function updateJob(
  jobId: string,
  updates: { status?: string; last_updated_by?: string; production_cost?: string }
): Promise<boolean> {
  const { sheets, sheetId } = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${JOBS_SHEET}!A:R`, // vendor_id 컬럼 포함
  });
  const rows = res.data.values ?? [];
  if (rows.length === 0) return false;
  const header = rows[0] ?? [];
  const hasHeader = headerCol(header, "job_id") !== -1;
  const jobIdCol = hasHeader ? headerCol(header, "job_id") : 0;
  const statusCol = hasHeader ? headerCol(header, "status") : JOB_HEADERS.indexOf("status");
  const lastUpdatedAtCol = hasHeader ? headerCol(header, "last_updated_at") : JOB_HEADERS.indexOf("last_updated_at");
  const lastUpdatedByCol = hasHeader ? headerCol(header, "last_updated_by") : JOB_HEADERS.indexOf("last_updated_by");
  const productionCostCol = hasHeader ? headerCol(header, "production_cost") : JOB_HEADERS.indexOf("production_cost");
  const dataStart = hasHeader ? 1 : 0;

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if ((row[jobIdCol] ?? "").toString().trim() !== jobId.trim()) continue;
    const newRow: string[] = [...row];
    while (newRow.length < JOB_HEADERS.length) newRow.push("");
    if (updates.status !== undefined && statusCol >= 0) newRow[statusCol] = updates.status;
    if (updates.last_updated_by !== undefined && lastUpdatedByCol >= 0) newRow[lastUpdatedByCol] = updates.last_updated_by;
    if (updates.production_cost !== undefined && productionCostCol >= 0) newRow[productionCostCol] = updates.production_cost;
    if (lastUpdatedAtCol >= 0) newRow[lastUpdatedAtCol] = new Date().toISOString();
    const range = `${JOBS_SHEET}!A${i + 1}:R${i + 1}`; // vendor_id 컬럼 포함
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });
    return true;
  }
  return false;
}

// ========== Vendors 관련 함수 ==========

function vendorsDataStart(rows: string[][]): number {
  if (rows.length === 0) return 0;
  const first = rows[0] ?? [];
  return headerCol(first, "vendor_id") >= 0 ? 1 : 0;
}

export async function getVendors(): Promise<VendorRow[]> {
  const { sheets, sheetId } = await getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${VENDORS_SHEET}!A:G`, // 7개 컬럼
    });
    const rows = res.data.values ?? [];
    console.log(`[getVendors] Fetched ${rows.length} rows from ${VENDORS_SHEET}`);
    const start = vendorsDataStart(rows);
    const header = rows[0] ?? [];
    const hasHeader = start === 1;
    console.log(`[getVendors] Header row: ${hasHeader ? "yes" : "no"}, headers:`, header);
    const list: VendorRow[] = [];
    for (let i = start; i < rows.length; i++) {
      const row = rows[i] ?? [];
      if (!row[0]?.toString().trim()) continue; // vendor_id가 비어있으면 스킵
      const vendor = hasHeader ? rowToVendorByHeader(row, header) : rowToVendor(row);
      console.log(`[getVendors] Vendor ${i}: id=${vendor.vendor_id}, name=${vendor.vendor_name}, pin_hash_b64=${vendor.pin_hash_b64 ? "exists" : "empty"}, is_active=${vendor.is_active}`);
      // is_active가 없거나 TRUE이면 포함 (기본값: 활성화)
      if (!vendor.is_active || vendor.is_active === "TRUE" || vendor.is_active === "true") {
        list.push(vendor);
      }
    }
    console.log(`[getVendors] Returning ${list.length} active vendors`);
    return list;
  } catch (e) {
    console.error(`Failed to get vendors from ${VENDORS_SHEET}:`, e);
    return [];
  }
}

export async function getVendorById(vendorId: string): Promise<VendorRow | null> {
  const vendors = await getVendors();
  return vendors.find((v) => v.vendor_id === vendorId) ?? null;
}

export async function getVendorByPin(pin: string): Promise<VendorRow | null> {
  const vendors = await getVendors();
  console.log(`[getVendorByPin] Checking PIN for ${vendors.length} vendors`);
  for (const vendor of vendors) {
    const hash = vendor.pin_hash_b64
      ? Buffer.from(vendor.pin_hash_b64, "base64").toString("utf8")
      : vendor.pin_hash ?? "";
    if (!hash) {
      console.log(`[getVendorByPin] Vendor ${vendor.vendor_id} has no PIN hash`);
      continue;
    }
    try {
      const bcrypt = await import("bcrypt");
      const match = await bcrypt.compare(pin, hash);
      if (match) {
        console.log(`[getVendorByPin] PIN matched for vendor: ${vendor.vendor_id} (${vendor.vendor_name})`);
        return vendor;
      }
    } catch (e) {
      // bcrypt 비교 실패 시 다음 vendor 확인
      console.error(`[getVendorByPin] Error comparing PIN for vendor ${vendor.vendor_id}:`, e);
      continue;
    }
  }
  console.log(`[getVendorByPin] No vendor found matching PIN`);
  return null;
}

// ========== Vendor Pricing 관련 함수 ==========

function vendorPricingDataStart(rows: string[][]): number {
  if (rows.length === 0) return 0;
  const first = rows[0] ?? [];
  return headerCol(first, "vendor_id") >= 0 ? 1 : 0;
}

export async function getVendorPricing(vendorId: string): Promise<VendorPricingRow[]> {
  const { sheets, sheetId } = await getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${VENDOR_PRICING_SHEET}!A:F`,
    });
    const rows = res.data.values ?? [];
    const start = vendorPricingDataStart(rows);
    const header = rows[0] ?? [];
    const hasHeader = start === 1;
    const list: VendorPricingRow[] = [];
    for (let i = start; i < rows.length; i++) {
      const row = rows[i] ?? [];
      if (!row[0]?.toString().trim()) continue; // vendor_id가 비어있으면 스킵
      const pricing = hasHeader ? rowToVendorPricingByHeader(row, header) : rowToVendorPricing(row);
      if (pricing.vendor_id === vendorId) {
        list.push(pricing);
      }
    }
    return list;
  } catch (e) {
    console.error(`Failed to get vendor pricing from ${VENDOR_PRICING_SHEET}:`, e);
    return [];
  }
}

export async function getVendorPrice(
  vendorId: string,
  itemType: "page" | "binding" | "finishing",
  itemName: string
): Promise<number | null> {
  const pricing = await getVendorPricing(vendorId);
  const item = pricing.find(
    (p) => p.item_type === itemType && p.item_name === itemName
  );
  return item ? item.unit_price : null;
}

// ========== Vendor CRUD 함수 ==========

function vendorToRow(vendor: VendorRow): string[] {
  // Google Sheets 컬럼 순서: vendor_id, vendor_name, pin (평문), pin_hash_b64, is_active, created_at, updated_at
  return [
    vendor.vendor_id,
    vendor.vendor_name,
    vendor.pin ?? "", // C 컬럼: PIN 평문 (관리자 확인용)
    vendor.pin_hash_b64 ?? "", // D 컬럼: PIN 해시
    vendor.is_active ?? "TRUE", // E 컬럼
    vendor.created_at ?? "",
    vendor.updated_at ?? "",
  ];
}

export async function createVendor(vendor: Omit<VendorRow, "created_at" | "updated_at">): Promise<boolean> {
  const { sheets, sheetId } = await getSheets();
  const now = toKoreaTimeString(new Date());
  const newVendor: VendorRow = {
    ...vendor,
    created_at: now,
    updated_at: now,
  };
  const row = vendorToRow(newVendor);
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${VENDORS_SHEET}!A:G`, // vendor_id, vendor_name, pin, pin_hash_b64, is_active, created_at, updated_at (7개 컬럼)
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    return true;
  } catch (e) {
    console.error(`Failed to create vendor:`, e);
    return false;
  }
}

export async function updateVendor(vendorId: string, updates: Partial<VendorRow>): Promise<boolean> {
  const { sheets, sheetId } = await getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${VENDORS_SHEET}!A:G`, // 7개 컬럼
    });
    const rows = res.data.values ?? [];
    const start = vendorsDataStart(rows);
    const header = rows[0] ?? [];
    const hasHeader = start === 1;
    const vendorIdCol = hasHeader ? headerCol(header, "vendor_id") : 0;
    const dataStart = hasHeader ? 1 : 0;

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i] ?? [];
      if (normalizeCell(row[vendorIdCol]) !== vendorId) continue;

      const current = hasHeader ? rowToVendorByHeader(row, header) : rowToVendor(row);
      const merged: VendorRow = {
        ...current,
        ...updates,
        updated_at: toKoreaTimeString(new Date()),
      };
      const newRow = vendorToRow(merged);
      const range = `${VENDORS_SHEET}!A${i + 1}:G${i + 1}`; // 7개 컬럼
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [newRow] },
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error(`Failed to update vendor:`, e);
    return false;
  }
}

export async function deleteVendor(vendorId: string): Promise<boolean> {
  const { sheets, sheetId } = await getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${VENDORS_SHEET}!A:G`, // 7개 컬럼
    });
    const rows = res.data.values ?? [];
    const start = vendorsDataStart(rows);
    const header = rows[0] ?? [];
    const hasHeader = start === 1;
    const vendorIdCol = hasHeader ? headerCol(header, "vendor_id") : 0;
    const dataStart = hasHeader ? 1 : 0;

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i] ?? [];
      if (normalizeCell(row[vendorIdCol]) !== vendorId) continue;

      // 행 삭제
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: await getSheetIdByName(sheetId, VENDORS_SHEET),
                  dimension: "ROWS",
                  startIndex: i,
                  endIndex: i + 1,
                },
              },
            },
          ],
        },
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error(`Failed to delete vendor:`, e);
    return false;
  }
}

async function getSheetIdByName(spreadsheetId: string, sheetName: string): Promise<number> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = res.data.sheets?.find((s) => s.properties?.title === sheetName);
  return sheet?.properties?.sheetId ?? 0;
}
