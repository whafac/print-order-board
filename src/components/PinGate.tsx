"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const HONEYPOT = "website_url";

export function PinGate() {
  const [pin, setPin] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(pin)) {
      setError("PIN은 6자리 숫자여야 합니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, [HONEYPOT]: honeypot }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "PIN이 올바르지 않습니다");
        return;
      }
      router.push("/list");
      router.refresh();
    } catch {
      setError("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white shadow-lg p-8">
      <h1 className="text-xl font-semibold text-center text-slate-800 mb-6">
        제작 의뢰 관리
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name={HONEYPOT}
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="absolute -left-[9999px]"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
        />
        <div>
          <label htmlFor="pin" className="block text-sm font-medium text-slate-600 mb-1">
            PIN 6자리
          </label>
          <input
            id="pin"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 6);
              setPin(next);
            }}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-xl font-semibold text-slate-900 tracking-[0.4em] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="000000"
            autoComplete="one-time-code"
            aria-label="PIN 6자리"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 text-center" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-800 text-white py-3 font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "확인 중…" : "입장"}
        </button>
      </form>
    </div>
  );
}
