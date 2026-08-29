import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
] as const;

const VALID_STATUSES = [
  "active",
  "paused",
] as const;

type Frequency = (typeof VALID_FREQUENCIES)[number];
type AutomationStatus = (typeof VALID_STATUSES)[number];

type CreateAutomationBody = {
  campaign_id?: unknown;
  frequency?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  status?: unknown;
};

type UpdateAutomationBody = {
  id?: unknown;
  status?: unknown;
  frequency?: unknown;
  start_date?: unknown;
  end_date?: unknown;
};

type CampaignForTasks = {
  id: string;
  facebook_post: string | null;
  instagram_post: string | null;
  linkedin_post: string | null;
  email_subject: string | null;
  email_body: string | null;
  follow_up_message: string | null;
};

type AutomationForTasks = {
  id: string;
  owner_id: string;
  campaign_id: string;
  status: AutomationStatus;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
};

function isValidFrequency(
  value: unknown,
): value is Frequency {
  return (
    typeof value === "string" &&
    VALID_FREQUENCIES.includes(value as Frequency)
  );
}

function isValidStatus(
  value: unknown,
): value is AutomationStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(value as AutomationStatus)
  );
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
}

function addFrequency(
  date: Date,
  frequency: Frequency,
) {
  const next = new Date(date);

  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
}

function buildTasks(
  campaign: {
    id: string;
    facebook_post: string | null;
    instagram_post: string | null;
    linkedin_post: string | null;
    email_subject: string | null;
    email_body: string | null;
    follow_up_message: string | null;
  },
  automation: {
    id: string;
    owner_id: string;
    frequency: Frequency;
    start_date: string;
    end_date: string | null;
  },
) {
  const channels: {
    channel: string;
    content: string;
  }[] = [];

  if (campaign.facebook_post?.trim()) {
    channels.push({
      channel: "facebook",
      content: campaign.facebook_post.trim(),
    });
  }

  if (campaign.instagram_post?.trim()) {
    channels.push({
      channel: "instagram",
      content: campaign.instagram_post.trim(),
    });
  }

  if (campaign.linkedin_post?.trim()) {
    channels.push({
      channel: "linkedin",
      content: campaign.linkedin_post.trim(),
    });
  }

  if (
    campaign.email_body?.trim() ||
    campaign.email_subject?.trim()
  ) {
    const emailContent = [
      campaign.email_subject?.trim()
        ? `Subject: ${campaign.email_subject.trim()}`
        : "",
      campaign.email_body?.trim() || "",
    ]
      .filter(Boolean)
      .join("\n\n");

    channels.push({
      channel: "email",
      content: emailContent,
    });
  }

  if (campaign.follow_up_message?.trim()) {
    channels.push({
      channel: "follow_up",
      content: campaign.follow_up_message.trim(),
    });
  }

  const tasks: {
    owner_id: string;
    automation_id: string;
    campaign_id: string;
    channel: string;
    scheduled_for: string;
    status: string;
    content: string;
  }[] = [];

  let currentDate = new Date(
    `${automation.start_date}T09:00:00`,
  );

  const endDate = automation.end_date
    ? new Date(`${automation.end_date}T23:59:59`)
    : null;

  const MAX_OCCURRENCES = 12;

  for (
    let occurrence = 0;
    occurrence < MAX_OCCURRENCES;
    occurrence += 1
  ) {
    if (endDate && currentDate > endDate) {
      break;
    }

    for (const item of channels) {
      tasks.push({
        owner_id: automation.owner_id,
        automation_id: automation.id,
        campaign_id: campaign.id,
        channel: item.channel,
        scheduled_for: currentDate.toISOString(),
        status: "scheduled",
        content: item.content,
      });
    }

    currentDate = addFrequency(
      currentDate,
      automation.frequency,
    );
  }

  return tasks;
}

