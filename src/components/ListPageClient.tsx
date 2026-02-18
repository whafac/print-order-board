"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Job {
  job_id: string;
  created_at: string;
  requester_name: string;
  media_id: string;
  media_name: string;
  vendor: string;
  due_date: string;
  qty: string;
  file_link: string;
  status: string;
  order_type?: string;
  spec_snapshot?: string;
  production_cost?: string;
}

const STATUS_LABELS: Record<string, string> = {
  접수: "접수",
  진행: "진행",
  납품: "납품",
  검수완료: "검수완료",
  완료: "완료",
};

const STATUS_STYLES: Record<string, string> = {
  접수: "bg-sky-100 text-sky-800",
  진행: "bg-amber-100 text-amber-800",
  납품: "bg-violet-100 text-violet-800",
  검수완료: "bg-blue-100 text-blue-800",
  완료: "bg-emerald-100 text-emerald-800",
};

function getStatusStyle(status: string): string {
  return STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700";
}

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

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

// 제작금액 가져오기 함수 (구글시트에 저장된 값 우선, 없으면 계산)
function getTotalAmount(job: Job): number | null {
  // 구글시트에 저장된 제작금액이 있으면 사용
  if (job.production_cost && job.production_cost.trim() !== "") {
    const cost = parseInt(job.production_cost.trim(), 10);
    if (!Number.isNaN(cost)) return cost;
  }

  // 저장된 값이 없으면 계산 (책자만)
  if (job.order_type === "sheet" || !job.spec_snapshot) return null;

  try {
    const spec = JSON.parse(job.spec_snapshot);
    
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

    return total;
  } catch {
    return null;
  }
}

