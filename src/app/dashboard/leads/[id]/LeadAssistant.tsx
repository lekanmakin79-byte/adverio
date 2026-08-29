"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Lead = {
id: string;
name: string;
email: string | null;
phone: string | null;
message: string | null;
status: string;
follow_up_status: string;
ai_response?: string | null;
ai_follow_up?: string | null;
};

type Campaign = {
campaign_name: string;
objective: string;
target_audience: string;
key_message: string;
call_to_action: string;
};

type Props = {
lead: Lead;
campaign: Campaign | null;
};

type Customer = {
id: string;
owner_id: string;
lead_id: string;
name: string;
email: string | null;
phone: string | null;
created_at: string;
updated_at: string;
};

const statuses = [
{
value: "new",
label: "New",
description: "New enquiry",
},
{
value: "contacted",
label: "Contacted",
description: "Customer has been contacted",
},
{
value: "qualified",
label: "Qualified",
description: "Potential customer is qualified",
},
{
value: "converted",
label: "Converted",
description: "Lead became a customer",
},
{
value: "lost",
label: "Lost",
description: "Lead did not convert",
},
];

export default function LeadAssistant({
lead,
campaign,
}: Props) {
const router = useRouter();

const [response, setResponse] = useState(
lead.ai_response || "",
);

const [followUp, setFollowUp] = useState(
lead.ai_follow_up || "",
);

const [loadingResponse, setLoadingResponse] =
useState(false);

const [loadingFollowUp, setLoadingFollowUp] =
useState(false);

const [savingResponse, setSavingResponse] =
useState(false);

const [savingFollowUp, setSavingFollowUp] =
useState(false);

const [updatingStatus, setUpdatingStatus] =
useState(false);

const [convertingLead, setConvertingLead] =
useState(false);

const [currentStatus, setCurrentStatus] =
useState(lead.status);

const [customer, setCustomer] =
useState<Customer | null>(null);

const [message, setMessage] = useState("");

const [error, setError] = useState("");

// --------------------------------------------------
// Generate AI response or follow-up
// --------------------------------------------------

async function generate(
type: "response" | "follow-up",
) {
setError("");
setMessage("");


if (type === "response") {
  setLoadingResponse(true);
} else {
  setLoadingFollowUp(true);
}

try {
  const result = await fetch(
    "/api/ai/lead-response",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        lead,
        campaign,
      }),
    },
  );

  const data = await result.json();

  if (!result.ok) {
    setError(
      data.error ||
        "Unable to generate AI content.",
    );
    return;
  }

  if (type === "response") {
    setResponse(data.content || "");
  } else {
    setFollowUp(data.content || "");
  }
} catch (err) {
  console.error(
    "AI lead generation error:",
    err,
  );

  setError(
    "Unable to connect to the AI service. Please try again.",
  );
} finally {
  setLoadingResponse(false);
  setLoadingFollowUp(false);
}


}

// --------------------------------------------------
// Save AI response or follow-up
// --------------------------------------------------

