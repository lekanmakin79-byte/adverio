import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateBody = {
  status?: "pending" | "completed" | "cancelled";
};

const VALID_STATUSES = [
  "pending",
  "completed",
  "cancelled",
] as const;

type FollowUpStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(
  value: unknown,
): value is FollowUpStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(
      value as FollowUpStatus,
    )
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const supabase = await createClient();

    // --------------------------------------------------
    // 1. Verify authenticated user
    // --------------------------------------------------

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

    // --------------------------------------------------
    // 2. Get follow-up ID
    // --------------------------------------------------

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Follow-up ID is required.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 3. Parse request body
    // --------------------------------------------------

    let body: UpdateBody;

    try {
      body = (await request.json()) as UpdateBody;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 4. Validate requested status
    // --------------------------------------------------

    if (!isValidStatus(body.status)) {
      return NextResponse.json(
        {
          error: "Invalid follow-up status.",
        },
        { status: 400 },
      );
    }

    const newStatus = body.status;

    // --------------------------------------------------
    // 5. Find the follow-up belonging to this user
    // --------------------------------------------------

    const {
      data: existingFollowUp,
      error: lookupError,
    } = await supabase
      .from("follow_ups")
      .select(
        `
          id,
          owner_id,
          lead_id,
          status
        `,
      )
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Follow-up lookup error:",
        lookupError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to find the follow-up.",
        },
        { status: 500 },
      );
    }

    if (!existingFollowUp) {
      return NextResponse.json(
        {
          error: "Follow-up not found.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // 6. Prevent unnecessary status updates
    // --------------------------------------------------

    if (existingFollowUp.status === newStatus) {
      return NextResponse.json({
        success: true,
        alreadyUpdated: true,
        message: `Follow-up is already ${newStatus}.`,
      });
    }

    // --------------------------------------------------
    // 7. Build update
    // --------------------------------------------------

    const updateData: {
      status: FollowUpStatus;
      completed_at?: string | null;
    } = {
      status: newStatus,
    };

    if (newStatus === "completed") {
      updateData.completed_at =
        new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }

    // --------------------------------------------------
    // 8. Update follow-up
    // --------------------------------------------------

    const {
      data: updatedFollowUp,
      error: updateError,
    } = await supabase
      .from("follow_ups")
      .update(updateData)
      .eq("id", id)
      .eq("owner_id", user.id)
      .select(
        `
          id,
          owner_id,
          lead_id,
          message,
          status,
          due_at,
          completed_at,
          created_at
        `,
      )
      .single();

    if (updateError) {
      console.error(
        "Follow-up update error:",
        updateError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to update the follow-up.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 9. Keep lead follow-up status synchronised
    // --------------------------------------------------

    const leadFollowUpStatus: FollowUpStatus =
      newStatus;

    const { error: leadUpdateError } =
      await supabase
        .from("leads")
        .update({
          follow_up_status:
            leadFollowUpStatus,
        })
        .eq("id", existingFollowUp.lead_id)
        .eq("owner_id", user.id);

    if (leadUpdateError) {
      console.error(
        "Lead follow-up status update error:",
        leadUpdateError,
      );

      return NextResponse.json(
        {
          error:
            "Follow-up was updated, but the lead follow-up status could not be synchronised.",
          followUp: updatedFollowUp,
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 10. Return successful response
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      followUp: updatedFollowUp,
    });
  } catch (error) {
    console.error(
      "Follow-up PATCH route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while updating the follow-up.",
      },
      { status: 500 },
    );
  }
}
