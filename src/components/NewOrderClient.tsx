"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    setRequesterName(getStoredRequester());
    fetch("/api/spec")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setSpecs(data))
      .catch(() => {});
  }, []);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requesterName.trim() || !mediaId || !dueDate || !qty) {
      setToast("err");
      setTimeout(() => setToast(null), 2000);
      return;
    }
    setSubmitting(true);
    setToast(null);
    setStoredRequester(requesterName.trim());
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester_name: requesterName.trim(),
          media_id: mediaId,
          vendor: vendor.trim() || undefined,
          due_date: dueDate,
          qty: qty.trim(),
          file_link: fileLink.trim() || undefined,
          changes_note: changesNote.trim() || undefined,
        }),
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
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-medium text-slate-500">입력</h2>
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
              <span className="block text-sm text-slate-600 mb-1">수량</span>
              <input
                type="text"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
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
              <span className="block text-sm text-slate-600 mb-1">변경사항</span>
              <textarea
                value={changesNote}
                onChange={(e) => setChangesNote(e.target.value)}
                rows={2}
                className="input-dark w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </section>

          {spec && (
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
