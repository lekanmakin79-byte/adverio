"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
const router = useRouter();
const searchParams = useSearchParams();

const redirect =
searchParams.get("redirect") || "/dashboard";

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleLogin(
event: FormEvent<HTMLFormElement>,
) {
event.preventDefault();


setError("");
setLoading(true);

try {
  const supabase = createClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    setError(error.message);
    return;
  }

  router.push(redirect);
  router.refresh();
} catch (err) {
  console.error("Login error:", err);

  setError(
    "Something went wrong. Please try again.",
  );
} finally {
  setLoading(false);
}


}

return ( <main className="min-h-screen bg-slate-50 px-6 py-12"> <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center"> <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"> <div className="mb-8 text-center"> <a
           href="/"
           className="text-2xl font-bold text-slate-950"
         >
Adverio. </a>


        <p className="mt-2 text-sm text-slate-500">
          AI Marketing Automation
        </p>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-950">
          Welcome back
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Sign in to access your Adverio marketing
          dashboard.
        </p>
      </div>

      <form
        onSubmit={handleLogin}
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

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Signing in..."
            : "Sign in"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-600">
        Don't have an Adverio account?{" "}
        <a
          href="/signup"
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          Create one
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

export default function LoginPage() {
return (
<Suspense
fallback={ <main className="min-h-screen bg-slate-50 px-6 py-12"> <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center"> <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"> <p className="text-sm text-slate-500">
Loading sign in... </p> </div> </div> </main>
}
> <LoginForm /> </Suspense>
);
}
