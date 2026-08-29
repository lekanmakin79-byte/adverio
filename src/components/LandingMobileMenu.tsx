"use client";

import { useState } from "react";

const navigation = [
  {
    label: "Features",
    href: "#features",
  },
  {
    label: "How It Works",
    href: "#how-it-works",
  },
  {
    label: "Industries",
    href: "#industries",
  },
  {
    label: "Pricing",
    href: "#pricing",
  },
];

export default function LandingMobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600 md:hidden"
      >
        <span className="sr-only">
          {open ? "Close menu" : "Open menu"}
        </span>

        {open ? (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              d="M6 6l12 12M18 6L6 18"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-[100] border-b border-slate-200 bg-white shadow-xl md:hidden">
          <nav className="mx-auto max-w-7xl px-6 py-4">
            <div className="grid gap-1">
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
              <a
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
              >
                Log in
              </a>

              <a
                href="/signup"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Get Started
              </a>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}