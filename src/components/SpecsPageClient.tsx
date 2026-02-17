"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AdditionalInnerPage {
  type: string;
  pages: string;
  paper: string;
  print: string;
}

interface Spec {
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
  additional_inner_pages?: string; // JSON 문자열
  // 하위 호환
  pages?: string;
  print_color?: string;
}

const SPEC_FIELDS: { key: keyof Spec; label: string }[] = [
  { key: "media_id", label: "매체 ID" },
  { key: "media_name", label: "매체명" },
  { key: "default_vendor", label: "기본 출력실" },
  { key: "trim_size", label: "판형" },
  { key: "cover_type", label: "표지유형" },
  { key: "cover_paper", label: "표지용지" },
  { key: "cover_print", label: "표지인쇄" },
  { key: "inner_pages", label: "내지페이지" },
  { key: "inner_paper", label: "내지용지" },
  { key: "inner_print", label: "내지인쇄" },
  { key: "binding", label: "제본" },
  { key: "finishing", label: "후가공" },
  { key: "packaging_delivery", label: "포장·납품" },
  { key: "file_rule", label: "파일규격" },
];

const emptySpec = (): Spec => ({
  media_id: "",
  media_name: "",
  default_vendor: "",
  trim_size: "",
  cover_type: "",
  cover_paper: "",
  cover_print: "",
  inner_pages: "",
  inner_paper: "",
  inner_print: "",
  binding: "",
  finishing: "",
  packaging_delivery: "",
  file_rule: "",
  additional_inner_pages: "",
});

