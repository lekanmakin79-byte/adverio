"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Campaign = {
  id: string;
  campaign_name: string;
  status: string;
};

type Automation = {
  id: string;
  campaign_id: string;
  status: "active" | "paused" | "completed";
  frequency: string;
  start_date: string;
  end_date: string | null;
};

type Props = {
  campaigns: Campaign[];
  automations: Automation[];
};

export default function MarketingAutomationControls({
  campaigns,
  automations,
}: Props) {
  const router = useRouter();

  const [campaignId, setCampaignId] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("paused");

  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const availableCampaigns = campaigns.filter(
    (campaign) =>
      campaign.status !== "completed" &&
      !automations.some(
        (automation) =>
          automation.campaign_id === campaign.id,
      ),
  );

  async function createAutomation() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!campaignId) {
        setError("Please select a campaign.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        "/api/marketing/automations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            frequency,
            start_date: startDate,
            end_date: endDate || null,
            status,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to create the marketing automation.",
        );
        return;
      }

      setMessage(
        `Automation created successfully. ${data.tasks_created ?? 0} scheduled task${
          data.tasks_created === 1 ? "" : "s"
        } created.`,
      );

      setCampaignId("");
      setFrequency("weekly");
      setStartDate(
        new Date().toISOString().slice(0, 10),
      );
      setEndDate("");
      setStatus("paused");

      router.refresh();
    } catch (err) {
      console.error(
        "Create automation error:",
        err,
      );

      setError(
        "Something went wrong while creating the automation.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateAutomation(
    automation: Automation,
    updates: Record<string, unknown>,
  ) {
    setActionId(automation.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/marketing/automations",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: automation.id,
            ...updates,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to update the automation.",
        );
        return;
      }

      setMessage(
        "Marketing automation updated successfully.",
      );

      router.refresh();
    } catch (err) {
      console.error(
        "Update automation error:",
        err,
      );

      setError(
        "Something went wrong while updating the automation.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function deleteAutomation(
    automation: Automation,
  ) {
    const confirmed = window.confirm(
      "Delete this marketing automation and its scheduled tasks?",
    );

    if (!confirmed) {
      return;
    }

    setActionId(automation.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/marketing/automations?id=${encodeURIComponent(
          automation.id,
        )}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to delete the automation.",
        );
        return;
      }

      setMessage(
        "Marketing automation deleted successfully.",
      );

      router.refresh();
    } catch (err) {
      console.error(
        "Delete automation error:",
        err,
      );

      setError(
        "Something went wrong while deleting the automation.",
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Create automation */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Create automation
          </p>

          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Automate an AI campaign
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Choose an AI campaign and tell Adverio how often its
            generated marketing content should be scheduled.
          </p>
        </div>

        {availableCampaigns.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="font-semibold text-slate-800">
              No campaigns available
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Every eligible campaign already has an automation,
              or you haven't created a campaign yet.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {/* Campaign */}
              <div>
                <label
                  htmlFor="automation-campaign"
                  className="text-sm font-semibold text-slate-700"
                >
                  Campaign
                </label>

                <select
                  id="automation-campaign"
                  value={campaignId}
                  onChange={(event) =>
                    setCampaignId(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Select a campaign
                  </option>

                  {availableCampaigns.map(
                    (campaign) => (
                      <option
                        key={campaign.id}
                        value={campaign.id}
                      >
                        {campaign.campaign_name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label
                  htmlFor="automation-frequency"
                  className="text-sm font-semibold text-slate-700"
                >
                  Frequency
                </label>

                <select
                  id="automation-frequency"
                  value={frequency}
                  onChange={(event) =>
                    setFrequency(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="daily">
                    Daily
                  </option>

                  <option value="weekly">
                    Weekly
                  </option>

                  <option value="monthly">
                    Monthly
                  </option>
                </select>
              </div>

              {/* Start date */}
              <div>
                <label
                  htmlFor="automation-start"
                  className="text-sm font-semibold text-slate-700"
                >
                  Start date
                </label>

                <input
                  id="automation-start"
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* End date */}
              <div>
                <label
                  htmlFor="automation-end"
                  className="text-sm font-semibold text-slate-700"
                >
                  End date
                </label>

                <input
                  id="automation-end"
                  type="date"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Leave empty to keep the automation running
                  without an end date.
                </p>
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="automation-status"
                  className="text-sm font-semibold text-slate-700"
                >
                  Initial status
                </label>

                <select
                  id="automation-status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="paused">
                    Paused
                  </option>

                  <option value="active">
                    Active
                  </option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={createAutomation}
              disabled={loading}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading
                ? "Creating automation..."
                : "Create automation"}
            </button>
          </>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Existing automation controls */}
      {automations.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Manage automation
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Automation controls
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pause, resume or delete your marketing automations.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {automations.map((automation) => {
              const campaign =
                campaigns.find(
                  (item) =>
                    item.id ===
                    automation.campaign_id,
                );

              const busy =
                actionId === automation.id;

              return (
                <div
                  key={automation.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-950">
                        {campaign?.campaign_name ||
                          "Campaign"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {automation.frequency
                          .charAt(0)
                          .toUpperCase() +
                          automation.frequency.slice(
                            1,
                          )}{" "}
                        ·{" "}
                        {automation.status
                          .charAt(0)
                          .toUpperCase() +
                          automation.status.slice(
                            1,
                          )}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      {automation.status ===
                        "active" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            updateAutomation(
                              automation,
                              {
                                status: "paused",
                              },
                            )
                          }
                          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy
                            ? "Updating..."
                            : "Pause"}
                        </button>
                      )}

                      {automation.status ===
                        "paused" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            updateAutomation(
                              automation,
                              {
                                status: "active",
                              },
                            )
                          }
                          className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy
                            ? "Updating..."
                            : "Resume"}
                        </button>
                      )}

                      {automation.status !==
                        "completed" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            deleteAutomation(
                              automation,
                            )
                          }
                          className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}