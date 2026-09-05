import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 },
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_SITE_URL is not configured.",
        },
        { status: 500 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: subscription } =
      await supabaseAdmin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "No Stripe customer exists yet. Start the test subscription first.",
        },
        { status: 400 },
      );
    }

    const stripe = getStripe();

    const session =
      await stripe.billingPortal.sessions.create({
        customer:
          subscription.stripe_customer_id,
        return_url: `${siteUrl}/admin`,
      });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Stripe portal error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open Stripe billing portal.",
      },
      { status: 500 },
    );
  }
}