async function saveContent(
type: "response" | "follow-up",
) {
setError("");
setMessage("");


const content =
  type === "response"
    ? response
    : followUp;

if (!content.trim()) {
  setError(
    type === "response"
      ? "Generate a response before saving it."
      : "Generate a follow-up before saving it.",
  );
  return;
}

if (type === "response") {
  setSavingResponse(true);
} else {
  setSavingFollowUp(true);
}

try {
  const result = await fetch(
    `/api/leads/${lead.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        [type === "response"
          ? "ai_response"
          : "ai_follow_up"]: content.trim(),
      }),
    },
  );

  const data = await result.json();

  if (!result.ok) {
    setError(
      data.error ||
        "Unable to save the AI message.",
    );
    return;
  }

  setMessage(
    type === "response"
      ? "AI response saved successfully."
      : "Follow-up message saved successfully.",
  );
} catch (err) {
  console.error(
    "Save AI content error:",
    err,
  );

  setError(
    "Unable to save the message. Please try again.",
  );
} finally {
  setSavingResponse(false);
  setSavingFollowUp(false);
}


}

// --------------------------------------------------
// Update lead status
//
// IMPORTANT:
// When Converted is selected:
//
// 1. Update lead status to "converted".
// 2. Then call /convert.
//
// This is required because the conversion API checks
// that the lead is already converted.
// --------------------------------------------------

async function updateStatus(
status: string,
) {
console.log(
"STATUS BUTTON CLICKED:",
{
leadId: lead.id,
requestedStatus: status,
currentStatus,
},
);


if (status === currentStatus) {
  return;
}

setError("");
setMessage("");
setUpdatingStatus(true);

try {
  // ------------------------------------------------
  // STEP 1: Update the lead status
  // ------------------------------------------------

  const result = await fetch(
    `/api/leads/${lead.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
      }),
    },
  );

  const data = await result.json();

  if (!result.ok) {
    setError(
      data.error ||
        "Unable to update lead status.",
    );
    return;
  }

  // ------------------------------------------------
  // STEP 2: Update local UI
  // ------------------------------------------------

  setCurrentStatus(status);

  // ------------------------------------------------
  // STEP 3: If Converted was selected, create the
  // customer AFTER the lead has been converted.
  // ------------------------------------------------

  if (status === "converted") {
    setConvertingLead(true);

    try {
      const convertResult = await fetch(
        `/api/leads/${lead.id}/convert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const convertData =
        await convertResult.json();

      if (!convertResult.ok) {
        setError(
          convertData.error ||
            "The lead was marked as Converted, but the customer could not be created.",
        );
        return;
      }

      if (convertData.customer) {
        setCustomer(convertData.customer);
      }

     if (convertData.alreadyExists) {
  setMessage(
    "Lead marked as Converted. This lead is already a customer, so no duplicate customer was created.",
  );
} else {
  setMessage(
    "Lead converted successfully. Customer created.",
  );
}

// Refresh the server-rendered lead details
router.refresh();

    } catch (err) {
      console.error(
        "Lead conversion error:",
        err,
      );

      setError(
        "The lead was marked as Converted, but we could not create the customer. Please try again.",
      );
    } finally {
      setConvertingLead(false);
    }

    return;
  }

  // ------------------------------------------------
  // STEP 4: Normal status change
  // ------------------------------------------------

  const selectedStatus = statuses.find(
    (item) => item.value === status,
  );

  setMessage(
    `Lead marked as ${
      selectedStatus?.label || status
    }.`,
  );
  
  router.refresh();
  
} catch (err) {
  console.error(
    "Lead status update error:",
    err,
  );

  setError(
    "Unable to update the lead status. Please try again.",
  );
} finally {
  setUpdatingStatus(false);
}


}

// --------------------------------------------------
// Copy text
// --------------------------------------------------

async function copyText(
text: string,
label: string,
) {
if (!text) {
return;
}


try {
  await navigator.clipboard.writeText(text);

  setError("");
  setMessage(
    `${label} copied to clipboard.`,
  );
} catch (err) {
  console.error(
    "Clipboard error:",
    err,
  );

  setError(
    "Unable to copy the message. Please select and copy it manually.",
  );
}


}

// --------------------------------------------------
// Disable actions while another operation is running
// --------------------------------------------------

const actionsDisabled =
loadingResponse ||
loadingFollowUp ||
savingResponse ||
savingFollowUp ||
updatingStatus ||
convertingLead;

return ( <div className="space-y-6">
{/* AI header */} <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm"> <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
✦ Adverio AI </p>


    <h2 className="mt-2 text-xl font-bold text-slate-950">
      Lead Assistant
    </h2>

    <p className="mt-2 text-sm leading-6 text-slate-600">
      Generate a personalised response or follow-up
      based on this customer enquiry.
    </p>
  </div>

  {/* Lead status */}
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="font-bold text-slate-950">
          Lead status
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Move this enquiry through your customer
          journey.
        </p>
      </div>

      <div className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
        Current status: {currentStatus}
      </div>
    </div>

    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {statuses.map((status) => {
        const active =
          currentStatus === status.value;

        const isConverted =
          status.value === "converted";

        return (
          <button
            key={status.value}
            type="button"
            disabled={actionsDisabled}
            onClick={() =>
              updateStatus(status.value)
            }
            className={`min-w-0 rounded-xl border p-4 text-left transition ${
              active
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <p
              className={`break-words text-sm font-bold ${
                active
                  ? "text-blue-700"
                  : "text-slate-900"
              }`}
            >
              {isConverted &&
              convertingLead
                ? "Converting..."
                : status.label}
            </p>

            <p className="mt-1 break-words text-xs leading-5 text-slate-500">
              {status.description}
            </p>
          </button>
        );
      })}
    </div>

    {/* Customer created successfully */}
    {customer && (
      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-bold text-emerald-800">
          Customer record
        </p>

        <p className="mt-1 text-sm text-emerald-700">
          {customer.name} is now a customer.
        </p>

        <Link
          href="/dashboard/customers"
          className="mt-3 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          View customers →
        </Link>
      </div>
    )}
  </section>

  {/* First response */}
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h3 className="font-bold text-slate-950">
      First response
    </h3>

    <p className="mt-2 text-sm leading-6 text-slate-600">
      Create a professional response for{" "}
      {lead.name}.
    </p>

    <button
      type="button"
      onClick={() => generate("response")}
      disabled={actionsDisabled}
      className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loadingResponse
        ? "Generating..."
        : "✦ Generate AI Response"}
    </button>

    {response && (
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Suggested response
        </p>

        <div className="mt-2 rounded-xl bg-slate-50 p-4">
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
            {response}
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              copyText(
                response,
                "Response",
              )
            }
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600"
          >
            Copy response
          </button>

          <button
            type="button"
            onClick={() =>
              saveContent("response")
            }
            disabled={
              savingResponse ||
              savingFollowUp
            }
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingResponse
              ? "Saving..."
              : "Save response"}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Review the message before sending it to
          the customer.
        </p>
      </div>
    )}
  </section>

  {/* Follow-up */}
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h3 className="font-bold text-slate-950">
      Follow-up message
    </h3>

    <p className="mt-2 text-sm leading-6 text-slate-600">
      Generate a friendly follow-up for this
      potential customer.
    </p>

    <button
      type="button"
      onClick={() =>
        generate("follow-up")
      }
      disabled={actionsDisabled}
      className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loadingFollowUp
        ? "Generating..."
        : "✦ Generate Follow-up"}
    </button>

    {followUp && (
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Suggested follow-up
        </p>

        <div className="mt-2 rounded-xl bg-slate-50 p-4">
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
            {followUp}
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              copyText(
                followUp,
                "Follow-up",
              )
            }
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600"
          >
            Copy follow-up
          </button>

          <button
            type="button"
            onClick={() =>
              saveContent("follow-up")
            }
            disabled={
              savingResponse ||
              savingFollowUp
            }
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingFollowUp
              ? "Saving..."
              : "Save follow-up"}
          </button>
        </div>
      </div>
    )}
  </section>

  {/* Success message */}
  {message && (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
      {message}
    </div>
  )}

  {/* Error */}
  {error && (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
      {error}
    </div>
  )}

  {/* Human approval */}
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <p className="text-sm font-semibold text-amber-900">
      Human approval
    </p>

    <p className="mt-1 text-xs leading-5 text-amber-800">
      AI suggestions are not sent automatically.
      Review them before communicating with the
      customer.
    </p>
  </div>
</div>


);
}
