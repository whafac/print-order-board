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
  const [summary, setSummary] = useState({ total: 0, due7: 0, done: 0 });

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
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setSummary({
        total: all.length,
        due7: all.filter((j: Job) => j.due_date && new Date(j.due_date) <= in7 && new Date(j.due_date) >= now).length,
        done: all.filter((j: Job) => j.status === "검수완료" || j.status === "완료").length,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [month, status, vendor, mediaId]);

  const vendors = Array.from(new Set(jobs.map((j) => j.vendor).filter(Boolean))).sort();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-800">제작 의뢰 관리</h1>
            <Link href="/specs" className="text-sm text-slate-600 hover:text-slate-800">매체 사양 관리</Link>
          </div>
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

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">이번 달 전체</p>
            <p className="text-2xl font-semibold text-slate-800">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">납기 7일 이내</p>
            <p className="text-2xl font-semibold text-amber-600">{summary.due7}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">검수완료</p>
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

        <div className="mb-4 flex justify-end">
          <Link
            href="/new"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + 새 의뢰
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">불러오는 중…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
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
                      <td className="px-4 py-2 text-slate-700">{job.media_name || "-"}</td>
                      <td className="px-4 py-2 text-slate-700">{job.qty || "-"}</td>
                      <td className="px-4 py-2 text-slate-700">{job.vendor || "-"}</td>
                      <td className="px-4 py-2 text-slate-700">{job.requester_name || "-"}</td>
                      <td className="px-4 py-2 text-slate-600">{job.created_at ? job.created_at.slice(0, 10) : "-"}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && jobs.length === 0 && (
            <div className="p-8 text-center text-slate-500">의뢰가 없습니다.</div>
          )}
        </div>
      </div>
    </>
  );
}
