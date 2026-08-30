import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishFacebookPost } from "@/lib/facebook";

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
  marketing_automations: {
    status: string;
  }[];
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
     * Vercel Cron sends:
     *
     * Authorization: Bearer <CRON_SECRET>
     */
    const authHeader =
      request.headers.get("authorization");

    const cronSecret =
      process.env.CRON_SECRET;

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

    const supabase =
      createAdminClient();

    /*
     * Current UTC time.
     */
    const now =
      new Date().toISOString();

    /*
     * Find scheduled tasks that are due.
     */
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
      content,
      marketing_automations!inner (
        status
      )
    `,
  )
  .eq("status", "scheduled")
  .eq("marketing_automations.status", "active")
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
          database_error:
            taskError.message,
        },
        { status: 500 },
      );
    }

    const marketingTasks =
      (tasks as MarketingTask[] | null) ?? [];

    /*
     * Return useful diagnostic information.
     */
    if (marketingTasks.length === 0) {
      console.log(
        "Marketing executor: no due tasks.",
        {
          now,
        },
      );

      return NextResponse.json({
        success: true,
        message:
          "No marketing tasks are due.",
        processed: 0,
        skipped: 0,
        failed: 0,
        total_due: 0,
        checked_at: now,
      });
    }

    console.log(
      "Marketing executor found due tasks:",
      {
        now,
        count: marketingTasks.length,
        task_ids:
          marketingTasks.map(
            (task) => task.id,
          ),
      },
    );

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    /*
     * Process each due task.
     */
    for (const task of marketingTasks) {
      try {
        /*
         * Validate channel.
         */
        if (!isValidChannel(task.channel)) {
          const { error } =
            await supabase
              .from("marketing_tasks")
              .update({
                status: "failed",
                error_message:
                  `Unsupported marketing channel: ${task.channel}`,
                updated_at:
                  new Date().toISOString(),
              })
              .eq("id", task.id)
              .eq("status", "scheduled");

          if (error) {
            console.error(
              "Failed to mark invalid-channel task:",
              {
                task_id: task.id,
                error,
              },
            );
          }

          failed += 1;
          continue;
        }

        /*
         * Do not execute tasks with empty content.
         */
        if (!task.content?.trim()) {
          const { error } =
            await supabase
              .from("marketing_tasks")
              .update({
                status: "failed",
                error_message:
                  "Marketing task has no content.",
                updated_at:
                  new Date().toISOString(),
              })
              .eq("id", task.id)
              .eq("status", "scheduled");

          if (error) {
            console.error(
              "Failed to mark empty-content task:",
              {
                task_id: task.id,
                error,
              },
            );
          }

          failed += 1;
          continue;
        }

        console.log(
          "Processing marketing task:",
          {
            id: task.id,
            channel: task.channel,
            scheduled_for:
              task.scheduled_for,
          },
        );

                /*
         * Execute the actual marketing action.
         *
         * Facebook tasks must be successfully published
         * before they can be marked as completed.
         */
        if (task.channel === "facebook") {
          const facebookResult =
            await publishFacebookPost(
              task.owner_id,
              task.content,
            );

          if (!facebookResult.success) {
            const { error: failureUpdateError } =
              await supabase
                .from("marketing_tasks")
                .update({
                  status: "failed",
                  error_message:
                    facebookResult.error ??
                    "Facebook publishing failed.",
                  updated_at:
                    new Date().toISOString(),
                })
                .eq("id", task.id)
                .eq("status", "scheduled");

            if (failureUpdateError) {
              console.error(
                "Failed to mark Facebook task as failed:",
                {
                  task_id: task.id,
                  error: failureUpdateError,
                },
              );
            }

            console.error(
              "Facebook marketing task failed:",
              {
                task_id: task.id,
                error:
                  facebookResult.error,
              },
            );

            failed += 1;
            continue;
          }

          /*
           * Facebook published successfully.
           * Only now mark the task completed.
           */
          const {
            data: updatedFacebookTask,
            error: facebookUpdateError,
          } = await supabase
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
            .eq("status", "scheduled")
            .select("id,status,executed_at")
            .maybeSingle();

          if (facebookUpdateError) {
            console.error(
              "Facebook task completion update failed:",
              {
                task_id: task.id,
                error: facebookUpdateError,
              },
            );

            failed += 1;
            continue;
          }

          if (!updatedFacebookTask) {
            console.error(
              "Facebook task was not updated after successful publishing:",
              {
                task_id: task.id,
                post_id:
                  facebookResult.post_id,
              },
            );

            skipped += 1;
            continue;
          }

          console.log(
            "Facebook marketing task completed:",
            {
              task_id: task.id,
              post_id:
                facebookResult.post_id,
            },
          );

          processed += 1;
          continue;
        }

        /*
         * Non-Facebook channels currently retain
         * the existing completion behaviour.
         */
        const {
          data: updatedTask,
          error: updateError,
        } = await supabase
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
          .eq("status", "scheduled")
          .select("id,status,executed_at")
          .maybeSingle();

        if (updateError) {
          console.error(
            "Marketing task update failed:",
            {
              task_id: task.id,
              error: updateError,
            },
          );

          failed += 1;
          continue;
        }

        /*
         * If no row was updated, something changed
         * between SELECT and UPDATE.
         */
        if (!updatedTask) {
          console.error(
            "Marketing task was not updated:",
            {
              task_id: task.id,
            },
          );

          skipped += 1;
          continue;
        }

        console.log(
          "Marketing task completed:",
          updatedTask,
        );

        processed += 1;
      } catch (taskError) {
        console.error(
          "Marketing task execution error:",
          taskError,
        );

        const { error: failureUpdateError } =
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

        if (failureUpdateError) {
          console.error(
            "Failed to mark task as failed:",
            {
              task_id: task.id,
              error:
                failureUpdateError,
            },
          );
        }

        failed += 1;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      failed,
      total_due:
        marketingTasks.length,
      checked_at: now,
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
