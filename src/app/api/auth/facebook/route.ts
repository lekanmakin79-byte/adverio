import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.redirect(
      new URL(
        "/login",
        process.env.NEXT_PUBLIC_SITE_URL ||
          "http://localhost:3000",
      ),
    );
  }

  const appId = process.env.META_APP_ID;

  if (!appId) {
    return NextResponse.json(
      {
        error: "Meta OAuth is not configured.",
      },
      { status: 500 },
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const redirectUri =
    `${siteUrl}/api/auth/facebook/callback`;

  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope:
      "pages_show_list,pages_read_engagement,pages_manage_posts",
  });

  const response = NextResponse.redirect(
    `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`,
  );

  response.cookies.set(
    "facebook_oauth_state",
    state,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    },
  );

  return response;
}