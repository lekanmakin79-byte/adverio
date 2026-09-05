import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(
      new URL(
        "/login",
        process.env.NEXT_PUBLIC_SITE_URL ||
          "http://localhost:3000",
      ),
    );
  }

  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription =
    searchParams.get("error_description");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const settingsUrl =
    `${siteUrl}/dashboard/settings`;

  if (error) {
    console.error("Facebook OAuth error:", {
      error,
      errorDescription,
    });

    return NextResponse.redirect(
      `${settingsUrl}?facebook=error`,
    );
  }

  const savedState = request.cookies.get(
    "facebook_oauth_state",
  )?.value;

  if (
    !state ||
    !savedState ||
    state !== savedState
  ) {
    console.error(
      "Facebook OAuth state mismatch.",
    );

    return NextResponse.redirect(
      `${settingsUrl}?facebook=invalid_state`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${settingsUrl}?facebook=no_code`,
    );
  }

  const appId = process.env.META_APP_ID;
  const appSecret =
    process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.error(
      "Meta OAuth environment variables are missing.",
    );

    return NextResponse.redirect(
      `${settingsUrl}?facebook=config_error`,
    );
  }

  try {
    /*
     * Exchange the authorization code for
     * a Meta user access token.
     */
    const tokenResponse = await fetch(
      "https://graph.facebook.com/v23.0/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri:
            `${siteUrl}/api/auth/facebook/callback`,
          code,
        }).toString(),
      },
    );

    const tokenData =
      await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      !tokenData.access_token
    ) {
      console.error(
        "Facebook token exchange error:",
        tokenData,
      );

      return NextResponse.redirect(
        `${settingsUrl}?facebook=token_error`,
      );
    }

    const userAccessToken =
      tokenData.access_token;

    /*
     * Get the Pages available to the
     * authenticated Meta user.
     */
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token,tasks&access_token=${encodeURIComponent(
        userAccessToken,
      )}`,
    );

    const pagesData =
      await pagesResponse.json();

    if (
      !pagesResponse.ok ||
      !Array.isArray(pagesData?.data)
    ) {
      console.error(
        "Facebook Pages lookup error:",
        pagesData,
      );

      return NextResponse.redirect(
        `${settingsUrl}?facebook=pages_error`,
      );
    }

    if (pagesData.data.length === 0) {
      console.error(
        "No Facebook Pages were returned.",
      );

      return NextResponse.redirect(
        `${settingsUrl}?facebook=no_pages`,
      );
    }

    /*
     * For the first version we connect the first
     * Page returned by Meta that has a Page access
     * token.
     *
     * We will add Page selection UI later if an
     * account manages multiple Pages.
     */
    const page = pagesData.data.find(
      (item: {
        id?: string;
        name?: string;
        access_token?: string;
      }) =>
        item?.id &&
        item?.access_token,
    );

    if (!page) {
      console.error(
        "No Facebook Page with an access token was returned.",
      );

      return NextResponse.redirect(
        `${settingsUrl}?facebook=no_page_token`,
      );
    }

    /*
     * Save the Page connection.
     *
     * The Page access token is stored server-side
     * and is never exposed to the browser.
     */
    const { error: saveError } =
      await supabase
        .from("social_connections")
        .upsert(
          {
            owner_id: user.id,
            platform: "facebook",
            platform_user_id: user.id,
            platform_page_id: page.id,
            platform_page_name:
              page.name || "Facebook Page",
            access_token: page.access_token,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "owner_id,platform",
          },
        );

    if (saveError) {
      console.error(
        "Facebook connection save error:",
        saveError,
      );

      return NextResponse.redirect(
        `${settingsUrl}?facebook=save_error`,
      );
    }

    const response =
      NextResponse.redirect(
        `${settingsUrl}?facebook=connected`,
      );

    response.cookies.delete(
      "facebook_oauth_state",
    );

    return response;
  } catch (error) {
    console.error(
      "Facebook OAuth callback error:",
      error,
    );

    return NextResponse.redirect(
      `${settingsUrl}?facebook=error`,
    );
  }
}