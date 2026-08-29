"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const industries = [
  "Electrician",
  "Plumber",
  "Builder",
  "Cleaner",
  "Landscaper",
  "Property Services",
  "Consultant",
  "Other",
];

const marketingGoals = [
  "Get more enquiries",
  "Generate more leads",
  "Get more bookings",
  "Increase local customers",
  "Promote my services",
  "Grow my business",
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [services, setServices] = useState("");
  const [targetCustomers, setTargetCustomers] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [marketingGoal, setMarketingGoal] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBusiness() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError) {
        setError(businessError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setBusinessName(data.business_name ?? "");
        setIndustry(data.industry ?? "");
        setServices(data.services ?? "");
        setTargetCustomers(data.target_customers ?? "");
        setLocation(data.location ?? "");
        setWebsite(data.website ?? "");
        setMarketingGoal(data.marketing_goal ?? "");
      }

      setLoading(false);
    }

    loadBusiness();
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const businessData = {
      owner_id: user.id,
      business_name: businessName.trim(),
      industry,
      services: services.trim(),
      target_customers: targetCustomers.trim(),
      location: location.trim(),
      website: website.trim() || null,
      marketing_goal: marketingGoal,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("businesses")
      .upsert(businessData, {
        onConflict: "owner_id",
      });

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading your business profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Adverio setup
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Tell us about your business
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            This information helps Adverio create marketing campaigns and
            content that are relevant to your business and customers.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="businessName"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Business name
              </label>

              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="e.g. ABC Electrical Services"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="industry"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Industry
              </label>

              <select
                id="industry"
                required
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select your industry</option>

                {industries.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="services"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                What services do you provide?
              </label>

              <textarea
                id="services"
                required
                rows={4}
                value={services}
                onChange={(event) => setServices(event.target.value)}
                placeholder="Describe the main services you offer..."
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="targetCustomers"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Who are your ideal customers?
              </label>

              <textarea
                id="targetCustomers"
                required
                rows={3}
                value={targetCustomers}
                onChange={(event) => setTargetCustomers(event.target.value)}
                placeholder="e.g. Homeowners and small businesses in my local area"
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="location"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Business location
              </label>

              <input
                id="location"
                type="text"
                required
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Manchester, UK"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="website"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Website{" "}
                <span className="font-normal text-slate-400">
                  (optional)
                </span>
              </label>

              <input
                id="website"
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://yourbusiness.com"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="marketingGoal"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                What is your main marketing goal?
              </label>

              <select
                id="marketingGoal"
                required
                value={marketingGoal}
                onChange={(event) => setMarketingGoal(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select your main goal</option>

                {marketingGoals.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save and continue"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
