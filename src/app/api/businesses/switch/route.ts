import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentBusiness,
  setSelectedBusinessId,
} from "@/lib/business";
import { getCurrentUserPlan } from "@/lib/subscription";
import { PLAN_LIMITS } from "@/lib/plans";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be logged in.",
        },
        { status: 401 },
      );
    }

    const business = await getCurrentBusiness();

    if (!business) {
      return NextResponse.json(
        {
          error: "No business found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      business,
    });
  } catch (error) {
    console.error(
      "Current business lookup error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load the current business.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be logged in.",
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    const action =
      typeof body.action === "string"
        ? body.action.trim().toLowerCase()
        : "switch";

    /*
     * Create a new business.
     */
    if (action === "create") {
      const businessName =
        typeof body.businessName === "string"
          ? body.businessName.trim()
          : "";

      if (!businessName) {
        return NextResponse.json(
          {
            error:
              "Business name is required.",
          },
          { status: 400 },
        );
      }

      if (businessName.length > 100) {
        return NextResponse.json(
          {
            error:
              "Business name must be 100 characters or fewer.",
          },
          { status: 400 },
        );
      }

      const plan = await getCurrentUserPlan();
      const businessLimit =
        PLAN_LIMITS[plan].businesses;

      const {
        count: businessCount,
        error: businessCountError,
      } = await supabase
        .from("businesses")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("owner_id", user.id);

      if (businessCountError) {
        console.error(
          "Business count lookup error:",
          businessCountError,
        );

        return NextResponse.json(
          {
            error:
              "Unable to check your business limit. Please try again.",
          },
          { status: 500 },
        );
      }

      if (
        businessLimit !== Infinity &&
        (businessCount ?? 0) >= businessLimit
      ) {
        return NextResponse.json(
          {
            error:
              plan === "free"
                ? "Your Free plan allows 1 business. Upgrade to Professional to manage up to 5 businesses."
                : "Your Professional plan allows up to 5 businesses.",
          },
          { status: 403 },
        );
      }

      const {
        data: business,
        error: createError,
      } = await supabase
        .from("businesses")
        .insert({
          owner_id: user.id,
          business_name: businessName,
        })
        .select("id, business_name")
        .single();

      if (createError || !business) {
        console.error(
          "Business creation error:",
          createError,
        );

        return NextResponse.json(
          {
            error:
              "Unable to create the business. Please try again.",
          },
          { status: 500 },
        );
      }

      await setSelectedBusinessId(
        business.id,
      );

      return NextResponse.json({
        success: true,
        action: "create",
        business,
      });
    }

    /*
     * Switch to an existing business.
     */
    if (action !== "switch") {
      return NextResponse.json(
        {
          error:
            "Invalid business action.",
        },
        { status: 400 },
      );
    }

    const businessId =
      typeof body.businessId === "string"
        ? body.businessId.trim()
        : "";

    if (!businessId) {
      return NextResponse.json(
        {
          error: "Business ID is required.",
        },
        { status: 400 },
      );
    }

    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError) {
      console.error(
        "Business switch lookup error:",
        businessError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to switch business. Please try again.",
        },
        { status: 500 },
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          error: "Business not found.",
        },
        { status: 404 },
      );
    }

    await setSelectedBusinessId(
      business.id,
    );

    return NextResponse.json({
      success: true,
      action: "switch",
      businessId: business.id,
    });
  } catch (error) {
    console.error(
      "Business API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to complete the business request. Please try again.",
      },
      { status: 500 },
    );
  }
}