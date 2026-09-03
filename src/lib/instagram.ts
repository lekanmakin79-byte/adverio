import { createAdminClient } from "@/lib/supabase/admin";

type InstagramConnection = {
  platform_user_id: string | null;
  access_token: string;
};

type InstagramPublishResult = {
  success: boolean;
  media_id?: string;
  error?: string;
};

const GRAPH_API_VERSION = "v23.0";

export async function publishInstagramPost(
  ownerId: string,
  content: string,
  imageUrl: string,
): Promise<InstagramPublishResult> {
  try {
    if (!ownerId) {
      return {
        success: false,
        error: "Missing owner ID.",
      };
    }

    if (!content?.trim()) {
      return {
        success: false,
        error: "Instagram caption is empty.",
      };
    }

    if (!imageUrl?.trim()) {
      return {
        success: false,
        error: "Instagram image URL is missing.",
      };
    }

    const supabase = createAdminClient();

    /*
     * --------------------------------------------------
     * 1. LOAD INSTAGRAM CONNECTION
     * --------------------------------------------------
     */

    const {
      data: connection,
      error: connectionError,
    } = await supabase
      .from("social_connections")
      .select(
        "platform_user_id, access_token",
      )
      .eq("owner_id", ownerId)
      .eq("platform", "instagram")
      .maybeSingle();

    if (connectionError) {
      console.error(
        "Instagram connection lookup failed:",
        connectionError,
      );

      return {
        success: false,
        error:
          "Unable to load the Instagram connection.",
      };
    }

    if (!connection) {
      return {
        success: false,
        error:
          "No Instagram account is connected to this account.",
      };
    }

    const instagramConnection =
      connection as InstagramConnection;

    if (!instagramConnection.platform_user_id) {
      return {
        success: false,
        error:
          "Instagram user ID is missing from the connection.",
      };
    }

    if (!instagramConnection.access_token) {
      return {
        success: false,
        error:
          "Instagram access token is missing.",
      };
    }

    const instagramUserId =
      instagramConnection.platform_user_id;

    /*
     * --------------------------------------------------
     * 2. CREATE MEDIA CONTAINER
     * --------------------------------------------------
     */

    const createUrl =
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramUserId}/media`;

    const createResponse =
      await fetch(createUrl, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          image_url: imageUrl.trim(),
          caption: content.trim(),
          access_token:
            instagramConnection.access_token,
        }).toString(),
      });

    const createResult =
      await createResponse.json();

    if (!createResponse.ok || createResult?.error) {
      console.error(
        "Instagram media container creation failed:",
        {
          status: createResponse.status,
          error:
            createResult?.error ??
            createResult,
        },
      );

      return {
        success: false,
        error:
          createResult?.error?.message ??
          "Instagram media container creation failed.",
      };
    }

    const creationId =
      createResult?.id;

    if (!creationId) {
      console.error(
        "Instagram did not return a creation ID:",
        createResult,
      );

      return {
        success: false,
        error:
          "Instagram did not return a media creation ID.",
      };
    }

    /*
     * --------------------------------------------------
     * 3. PUBLISH MEDIA CONTAINER
     * --------------------------------------------------
     */

    const publishUrl =
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramUserId}/media_publish`;

    const publishResponse =
      await fetch(publishUrl, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          creation_id: creationId,
          access_token:
            instagramConnection.access_token,
        }).toString(),
      });

    const publishResult =
      await publishResponse.json();

    if (
      !publishResponse.ok ||
      publishResult?.error
    ) {
      console.error(
        "Instagram media publishing failed:",
        {
          status: publishResponse.status,
          error:
            publishResult?.error ??
            publishResult,
        },
      );

      return {
        success: false,
        error:
          publishResult?.error?.message ??
          "Instagram media publishing failed.",
      };
    }

    const mediaId =
      publishResult?.id;

    if (!mediaId) {
      console.error(
        "Instagram did not return a published media ID:",
        publishResult,
      );

      return {
        success: false,
        error:
          "Instagram did not return a published media ID.",
      };
    }

    console.log(
      "Instagram post published successfully:",
      {
        instagram_user_id:
          instagramUserId,
        creation_id:
          creationId,
        media_id:
          mediaId,
      },
    );

    return {
      success: true,
      media_id: mediaId,
    };
  } catch (error) {
    console.error(
      "Instagram publishing error:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown Instagram publishing error.",
    };
  }
}