"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

const SPEC_FIELDS: { key: keyof Spec; label: string }[] = [
  { key: "media_id", label: "매체 ID" },
  { key: "media_name", label: "매체명" },
  { key: "default_vendor", label: "기본 출력실" },
  { key: "trim_size", label: "판형" },
  { key: "pages", label: "면수" },
  { key: "cover_paper", label: "표지" },
  { key: "inner_paper", label: "내지" },
  { key: "print_color", label: "도수" },
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
  pages: "",
  cover_paper: "",
  inner_paper: "",
  print_color: "",
  binding: "",
  finishing: "",
  packaging_delivery: "",
  file_rule: "",
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
  }

  function startEdit(spec: Spec) {
    setAdding(false);
    setEditing(spec);
    setForm({ ...spec });
  }

  function cancelEdit() {
    setAdding(false);
    setEditing(null);
    setForm(emptySpec());
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
      if (editing) {
        const res = await fetch(`/api/spec/${encodeURIComponent(editing.media_id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
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
          body: JSON.stringify(form),
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
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/list" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            홈
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
