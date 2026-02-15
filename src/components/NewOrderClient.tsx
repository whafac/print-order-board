"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const REQUESTER_KEY = "print_order_requester_name";

function getStoredRequester(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REQUESTER_KEY) ?? "";
}

function setStoredRequester(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REQUESTER_KEY, name);
}

const SHEET_FINISHING_OPTIONS = [
  "무광코팅",
  "유광코팅",
  "에폭시",
  "박",
  "형압",
  "도무송",
  "오시",
  "미싱",
  "접지",
  "넘버링",
] as const;

interface Spec {
  media_id: string;
  media_name: string;
  default_vendor: string;
  trim_size: string;
  pages: string;
  cover_paper: string;
  inner_paper: string;
  print_color: string;
  binding: string;
  finishing: string;
  packaging_delivery: string;
  file_rule: string;
}

export function NewOrderClient() {
  const router = useRouter();
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [orderType, setOrderType] = useState<"book" | "sheet">("book");
  const [requesterName, setRequesterName] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [vendor, setVendor] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [qty, setQty] = useState("");
  const [fileLink, setFileLink] = useState("");
  const [changesNote, setChangesNote] = useState("");
  const [spec, setSpec] = useState<Spec | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<"ok" | "err" | null>(null);

  // 낱장 전용
  const [sheetMediaName, setSheetMediaName] = useState("낱장 인쇄물");
  const [size, setSize] = useState("");
  const [paperName, setPaperName] = useState("");
  const [paperWeight, setPaperWeight] = useState("");
  const [paperColor, setPaperColor] = useState("");
  const [printSide, setPrintSide] = useState<"단면" | "양면">("양면");
  const [printColor, setPrintColor] = useState<"먹1도" | "컬러">("컬러");
  const [finishing, setFinishing] = useState<Record<string, boolean>>({});
  const [finishingEtc, setFinishingEtc] = useState("");
  const [cutting, setCutting] = useState<"필요없음" | "정재단">("필요없음");
  const [kindsCountStr, setKindsCountStr] = useState("1");
  const [sheetsPerKindStr, setSheetsPerKindStr] = useState("1");
  const [extraRequest, setExtraRequest] = useState("");
  const [receiveMethod, setReceiveMethod] = useState<"완료시 전화요망" | "완료시 방문수령">("완료시 전화요망");
  const [sheetSuggestions, setSheetSuggestions] = useState<{
    size: string[];
    paper_name: string[];
    paper_weight: string[];
    paper_color: string[];
  }>({ size: [], paper_name: [], paper_weight: [], paper_color: [] });
  const [activeSuggestions, setActiveSuggestions] = useState<"size" | "paper_name" | "paper_weight" | "paper_color" | null>(null);
  const sizeWrapperRef = useRef<HTMLDivElement>(null);
  const paperNameWrapperRef = useRef<HTMLDivElement>(null);
  const paperWeightWrapperRef = useRef<HTMLDivElement>(null);
  const paperColorWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRequesterName(getStoredRequester());
    fetch("/api/spec")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setSpecs(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (orderType !== "sheet") return;
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data: { order_type?: string; type_spec_snapshot?: string }[]) => {
        if (!Array.isArray(data)) return;
        const sizeSet = new Set<string>();
        const paperNameSet = new Set<string>();
        const paperWeightSet = new Set<string>();
        const paperColorSet = new Set<string>();
        const MAX = 20;
        for (const job of data) {
          if (job.order_type !== "sheet" || !job.type_spec_snapshot) continue;
          try {
            const spec = JSON.parse(job.type_spec_snapshot) as Record<string, unknown>;
            if (typeof spec.size === "string" && spec.size.trim() && sizeSet.size < MAX) sizeSet.add(spec.size.trim());
            if (typeof spec.paper_name === "string" && spec.paper_name.trim() && paperNameSet.size < MAX) paperNameSet.add(spec.paper_name.trim());
            if (typeof spec.paper_weight === "string" && spec.paper_weight.trim() && paperWeightSet.size < MAX) paperWeightSet.add(spec.paper_weight.trim());
            if (typeof spec.paper_color === "string" && spec.paper_color.trim() && paperColorSet.size < MAX) paperColorSet.add(spec.paper_color.trim());
          } catch {
            // ignore parse error
          }
        }
        setSheetSuggestions({
          size: Array.from(sizeSet),
          paper_name: Array.from(paperNameSet),
          paper_weight: Array.from(paperWeightSet),
          paper_color: Array.from(paperColorSet),
        });
      })
      .catch(() => {});
  }, [orderType]);

  useEffect(() => {
    if (!activeSuggestions) return;
    const ref =
      activeSuggestions === "size"
        ? sizeWrapperRef
        : activeSuggestions === "paper_name"
          ? paperNameWrapperRef
          : activeSuggestions === "paper_weight"
            ? paperWeightWrapperRef
            : paperColorWrapperRef;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        setActiveSuggestions(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [activeSuggestions]);

  useEffect(() => {
    if (!mediaId) {
      setSpec(null);
      setVendor("");
      return;
    }
    const s = specs.find((x) => x.media_id === mediaId) ?? null;
    setSpec(s);
    setVendor(s?.default_vendor ?? "");
  }, [mediaId, specs]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function setFinishingOption(key: string, checked: boolean) {
    setFinishing((prev) => ({ ...prev, [key]: checked }));
  }

  function filterSuggestions(list: string[], value: string): string[] {
    if (!value.trim()) return list.slice(0, 10);
    const v = value.trim().toLowerCase();
    return list.filter((s) => s.toLowerCase().includes(v)).slice(0, 10);
  }

  function SuggestionDropdown({
    field,
    value,
    onSelect,
  }: {
    field: "size" | "paper_name" | "paper_weight" | "paper_color";
    value: string;
    onSelect: (s: string) => void;
  }) {
    const list = sheetSuggestions[field];
    const filtered = filterSuggestions(list, value);
    const open = activeSuggestions === field && filtered.length > 0;
    if (!open) return null;
    return (
      <ul
        className="absolute left-0 right-0 top-full z-10 mt-0.5 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        onPointerDown={(e) => e.preventDefault()}
      >
        {filtered.map((s) => (
          <li
            key={s}
            role="button"
            tabIndex={-1}
            className="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 active:bg-slate-200"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(s);
              setActiveSuggestions(null);
            }}
          >
            {s}
          </li>
        ))}
      </ul>
    );
  }

  function getMissingRequiredFields(): string[] {
    const missing: string[] = [];
    if (!requesterName.trim()) missing.push("의뢰자 이름");
    if (!dueDate) missing.push("납기일");
    if (!vendor.trim()) missing.push("출력실");
    if (orderType === "book") {
      if (!mediaId) missing.push("매체");
      if (!qty.trim()) missing.push("수량");
    } else {
      if (!sheetMediaName.trim()) missing.push("매체명");
      if (!size.trim()) missing.push("낱장 사양 1. 사이즈");
      if (!paperName.trim()) missing.push("낱장 사양 2. 용지명");
      if (!paperWeight.trim()) missing.push("낱장 사양 2. 평량");
      if (!paperColor.trim()) missing.push("낱장 사양 2. 용지색상");
    }
    return missing;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = getMissingRequiredFields();
    if (missing.length > 0) {
      const message = "입력 내용을 확인해 주세요.\n\n필수 항목: " + missing.join(", ");
      window.alert(message);
      setToast("err");
      setTimeout(() => setToast(null), 2000);
      return;
    }
    setSubmitting(true);
    setToast(null);
    setStoredRequester(requesterName.trim());
    try {
      const payload: Record<string, unknown> = {
        order_type: orderType,
        requester_name: requesterName.trim(),
        due_date: dueDate,
        vendor: vendor.trim() || undefined,
        file_link: fileLink.trim() || undefined,
        changes_note: changesNote.trim() || "없음",
      };
      if (orderType === "book") {
        payload.media_id = mediaId;
        payload.qty = qty.trim();
      } else {
        const kindsCount = Math.max(1, parseInt(kindsCountStr, 10) || 1);
        const sheetsPerKind = Math.max(1, parseInt(sheetsPerKindStr, 10) || 1);
        payload.media_name = sheetMediaName.trim() || "낱장 인쇄물";
        payload.qty = `${kindsCount}종 ${sheetsPerKind}매`;
        const selectedFinishing: string[] = [...SHEET_FINISHING_OPTIONS.filter((k) => finishing[k])];
        if (finishing["기타"] && finishingEtc.trim()) selectedFinishing.push(`기타: ${finishingEtc.trim()}`);
        payload.type_spec = {
          size: size.trim(),
          paper_name: paperName.trim(),
          paper_weight: paperWeight.trim(),
          paper_color: paperColor.trim(),
          print_side: printSide,
          print_color: printColor,
          finishing: selectedFinishing,
          cutting,
          kinds_count: kindsCount,
          sheets_per_kind: sheetsPerKind,
          extra_request: extraRequest.trim(),
          receive_method: receiveMethod,
        };
      }
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = data.error || "의뢰 생성에 실패했습니다.";
        console.error("API error:", errorMsg);
        setToast("err");
        setTimeout(() => setToast(null), 3000);
        return;
      }
      if (!data.job_id) {
        console.error("job_id not found in response:", data);
        setToast("err");
        setTimeout(() => setToast(null), 3000);
        return;
      }
      setToast("ok");
      // 시트 반영 지연으로 404 방지: 상세 API가 성공할 때까지 대기 후 이동
      const jobId = data.job_id;
      const maxAttempts = 24;
      const intervalMs = 500;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const r = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        if (r.ok) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          router.push(`/jobs/${jobId}`);
          router.refresh();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      router.push("/list");
      router.refresh();
    } catch {
      setToast("err");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/list" className="text-slate-600 hover:text-slate-800 text-sm">
            ← 목록
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-emerald-600">잠금해제됨 ✔</span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              잠금(로그아웃)
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-lg font-semibold text-slate-800 mb-6">새 의뢰 등록</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500 mb-3">제작 유형</h2>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orderType"
                  checked={orderType === "book"}
                  onChange={() => setOrderType("book")}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">책자</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orderType"
                  checked={orderType === "sheet"}
                  onChange={() => setOrderType("sheet")}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">낱장 인쇄물</span>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-medium text-slate-500">공통 입력</h2>
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">의뢰자 이름</span>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>
            {orderType === "book" ? (
              <>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">매체</span>
                  <select
                    value={mediaId}
                    onChange={(e) => setMediaId(e.target.value)}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  >
                    <option value="">선택</option>
                    {specs.map((s) => (
                      <option key={s.media_id} value={s.media_id}>{s.media_name}</option>
                    ))}
                  </select>
                  {specs.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      등록된 매체가 없습니다.{" "}
                      <Link href="/specs" className="underline">매체 사양 관리</Link>에서 먼저 매체를 추가해 주세요.
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">수량</span>
                  <input
                    type="text"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </label>
              </>
            ) : (
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">매체명</span>
                <input
                  type="text"
                  value={sheetMediaName}
                  onChange={(e) => setSheetMediaName(e.target.value)}
                  placeholder="낱장 인쇄물"
                  className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            )}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">출력실</span>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder={spec?.default_vendor ?? ""}
                className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">납기일</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">파일 링크</span>
              <input
                type="url"
                value={fileLink}
                onChange={(e) => setFileLink(e.target.value)}
                placeholder="https://..."
                className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">변경 및 요청 사항</span>
              <textarea
                value={changesNote}
                onChange={(e) => setChangesNote(e.target.value)}
                rows={2}
                className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </section>

          {orderType === "sheet" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-medium text-slate-500">낱장 인쇄 사양</h2>
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">1. 사이즈</span>
                <div ref={sizeWrapperRef} className="relative">
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    onFocus={() => setActiveSuggestions("size")}
                    placeholder="예: 210×297"
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <SuggestionDropdown field="size" value={size} onSelect={setSize} />
                </div>
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">2. 용지명</span>
                  <div ref={paperNameWrapperRef} className="relative">
                    <input
                      type="text"
                      value={paperName}
                      onChange={(e) => setPaperName(e.target.value)}
                      onFocus={() => setActiveSuggestions("paper_name")}
                      className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <SuggestionDropdown field="paper_name" value={paperName} onSelect={setPaperName} />
                  </div>
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">평량</span>
                  <div ref={paperWeightWrapperRef} className="relative">
                    <input
                      type="text"
                      value={paperWeight}
                      onChange={(e) => setPaperWeight(e.target.value)}
                      onFocus={() => setActiveSuggestions("paper_weight")}
                      placeholder="예: 80g"
                      className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <SuggestionDropdown field="paper_weight" value={paperWeight} onSelect={setPaperWeight} />
                  </div>
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">용지색상</span>
                  <div ref={paperColorWrapperRef} className="relative">
                    <input
                      type="text"
                      value={paperColor}
                      onChange={(e) => setPaperColor(e.target.value)}
                      onFocus={() => setActiveSuggestions("paper_color")}
                      placeholder="예: 백상지"
                      className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <SuggestionDropdown field="paper_color" value={paperColor} onSelect={setPaperColor} />
                  </div>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">3. 인쇄 (단면/양면)</span>
                  <select
                    value={printSide}
                    onChange={(e) => setPrintSide(e.target.value as "단면" | "양면")}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="단면">단면</option>
                    <option value="양면">양면</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">인쇄 (먹1도/컬러)</span>
                  <select
                    value={printColor}
                    onChange={(e) => setPrintColor(e.target.value as "먹1도" | "컬러")}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="먹1도">먹1도</option>
                    <option value="컬러">컬러</option>
                  </select>
                </label>
              </div>
              <div className="block">
                <span className="block text-sm text-slate-600 mb-2">4. 후가공</span>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {SHEET_FINISHING_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!finishing[opt]}
                        onChange={(e) => setFinishingOption(opt, e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">{opt}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!finishing["기타"]}
                      onChange={(e) => setFinishingOption("기타", e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">기타</span>
                    {finishing["기타"] && (
                      <input
                        type="text"
                        value={finishingEtc}
                        onChange={(e) => setFinishingEtc(e.target.value)}
                        placeholder="직접 입력"
                        className="input-dark rounded border border-slate-300 px-2 py-1 text-sm w-32"
                      />
                    )}
                  </label>
                </div>
              </div>
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">5. 재단</span>
                <select
                  value={cutting}
                  onChange={(e) => setCutting(e.target.value as "필요없음" | "정재단")}
                  className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="필요없음">필요없음</option>
                  <option value="정재단">정재단</option>
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">6. 종 수</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={kindsCountStr}
                    onChange={(e) => setKindsCountStr(e.target.value)}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">수량 (매)</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={sheetsPerKindStr}
                    onChange={(e) => setSheetsPerKindStr(e.target.value)}
                    className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">7. 추가 요청사항</span>
                <textarea
                  value={extraRequest}
                  onChange={(e) => setExtraRequest(e.target.value)}
                  rows={2}
                  className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">8. 수령방법</span>
                <select
                  value={receiveMethod}
                  onChange={(e) => setReceiveMethod(e.target.value as "완료시 전화요망" | "완료시 방문수령")}
                  className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="완료시 전화요망">완료시 전화요망</option>
                  <option value="완료시 방문수령">완료시 방문수령</option>
                </select>
              </label>
            </section>
          )}

          {orderType === "book" && spec && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <h2 className="text-sm font-medium text-slate-500 mb-3">자동 사양 (읽기전용)</h2>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">판형</dt><dd className="text-slate-800">{spec.trim_size || "-"}</dd></div>
                <div><dt className="text-slate-500">면수</dt><dd className="text-slate-800">{spec.pages || "-"}</dd></div>
                <div><dt className="text-slate-500">표지</dt><dd className="text-slate-800">{spec.cover_paper || "-"}</dd></div>
                <div><dt className="text-slate-500">내지</dt><dd className="text-slate-800">{spec.inner_paper || "-"}</dd></div>
                <div><dt className="text-slate-500">도수</dt><dd className="text-slate-800">{spec.print_color || "-"}</dd></div>
                <div><dt className="text-slate-500">제본</dt><dd className="text-slate-800">{spec.binding || "-"}</dd></div>
                <div><dt className="text-slate-500">후가공</dt><dd className="text-slate-800">{spec.finishing || "-"}</dd></div>
                <div><dt className="text-slate-500">포장·납품</dt><dd className="text-slate-800">{spec.packaging_delivery || "-"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-slate-500">파일규격</dt><dd className="text-slate-800">{spec.file_rule || "-"}</dd></div>
              </dl>
            </section>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {submitting ? "제출 중…" : "제출"}
            </button>
            <Link
              href="/list"
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              취소
            </Link>
          </div>
        </form>

        {toast === "err" && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow">
            입력을 확인하거나 다시 시도해 주세요.
          </div>
        )}
      </div>
    </>
  );
}
