import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SPEC_SHEET = "spec_master";
const JOBS_SHEET = "jobs_raw";

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
  // 하위 호환: 기존 데이터용
  pages?: string;
  print_color?: string;
}

const SPEC_HEADERS: (keyof SpecRow)[] = [
  "media_id", "media_name", "default_vendor", "trim_size", "cover_type",
  "cover_paper", "cover_print", "inner_pages", "inner_paper", "inner_print",
  "binding", "finishing", "packaging_delivery", "file_rule",
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
}

const JOB_HEADERS: (keyof JobRow)[] = [
  "job_id", "created_at", "requester_name", "media_id", "media_name",
  "vendor", "due_date", "qty", "file_link", "changes_note", "status",
  "spec_snapshot", "last_updated_at", "last_updated_by",
  "order_type", "type_spec_snapshot",
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
    range: `${SPEC_SHEET}!A:N`,
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
    range: `${SPEC_SHEET}!A:N`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
  clearSpecCache();
}

export async function updateSpecByMediaId(mediaId: string, updates: Partial<SpecRow>): Promise<boolean> {
  const { sheets, sheetId } = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SPEC_SHEET}!A:N`,
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
    const range = `${SPEC_SHEET}!A${i + 1}:N${i + 1}`;
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

export async function appendJob(row: Omit<JobRow, "job_id" | "created_at" | "last_updated_at">): Promise<string> {
  const id = jobId();
  const created = new Date().toISOString();
  const lastUpdated = created;
  const newRow: string[] = [
    id, created, row.requester_name, row.media_id, row.media_name,
    row.vendor, row.due_date, row.qty, row.file_link, row.changes_note,
    row.status ?? "접수", row.spec_snapshot, lastUpdated, row.last_updated_by ?? "",
    row.order_type ?? "", row.type_spec_snapshot ?? "",
  ];
  const { sheets, sheetId } = await getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${JOBS_SHEET}!A:P`,
    });
    const rows = res.data.values ?? [];
    const nextRow = rows.length + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${JOBS_SHEET}!A${nextRow}:P${nextRow}`,
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
  media_id?: string;
  q?: string;
}): Promise<JobRow[]> {
  const { sheets, sheetId } = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${JOBS_SHEET}!A:P`,
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
    range: `${JOBS_SHEET}!A:P`,
  });
  const rows = res.data.values ?? [];
  if (rows.length === 0) {
      if (attempt === maxRetries - 1)
        console.error(`[getJobById] jobs_raw sheet is empty or doesn't exist`);
      else await new Promise((r) => setTimeout(r, 800));
      continue;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const firstCell = normalizeCell(row[0]);
      if (firstCell === needle) return rowToJob(row);
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

export async function updateJob(
  jobId: string,
  updates: { status?: string; last_updated_by?: string }
): Promise<boolean> {
  const { sheets, sheetId } = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${JOBS_SHEET}!A:P`,
  });
  const rows = res.data.values ?? [];
  if (rows.length === 0) return false;
  const header = rows[0] ?? [];
  const hasHeader = headerCol(header, "job_id") !== -1;
  const jobIdCol = hasHeader ? headerCol(header, "job_id") : 0;
  const statusCol = hasHeader ? headerCol(header, "status") : JOB_HEADERS.indexOf("status");
  const lastUpdatedAtCol = hasHeader ? headerCol(header, "last_updated_at") : JOB_HEADERS.indexOf("last_updated_at");
  const lastUpdatedByCol = hasHeader ? headerCol(header, "last_updated_by") : JOB_HEADERS.indexOf("last_updated_by");
  const dataStart = hasHeader ? 1 : 0;

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if ((row[jobIdCol] ?? "").toString().trim() !== jobId.trim()) continue;
    const newRow: string[] = [...row];
    while (newRow.length < JOB_HEADERS.length) newRow.push("");
    if (updates.status !== undefined && statusCol >= 0) newRow[statusCol] = updates.status;
    if (updates.last_updated_by !== undefined && lastUpdatedByCol >= 0) newRow[lastUpdatedByCol] = updates.last_updated_by;
    if (lastUpdatedAtCol >= 0) newRow[lastUpdatedAtCol] = new Date().toISOString();
    const range = `${JOBS_SHEET}!A${i + 1}:P${i + 1}`;
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
