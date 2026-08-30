import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const VALID_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
] as const;

type CampaignStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(
  value: unknown,
): value is CampaignStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(
      value as CampaignStatus,
    )
  );
}

type UpdateBody = {
  status?: unknown;
};

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
    // 2. Get campaign ID
    // --------------------------------------------------

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Campaign ID is required.",
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
    // 4. Validate status
    // --------------------------------------------------

    if (!isValidStatus(body.status)) {
      return NextResponse.json(
        {
          error:
            "Invalid campaign status. Use draft, active, paused or completed.",
        },
        { status: 400 },
      );
    }

    const newStatus = body.status;

    // --------------------------------------------------
    // 5. Verify campaign belongs to user
    // --------------------------------------------------

    const {
      data: existingCampaign,
      error: lookupError,
    } = await supabase
      .from("campaigns")
      .select("id, owner_id, status")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Campaign lookup error:",
        lookupError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to find the campaign.",
        },
        { status: 500 },
      );
    }

    if (!existingCampaign) {
      return NextResponse.json(
        {
          error: "Campaign not found.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // 6. Completed campaigns cannot be changed
    // --------------------------------------------------

    if (existingCampaign.status === "completed") {
      return NextResponse.json(
        {
          error:
            "Completed campaigns cannot be changed.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 7. No change required
    // --------------------------------------------------

    if (existingCampaign.status === newStatus) {
      return NextResponse.json({
        success: true,
        message: "Campaign is already in this status.",
      });
    }

    // --------------------------------------------------
    // 8. Update campaign status
    // --------------------------------------------------

    const {
      data: updatedCampaign,
      error: updateError,
    } = await supabase
      .from("campaigns")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("owner_id", user.id)
      .select(
        "id, campaign_name, status, updated_at",
      )
      .single();

    if (updateError) {
      console.error(
        "Campaign status update error:",
        updateError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to update the campaign. Please try again.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 9. Find existing marketing automation
    // --------------------------------------------------

    const {
      data: existingAutomation,
      error: automationLookupError,
    } = await supabase
      .from("marketing_automations")
      .select(
        "id, status, frequency, start_date, end_date",
      )
      .eq("campaign_id", id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (automationLookupError) {
      console.error(
        "Marketing automation lookup error:",
        automationLookupError,
      );

      return NextResponse.json(
        {
          error:
            "Campaign updated, but the marketing automation could not be checked.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 10. Activate campaign
    //
    // Create an automation if one does not exist.
    // Otherwise reactivate the existing automation.
    // --------------------------------------------------

    if (newStatus === "active") {
      if (!existingAutomation) {
        const {
          data: automation,
          error: automationInsertError,
        } = await supabase
          .from("marketing_automations")
          .insert({
            owner_id: user.id,
            campaign_id: id,
            status: "active",
            frequency: "weekly",
            start_date: new Date()
              .toISOString()
              .split("T")[0],
          })
          .select()
          .single();

        if (automationInsertError) {
          console.error(
            "Marketing automation creation error:",
            automationInsertError,
          );

          return NextResponse.json(
            {
              error:
                "Campaign was activated, but the marketing automation could not be created.",
            },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          campaign: updatedCampaign,
          automation,
          message:
            "Campaign activated and marketing automation created.",
        });
      }

      const {
        data: automation,
        error: automationUpdateError,
      } = await supabase
        .from("marketing_automations")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAutomation.id)
        .eq("owner_id", user.id)
        .select()
        .single();

      if (automationUpdateError) {
        console.error(
          "Marketing automation activation error:",
          automationUpdateError,
        );

        return NextResponse.json(
          {
            error:
              "Campaign was activated, but the marketing automation could not be activated.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        campaign: updatedCampaign,
        automation,
        message:
          "Campaign activated and marketing automation resumed.",
      });
    }

    // --------------------------------------------------
    // 11. Pause campaign
    // --------------------------------------------------

    if (newStatus === "paused") {
      if (existingAutomation) {
        const {
          data: automation,
          error: automationUpdateError,
        } = await supabase
          .from("marketing_automations")
          .update({
            status: "paused",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAutomation.id)
          .eq("owner_id", user.id)
          .select()
          .single();

        if (automationUpdateError) {
          console.error(
            "Marketing automation pause error:",
            automationUpdateError,
          );

          return NextResponse.json(
            {
              error:
                "Campaign was paused, but the marketing automation could not be paused.",
            },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          campaign: updatedCampaign,
          automation,
          message:
            "Campaign paused and marketing automation paused.",
        });
      }

      return NextResponse.json({
        success: true,
        campaign: updatedCampaign,
        automation: null,
        message: "Campaign paused.",
      });
    }

    // --------------------------------------------------
    // 12. Complete campaign
    // --------------------------------------------------

    if (newStatus === "completed") {
      if (existingAutomation) {
        const {
          data: automation,
          error: automationUpdateError,
        } = await supabase
          .from("marketing_automations")
          .update({
            status: "completed",
            end_date: new Date()
              .toISOString()
              .split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAutomation.id)
          .eq("owner_id", user.id)
          .select()
          .single();

        if (automationUpdateError) {
          console.error(
            "Marketing automation completion error:",
            automationUpdateError,
          );

          return NextResponse.json(
            {
              error:
                "Campaign was completed, but the marketing automation could not be completed.",
            },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          campaign: updatedCampaign,
          automation,
          message:
            "Campaign completed and marketing automation completed.",
        });
      }

      return NextResponse.json({
        success: true,
        campaign: updatedCampaign,
        automation: null,
        message: "Campaign completed.",
      });
    }

    // --------------------------------------------------
    // 13. Draft campaign
    // --------------------------------------------------

    if (newStatus === "draft") {
      if (existingAutomation) {
        const {
          data: automation,
          error: automationUpdateError,
        } = await supabase
          .from("marketing_automations")
          .update({
            status: "paused",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAutomation.id)
          .eq("owner_id", user.id)
          .select()
          .single();

        if (automationUpdateError) {
          console.error(
            "Marketing automation draft update error:",
            automationUpdateError,
          );

          return NextResponse.json(
            {
              error:
                "Campaign was changed to draft, but the marketing automation could not be paused.",
            },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          campaign: updatedCampaign,
          automation,
          message:
            "Campaign moved to draft and marketing automation paused.",
        });
      }
    }

    // --------------------------------------------------
    // 14. Normal response
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
      automation: existingAutomation ?? null,
      message: `Campaign marked as ${newStatus}.`,
    });
  } catch (error) {
    console.error(
      "Campaign PATCH route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while updating the campaign.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE CAMPAIGN
// ======================================================

export async function DELETE(
  _request: Request,
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
    // 2. Get campaign ID
    // --------------------------------------------------

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Campaign ID is required.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 3. Verify campaign belongs to user
    // --------------------------------------------------

    const {
      data: campaign,
      error: lookupError,
    } = await supabase
      .from("campaigns")
      .select("id, owner_id, status")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Campaign delete lookup error:",
        lookupError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to find the campaign.",
        },
        { status: 500 },
      );
    }

    if (!campaign) {
      return NextResponse.json(
        {
          error: "Campaign not found.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // 4. Protect active campaigns
    // --------------------------------------------------

    if (campaign.status === "active") {
      return NextResponse.json(
        {
          error:
            "Active campaigns cannot be deleted. Pause or complete the campaign first.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 5. Find automation
    // --------------------------------------------------

    const {
      data: automation,
      error: automationLookupError,
    } = await supabase
      .from("marketing_automations")
      .select("id")
      .eq("campaign_id", id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (automationLookupError) {
      console.error(
        "Marketing automation delete lookup error:",
        automationLookupError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to check the campaign automation.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 6. Delete marketing tasks first
    //
    // marketing_tasks references marketing_automations.
    // --------------------------------------------------

    if (automation) {
      const { error: taskDeleteError } =
        await supabase
          .from("marketing_tasks")
          .delete()
          .eq("automation_id", automation.id)
          .eq("owner_id", user.id);

      if (taskDeleteError) {
        console.error(
          "Marketing task delete error:",
          taskDeleteError,
        );

        return NextResponse.json(
          {
            error:
              "Unable to remove the campaign's marketing tasks.",
          },
          { status: 500 },
        );
      }

      // ------------------------------------------------
      // 7. Delete marketing automation
      // ------------------------------------------------

      const { error: automationDeleteError } =
        await supabase
          .from("marketing_automations")
          .delete()
          .eq("id", automation.id)
          .eq("owner_id", user.id);

      if (automationDeleteError) {
        console.error(
          "Marketing automation delete error:",
          automationDeleteError,
        );

        return NextResponse.json(
          {
            error:
              "Unable to remove the campaign's marketing automation.",
          },
          { status: 500 },
        );
      }
    }

    // --------------------------------------------------
    // 8. Delete campaign
    // --------------------------------------------------

    const { error: deleteError } =
      await supabase
        .from("campaigns")
        .delete()
        .eq("id", id)
        .eq("owner_id", user.id);

    if (deleteError) {
      console.error(
        "Campaign delete error:",
        deleteError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to delete the campaign. Please try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Campaign and its marketing automation deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Campaign DELETE route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while deleting the campaign.",
      },
      { status: 500 },
    );
  }
}