import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeadAssistant from "./LeadAssistant";
import ConvertToCustomer from "./ConvertToCustomer";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LeadDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      `
        id,
        owner_id,
        campaign_id,
        name,
        email,
        phone,
        message,
        source,
        status,
        follow_up_status,
        created_at,
        updated_at
      `,
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Lead details error:", error);
    notFound();
  }

  if (!lead) {
    notFound();
  }

  let campaign = null;

  if (lead.campaign_id) {
    const { data: campaignData } = await supabase
      .from("campaigns")
      .select(
        "id, campaign_name, objective, target_audience, key_message, call_to_action",
      )
      .eq("id", lead.campaign_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    campaign = campaignData;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <Link
          href="/dashboard/leads"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to leads
        </Link>

        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              ♙ Adverio Lead
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {lead.name}
            </h1>

            <p className="mt-2 text-slate-600">
              Customer enquiry and AI response assistant.
            </p>
          </div>

          <StatusBadge status={lead.status} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Customer information */}
          <section className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Customer information
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <InfoItem
                  label="Name"
                  value={lead.name}
                />

                <InfoItem
                  label="Status"
                  value={formatStatus(lead.status)}
                />

                <InfoItem
                  label="Email"
                  value={lead.email || "Not provided"}
                />

                <InfoItem
                  label="Phone"
                  value={lead.phone || "Not provided"}
                />

                <InfoItem
                  label="Source"
                  value={formatSource(lead.source)}
                />

                <InfoItem
                  label="Follow-up"
                  value={formatFollowUpStatus(
                    lead.follow_up_status,
                  )}
                />
              </div>

              <div className="mt-7 border-t border-slate-100 pt-6">
                <p className="text-sm font-semibold text-slate-500">
                  Customer enquiry
                </p>

                <div className="mt-3 rounded-xl bg-slate-50 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {lead.message || "No message provided."}
                  </p>
                </div>
              </div>

              <div className="mt-6 text-xs text-slate-400">
                Lead created{" "}
                {formatDate(lead.created_at)}
              </div>
            </div>

            {/* Campaign */}
            {campaign && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Campaign
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  {campaign.campaign_name}
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  {campaign.objective}
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <InfoItem
                    label="Target audience"
                    value={campaign.target_audience}
                  />

                  <InfoItem
                    label="Call to action"
                    value={campaign.call_to_action}
                  />
                </div>
              </div>
            )}
          </section>

          {/* AI assistant */}
          <aside>
            <LeadAssistant
              lead={{
                id: lead.id,
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                message: lead.message,
                status: lead.status,
                follow_up_status: lead.follow_up_status,
              }}
              campaign={
                campaign
                  ? {
                      campaign_name: campaign.campaign_name,
                      objective: campaign.objective,
                      target_audience:
                        campaign.target_audience,
                      key_message: campaign.key_message,
                      call_to_action:
                        campaign.call_to_action,
                    }
                  : null
              }
            />
          </aside>
               </div>

        {/* Convert converted lead into customer */}
        <div className="mt-6">
          <ConvertToCustomer
            leadId={lead.id}
            leadStatus={lead.status}
          />
        </div>
      </div>
    </main>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    new: "border-blue-200 bg-blue-50 text-blue-700",
    contacted:
      "border-amber-200 bg-amber-50 text-amber-700",
    qualified:
      "border-violet-200 bg-violet-50 text-violet-700",
    converted:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    lost: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${
        styles[status] ||
        "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    converted: "Converted",
    lost: "Lost",
  };

  return labels[status] || status;
}

function formatSource(source: string) {
  return source
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatFollowUpStatus(status: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    scheduled: "Scheduled",
    sent: "Sent",
    completed: "Completed",
  };

  return labels[status] || status;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
