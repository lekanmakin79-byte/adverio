"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Business = {
  business_name: string;
  industry: string;
  services: string;
  target_customers: string;
  location: string;
  website: string;
  marketing_goal: string;
};

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business>({
    business_name: "",
    industry: "",
    services: "",
    target_customers: "",
    location: "",
    website: "",
    marketing_goal: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  const [linkedinConnected, setLinkedinConnected] =
  useState(false);

  useEffect(() => {
	  const params = new URLSearchParams(
  window.location.search,
);

const linkedinStatus = params.get("linkedin");

if (linkedinStatus === "connected") {
  setLinkedinConnected(true);
  setMessage("LinkedIn connected successfully.");
}

if (linkedinStatus === "error") {
  setError(
    "Unable to connect LinkedIn. Please try again.",
  );
}

if (linkedinStatus === "invalid_state") {
  setError(
    "LinkedIn connection expired. Please try again.",
  );

}

if (linkedinStatus === "token_error") {
  setError(
    "LinkedIn authorization could not be completed.",
  );
}

if (linkedinStatus === "save_error") {
  setError(
    "LinkedIn was authorized, but the connection could not be saved.",
  );
}
    async function loadBusiness() {
      setError("");

      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          window.location.href = "/login";
          return;
        }

        const { data, error: businessError } = await supabase
          .from("businesses")
          .select(
            "business_name, industry, services, target_customers, location, website, marketing_goal",
          )
          .eq("owner_id", user.id)
          .maybeSingle();

        if (businessError) {
          console.error(
            "Business settings lookup error:",
            businessError,
          );

          setError(
            "Unable to load your business settings.",
          );

          return;
        }

        if (!data) {
          window.location.href = "/onboarding";
          return;
        }

        setBusiness({
          business_name: data.business_name || "",
          industry: data.industry || "",
          services: data.services || "",
          target_customers: data.target_customers || "",
          location: data.location || "",
          website: data.website || "",
          marketing_goal: data.marketing_goal || "",
        });
      } catch (err) {
        console.error(
          "Business settings load error:",
          err,
        );

        setError(
          "Something went wrong while loading your settings.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadBusiness();
  }, []);

  function updateField(
    field: keyof Business,
    value: string,
  ) {
    setBusiness((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveSettings(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!business.business_name.trim()) {
      setError("Business name is required.");
      return;
    }

    if (!business.industry.trim()) {
      setError("Industry is required.");
      return;
    }

    if (!business.services.trim()) {
      setError("Please enter your services.");
      return;
    }

    if (!business.target_customers.trim()) {
      setError("Please enter your target customers.");
      return;
    }

    if (!business.location.trim()) {
      setError("Please enter your business location.");
      return;
    }

    if (!business.marketing_goal.trim()) {
      setError("Please enter your main marketing goal.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      const { error: updateError } = await supabase
        .from("businesses")
        .update({
          business_name: business.business_name.trim(),
          industry: business.industry.trim(),
          services: business.services.trim(),
          target_customers:
            business.target_customers.trim(),
          location: business.location.trim(),
          website: business.website.trim() || null,
          marketing_goal:
            business.marketing_goal.trim(),
        })
        .eq("owner_id", user.id);

      if (updateError) {
        console.error(
          "Business settings update error:",
          updateError,
        );

        setError(
          "Unable to save your business settings. Please try again.",
        );

        return;
      }

      setMessage(
        "Business settings saved successfully.",
      );
    } catch (err) {
      console.error(
        "Business settings save error:",
        err,
      );

      setError(
        "Something went wrong while saving your settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">
              Loading business settings...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-8">
          <a
            href="/dashboard"
            className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          >
            ← Back to dashboard
          </a>

          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            Business Settings
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Manage the business information Adverio uses to
            personalise your AI-generated marketing content.
          </p>
        </div>

        <form
          onSubmit={saveSettings}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-950">
              Business profile
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Keep these details accurate so Adverio can create
              relevant and truthful marketing content.
            </p>
          </div>

          <div className="space-y-6">
            {/* Business name */}
            <div>
              <label
                htmlFor="business_name"
                className="text-sm font-semibold text-slate-900"
              >
                Business name
              </label>

              <input
                id="business_name"
                type="text"
                value={business.business_name}
                onChange={(event) =>
                  updateField(
                    "business_name",
                    event.target.value,
                  )
                }
                maxLength={150}
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Industry */}
            <div>
              <label
                htmlFor="industry"
                className="text-sm font-semibold text-slate-900"
              >
                Industry
              </label>

              <input
                id="industry"
                type="text"
                value={business.industry}
                onChange={(event) =>
                  updateField(
                    "industry",
                    event.target.value,
                  )
                }
                maxLength={100}
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Services */}
            <div>
              <label
                htmlFor="services"
                className="text-sm font-semibold text-slate-900"
              >
                Services
              </label>

              <textarea
                id="services"
                value={business.services}
                onChange={(event) =>
                  updateField(
                    "services",
                    event.target.value,
                  )
                }
                maxLength={2000}
                rows={4}
                required
                className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-xs text-slate-400">
                Describe the services your business provides.
              </p>
            </div>

            {/* Target customers */}
            <div>
              <label
                htmlFor="target_customers"
                className="text-sm font-semibold text-slate-900"
              >
                Target customers
              </label>

              <textarea
                id="target_customers"
                value={business.target_customers}
                onChange={(event) =>
                  updateField(
                    "target_customers",
                    event.target.value,
                  )
                }
                maxLength={1000}
                rows={3}
                required
                className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="text-sm font-semibold text-slate-900"
              >
                Location
              </label>

              <input
                id="location"
                type="text"
                value={business.location}
                onChange={(event) =>
                  updateField(
                    "location",
                    event.target.value,
                  )
                }
                maxLength={200}
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Website */}
            <div>
              <label
                htmlFor="website"
                className="text-sm font-semibold text-slate-900"
              >
                Website
              </label>

              <input
                id="website"
                type="url"
                value={business.website}
                onChange={(event) =>
                  updateField(
                    "website",
                    event.target.value,
                  )
                }
                maxLength={500}
                placeholder="https://example.com"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Marketing goal */}
            <div>
              <label
                htmlFor="marketing_goal"
                className="text-sm font-semibold text-slate-900"
              >
                Main marketing goal
              </label>

              <textarea
                id="marketing_goal"
                value={business.marketing_goal}
                onChange={(event) =>
                  updateField(
                    "marketing_goal",
                    event.target.value,
                  )
                }
                maxLength={1000}
                rows={3}
                required
                className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-xs text-slate-400">
                Example: Get more enquiries, generate more
                bookings, or increase repeat customers.
              </p>
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          )}

          {/* Save */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
			
			<div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className="text-lg font-bold text-slate-950">
        Social connections
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        Connect your LinkedIn account so Adverio can
        publish your marketing content for you.
      </p>
    </div>

    <a
      href="/api/auth/linkedin"
      className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
    >
      {linkedinConnected
        ? "Reconnect LinkedIn"
        : "Connect LinkedIn"}
    </a>
  </div>

  {linkedinConnected && (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      LinkedIn is connected and ready for publishing.
    </div>
  )}
</div>
			
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}