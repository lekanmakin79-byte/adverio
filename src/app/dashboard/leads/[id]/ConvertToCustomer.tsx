"use client";

import Link from "next/link";

type Props = {
  leadId: string;
  leadStatus: string;
};

export default function ConvertToCustomer({
  leadId,
  leadStatus,
}: Props) {
  /*
   * Customer conversion is now handled directly by
   * LeadAssistant when the user selects "Converted".
   *
   * This component is therefore intentionally hidden.
   *
   * We keep the component in place so page.tsx does
   * not need to be changed and the old conversion
   * flow cannot create duplicate customer records.
   */

  void leadId;

  if (leadStatus !== "converted") {
    return null;
  }

  /*
   * The lead has already been converted by
   * LeadAssistant.
   *
   * Do not show another "Convert to Customer"
   * button because the customer record has already
   * been created.
   */

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          Customer
        </p>

        <h2 className="mt-2 text-xl font-bold text-emerald-950">
          Lead converted successfully
        </h2>

        <p className="mt-2 text-sm leading-6 text-emerald-800">
          This lead has been converted and a customer
          record has been created successfully.
        </p>
      </div>

      <Link
        href="/dashboard/customers"
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
      >
        View Customers →
      </Link>
    </section>
  );
}
