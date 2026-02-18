"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Vendor {
  vendor_id: string;
  vendor_name: string;
  is_active: string;
  created_at?: string;
  updated_at?: string;
}

export function VendorsPageClient() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setError("접근 권한이 없습니다. 관리자만 접근할 수 있습니다.");
          router.push("/list");
          return;
        }
        setError(data.error ?? "업체 목록을 불러올 수 없습니다.");
        setVendors([]);
        return;
      }
      setVendors(Array.isArray(data) ? data : []);
    } catch {
      setError("업체 목록을 불러올 수 없습니다.");
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(vendorId: string, vendorName: string) {
    if (!confirm(`정말로 "${vendorName}" 업체를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "삭제에 실패했습니다.");
        return;
      }
      alert("삭제되었습니다.");
      load();
    } catch {
      alert("삭제에 실패했습니다.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* 데스크탑: 탭 네비게이션 */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/list" className="text-base font-medium text-slate-600 hover:text-slate-800">
              제작 의뢰 관리
            </Link>
            <span className="text-slate-400">|</span>
            <Link href="/specs" className="text-base font-medium text-slate-600 hover:text-slate-800">
              매체 사양 관리
            </Link>
            <span className="text-slate-400">|</span>
            <Link href="/vendors" className="text-base font-medium text-blue-600">
              제작업체 관리
            </Link>
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
            <span className="text-base font-medium text-blue-600">제작업체 관리</span>
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
      {/* 배경 블러 처리 */}
      <div
        className={`fixed inset-0 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />
      {/* 슬라이드 메뉴 */}
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
            className="block text-base font-medium text-white/70 hover:text-white py-2"
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
          <Link
            href="/vendors"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-blue-400 py-2"
          >
            제작업체 관리
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">제작업체 관리</h1>
          <Link
            href="/vendors/new"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + 업체 추가
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium mb-1">⚠️ 오류</p>
            <p>{error}</p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">불러오는 중…</div>
          ) : vendors.length === 0 ? (
            <div className="p-8 text-center text-slate-500">등록된 업체가 없습니다.</div>
          ) : (
            <>
              {/* 데스크탑: 테이블 형태 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                      <th className="px-4 py-3 font-medium">업체 ID</th>
                      <th className="px-4 py-3 font-medium">업체명</th>
                      <th className="px-4 py-3 font-medium">상태</th>
                      <th className="px-4 py-3 font-medium">생성일</th>
                      <th className="px-4 py-3 font-medium">수정일</th>
                      <th className="px-4 py-3 font-medium text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor) => (
                      <tr
                        key={vendor.vendor_id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 text-slate-700 font-mono text-xs">
                          {vendor.vendor_id}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {vendor.vendor_name}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              vendor.is_active === "TRUE" || vendor.is_active === "true"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {vendor.is_active === "TRUE" || vendor.is_active === "true"
                              ? "활성"
                              : "비활성"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {vendor.created_at
                            ? vendor.created_at.slice(0, 10).replace("T", " ")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {vendor.updated_at
                            ? vendor.updated_at.slice(0, 10).replace("T", " ")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/vendors/${vendor.vendor_id}`}
                              className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                            >
                              수정
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(vendor.vendor_id, vendor.vendor_name)}
                              className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일: 카드 형태 */}
              <div className="md:hidden divide-y divide-slate-200">
                {vendors.map((vendor) => (
                  <div key={vendor.vendor_id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-800 mb-1">{vendor.vendor_name}</h3>
                        <p className="text-xs text-slate-500 font-mono">{vendor.vendor_id}</p>
                      </div>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          vendor.is_active === "TRUE" || vendor.is_active === "true"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {vendor.is_active === "TRUE" || vendor.is_active === "true"
                          ? "활성"
                          : "비활성"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                      <div>
                        <span className="text-slate-500">생성일:</span>{" "}
                        {vendor.created_at
                          ? vendor.created_at.slice(0, 10).replace("T", " ")
                          : "-"}
                      </div>
                      <div>
                        <span className="text-slate-500">수정일:</span>{" "}
                        {vendor.updated_at
                          ? vendor.updated_at.slice(0, 10).replace("T", " ")
                          : "-"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/vendors/${vendor.vendor_id}`}
                        className="flex-1 rounded bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 text-center"
                      >
                        수정
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(vendor.vendor_id, vendor.vendor_name)}
                        className="flex-1 rounded bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