/*
 * GET
 *
 * Return all marketing automations belonging
 * to the authenticated user.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        { status: 401 },
      );
    }

    const {
      data: automations,
      error,
    } = await supabase
      .from("marketing_automations")
      .select(
        `
          id,
          owner_id,
          campaign_id,
          status,
          frequency,
          start_date,
          end_date,
          created_at,
          updated_at,
          campaigns (
            id,
            campaign_name,
            status
          )
        `,
      )
      .eq("owner_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Marketing automations GET error:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load marketing automations.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      automations: automations ?? [],
    });
  } catch (error) {
    console.error(
      "Marketing automations GET route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while loading automations.",
      },
      { status: 500 },
    );
  }
}

/*
 * POST
 *
 * Create a marketing automation and generate
 * its initial scheduled tasks.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        { status: 401 },
      );
    }

    let body: CreateAutomationBody;

    try {
      body = (await request.json()) as CreateAutomationBody;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const campaignId = body.campaign_id;

    if (
      typeof campaignId !== "string" ||
      !campaignId.trim()
    ) {
      return NextResponse.json(
        {
          error: "Campaign ID is required.",
        },
        { status: 400 },
      );
    }

    const frequency =
      body.frequency === undefined
        ? "weekly"
        : body.frequency;

    if (!isValidFrequency(frequency)) {
      return NextResponse.json(
        {
          error:
            "Invalid frequency. Use daily, weekly or monthly.",
        },
        { status: 400 },
      );
    }

    const requestedStatus =
      body.status === undefined
        ? "paused"
        : body.status;

    if (!isValidStatus(requestedStatus)) {
      return NextResponse.json(
        {
          error:
            "Invalid automation status. Use active or paused.",
        },
        { status: 400 },
      );
    }

    const startDate =
      body.start_date === undefined
        ? new Date().toISOString().slice(0, 10)
        : body.start_date;

    if (!isValidDate(startDate)) {
      return NextResponse.json(
        {
          error:
            "Invalid start date. Use YYYY-MM-DD.",
        },
        { status: 400 },
      );
    }

    let endDate: string | null = null;

    if (body.end_date !== undefined) {
      if (
        body.end_date === null ||
        body.end_date === ""
      ) {
        endDate = null;
      } else if (isValidDate(body.end_date)) {
        endDate = body.end_date;
      } else {
        return NextResponse.json(
          {
            error:
              "Invalid end date. Use YYYY-MM-DD.",
          },
          { status: 400 },
        );
      }
    }

    if (
      endDate &&
      new Date(`${endDate}T00:00:00`) <
        new Date(`${startDate}T00:00:00`)
    ) {
      return NextResponse.json(
        {
          error:
            "End date cannot be earlier than start date.",
        },
        { status: 400 },
      );
    }

    /*
     * Verify that the campaign belongs to the user.
     */
    const {
      data: campaign,
      error: campaignError,
    } = await supabase
      .from("campaigns")
      .select(
        `
          id,
          owner_id,
          campaign_name,
          status,
          facebook_post,
          instagram_post,
          linkedin_post,
          email_subject,
          email_body,
          follow_up_message
        `,
      )
      .eq("id", campaignId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (campaignError) {
      console.error(
        "Marketing automation campaign lookup error:",
        campaignError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify the campaign.",
        },
        { status: 500 },
      );
    }

    if (!campaign) {
      return NextResponse.json(
        {
          error:
            "Campaign not found or you do not have access to it.",
        },
        { status: 404 },
      );
    }

    if (campaign.status === "completed") {
      return NextResponse.json(
        {
          error:
            "Completed campaigns cannot be automated.",
        },
        { status: 400 },
      );
    }

    /*
     * Only one automation is allowed per campaign.
     */
    const {
      data: existingAutomation,
      error: existingError,
    } = await supabase
      .from("marketing_automations")
      .select("id, status")
      .eq("campaign_id", campaignId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing automation lookup error:",
        existingError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to check existing automations.",
        },
        { status: 500 },
      );
    }

    if (existingAutomation) {
      return NextResponse.json(
        {
          error:
            "This campaign already has a marketing automation.",
          automation: existingAutomation,
        },
        { status: 409 },
      );
    }

    /*
     * Create automation.
     */
    const {
      data: automation,
      error: automationError,
    } = await supabase
      .from("marketing_automations")
      .insert({
        owner_id: user.id,
        campaign_id: campaignId,
        status: requestedStatus,
        frequency,
        start_date: startDate,
        end_date: endDate,
        updated_at: new Date().toISOString(),
      })
      .select(
        `
          id,
          owner_id,
          campaign_id,
          status,
          frequency,
          start_date,
          end_date,
          created_at,
          updated_at
        `,
      )
      .single();

    if (automationError || !automation) {
      console.error(
        "Marketing automation insert error:",
        automationError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to create the marketing automation.",
        },
        { status: 500 },
      );
    }

    /*
     * Build the strongly typed automation object.
     *
     * This avoids the previous TypeScript problem where
     * Supabase inferred an object without status.
     */
    const automationForTasks: AutomationForTasks = {
      id: automation.id,
      owner_id: automation.owner_id,
      campaign_id: automation.campaign_id,
      status: automation.status as AutomationStatus,
      frequency: automation.frequency as Frequency,
      start_date: automation.start_date,
      end_date: automation.end_date,
    };

    const campaignForTasks: CampaignForTasks = {
      id: campaign.id,
      facebook_post: campaign.facebook_post,
      instagram_post: campaign.instagram_post,
      linkedin_post: campaign.linkedin_post,
      email_subject: campaign.email_subject,
      email_body: campaign.email_body,
      follow_up_message: campaign.follow_up_message,
    };

    /*
     * Generate initial tasks.
     */
    const tasks = buildTasks(
      campaignForTasks,
      automationForTasks,
    );

    if (tasks.length > 0) {
      const {
        error: taskError,
      } = await supabase
        .from("marketing_tasks")
        .insert(tasks);

      if (taskError) {
        console.error(
          "Marketing task creation error:",
          taskError,
        );

        /*
         * Roll back automation if tasks fail.
         */
        await supabase
          .from("marketing_automations")
          .delete()
          .eq("id", automation.id)
          .eq("owner_id", user.id);

        return NextResponse.json(
          {
            error:
              "Unable to create the automation tasks.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        automation,
        tasks_created: tasks.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Marketing automation POST route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating the automation.",
      },
      { status: 500 },
    );
  }
}

