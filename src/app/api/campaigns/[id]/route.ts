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
    // 4. Validate requested status
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
    // 6. Prevent changes to completed campaigns
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
    // 7. Prevent unnecessary updates
    // --------------------------------------------------

    if (existingCampaign.status === newStatus) {
      return NextResponse.json({
        success: true,
        message: "Campaign is already in this status.",
      });
    }

    // --------------------------------------------------
    // 8. Update campaign
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

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
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
    // 5. Delete campaign
    // --------------------------------------------------

    const { error: deleteError } = await supabase
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
      message: "Campaign deleted successfully.",
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