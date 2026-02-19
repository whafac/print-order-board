"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Job {
  job_id: string;
  created_at: string;
  requester_name: string;
  media_id?: string;
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
  order_type?: string;
  type_spec_snapshot?: string;
  production_cost?: string;
}

const STATUS_OPTIONS = ["접수", "진행", "납품", "검수완료", "완료"];

const EDITOR_KEY = "print_order_editor_name";

function getStoredEditor(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(EDITOR_KEY) ?? "";
}

function setStoredEditor(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EDITOR_KEY, name);
}

function formatCreatedAt(iso: string | undefined): string {
  if (!iso) return "-";
  
  // ISO 8601 형식 파싱 (KST +09:00 또는 UTC Z 형식 지원)
  // 예: "2026-02-16T14:16:15.677+09:00" 또는 "2026-02-16T14:16:15.677Z"
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?([+-]\d{2}:\d{2}|Z)?/);
  
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
  
  // 파싱 실패 시 기존 방식으로 폴백
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10) || "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function JobDetailClient({ job }: { job: Job }) {
  const router = useRouter();
  const [status, setStatus] = useState(job.status);
  const [editorName, setEditorName] = useState(job.last_updated_by || getStoredEditor());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<"ok" | "err" | null>(null);

  let spec: Record<string, unknown> = {};
  try {
    if (job.spec_snapshot) spec = JSON.parse(job.spec_snapshot);
  } catch {}

  let typeSpec: Record<string, unknown> = {};
  try {
    if (job.type_spec_snapshot) typeSpec = JSON.parse(job.type_spec_snapshot);
  } catch {}
  const isSheet = job.order_type === "sheet";

  // 제작금액 계산 함수 (책자 및 낱장) - 구글시트에 저장된 값 우선 사용
  function calculateProductionCost() {
    // 구글시트에 저장된 제작금액이 있으면 사용
    if (job.production_cost && job.production_cost.trim() !== "") {
      const cost = parseInt(job.production_cost.trim(), 10);
      if (!Number.isNaN(cost)) {
        // 부동소수점 정밀도 문제 해결: Math.round 사용
        // 원래 계산: subtotal + Math.floor(subtotal * 0.1) = total
        // 역산: subtotal = Math.round(total / 1.1)
        const subtotal = Math.round(cost / 1.1);
        const vat = cost - subtotal;
        return { subtotal, vat, total: cost };
      }
    }

    // 저장된 값이 없으면 계산
    if (isSheet) {
      // 낱장 금액 계산
      if (!job.type_spec_snapshot) return null;
      try {
        const kindsCount = Math.max(1, parseInt(String(typeSpec.kinds_count || "1"), 10) || 1);
        const sheetsPerKind = Math.max(1, parseInt(String(typeSpec.sheets_per_kind || "1"), 10) || 1);
        const totalSheets = kindsCount * sheetsPerKind;

        // 기본 인쇄 비용 (매당 300원)
        const printCost = totalSheets * 300;

        // 후가공 비용
        let finishingCost = 0;
        const finishing = String(typeSpec.finishing || "");
        const finishingLower = finishing.toLowerCase().trim();
        const printSide = String(typeSpec.print_side || "양면");

        if (!finishingLower.startsWith("없음") && finishingLower !== "") {
          if (finishingLower.includes("에폭시")) {
            // 에폭시는 종 수당 1회 (120000원)
            finishingCost = 120000 * kindsCount;
          } else if (
            finishingLower.includes("코팅") ||
            finishingLower.includes("라미네이팅") ||
            finishingLower.includes("라미테이팅")
          ) {
            // 코팅은 매당 500원
            let coatingSheets = totalSheets;
            if (printSide === "양면") {
              // 양면 인쇄인 경우 양면 코팅으로 계산 (매당 2면)
              coatingSheets = totalSheets * 2;
            }
            finishingCost = coatingSheets * 500;
          }
        }

        // 총 제작금액 (공급가)
        const subtotal = printCost + finishingCost;
        // 부가세 (10%)
        const vat = Math.floor(subtotal * 0.1);
        // 총금액
        const total = subtotal + vat;

        return { subtotal, vat, total };
      } catch {
        return null;
      }
    }

    if (!job.spec_snapshot) return null;

    // 페이지 수 추출 함수
    function extractPageCount(pageStr: string | undefined): number {
      if (!pageStr) return 0;
      const match = String(pageStr).match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }

    // 수량 추출
    const qtyNum = parseInt(job.qty.trim(), 10) || 1;

    // 표지 페이지 수 계산
    const coverPrint = String(spec.cover_print || spec.print_color || "");
    const coverPageCount = coverPrint.includes("단면") ? 2 : 4;
    const coverCost = coverPageCount * 300 * qtyNum;

    // 내지 페이지 수 계산
    const innerPages = String(spec.inner_pages || spec.pages || "");
    const innerPageCount = extractPageCount(innerPages);
    const innerCost = innerPageCount * 300 * qtyNum;

    // 추가 내지 비용 계산
    let additionalInnerCost = 0;
    const additionalPages = spec.additional_inner_pages;
    if (Array.isArray(additionalPages)) {
      (additionalPages as Record<string, unknown>[]).forEach((item) => {
        const pageCount = extractPageCount(String(item.pages || ""));
        additionalInnerCost += pageCount * 300 * qtyNum;
      });
    }

    // 제본 비용
    const binding = String(spec.binding || "");
    let bindingCost = 0;
    if (binding.includes("무선제본")) {
      bindingCost = 2000 * qtyNum;
    } else if (binding.includes("중철제본")) {
      bindingCost = 1500 * qtyNum;
    }

    // 후가공 비용
    const finishing = String(spec.finishing || "");
    const finishingLower = finishing.toLowerCase().trim();
    let finishingCost = 0;
    if (finishingLower.startsWith("없음") || finishingLower === "") {
      finishingCost = 0;
    } else if (finishingLower.includes("에폭시")) {
      finishingCost = 120000;
    } else if (
      finishingLower.includes("코팅") ||
      finishingLower.includes("라미네이팅") ||
      finishingLower.includes("라미테이팅")
    ) {
      let coatingPageCount = 2;
      if (finishingLower.includes("양면")) {
        coatingPageCount = 4;
      }
      finishingCost = coatingPageCount * 500 * qtyNum;
    }

    // 총 제작금액
    const subtotal = coverCost + innerCost + additionalInnerCost + bindingCost + finishingCost;
    const vat = Math.floor(subtotal * 0.1);
    const total = subtotal + vat;

    return { subtotal, vat, total };
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function copyId() {
    await navigator.clipboard.writeText(job.job_id);
    setToast("ok");
    setTimeout(() => setToast(null), 2000);
  }

  async function saveStatus() {
    setSaving(true);
    setToast(null);
    if (editorName) setStoredEditor(editorName);
    try {
      const res = await fetch(`/api/jobs/${job.job_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, last_updated_by: editorName }),
      });
      if (!res.ok) {
        setToast("err");
        return;
      }
      setToast("ok");
      router.refresh();
    } catch {
      setToast("err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/list" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            홈으로
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

      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-800">의뢰 상세</h1>
          <button
            type="button"
            onClick={copyId}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            title="복사"
          >
            {job.job_id} 📋
          </button>
        </div>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-slate-500">기본정보</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">의뢰자</dt><dd className="text-slate-800">{job.requester_name || "-"}</dd></div>
            <div><dt className="text-slate-500">생성일</dt><dd className="text-slate-800">{formatCreatedAt(job.created_at)}</dd></div>
            {!isSheet && (
              <>
                <div><dt className="text-slate-500">발주사 (매체ID)</dt><dd className="text-slate-800">{job.media_id === "other" ? String(spec.media_id ?? "-") : (job.media_id || "-")}</dd></div>
                <div><dt className="text-slate-500">매체명</dt><dd className="text-slate-800">{job.media_name || "-"}</dd></div>
              </>
            )}
            {isSheet && (
              <div><dt className="text-slate-500">매체명</dt><dd className="text-slate-800">{job.media_name || "-"}</dd></div>
            )}
            <div><dt className="text-slate-500">출력실</dt><dd className="text-slate-800">{job.vendor || "-"}</dd></div>
            <div><dt className="text-slate-500">납기</dt><dd className="text-slate-800">{job.due_date ? job.due_date.slice(0, 10) : "-"}</dd></div>
            <div><dt className="text-slate-500">수량</dt><dd className="text-slate-800">{job.qty || "-"}</dd></div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">파일 링크</dt>
              <dd className="text-slate-800">
                {job.file_link ? (
                  <a href={job.file_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {job.file_link}
                  </a>
                ) : "-"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">변경사항</dt><dd className="text-slate-800 whitespace-pre-wrap">{job.changes_note || "-"}</dd>
            </div>
          </dl>
        </section>

        {isSheet ? (
          <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-medium text-slate-500">낱장 인쇄 사양</h2>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">사이즈</dt><dd className="text-slate-800">{String(typeSpec.size ?? "-")}</dd></div>
              <div><dt className="text-slate-500">용지명</dt><dd className="text-slate-800">{String(typeSpec.paper_name ?? "-")}</dd></div>
              <div><dt className="text-slate-500">평량</dt><dd className="text-slate-800">{String(typeSpec.paper_weight ?? "-")}</dd></div>
              <div><dt className="text-slate-500">용지색상</dt><dd className="text-slate-800">{String(typeSpec.paper_color ?? "-")}</dd></div>
              <div><dt className="text-slate-500">인쇄 (단/양면)</dt><dd className="text-slate-800">{String(typeSpec.print_side ?? "-")}</dd></div>
              <div><dt className="text-slate-500">인쇄 (도수)</dt><dd className="text-slate-800">{String(typeSpec.print_color ?? "-")}</dd></div>
              <div><dt className="text-slate-500">후가공</dt><dd className="text-slate-800">{Array.isArray(typeSpec.finishing) ? typeSpec.finishing.join(", ") : "-"}</dd></div>
              <div><dt className="text-slate-500">재단</dt><dd className="text-slate-800">{String(typeSpec.cutting ?? "-")}</dd></div>
              <div><dt className="text-slate-500">종 수</dt><dd className="text-slate-800">{typeSpec.kinds_count != null ? String(typeSpec.kinds_count) : "-"}</dd></div>
              <div><dt className="text-slate-500">수량 (매)</dt><dd className="text-slate-800">{typeSpec.sheets_per_kind != null ? String(typeSpec.sheets_per_kind) : "-"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">추가 요청사항</dt><dd className="text-slate-800 whitespace-pre-wrap">{String(typeSpec.extra_request ?? "-")}</dd></div>
              <div><dt className="text-slate-500">수령방법</dt><dd className="text-slate-800">{String(typeSpec.receive_method ?? "-")}</dd></div>
            </dl>
          </section>
        ) : (
          <>
            <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-medium text-slate-500">제작사양 (스냅샷)</h2>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">판형</dt><dd className="text-slate-800">{String(spec.trim_size ?? "-")}</dd></div>
                <div><dt className="text-slate-500">표지유형</dt><dd className="text-slate-800">{String(spec.cover_type ?? "-")}</dd></div>
                <div><dt className="text-slate-500">표지용지</dt><dd className="text-slate-800">{String(spec.cover_paper ?? "-")}</dd></div>
                <div><dt className="text-slate-500">표지인쇄</dt><dd className="text-slate-800">{String(spec.cover_print ?? spec.print_color ?? "-")}</dd></div>
                <div><dt className="text-slate-500">내지페이지</dt><dd className="text-slate-800">{String(spec.inner_pages ?? spec.pages ?? "-")}</dd></div>
                <div><dt className="text-slate-500">내지용지</dt><dd className="text-slate-800">{String(spec.inner_paper ?? "-")}</dd></div>
                <div><dt className="text-slate-500">내지인쇄</dt><dd className="text-slate-800">{String(spec.inner_print ?? spec.print_color ?? "-")}</dd></div>
                <div><dt className="text-slate-500">제본</dt><dd className="text-slate-800">{String(spec.binding ?? "-")}</dd></div>
                <div><dt className="text-slate-500">후가공</dt><dd className="text-slate-800">{String(spec.finishing ?? "-")}</dd></div>
                <div><dt className="text-slate-500">포장·납품</dt><dd className="text-slate-800">{String(spec.packaging_delivery ?? "-")}</dd></div>
                <div className="sm:col-span-2"><dt className="text-slate-500">파일규격</dt><dd className="text-slate-800">{String(spec.file_rule ?? "-")}</dd></div>
              </dl>
            </section>
            {(() => {
              try {
                const parsed = JSON.parse(job.spec_snapshot);
                const additionalPages = parsed.additional_inner_pages;
                if (Array.isArray(additionalPages) && additionalPages.length > 0) {
                  return (
                    <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                      <h2 className="mb-3 text-sm font-medium text-slate-500">추가 내지</h2>
                      <div className="space-y-4">
                        {additionalPages.map((item: Record<string, unknown>, index: number) => (
                          <div key={index} className="rounded-lg border border-slate-200 bg-white p-4">
                            <h3 className="text-xs font-medium text-slate-500 mb-2">추가 내지 {index + 1}</h3>
                            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                              <div><dt className="text-slate-500">유형</dt><dd className="text-slate-800">{String(item.type ?? "-")}</dd></div>
                              <div><dt className="text-slate-500">페이지</dt><dd className="text-slate-800">{String(item.pages ?? "-")}</dd></div>
                              <div><dt className="text-slate-500">용지</dt><dd className="text-slate-800">{String(item.paper ?? "-")}</dd></div>
                              <div><dt className="text-slate-500">인쇄</dt><dd className="text-slate-800">{String(item.print ?? "-")}</dd></div>
                            </dl>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }
              } catch {
                // ignore parse error
              }
              return null;
            })()}
          </>
        )}

        {/* 제작금액 표시 (책자만) */}
        {(() => {
          const cost = calculateProductionCost();
          if (!cost) return null;
          return (
            <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-medium text-slate-500">제작금액</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3 border-r border-slate-200 pr-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">공급가</span>
                    <span className="text-sm font-medium text-slate-800">{cost.subtotal.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">부가세 (10%)</span>
                    <span className="text-sm font-medium text-slate-800">{cost.vat.toLocaleString()}원</span>
                  </div>
                </div>
                <div className="flex flex-col justify-center pl-4">
                  <div className="text-xs text-slate-500 mb-1">총 결제금액</div>
                  <div className="text-2xl font-bold text-red-600">{cost.total.toLocaleString()}원</div>
                </div>
              </div>
            </section>
          );
        })()}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-slate-500">상태 변경</h2>
          <div className="mb-3 space-y-1 text-xs text-slate-500">
            <div>
              최초 작성한 의뢰자: <span className="font-medium text-slate-700">{job.requester_name || "-"}</span>
            </div>
            {job.last_updated_by && job.last_updated_by !== job.requester_name && (
              <div>
                마지막 수정자: <span className="font-medium text-slate-700">{job.last_updated_by}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">상태</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-dark rounded border border-slate-300 px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">수정자 이름</span>
              <input
                type="text"
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder="이름 입력"
                className="input-dark rounded border border-slate-300 px-3 py-2 text-sm w-40 placeholder:text-slate-500"
              />
            </label>
            <button
              type="button"
              onClick={saveStatus}
              disabled={saving}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </section>

        {toast === "ok" && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white shadow">
            저장되었습니다
          </div>
        )}
        {toast === "err" && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow">
            저장 실패
          </div>
        )}
      </div>
    </>
  );
}