/*
 * PATCH
 *
 * Update an existing automation.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        { status: 401 },
      );
    }

    let body: UpdateAutomationBody;

    try {
      body = (await request.json()) as UpdateAutomationBody;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    if (
      typeof body.id !== "string" ||
      !body.id.trim()
    ) {
      return NextResponse.json(
        {
          error: "Automation ID is required.",
        },
        { status: 400 },
      );
    }

    const automationId = body.id;

    const {
      data: existingAutomation,
      error: lookupError,
    } = await supabase
      .from("marketing_automations")
      .select(
        `
          id,
          owner_id,
          campaign_id,
          status,
          frequency,
          start_date,
          end_date
        `,
      )
      .eq("id", automationId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Automation PATCH lookup error:",
        lookupError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to find the automation.",
        },
        { status: 500 },
      );
    }

    if (!existingAutomation) {
      return NextResponse.json(
        {
          error: "Automation not found.",
        },
        { status: 404 },
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json(
          {
            error:
              "Invalid automation status. Use active or paused.",
          },
          { status: 400 },
        );
      }

      updates.status = body.status;
    }

    if (body.frequency !== undefined) {
      if (!isValidFrequency(body.frequency)) {
        return NextResponse.json(
          {
            error:
              "Invalid frequency. Use daily, weekly or monthly.",
          },
          { status: 400 },
        );
      }

      updates.frequency = body.frequency;
    }

    if (body.start_date !== undefined) {
      if (!isValidDate(body.start_date)) {
        return NextResponse.json(
          {
            error:
              "Invalid start date. Use YYYY-MM-DD.",
          },
          { status: 400 },
        );
      }

      updates.start_date = body.start_date;
    }

    if (body.end_date !== undefined) {
      if (
        body.end_date !== null &&
        body.end_date !== "" &&
        !isValidDate(body.end_date)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid end date. Use YYYY-MM-DD.",
          },
          { status: 400 },
        );
      }

      updates.end_date =
        body.end_date === "" ||
        body.end_date === null
          ? null
          : body.end_date;
    }

    const finalStartDate =
      (updates.start_date as string | undefined) ??
      existingAutomation.start_date;

    const finalEndDate =
      updates.end_date !== undefined
        ? (updates.end_date as string | null)
        : existingAutomation.end_date;

    if (
      finalEndDate &&
      new Date(`${finalEndDate}T00:00:00`) <
        new Date(`${finalStartDate}T00:00:00`)
    ) {
      return NextResponse.json(
        {
          error:
            "End date cannot be earlier than start date.",
        },
        { status: 400 },
      );
    }

    /*
     * Update automation.
     */
    const {
      data: updatedAutomation,
      error: updateError,
    } = await supabase
      .from("marketing_automations")
      .update(updates)
      .eq("id", automationId)
      .eq("owner_id", user.id)
      .select(
        `
          id,
          owner_id,
          campaign_id,
          status,
          frequency,
          start_date,
          end_date,
          created_at,
          updated_at
        `,
      )
      .single();

    if (updateError || !updatedAutomation) {
      console.error(
        "Marketing automation PATCH error:",
        updateError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to update the marketing automation.",
        },
        { status: 500 },
      );
    }

    /*
     * Rebuild scheduled tasks when the schedule changes.
     */
    if (
      body.frequency !== undefined ||
      body.start_date !== undefined ||
      body.end_date !== undefined
    ) {
      const {
        error: taskDeleteError,
      } = await supabase
        .from("marketing_tasks")
        .delete()
        .eq("automation_id", automationId)
        .eq("owner_id", user.id)
        .eq("status", "scheduled");

      if (taskDeleteError) {
        console.error(
          "Automation scheduled task cleanup error:",
          taskDeleteError,
        );
      }

      const {
        data: campaign,
        error: campaignError,
      } = await supabase
        .from("campaigns")
        .select(
          `
            id,
            facebook_post,
            instagram_post,
            linkedin_post,
            email_subject,
            email_body,
            follow_up_message
          `,
        )
        .eq(
          "id",
          updatedAutomation.campaign_id,
        )
        .eq("owner_id", user.id)
        .single();

      if (campaignError || !campaign) {
        console.error(
          "Automation task rebuild campaign error:",
          campaignError,
        );

        return NextResponse.json({
          success: true,
          automation: updatedAutomation,
          warning:
            "Automation updated, but scheduled tasks could not be rebuilt.",
        });
      }

      const automationForTasks: AutomationForTasks = {
        id: updatedAutomation.id,
        owner_id: updatedAutomation.owner_id,
        campaign_id: updatedAutomation.campaign_id,
        status:
          updatedAutomation.status as AutomationStatus,
        frequency:
          updatedAutomation.frequency as Frequency,
        start_date: updatedAutomation.start_date,
        end_date: updatedAutomation.end_date,
      };

      const campaignForTasks: CampaignForTasks = {
        id: campaign.id,
        facebook_post: campaign.facebook_post,
        instagram_post: campaign.instagram_post,
        linkedin_post: campaign.linkedin_post,
        email_subject: campaign.email_subject,
        email_body: campaign.email_body,
        follow_up_message: campaign.follow_up_message,
      };

      const tasks = buildTasks(
        campaignForTasks,
        automationForTasks,
      );

      if (tasks.length > 0) {
        const {
          error: taskError,
        } = await supabase
          .from("marketing_tasks")
          .insert(tasks);

        if (taskError) {
          console.error(
            "Automation task rebuild error:",
            taskError,
          );

          return NextResponse.json({
            success: true,
            automation: updatedAutomation,
            warning:
              "Automation updated, but scheduled tasks could not be rebuilt.",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      automation: updatedAutomation,
    });
  } catch (error) {
    console.error(
      "Marketing automation PATCH route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while updating the automation.",
      },
      { status: 500 },
    );
  }
}

