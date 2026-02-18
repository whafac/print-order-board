"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface VendorFormData {
  vendor_id: string;
  vendor_name: string;
  pin: string;
  pin_confirm: string;
  is_active: string;
}

interface VendorFormClientProps {
  vendorId?: string; // 수정 모드일 때만 제공
}

export function VendorFormClient({ vendorId }: VendorFormClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<VendorFormData>({
    vendor_id: "",
    vendor_name: "",
    pin: "",
    pin_confirm: "",
    is_active: "TRUE",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!vendorId;

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (isEditMode && vendorId) {
      async function load() {
        setLoading(true);
        try {
          const res = await fetch(`/api/vendors/${vendorId}`);
          const data = await res.json();
          if (!res.ok) {
            if (res.status === 403) {
              alert("접근 권한이 없습니다.");
              router.push("/vendors");
              return;
            }
            setError(data.error || "업체 정보를 불러올 수 없습니다.");
            return;
          }
          setForm({
            vendor_id: data.vendor_id || "",
            vendor_name: data.vendor_name || "",
            pin: "", // PIN은 표시하지 않음
            pin_confirm: "",
            is_active: data.is_active || "TRUE",
          });
        } catch {
          setError("업체 정보를 불러올 수 없습니다.");
        } finally {
          setLoading(false);
        }
      }
      load();
    }
  }, [isEditMode, vendorId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!form.vendor_id.trim()) {
      setError("업체 ID를 입력해주세요.");
      return;
    }
    if (!form.vendor_name.trim()) {
      setError("업체명을 입력해주세요.");
      return;
    }
    if (!isEditMode) {
      // 추가 모드일 때만 PIN 필수
      if (!form.pin.trim()) {
        setError("PIN 번호를 입력해주세요.");
        return;
      }
      if (!/^\d{6}$/.test(form.pin.trim())) {
        setError("PIN 번호는 6자리 숫자여야 합니다.");
        return;
      }
      if (form.pin !== form.pin_confirm) {
        setError("PIN 번호가 일치하지 않습니다.");
        return;
      }
    } else {
      // 수정 모드일 때 PIN이 입력되면 확인 필요
      if (form.pin.trim()) {
        if (!/^\d{6}$/.test(form.pin.trim())) {
          setError("PIN 번호는 6자리 숫자여야 합니다.");
          return;
        }
        if (form.pin !== form.pin_confirm) {
          setError("PIN 번호가 일치하지 않습니다.");
          return;
        }
      }
    }

    setSaving(true);
    try {
      if (isEditMode) {
        // 수정
        const body: { vendor_name?: string; pin?: string; is_active?: string } = {
          vendor_name: form.vendor_name.trim(),
          is_active: form.is_active,
        };
        if (form.pin.trim()) {
          body.pin = form.pin.trim();
        }
        const res = await fetch(`/api/vendors/${vendorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "수정에 실패했습니다.");
          return;
        }
        alert("수정되었습니다.");
        router.push("/vendors");
      } else {
        // 추가
        const res = await fetch("/api/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendor_id: form.vendor_id.trim(),
            vendor_name: form.vendor_name.trim(),
            pin: form.pin.trim(),
            is_active: form.is_active,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "등록에 실패했습니다.");
          return;
        }
        alert("등록되었습니다.");
        router.push("/vendors");
      }
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center text-slate-500">
          불러오는 중…
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link
            href="/vendors"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
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
        <h1 className="text-lg font-semibold text-slate-800 mb-6">
          {isEditMode ? "제작업체 수정" : "제작업체 추가"}
        </h1>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium mb-1">⚠️ 오류</p>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              업체 ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.vendor_id}
              onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
              disabled={isEditMode}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              placeholder="예: newvendor"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              영문 소문자, 하이픈 허용. 수정 불가.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              업체명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.vendor_name}
              onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="예: 신규업체"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              PIN 번호 {!isEditMode && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={isEditMode ? "변경하지 않으려면 비워두세요" : "6자리 숫자"}
              maxLength={6}
            />
            <p className="mt-1 text-xs text-slate-500">
              {isEditMode
                ? "변경하지 않으려면 비워두세요. 변경 시 새 PIN 번호를 입력하세요."
                : "6자리 숫자로 입력하세요."}
            </p>
          </div>

          {form.pin.trim() && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                PIN 번호 확인 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={form.pin_confirm}
                onChange={(e) => setForm({ ...form, pin_confirm: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="PIN 번호를 다시 입력하세요"
                maxLength={6}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              상태
            </label>
            <select
              value={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="TRUE">활성</option>
              <option value="FALSE">비활성</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              비활성으로 설정하면 해당 업체로 로그인할 수 없습니다.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/vendors"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중..." : isEditMode ? "수정" : "등록"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
