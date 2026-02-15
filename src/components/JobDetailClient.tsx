"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Job {
  job_id: string;
  created_at: string;
  requester_name: string;
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

export function JobDetailClient({ job }: { job: Job }) {
  const router = useRouter();
  const [status, setStatus] = useState(job.status);
  const [editorName, setEditorName] = useState(job.last_updated_by || getStoredEditor());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<"ok" | "err" | null>(null);

  let spec: Record<string, string> = {};
  try {
    if (job.spec_snapshot) spec = JSON.parse(job.spec_snapshot);
  } catch {}

  let typeSpec: Record<string, unknown> = {};
  try {
    if (job.type_spec_snapshot) typeSpec = JSON.parse(job.type_spec_snapshot);
  } catch {}
  const isSheet = job.order_type === "sheet";

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
            <div><dt className="text-slate-500">생성일</dt><dd className="text-slate-800">{job.created_at ? job.created_at.slice(0, 10) : "-"}</dd></div>
            <div><dt className="text-slate-500">매체</dt><dd className="text-slate-800">{job.media_name || "-"}</dd></div>
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
          <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-medium text-slate-500">제작사양 (스냅샷)</h2>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">판형</dt><dd className="text-slate-800">{spec.trim_size ?? "-"}</dd></div>
              <div><dt className="text-slate-500">면수</dt><dd className="text-slate-800">{spec.pages ?? "-"}</dd></div>
              <div><dt className="text-slate-500">표지</dt><dd className="text-slate-800">{spec.cover_paper ?? "-"}</dd></div>
              <div><dt className="text-slate-500">내지</dt><dd className="text-slate-800">{spec.inner_paper ?? "-"}</dd></div>
              <div><dt className="text-slate-500">도수</dt><dd className="text-slate-800">{spec.print_color ?? "-"}</dd></div>
              <div><dt className="text-slate-500">제본</dt><dd className="text-slate-800">{spec.binding ?? "-"}</dd></div>
              <div><dt className="text-slate-500">후가공</dt><dd className="text-slate-800">{spec.finishing ?? "-"}</dd></div>
              <div><dt className="text-slate-500">포장·납품</dt><dd className="text-slate-800">{spec.packaging_delivery ?? "-"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">파일규격</dt><dd className="text-slate-800">{spec.file_rule ?? "-"}</dd></div>
            </dl>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-slate-500">상태 변경</h2>
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
