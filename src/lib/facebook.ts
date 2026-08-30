import { createAdminClient } from "@/lib/supabase/admin";

type FacebookConnection = {
  platform_page_id: string | null;
  platform_page_name: string | null;
  access_token: string;
};

type FacebookPublishResult = {
  success: boolean;
  post_id?: string;
  error?: string;
};

export async function publishFacebookPost(
  ownerId: string,
  message: string,
): Promise<FacebookPublishResult> {
  if (!ownerId) {
    return {
      success: false,
      error: "Missing owner ID.",
    };
  }

  if (!message?.trim()) {
    return {
      success: false,
      error: "Facebook post content is empty.",
    };
  }

  const supabase = createAdminClient();

  /*
   * Get the Facebook connection belonging to this user.
   */
  const { data: connection, error: connectionError } =
    await supabase
      .from("social_connections")
      .select(
        "platform_page_id, platform_page_name, access_token",
      )
      .eq("owner_id", ownerId)
      .eq("platform", "facebook")
      .maybeSingle();

  if (connectionError) {
    console.error(
      "Facebook connection lookup failed:",
      connectionError,
    );

    return {
      success: false,
      error:
        "Unable to load the Facebook connection.",
    };
  }

  if (!connection) {
    return {
      success: false,
      error:
        "No Facebook Page is connected to this account.",
    };
  }

  const facebookConnection =
    connection as FacebookConnection;

  if (!facebookConnection.platform_page_id) {
    return {
      success: false,
      error:
        "Facebook Page ID is missing from the connection.",
    };
  }

  if (!facebookConnection.access_token) {
    return {
      success: false,
      error:
        "Facebook Page access token is missing.",
    };
  }

  /*
   * Publish the post through the Facebook Graph API.
   */
  const response = await fetch(
    `https://graph.facebook.com/v23.0/${encodeURIComponent(
      facebookConnection.platform_page_id,
    )}/feed`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        message: message.trim(),
        access_token:
          facebookConnection.access_token,
      }).toString(),
    },
  );

  const result = await response.json();

  if (!response.ok || result?.error) {
    console.error(
      "Facebook publishing failed:",
      {
        status: response.status,
        error: result?.error ?? result,
      },
    );

    return {
      success: false,
      error:
        result?.error?.message ??
        "Facebook rejected the post.",
    };
  }

  if (!result?.id) {
    console.error(
      "Facebook returned an unexpected response:",
      result,
    );

    return {
      success: false,
      error:
        "Facebook did not return a post ID.",
    };
  }

  console.log(
    "Facebook post published successfully:",
    {
      page_id:
        facebookConnection.platform_page_id,
      page_name:
        facebookConnection.platform_page_name,
      post_id: result.id,
    },
  );

  return {
    success: true,
    post_id: result.id,
  };
}
