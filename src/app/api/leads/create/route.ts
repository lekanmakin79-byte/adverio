import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const campaignId =
      typeof body.campaignId === "string" ? body.campaignId.trim() : "";

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const email =
      typeof body.email === "string" ? body.email.trim() : "";

    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    // Basic validation
    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign is required." },
        { status: 400 },
      );
    }

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Please enter your name." },
        { status: 400 },
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name is too long." },
        { status: 400 },
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Please provide an email address or phone number." },
        { status: 400 },
      );
    }

    if (email && email.length > 254) {
      return NextResponse.json(
        { error: "Email address is too long." },
        { status: 400 },
      );
    }

    if (phone && phone.length > 50) {
      return NextResponse.json(
        { error: "Phone number is too long." },
        { status: 400 },
      );
    }

    if (message.length > 3000) {
      return NextResponse.json(
        { error: "Your message is too long." },
        { status: 400 },
      );
    }

    // Use the normal Supabase client.
    // The public form does not receive or expose any service-role key.
    const supabase = await createClient();

    // Find the campaign and its owner.
    // Only active campaigns can receive public enquiries.
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, owner_id, status")
      .eq("id", campaignId)
      .eq("status", "active")
      .maybeSingle();

    if (campaignError) {
      console.error("Lead campaign lookup error:", campaignError);

      return NextResponse.json(
        { error: "Unable to process this enquiry." },
        { status: 500 },
      );
    }

    if (!campaign) {
      return NextResponse.json(
        {
          error:
            "This campaign is not currently accepting enquiries.",
        },
        { status: 404 },
      );
    }

    // Insert the lead.
    // owner_id is taken from the campaign, not from the visitor.
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        owner_id: campaign.owner_id,
        campaign_id: campaign.id,
        name,
        email: email || null,
        phone: phone || null,
        message: message || null,
        source: "public_form",
        status: "new",
        follow_up_status: "pending",
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("Lead creation error:", leadError);

      return NextResponse.json(
        { error: "Unable to save your enquiry. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        leadId: lead.id,
        message:
          "Your enquiry has been submitted successfully.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Public lead API error:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while submitting your enquiry.",
      },
      { status: 500 },
    );
  }
}