/*
 * DELETE
 *
 * Delete an automation and all of its tasks.
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        { status: 401 },
      );
    }

    const { searchParams } =
      new URL(request.url);

    const automationId =
      searchParams.get("id");

    if (!automationId) {
      return NextResponse.json(
        {
          error: "Automation ID is required.",
        },
        { status: 400 },
      );
    }

    const {
      data: automation,
      error: lookupError,
    } = await supabase
      .from("marketing_automations")
      .select("id, owner_id")
      .eq("id", automationId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Automation DELETE lookup error:",
        lookupError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to find the automation.",
        },
        { status: 500 },
      );
    }

    if (!automation) {
      return NextResponse.json(
        {
          error: "Automation not found.",
        },
        { status: 404 },
      );
    }

    /*
     * Delete tasks first because marketing_tasks
     * references marketing_automations.
     */
    const {
      error: taskDeleteError,
    } = await supabase
      .from("marketing_tasks")
      .delete()
      .eq("automation_id", automationId)
      .eq("owner_id", user.id);

    if (taskDeleteError) {
      console.error(
        "Automation task delete error:",
        taskDeleteError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to delete the automation tasks.",
        },
        { status: 500 },
      );
    }

    const {
      error: automationDeleteError,
    } = await supabase
      .from("marketing_automations")
      .delete()
      .eq("id", automationId)
      .eq("owner_id", user.id);

    if (automationDeleteError) {
      console.error(
        "Automation delete error:",
        automationDeleteError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to delete the marketing automation.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Marketing automation deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Marketing automation DELETE route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while deleting the automation.",
      },
      { status: 500 },
    );
  }
}
