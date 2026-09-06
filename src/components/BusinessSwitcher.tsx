"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Business = {
  id: string;
  business_name: string;
};

export default function BusinessSwitcher({
  businesses,
  currentBusinessId,
}: {
  businesses: Business[];
  currentBusinessId: string;
}) {
  const router = useRouter();

  const [switching, setSwitching] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleChange(
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label
        htmlFor="business-switcher"
        className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400"
      >
        Business
      </label>

      <select
        id="business-switcher"
        value={currentBusinessId}
        onChange={handleChange}
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
  );
}