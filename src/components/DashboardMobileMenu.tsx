"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
    label: "Marketing",
    href: "/dashboard/marketing",
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

type Business = {
  id: string;
  business_name: string;
};

export default function DashboardMobileMenu({
  businesses,
  currentBusinessId,
}: {
  businesses: Business[];
  currentBusinessId: string;
}) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [creating, setCreating] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  async function handleBusinessChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const businessId = event.target.value;

    if (
      !businessId ||
      businessId === currentBusinessId
    ) {
      return;
    }

    setSwitching(true);

    try {
      const response = await fetch(
        "/api/businesses/switch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "switch",
            businessId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to switch business.",
        );
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(
        "Business switch failed:",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to switch business. Please try again.",
      );
    } finally {
      setSwitching(false);
    }
  }

  async function handleCreateBusiness() {
    const businessName =
      window.prompt(
        "Enter the name of your new business:",
      );

    if (businessName === null) {
      return;
    }

    const trimmedName =
      businessName.trim();

    if (!trimmedName) {
      window.alert(
        "Please enter a business name.",
      );
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(
        "/api/businesses/switch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "create",
            businessName: trimmedName,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to create business.",
        );
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(
        "Business creation failed:",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to create business. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          open ? "Close menu" : "Open menu"
        }
        aria-expanded={open}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600 lg:hidden"
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
        <div className="fixed inset-x-0 top-20 z-[100] border-b border-slate-200 bg-white shadow-xl lg:hidden">
          <nav className="mx-auto max-w-7xl px-6 py-4">
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label
                htmlFor="mobile-business-switcher"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
              >
                Business
              </label>

              <select
                id="mobile-business-switcher"
                value={currentBusinessId}
                onChange={handleBusinessChange}
                disabled={
                  switching ||
                  creating
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
              >
                {businesses.map((business) => (
                  <option
                    key={business.id}
                    value={business.id}
                  >
                    {business.business_name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleCreateBusiness}
                disabled={
                  switching ||
                  creating
                }
                className="mt-2 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
              >
                {creating
                  ? "Creating business..."
                  : "+ Add Business"}
              </button>

              {switching && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Switching business...
                </p>
              )}
            </div>

            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </p>

            <div className="grid gap-1">
              {navigation.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(
                        item.href,
                      );

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() =>
                      setOpen(false)
                    }
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
              <form
                action="/auth/signout"
                method="post"
              >
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