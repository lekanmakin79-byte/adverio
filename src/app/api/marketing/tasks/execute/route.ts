import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishFacebookPost } from "@/lib/facebook";
import { publishLinkedInPost } from "@/lib/linkedin";
import { publishInstagramPost } from "@/lib/instagram";

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
  campaigns: {
    image_url: string | null;
  }[];
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

async function markTaskFailed(
  supabase: ReturnType<typeof createAdminClient>,
  taskId: string,
  errorMessage: string,
) {
  const { error } = await supabase
    .from("marketing_tasks")
    .update({
      status: "failed",
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("status", "scheduled");

  if (error) {
    console.error(
      "Failed to mark marketing task as failed:",
      {
        task_id: taskId,
        error,
      },
    );
  }
}

async function markTaskCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  taskId: string,
) {
  return await supabase
    .from("marketing_tasks")
    .update({
      status: "completed",
      executed_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("status", "scheduled")
    .select("id,status,executed_at")
    .maybeSingle();
}

export async function GET(request: Request) {
  try {
    /*
     * ----------------------------------------------------
     * 1. PROTECT CRON ENDPOINT
     * ----------------------------------------------------
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
     * ----------------------------------------------------
     * 2. CURRENT UTC TIME
     * ----------------------------------------------------
     */

    const now =
      new Date().toISOString();

    /*
     * ----------------------------------------------------
     * 3. FIND DUE MARKETING TASKS
     * ----------------------------------------------------
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
          campaigns!inner (
            image_url
          ),
          marketing_automations!inner (
            status
          )
        `,
      )
      .eq("status", "scheduled")
      .eq(
        "marketing_automations.status",
        "active",
      )
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
     * ----------------------------------------------------
     * 4. NO TASKS DUE
     * ----------------------------------------------------
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
     * ----------------------------------------------------
     * 5. PROCESS EACH TASK
     * ----------------------------------------------------
     */

    for (const task of marketingTasks) {
      try {
        /*
         * --------------------------------------------------
         * VALIDATE CHANNEL
         * --------------------------------------------------
         */

        if (!isValidChannel(task.channel)) {
          await markTaskFailed(
            supabase,
            task.id,
            `Unsupported marketing channel: ${task.channel}`,
          );

          failed += 1;
          continue;
        }

        /*
         * --------------------------------------------------
         * VALIDATE CONTENT
         * --------------------------------------------------
         */

        if (!task.content?.trim()) {
          await markTaskFailed(
            supabase,
            task.id,
            "Marketing task has no content.",
          );

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
         * --------------------------------------------------
         * FACEBOOK
         * --------------------------------------------------
         */

        if (task.channel === "facebook") {
          const facebookResult =
            await publishFacebookPost(
              task.owner_id,
              task.content,
            );

          if (!facebookResult.success) {
            await markTaskFailed(
              supabase,
              task.id,
              facebookResult.error ??
                "Facebook publishing failed.",
            );

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

          const {
            data: updatedFacebookTask,
            error: facebookUpdateError,
          } = await markTaskCompleted(
            supabase,
            task.id,
          );

          if (facebookUpdateError) {
            console.error(
              "Facebook task completion update failed:",
              {
                task_id: task.id,
                error:
                  facebookUpdateError,
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
         * --------------------------------------------------
         * LINKEDIN
         * --------------------------------------------------
         */

        if (task.channel === "linkedin") {
          const {
            data: duplicateTask,
            error: duplicateLookupError,
          } = await supabase
            .from("marketing_tasks")
            .select(
              "id,status,executed_at",
            )
            .eq(
              "owner_id",
              task.owner_id,
            )
            .eq(
              "campaign_id",
              task.campaign_id,
            )
            .eq(
              "channel",
              "linkedin",
            )
            .eq(
              "status",
              "completed",
            )
            .eq(
              "content",
              task.content.trim(),
            )
            .neq(
              "id",
              task.id,
            )
            .order(
              "executed_at",
              {
                ascending: false,
              },
            )
            .limit(1)
            .maybeSingle();

          if (duplicateLookupError) {
            console.error(
              "LinkedIn duplicate lookup failed:",
              {
                task_id: task.id,
                error:
                  duplicateLookupError,
              },
            );
          }

          if (duplicateTask) {
            console.log(
              "Duplicate LinkedIn task detected. No second post will be published.",
              {
                task_id: task.id,
                existing_task_id:
                  duplicateTask.id,
                campaign_id:
                  task.campaign_id,
              },
            );

            const { error: duplicateUpdateError } =
              await supabase
                .from("marketing_tasks")
                .update({
                  status: "failed",
                  error_message:
                    "Duplicate LinkedIn content was already published by another task.",
                  updated_at:
                    new Date().toISOString(),
                })
                .eq(
                  "id",
                  task.id,
                )
                .eq(
                  "status",
                  "scheduled",
                );

            if (duplicateUpdateError) {
              console.error(
                "Failed to mark duplicate LinkedIn task:",
                {
                  task_id: task.id,
                  error:
                    duplicateUpdateError,
                },
              );

              failed += 1;
            } else {
              skipped += 1;
            }

            continue;
          }

          const linkedInResult =
            await publishLinkedInPost(
              task.owner_id,
              task.content,
            );

          if (!linkedInResult.success) {
            await markTaskFailed(
              supabase,
              task.id,
              linkedInResult.error ??
                "LinkedIn publishing failed.",
            );

            console.error(
              "LinkedIn marketing task failed:",
              {
                task_id: task.id,
                error:
                  linkedInResult.error,
              },
            );

            failed += 1;
            continue;
          }

          const {
            data: updatedLinkedInTask,
            error: linkedInUpdateError,
          } = await markTaskCompleted(
            supabase,
            task.id,
          );

          if (linkedInUpdateError) {
            console.error(
              "LinkedIn task completion update failed:",
              {
                task_id: task.id,
                error:
                  linkedInUpdateError,
              },
            );

            failed += 1;
            continue;
          }

          if (!updatedLinkedInTask) {
            console.error(
              "LinkedIn task was not updated after successful publishing:",
              {
                task_id: task.id,
                post_id:
                  linkedInResult.post_id,
              },
            );

            skipped += 1;
            continue;
          }

          console.log(
            "LinkedIn marketing task completed:",
            {
              task_id: task.id,
              post_id:
                linkedInResult.post_id,
            },
          );

          processed += 1;
          continue;
        }

        /*
         * --------------------------------------------------
         * INSTAGRAM
         * --------------------------------------------------
         *
         * Instagram requires an image URL.
         * The campaign relationship is returned as
         * an array by the current Supabase query.
         */

        if (task.channel === "instagram") {
          const imageUrl =
            task.campaigns?.[0]?.image_url;

          if (!imageUrl?.trim()) {
            await markTaskFailed(
              supabase,
              task.id,
              "Instagram task cannot be published because the campaign has no image URL.",
            );

            failed += 1;
            continue;
          }

          console.log(
            "Publishing Instagram marketing task:",
            {
              task_id: task.id,
              campaign_id:
                task.campaign_id,
              image_url: imageUrl,
            },
          );

          const instagramResult =
            await publishInstagramPost(
              task.owner_id,
              task.content,
              imageUrl,
            );

          if (!instagramResult.success) {
            await markTaskFailed(
              supabase,
              task.id,
              instagramResult.error ??
                "Instagram publishing failed.",
            );

            console.error(
              "Instagram marketing task failed:",
              {
                task_id: task.id,
                error:
                  instagramResult.error,
              },
            );

            failed += 1;
            continue;
          }

          const {
            data: updatedInstagramTask,
            error: instagramUpdateError,
          } = await markTaskCompleted(
            supabase,
            task.id,
          );

          if (instagramUpdateError) {
            console.error(
              "Instagram task completion update failed:",
              {
                task_id: task.id,
                error:
                  instagramUpdateError,
              },
            );

            failed += 1;
            continue;
          }

          if (!updatedInstagramTask) {
            console.error(
              "Instagram task was not updated after successful publishing:",
              {
                task_id: task.id,
                media_id:
                  instagramResult.media_id,
              },
            );

            skipped += 1;
            continue;
          }

          console.log(
            "Instagram marketing task completed:",
            {
              task_id: task.id,
              media_id:
                instagramResult.media_id,
            },
          );

          processed += 1;
          continue;
        }

        /*
         * --------------------------------------------------
         * OTHER CHANNELS
         * --------------------------------------------------
         */

        const {
          data: updatedTask,
          error: updateError,
        } = await markTaskCompleted(
          supabase,
          task.id,
        );

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

        await markTaskFailed(
          supabase,
          task.id,
          taskError instanceof Error
            ? taskError.message
            : "Unknown task execution error.",
        );

        failed += 1;
      }
    }

    /*
     * ----------------------------------------------------
     * 6. EXECUTION SUMMARY
     * ----------------------------------------------------
     */

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