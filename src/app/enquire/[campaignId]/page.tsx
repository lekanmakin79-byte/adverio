import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeadForm from "./LeadForm";

type PageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function PublicEnquiryPage({
  params,
}: PageProps) {
  const { campaignId } = await params;

  const supabase = await createClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select(
      "id, campaign_name, objective, call_to_action, status",
    )
    .eq("id", campaignId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Public campaign lookup error:", error);
    notFound();
  }

  if (!campaign) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-950">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              ✦ Adverio
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              {campaign.campaign_name}
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              {campaign.objective}
            </p>
          </div>

          <div className="my-8 h-px bg-slate-100" />

          <div>
            <h2 className="text-xl font-bold">
              Get in touch
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tell us what you need and we&apos;ll get back to you.
            </p>

            <div className="mt-7">
              <LeadForm campaignId={campaign.id} />
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by Adverio AI
        </p>
      </div>
    </main>
  );
}
