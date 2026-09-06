import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  if (authError || !user) {
    return NextResponse.redirect(
      new URL("/login", siteUrl),
    );
  }

  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription =
    searchParams.get("error_description");

  if (error) {
    console.error("LinkedIn OAuth error:", {
      error,
      errorDescription,
    });

    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?linkedin=error",
        siteUrl,
      ),
    );
  }

  const savedState = request.cookies.get(
    "linkedin_oauth_state",
  )?.value;

  if (!state || !savedState || state !== savedState) {
    console.error("LinkedIn OAuth state mismatch.");

    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?linkedin=invalid_state",
        siteUrl,
      ),
    );
  }

  const oauthBusinessId = request.cookies.get(
    "linkedin_oauth_business",
  )?.value;

  if (!oauthBusinessId) {
    console.error(
      "LinkedIn OAuth business context is missing.",
    );

    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?linkedin=business_missing",
        siteUrl,
      ),
    );
  }

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("id")
      .eq("id", oauthBusinessId)
      .eq("owner_id", user.id)
      .maybeSingle();

  if (businessError) {
    console.error(
      "LinkedIn OAuth business lookup error:",
      businessError,
    );

    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?linkedin=business_error",
        siteUrl,
      ),
    );
  }

  if (!business) {
    console.error(
      "LinkedIn OAuth business not found or not owned by user.",
    );

    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?linkedin=business_not_found",
        siteUrl,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?linkedin=no_code",
        siteUrl,
      ),
    );
  }

  const clientId =
    process.env.LINKEDIN_CLIENT_ID;

  const clientSecret =
    process.env.LINKEDIN_CLIENT_SECRET;

  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error(
      "LinkedIn OAuth environment variables are missing.",
    );

    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?linkedin=config_error",
        siteUrl,
      ),
    );
  }

  try {
    const tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }).toString(),
      },
    );

    const tokenData = await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      !tokenData.access_token
    ) {
      console.error(
        "LinkedIn token exchange error:",
        tokenData,
      );

      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?linkedin=token_error",
          siteUrl,
        ),
      );
    }

    const accessToken =
      tokenData.access_token;

    const expiresIn =
      tokenData.expires_in;

    const profileResponse = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const profile =
      await profileResponse.json();

    if (
      !profileResponse.ok ||
      !profile.sub
    ) {
      console.error(
        "LinkedIn profile lookup error:",
        profile,
      );

      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?linkedin=profile_error",
          siteUrl,
        ),
      );
    }

    const expiresAt = expiresIn
      ? new Date(
          Date.now() +
            expiresIn * 1000,
        ).toISOString()
      : null;

    const { error: saveError } =
      await supabase
        .from("social_connections")
        .upsert(
          {
            owner_id: user.id,
            business_id: business.id,
            platform: "linkedin",
            platform_user_id: profile.sub,
            platform_page_id: null,
            platform_page_name:
              profile.name ||
              profile.given_name ||
              "LinkedIn",
            access_token: accessToken,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "owner_id,business_id,platform",
          },
        );

    if (saveError) {
      console.error(
        "LinkedIn connection save error:",
        saveError,
      );

      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?linkedin=save_error",
          siteUrl,
        ),
      );
    }

    const response =
      NextResponse.redirect(
        new URL(
          "/dashboard/settings?linkedin=connected",
          siteUrl,
        ),
      );

    response.cookies.delete(
      "linkedin_oauth_state",
    );

    response.cookies.delete(
      "linkedin_oauth_business",
    );

    return response;
  } catch (error) {
    console.error(
      "LinkedIn OAuth callback error:",
      error,
    );

    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?linkedin=error",
        siteUrl,
      ),
    );
  }
}