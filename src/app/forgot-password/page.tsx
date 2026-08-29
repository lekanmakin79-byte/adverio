"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (error) {
        setError(error.message);
        return;
      }

      setMessage(
        "If an account exists with this email address, we have sent a password reset link.",
      );
    } catch (err) {
      console.error("Password reset error:", err);

      setError(
        "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <a
              href="/"
              className="text-2xl font-bold text-slate-950"
            >
              Adverio<span className="text-blue-600">.</span>
            </a>

            <p className="mt-2 text-sm text-slate-500">
              AI Marketing Automation
            </p>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-950">
              Forgot your password?
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter your email address and we&apos;ll send you a
              secure link to reset your password.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Sending reset link..."
                : "Send reset link"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Remember your password?{" "}
            <a
              href="/login"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Sign in
            </a>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              ← Back to Adverio
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}