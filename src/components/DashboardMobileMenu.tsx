"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
{
label: "Overview",
href: "/dashboard",
},
{
label: "AI Campaigns",
href: "/dashboard/campaigns",
},
{
label: "Content",
href: "/dashboard/content",
},
{
label: "Leads",
href: "/dashboard/leads",
},
{
label: "Follow-ups",
href: "/dashboard/follow-ups",
},
{
label: "Analytics",
href: "/dashboard/analytics",
},
{
label: "Business Settings",
href: "/dashboard/settings",
},
];

export default function DashboardMobileMenu() {
const [open, setOpen] = useState(false);
const pathname = usePathname();

return (
<>
<button
type="button"
onClick={() => setOpen((value) => !value)}
aria-label={open ? "Close menu" : "Open menu"}
aria-expanded={open}
className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600 lg:hidden"
> <span className="sr-only">
{open ? "Close menu" : "Open menu"} </span>


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
    <div className="fixed inset-x-0 top-20 z-[100] border-b border-slate-200 bg-white shadow-xl lg:hidden">
      <nav className="mx-auto max-w-7xl px-6 py-4">
        <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </p>

        <div className="grid gap-1">
          {navigation.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-red-600"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </div>
  )}
</>


);
}