export function SpecsPageClient() {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Spec | null>(null);
  const [form, setForm] = useState<Spec>(emptySpec());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<"ok" | "err" | null>(null);
  const [additionalInnerPages, setAdditionalInnerPages] = useState<AdditionalInnerPage[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function load() {
    setLoading(true);
    setSheetError(null);
    try {
      const res = await fetch("/api/spec");
      const data = await res.json();
      if (!res.ok) {
        setSheetError(data.error ?? "Google 시트 연결을 확인해 주세요. .env.local에 GOOGLE_SHEET_ID 등이 설정되어 있어야 합니다.");
        setSpecs([]);
        return;
      }
      setSpecs(Array.isArray(data) ? data : []);
    } catch {
      setSheetError("목록을 불러올 수 없습니다.");
      setSpecs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  function startAdd() {
    setAdding(true);
    setEditing(null);
    setForm(emptySpec());
    setAdditionalInnerPages([]);
  }

  function startEdit(spec: Spec) {
    setAdding(false);
    setEditing(spec);
    setForm({ ...spec });
    // additional_inner_pages JSON 파싱
    try {
      if (spec.additional_inner_pages) {
        const parsed = JSON.parse(spec.additional_inner_pages);
        if (Array.isArray(parsed)) {
          setAdditionalInnerPages(parsed);
        } else {
          setAdditionalInnerPages([]);
        }
      } else {
        setAdditionalInnerPages([]);
      }
    } catch {
      setAdditionalInnerPages([]);
    }
  }

  function cancelEdit() {
    setAdding(false);
    setEditing(null);
    setForm(emptySpec());
    setAdditionalInnerPages([]);
  }

  function addAdditionalInnerPage() {
    setAdditionalInnerPages([...additionalInnerPages, { type: "", pages: "", paper: "", print: "" }]);
  }

  function removeAdditionalInnerPage(index: number) {
    setAdditionalInnerPages(additionalInnerPages.filter((_, i) => i !== index));
  }

  function updateAdditionalInnerPage(index: number, field: keyof AdditionalInnerPage, value: string) {
    const updated = [...additionalInnerPages];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalInnerPages(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.media_id.trim() || !form.media_name.trim()) {
      setToast("err");
      setTimeout(() => setToast(null), 2000);
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      const submitData = {
        ...form,
        additional_inner_pages: additionalInnerPages.length > 0 ? JSON.stringify(additionalInnerPages) : "",
      };
      if (editing) {
        const res = await fetch(`/api/spec/${encodeURIComponent(editing.media_id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        if (!res.ok) {
          setToast("err");
          return;
        }
        setToast("ok");
        cancelEdit();
        await load();
      } else {
        const res = await fetch("/api/spec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        if (!res.ok) {
          setToast("err");
          return;
        }
        setToast("ok");
        cancelEdit();
        await load();
      }
    } catch {
      setToast("err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          {/* 데스크탑: 탭 네비게이션 */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/list" className="text-base font-medium text-slate-600 hover:text-slate-800">제작 의뢰 관리</Link>
            <Link href="/specs" className="text-base font-medium text-blue-600">매체 사양 관리</Link>
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
            <span className="text-base font-medium text-blue-600">매체 사양 관리</span>
          </div>

          <div className="flex items-center gap-3">
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
      {/* 배경 오버레이 (투명도 70%) */}
      <div
        className={`fixed inset-0 bg-black/70 z-30 md:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />
      {/* 슬라이드 메뉴 (화면의 1/3, 투명도 70%) */}
      <div
        className={`fixed left-0 top-0 bottom-0 w-1/3 bg-white/70 backdrop-blur-sm shadow-xl z-40 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 space-y-4">
          {/* 닫기 버튼 */}
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-slate-600 hover:text-slate-800"
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
            className="block text-base font-medium text-slate-600 hover:text-slate-800 py-2"
          >
            제작 의뢰 관리
          </Link>
          <Link
            href="/specs"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-blue-600 py-2"
          >
            매체 사양 관리
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-lg font-semibold text-slate-800 mb-2">매체 사양 관리</h1>
        <p className="text-sm text-slate-500 mb-6">
          각 매체별 제작사양을 미리 입력해 두면, 새 의뢰 시 매체 선택만으로 사양이 자동 표시됩니다.
        </p>

        {sheetError && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium mb-1">⚠️ Google 시트 연결 오류</p>
            <p className="mb-2">{sheetError}</p>
            <p className="text-xs text-amber-700">
              Google 시트가 설정되지 않아도 폼은 열 수 있지만, 저장하려면 .env.local에 GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY를 설정하고 서버를 재시작해야 합니다.
            </p>
          </div>
        )}

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={startAdd}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + 매체 추가
          </button>
        </div>

        {(adding || editing) && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium text-slate-600 mb-4">
              {editing ? "사양 수정" : "새 매체 등록"}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {SPEC_FIELDS.map(({ key, label }) => (
                <label key={key} className="block">
                  <span className="block text-xs text-slate-500 mb-1">{label}</span>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    disabled={editing !== null && key === "media_id"}
                    className="input-dark w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                  />
                </label>
              ))}
            </div>

            {/* 추가 내지 섹션 */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-600">추가 내지 (기본값)</h3>
                <button
                  type="button"
                  onClick={addAdditionalInnerPage}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <span>+</span>
                  <span>내지 추가</span>
                </button>
              </div>

              {additionalInnerPages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">추가 내지가 없습니다. 위 버튼을 클릭하여 추가하세요.</p>
              ) : (
                <div className="space-y-4">
                  {additionalInnerPages.map((item, index) => (
                    <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-slate-500">추가 내지 {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeAdditionalInnerPage(index)}
                          className="text-xs text-red-600 hover:text-red-700 hover:underline"
                        >
                          삭제
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <label className="block">
                          <span className="block text-xs text-slate-500 mb-1">내지추가유형</span>
                          <input
                            type="text"
                            value={item.type}
                            onChange={(e) => updateAdditionalInnerPage(index, "type", e.target.value)}
                            placeholder="면지, 엽서, 별지 등"
                            className="input-dark w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-xs text-slate-500 mb-1">내지추가페이지</span>
                          <input
                            type="text"
                            value={item.pages}
                            onChange={(e) => updateAdditionalInnerPage(index, "pages", e.target.value)}
                            placeholder="페이지 수"
                            className="input-dark w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-xs text-slate-500 mb-1">내지추가용지</span>
                          <input
                            type="text"
                            value={item.paper}
                            onChange={(e) => updateAdditionalInnerPage(index, "paper", e.target.value)}
                            placeholder="용지 정보"
                            className="input-dark w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-xs text-slate-500 mb-1">내지추가인쇄</span>
                          <input
                            type="text"
                            value={item.print}
                            onChange={(e) => updateAdditionalInnerPage(index, "print", e.target.value)}
                            placeholder="인쇄 방법"
                            className="input-dark w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "저장 중…" : editing ? "수정" : "등록"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                취소
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">불러오는 중…</div>
          ) : specs.length === 0 && !sheetError ? (
            <div className="p-8 text-center text-slate-500">
              등록된 매체가 없습니다. 위 &quot;매체 추가&quot;로 먼저 매체와 제작사양을 등록해 주세요.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-4 py-2 font-medium">매체 ID</th>
                    <th className="px-4 py-2 font-medium">매체명</th>
                    <th className="px-4 py-2 font-medium">기본 출력실</th>
                    <th className="px-4 py-2 font-medium w-20">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {specs.map((s) => (
                    <tr key={s.media_id} className="border-b border-slate-100">
                      <td className="px-4 py-2 text-slate-900">{s.media_id}</td>
                      <td className="px-4 py-2 text-slate-900">{s.media_name}</td>
                      <td className="px-4 py-2 text-slate-700">{s.default_vendor || "-"}</td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          수정
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {toast === "ok" && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white shadow">
            저장되었습니다
          </div>
        )}
        {toast === "err" && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow">
            저장 실패. 매체 ID·매체명을 확인해 주세요.
          </div>
        )}
      </div>
    </>
  );
}
