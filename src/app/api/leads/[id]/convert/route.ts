import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
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
    // 2. Resolve the currently selected business
    // --------------------------------------------------

    const business = await getCurrentBusiness();

    if (!business) {
      return NextResponse.json(
        {
          error:
            "No business is available. Please complete your business setup first.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 3. Get lead ID
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
    // 4. Find the lead belonging to this user and
    //    selected business
    // --------------------------------------------------

    const { data: lead, error: leadError } =
      await supabase
        .from("leads")
        .select(
          `
            id,
            owner_id,
            business_id,
            name,
            email,
            phone,
            status
          `,
        )
        .eq("id", id)
        .eq("owner_id", user.id)
        .eq("business_id", business.id)
        .maybeSingle();

    if (leadError) {
      console.error(
        "Lead lookup error:",
        leadError,
      );

      return NextResponse.json(
        {
          error: "Unable to find the lead.",
        },
        { status: 500 },
      );
    }

    if (!lead) {
      return NextResponse.json(
        {
          error: "Lead not found.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // 5. The lead must already be converted
    // --------------------------------------------------

    const normalizedStatus =
      typeof lead.status === "string"
        ? lead.status.trim().toLowerCase()
        : "";

    if (normalizedStatus !== "converted") {
      return NextResponse.json(
        {
          error:
            "This lead must have a status of Converted before it can become a customer.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 6. Check whether this lead already has a customer
    //    in the selected business
    // --------------------------------------------------

    const {
      data: existingCustomer,
      error: existingError,
    } = await supabase
      .from("customers")
      .select(
        `
          id,
          owner_id,
          business_id,
          lead_id,
          name,
          email,
          phone,
          created_at,
          updated_at
        `,
      )
      .eq("lead_id", lead.id)
      .eq("owner_id", user.id)
      .eq("business_id", business.id)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing customer lookup error:",
        existingError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to check whether this lead is already a customer.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 7. Prevent duplicate customers
    // --------------------------------------------------

    if (existingCustomer) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        message:
          "This lead has already been converted into a customer.",
        customer: existingCustomer,
      });
    }

    // --------------------------------------------------
    // 8. Create customer
    // --------------------------------------------------

    const {
      data: customer,
      error: customerError,
    } = await supabase
      .from("customers")
      .insert({
        owner_id: user.id,
        business_id: business.id,
        lead_id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
      })
      .select(
        `
          id,
          owner_id,
          business_id,
          lead_id,
          name,
          email,
          phone,
          created_at,
          updated_at
        `,
      )
      .single();

    if (customerError) {
      console.error(
        "Customer creation error:",
        customerError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to create the customer. Please try again.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 9. Return created customer
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      message:
        "Lead successfully converted into a customer.",
      customer,
    });
  } catch (error) {
    console.error(
      "Lead conversion error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while converting the lead into a customer.",
      },
      { status: 500 },
    );
  }
}