"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "hsl(20, 14%, 6%)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="Mr Tasty"
            width={140}
            height={60}
            className="object-contain"
            priority
          />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-8"
          style={{
            background: "hsl(20, 14%, 9%)",
            borderColor: "hsl(25, 8%, 17%)",
          }}
        >
          <h1 className="text-xl font-bold text-white mb-1">Bienvenido</h1>
          <p className="text-sm text-white/40 mb-6">
            Iniciá sesión para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-brand-500 transition"
                style={{
                  background: "hsl(25, 8%, 13%)",
                  border: "1px solid hsl(25, 8%, 22%)",
                }}
                placeholder="admin@mrtasty.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                Contraseña
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-brand-500 transition"
                style={{
                  background: "hsl(25, 8%, 13%)",
                  border: "1px solid hsl(25, 8%, 22%)",
                }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg px-3 py-2.5 text-sm text-red-400 bg-red-500/10 border border-red-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? "hsl(25, 80%, 35%)"
                  : "hsl(25, 90%, 45%)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Iniciando sesión…
                </span>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          Mr Tasty · Sistema de gestión
        </p>
      </div>
    </div>
  );
}
