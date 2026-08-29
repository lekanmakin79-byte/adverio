import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateBody = {
  status?: string;
  ai_response?: string;
  ai_follow_up?: string;
};

const VALID_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
] as const;

type LeadStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(value: unknown): value is LeadStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(value as LeadStatus)
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

    if (authError) {
      console.error("Authentication error:", authError);

      return NextResponse.json(
        {
          error: "Unable to verify your session.",
        },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 2. Get lead ID
    // --------------------------------------------------

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Lead ID is required.",
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
    // 4. Verify lead belongs to authenticated user
    // --------------------------------------------------

    const { data: existingLead, error: leadError } =
      await supabase
        .from("leads")
        .select(
          `
            id,
            owner_id,
            status,
            follow_up_status,
            ai_response,
            ai_follow_up,
            contacted_at,
            qualified_at,
            converted_at,
            lost_at
          `,
        )
        .eq("id", id)
        .eq("owner_id", user.id)
        .maybeSingle();

    if (leadError) {
      console.error("Lead lookup error:", leadError);

      return NextResponse.json(
        {
          error: "Unable to find the lead.",
        },
        { status: 500 },
      );
    }

    if (!existingLead) {
      return NextResponse.json(
        {
          error: "Lead not found.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // 5. Build safe lead update object
    // --------------------------------------------------

    const updates: Record<string, string | null> = {};

    let savingFollowUp = false;
    let followUpMessage = "";

    // --------------------------------------------------
    // Save AI response
    // --------------------------------------------------

    if (typeof body.ai_response === "string") {
      const value = body.ai_response.trim();

      if (!value) {
        return NextResponse.json(
          {
            error: "AI response cannot be empty.",
          },
          { status: 400 },
        );
      }

      if (value.length > 5000) {
        return NextResponse.json(
          {
            error: "AI response is too long.",
          },
          { status: 400 },
        );
      }

      updates.ai_response = value;
    }

    // --------------------------------------------------
    // Save AI follow-up
    // --------------------------------------------------

    if (typeof body.ai_follow_up === "string") {
      const value = body.ai_follow_up.trim();

      if (!value) {
        return NextResponse.json(
          {
            error: "AI follow-up cannot be empty.",
          },
          { status: 400 },
        );
      }

      if (value.length > 5000) {
        return NextResponse.json(
          {
            error: "AI follow-up is too long.",
          },
          { status: 400 },
        );
      }

      updates.ai_follow_up = value;

      savingFollowUp = true;
      followUpMessage = value;

      // Saving an AI follow-up means there is now
      // a follow-up task associated with this lead.
      //
      // "scheduled" is a valid value for
      // leads.follow_up_status.
      updates.follow_up_status = "scheduled";
    }

    // --------------------------------------------------
    // Update lead status
    // --------------------------------------------------

    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json(
          {
            error:
              "Invalid lead status. Use new, contacted, qualified, converted or lost.",
          },
          { status: 400 },
        );
      }

      const newStatus = body.status;
      const previousStatus =
        existingLead.status as LeadStatus;

      updates.status = newStatus;

      // ------------------------------------------------
      // Record journey timestamps.
      // ------------------------------------------------

      if (
        newStatus === "contacted" &&
        previousStatus !== "contacted" &&
        !existingLead.contacted_at
      ) {
        updates.contacted_at =
          new Date().toISOString();
      }

      if (
        newStatus === "qualified" &&
        previousStatus !== "qualified" &&
        !existingLead.qualified_at
      ) {
        updates.qualified_at =
          new Date().toISOString();
      }

      if (
        newStatus === "converted" &&
        previousStatus !== "converted" &&
        !existingLead.converted_at
      ) {
        updates.converted_at =
          new Date().toISOString();
      }

      if (
        newStatus === "lost" &&
        previousStatus !== "lost" &&
        !existingLead.lost_at
      ) {
        updates.lost_at =
          new Date().toISOString();
      }
    }

    // --------------------------------------------------
    // 6. Make sure there is something to update
    // --------------------------------------------------

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: "No valid changes were provided.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 7. Update the lead
    // --------------------------------------------------

    console.log("LEAD UPDATE:", {
      leadId: id,
      previousStatus: existingLead.status,
      requestedStatus: body.status,
      previousFollowUpStatus:
        existingLead.follow_up_status,
      updates,
    });

    const {
      data: updatedLead,
      error: updateError,
    } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .eq("owner_id", user.id)
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
          updated_at,
          ai_response,
          ai_follow_up,
          contacted_at,
          qualified_at,
          converted_at,
          lost_at
        `,
      )
      .single();

    if (updateError) {
      console.error(
        "Lead update error:",
        updateError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to update the lead. Please try again.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 8. Create or update follow-up task when an
    //    AI follow-up is saved
    // --------------------------------------------------

    let createdFollowUp = null;

    if (savingFollowUp && followUpMessage) {
      // Check whether this lead already has a pending
      // follow-up.
      //
      // This prevents duplicate pending tasks when the
      // user saves the same AI follow-up again.

      const {
        data: existingFollowUp,
        error: existingFollowUpError,
      } = await supabase
        .from("follow_ups")
        .select("id, status")
        .eq("lead_id", id)
        .eq("owner_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (existingFollowUpError) {
        console.error(
          "Existing follow-up lookup error:",
          existingFollowUpError,
        );

        return NextResponse.json(
          {
            error:
              "The lead was updated, but we could not check existing follow-ups.",
            lead: updatedLead,
          },
          { status: 500 },
        );
      }

      if (existingFollowUp) {
        // Update the existing pending follow-up
        // instead of creating another one.

        const {
          data: updatedFollowUp,
          error: updateFollowUpError,
        } = await supabase
          .from("follow_ups")
          .update({
            message: followUpMessage,
          })
          .eq("id", existingFollowUp.id)
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
              created_at,
              updated_at
            `,
          )
          .single();

        if (updateFollowUpError) {
          console.error(
            "Follow-up update error:",
            updateFollowUpError,
          );

          return NextResponse.json(
            {
              error:
                "The AI follow-up was saved, but the follow-up task could not be updated.",
              lead: updatedLead,
            },
            { status: 500 },
          );
        }

        createdFollowUp = updatedFollowUp;
      } else {
        // Create a new follow-up for tomorrow.

        const dueAt = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString();

        const {
          data: newFollowUp,
          error: createFollowUpError,
        } = await supabase
          .from("follow_ups")
          .insert({
            owner_id: user.id,
            lead_id: id,
            message: followUpMessage,
            status: "pending",
            due_at: dueAt,
          })
          .select(
            `
              id,
              owner_id,
              lead_id,
              message,
              status,
              due_at,
              completed_at,
              created_at,
              updated_at
            `,
          )
          .single();

        if (createFollowUpError) {
          console.error(
            "Follow-up creation error:",
            createFollowUpError,
          );

          return NextResponse.json(
            {
              error:
                "The AI follow-up was saved, but the follow-up task could not be created.",
              lead: updatedLead,
            },
            { status: 500 },
          );
        }

        createdFollowUp = newFollowUp;
      }
    }

    // --------------------------------------------------
    // 9. Return result
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      followUp: createdFollowUp,
    });
  } catch (error) {
    console.error(
      "Lead PATCH route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while updating the lead.",
      },
      { status: 500 },
    );
  }
}
