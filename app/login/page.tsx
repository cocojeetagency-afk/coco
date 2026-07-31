"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-green-700 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
            🥥
          </div>
          <h1 className="text-xl font-bold text-green-800">
            Coconut Export Manager
          </h1>
          <p className="mt-1 text-sm text-slate-500">JEET AGENCY, Salem</p>
        </div>
        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200"
              placeholder="Enter password"
            />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-green-700 py-3 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Logging in..." : "LOGIN"}
          </button>
        </form>
      </div>
    </main>
  );
}
