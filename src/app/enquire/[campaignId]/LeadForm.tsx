"use client";

import { FormEvent, useState } from "react";

export default function LeadForm({
  campaignId,
}: {
  campaignId: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/leads/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId,
          name,
          email,
          phone,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to submit your enquiry. Please try again.",
        );
        return;
      }

      setSuccess(true);

      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (submitError) {
      console.error("Lead submission error:", submitError);

      setError(
        "Unable to submit your enquiry. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl">
          ✓
        </div>

        <h2 className="mt-4 text-xl font-bold text-emerald-950">
          Enquiry sent
        </h2>

        <p className="mt-2 text-sm leading-6 text-emerald-800">
          Thank you. Your enquiry has been submitted successfully.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-semibold text-slate-700"
        >
          Your name
        </label>

        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="John Smith"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-slate-700"
        >
          Email address
        </label>

        <input
          id="email"
          name="email"
          type="email"
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="john@example.com"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-semibold text-slate-700"
        >
          Phone number
        </label>

        <input
          id="phone"
          name="phone"
          type="tel"
          maxLength={50}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+44 7000 000000"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <p className="mt-2 text-xs text-slate-500">
          Please provide an email address or phone number.
        </p>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-semibold text-slate-700"
        >
          How can we help?
        </label>

        <textarea
          id="message"
          name="message"
          rows={5}
          maxLength={3000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us what you need..."
          className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Enquiry"}
      </button>

      <p className="text-center text-xs leading-5 text-slate-400">
        By submitting this form, you are sending your enquiry to the
        business associated with this campaign.
      </p>
    </form>
  );
}
