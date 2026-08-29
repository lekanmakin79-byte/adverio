import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_CHANNELS = [
  "facebook",
  "instagram",
  "linkedin",
  "email",
  "follow_up",
] as const;

type MarketingChannel =
  (typeof VALID_CHANNELS)[number];

type MarketingTask = {
  id: string;
  owner_id: string;
  automation_id: string;
  campaign_id: string;
  channel: string;
  scheduled_for: string;
  status: string;
  content: string | null;
};

function isValidChannel(
  value: string,
): value is MarketingChannel {
  return VALID_CHANNELS.includes(
    value as MarketingChannel,
  );
}

export async function GET(request: Request) {
  try {
    /*
     * Protect the cron endpoint.
     *
     * Vercel Cron sends the CRON_SECRET as:
     *
     * Authorization: Bearer <CRON_SECRET>
     */
    const authHeader =
      request.headers.get("authorization");

   const cronSecret = process.env.CRON_SECRET;

console.log("CRON_SECRET diagnostic:", {
  exists: Boolean(cronSecret),
  length: cronSecret?.length ?? 0,
});

if (!cronSecret) {
  console.error(
    "CRON_SECRET environment variable is missing.",
  );

  return NextResponse.json(
    {
      error:
        "Cron configuration is incomplete.",
    },
    { status: 500 },
  );
}

    if (
      authHeader !==
      `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const supabase = await createClient();

    /*
     * Find tasks that are due.
     *
     * We only process scheduled tasks whose
     * scheduled_for time has arrived.
     */
    const now =
      new Date().toISOString();

    const {
      data: tasks,
      error: taskError,
    } = await supabase
      .from("marketing_tasks")
      .select(
        `
          id,
          owner_id,
          automation_id,
          campaign_id,
          channel,
          scheduled_for,
          status,
          content
        `,
      )
      .eq("status", "scheduled")
      .lte("scheduled_for", now)
      .order("scheduled_for", {
        ascending: true,
      })
      .limit(50);

    if (taskError) {
      console.error(
        "Marketing task lookup error:",
        taskError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load scheduled marketing tasks.",
        },
        { status: 500 },
      );
    }

    const marketingTasks =
      (tasks as MarketingTask[] | null) ?? [];

    if (marketingTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No marketing tasks are due.",
        processed: 0,
      });
    }

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    /*
     * Process each due task.
     */
    for (const task of marketingTasks) {
      try {
        if (!isValidChannel(task.channel)) {
          await supabase
            .from("marketing_tasks")
            .update({
              status: "failed",
              error_message:
                `Unsupported marketing channel: ${task.channel}`,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", task.id);

          failed += 1;
          continue;
        }

        /*
         * Do not execute tasks with empty content.
         */
        if (!task.content?.trim()) {
          await supabase
            .from("marketing_tasks")
            .update({
              status: "failed",
              error_message:
                "Marketing task has no content.",
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", task.id);

          failed += 1;
          continue;
        }

        /*
         * IMPORTANT:
         *
         * At this stage we record the task as
         * processed by the automation engine.
         *
         * Actual Facebook / Instagram / LinkedIn
         * publishing and email delivery will be
         * connected separately.
         */
        console.log(
          "Processing marketing task:",
          {
            id: task.id,
            channel: task.channel,
            scheduled_for:
              task.scheduled_for,
          },
        );

        await supabase
          .from("marketing_tasks")
          .update({
            status: "completed",
            executed_at:
              new Date().toISOString(),
            error_message: null,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", task.id)
          .eq("status", "scheduled");

        processed += 1;
      } catch (taskError) {
        console.error(
          "Marketing task execution error:",
          taskError,
        );

        await supabase
          .from("marketing_tasks")
          .update({
            status: "failed",
            error_message:
              taskError instanceof Error
                ? taskError.message
                : "Unknown task execution error.",
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", task.id);

        failed += 1;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      failed,
      total_due: marketingTasks.length,
    });
  } catch (error) {
    console.error(
      "Marketing task executor error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while executing marketing tasks.",
      },
      { status: 500 },
    );
  }
}