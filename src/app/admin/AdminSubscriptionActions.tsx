"use client";

import { useState } from "react";

export default function AdminSubscriptionActions({
  hasActiveSubscription,
  hasCustomer,
}: {
  hasActiveSubscription: boolean;
  hasCustomer: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function startCheckout() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/stripe/checkout",
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to start Stripe checkout.",
        );
      }

      if (!data.url) {
        throw new Error(
          "Stripe did not return a checkout URL.",
        );
      }

      window.location.href = data.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to start checkout.",
      );

      setLoading(false);
    }
  }

  async function openPortal() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/stripe/portal",
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to open Stripe portal.",
        );
      }

      if (!data.url) {
        throw new Error(
          "Stripe did not return a portal URL.",
        );
      }

      window.location.href = data.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to open billing portal.",
      );

      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        {!hasActiveSubscription && (
          <button
            type="button"
            onClick={startCheckout}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Opening Stripe..."
              : "Start Test Pro Subscription"}
          </button>
        )}

        {hasCustomer && (
          <button
            type="button"
            onClick={openPortal}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Manage Test Subscription
          </button>
        )}
      </div>

      {message && (
        <p className="mt-4 text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}