export function ListPageClient() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [specs, setSpecs] = useState<{ media_id: string; media_name: string }[]>([]);
  const [month, setMonth] = useState(thisMonth());
  const [status, setStatus] = useState("");
  const [vendor, setVendor] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, received: 0, due7: 0, done: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "vendor" | "requester">("admin");
  const [vendorName, setVendorName] = useState<string | null>(null);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function load() {
    setLoading(true);
    try {
      const [jobsRes, specRes] = await Promise.all([
        fetch(`/api/jobs?month=${month}${status ? `&status=${encodeURIComponent(status)}` : ""}${vendor ? `&vendor=${encodeURIComponent(vendor)}` : ""}${mediaId ? `&media_id=${encodeURIComponent(mediaId)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
        fetch("/api/spec"),
      ]);
      const jobsData = await jobsRes.json();
      const specData = await specRes.json();
      if (Array.isArray(jobsData)) setJobs(jobsData);
      if (Array.isArray(specData)) setSpecs(specData);

      const all = Array.isArray(jobsData) ? jobsData : [];
      setSummary({
        total: all.length,
        received: all.filter((j: Job) => j.status === "접수").length,
        due7: all.filter((j: Job) => j.status === "진행").length,
        done: all.filter((j: Job) => j.status === "검수완료" || j.status === "완료").length,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [month, status, vendor, mediaId]);

  // 사용자 역할 및 업체명 확인
  useEffect(() => {
    async function checkUserRole() {
      try {
        const res = await fetch("/api/auth/role");
        const data = await res.json();
        if (res.ok) {
          setUserRole(data.role || "admin");
          setVendorName(data.vendor_name || null);
        }
      } catch {
        // 역할 확인 실패 시 기본값 유지
      }
    }
    checkUserRole();
  }, []);

  const vendors = Array.from(new Set(jobs.map((j) => j.vendor).filter(Boolean))).sort();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* 데스크탑: 탭 네비게이션 (고정 위치) */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/list" className="text-base font-medium text-blue-600">제작 의뢰 관리</Link>
            <span className="text-slate-400">|</span>
            <Link href="/specs" className="text-base font-medium text-slate-600 hover:text-slate-800">매체 사양 관리</Link>
          </div>
          
          {/* 모바일: 햄버거 버튼 */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-800"
              aria-label="메뉴 열기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="flex flex-col">
              <span className="text-base font-medium text-blue-600">제작 의뢰 관리</span>
              {userRole === "vendor" && vendorName && (
                <span className="text-xs text-blue-500">{vendorName} 로그인</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userRole === "vendor" && vendorName && (
              <span className="hidden sm:inline text-sm font-medium text-blue-600">
                {vendorName} 로그인
              </span>
            )}
            <span className="hidden sm:inline text-sm text-emerald-600">잠금해제됨 ✔</span>
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

      {/* 모바일 슬라이드 메뉴 */}
      {/* 배경 블러 처리 */}
      <div
        className={`fixed inset-0 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />
      {/* 슬라이드 메뉴 (화면의 50%, 더 어두운 배경 투명도 70%) */}
      <div
        className={`fixed left-0 top-0 bottom-0 w-1/2 bg-slate-900/70 backdrop-blur-sm shadow-xl z-40 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 space-y-4">
          {/* 닫기 버튼 */}
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-white hover:text-slate-200"
              aria-label="메뉴 닫기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <Link
            href="/list"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-blue-400 py-2"
          >
            제작 의뢰 관리
          </Link>
          <Link
            href="/specs"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-white/70 hover:text-white py-2"
          >
            매체 사양 관리
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* 모바일: 하나의 박스에 통합 */}
        <div className="mb-6 sm:hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-500 mb-1">이번 달 전체</p>
                <p className="text-xl font-semibold text-slate-800">{summary.total}</p>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-500 mb-1">접수</p>
                <p className="text-xl font-semibold text-sky-600">{summary.received}</p>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-500 mb-1">진행중</p>
                <p className="text-xl font-semibold text-amber-600">{summary.due7}</p>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-500 mb-1">완료</p>
                <p className="text-xl font-semibold text-emerald-600">{summary.done}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 데스크탑: 4개의 카드 */}
        <div className="mb-6 hidden sm:grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">이번 달 전체</p>
            <p className="text-2xl font-semibold text-slate-800">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">접수</p>
            <p className="text-2xl font-semibold text-sky-600">{summary.received}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">진행중</p>
            <p className="text-2xl font-semibold text-amber-600">{summary.due7}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">완료</p>
            <p className="text-2xl font-semibold text-emerald-600">{summary.done}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-600">월</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input-dark rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-600">상태</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-dark rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">전체</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-600">출력실</span>
            <select
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="input-dark rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">전체</option>
              {vendors.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-600">매체</span>
            <select
              value={mediaId}
              onChange={(e) => setMediaId(e.target.value)}
              className="input-dark rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">전체</option>
              {specs.map((s) => (
                <option key={s.media_id} value={s.media_id}>{s.media_name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-600">검색</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="job_id, 의뢰자, 매체"
              className="input-dark rounded border border-slate-300 px-2 py-1.5 text-sm w-40"
            />
            <button
              type="button"
              onClick={() => load()}
              className="rounded bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600"
            >
              검색
            </button>
          </label>
        </div>

        {/* 제작업체는 "새 의뢰" 버튼 숨김 */}
        {userRole !== "vendor" && (
          <div className="mb-4 flex justify-end">
            <Link
              href="/new"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              + 새 의뢰
            </Link>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">불러오는 중…</div>
          ) : (
            <>
              {/* 데스크탑: 테이블 형태 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                      <th className="px-4 py-3 font-medium">상태</th>
                      <th className="px-4 py-3 font-medium">납기</th>
                      <th className="px-4 py-3 font-medium">매체</th>
                      <th className="px-4 py-3 font-medium">수량</th>
                      <th className="px-4 py-3 font-medium">출력실</th>
                      <th className="px-4 py-3 font-medium">의뢰자</th>
                      <th className="px-4 py-3 font-medium">생성일</th>
                      <th className="px-4 py-3 font-medium w-10">파일</th>
                      <th className="px-4 py-3 font-medium text-right">총금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr
                        key={job.job_id}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => router.push(`/jobs/${job.job_id}`)}
                      >
                        <td className="px-4 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusStyle(job.status)}`}>
                            {STATUS_LABELS[job.status] ?? job.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-700">{job.due_date ? job.due_date.slice(0, 10) : "-"}</td>
                        <td className="px-4 py-2 text-slate-700">
                          <span>{job.media_name || "-"}</span>
                          {job.order_type === "sheet" && (
                            <span className="ml-1.5 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">낱장</span>
                          )}
                          {job.order_type === "book" && (
                            <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">책자</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-700">{job.qty || "-"}</td>
                        <td className="px-4 py-2 text-slate-700">{job.vendor || "-"}</td>
                        <td className="px-4 py-2 text-slate-700">{job.requester_name || "-"}</td>
                        <td className="px-4 py-2 text-slate-600">{formatCreatedAt(job.created_at)}</td>
                        <td className="px-4 py-2">
                          {job.file_link ? (
                            <a
                              href={job.file_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              📎
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {(() => {
                            const total = getTotalAmount(job);
                            return total !== null ? (
                              <span className="font-medium text-slate-800">{total.toLocaleString()}원</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일: 카드 형태 */}
              <div className="md:hidden divide-y divide-slate-200">
                {jobs.map((job) => (
                  <div
                    key={job.job_id}
                    className="p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/jobs/${job.job_id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${getStatusStyle(job.status)}`}>
                            {STATUS_LABELS[job.status] ?? job.status}
                          </span>
                          {job.order_type === "sheet" && (
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600 whitespace-nowrap">낱장</span>
                          )}
                          {job.order_type === "book" && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 whitespace-nowrap">책자</span>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-slate-800 truncate">{job.media_name || "-"}</h3>
                      </div>
                      {job.file_link && (
                        <a
                          href={job.file_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-2 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📎
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-500">납기:</span> {job.due_date ? job.due_date.slice(0, 10) : "-"}
                      </div>
                      <div>
                        <span className="text-slate-500">수량:</span> {job.qty || "-"}
                      </div>
                      <div>
                        <span className="text-slate-500">출력실:</span> {job.vendor || "-"}
                      </div>
                      <div>
                        <span className="text-slate-500">의뢰자:</span> {job.requester_name || "-"}
                      </div>
                      <div>
                        <span className="text-slate-500">생성일:</span> {formatCreatedAt(job.created_at)}
                      </div>
                      <div className="text-right">
                        {(() => {
                          const total = getTotalAmount(job);
                          return total !== null ? (
                            <span className="font-medium text-slate-800">{total.toLocaleString()}원</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!loading && jobs.length === 0 && (
            <div className="p-8 text-center text-slate-500">의뢰가 없습니다.</div>
          )}
        </div>
      </div>
    </>
  );
}
