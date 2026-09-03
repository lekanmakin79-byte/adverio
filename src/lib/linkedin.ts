import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

type LinkedInConnection = {
  platform_user_id: string | null;
  platform_page_name: string | null;
  access_token: string;
};

type LinkedInPublishResult = {
  success: boolean;
  post_id?: string;
  error?: string;
  duplicate?: boolean;
};

type LinkedInImageUpload = {
  uploadUrl: string;
  imageUrn: string;
};

const LINKEDIN_VERSION = "202608";

function extractLinkedInError(
  result: unknown,
): string {
  if (
    typeof result === "object" &&
    result !== null &&
    "message" in result &&
    typeof result.message === "string"
  ) {
    return result.message;
  }

  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }

  return "LinkedIn rejected the request.";
}

function isDuplicateLinkedInError(
  result: unknown,
): boolean {
  const message =
    extractLinkedInError(result).toLowerCase();

  return (
    message.includes("duplicate") ||
    message.includes(
      "content is a duplicate",
    )
  );
}

/**
 * Downloads the Adverio Creative Studio image
 * and converts the SVG into a PNG that LinkedIn
 * can accept.
 */
async function downloadAndConvertImage(
  imageUrl: string,
): Promise<Buffer> {
  const response = await fetch(
    imageUrl,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Unable to download the marketing creative. HTTP ${response.status}.`,
    );
  }

  const contentType =
    response.headers.get(
      "content-type",
    ) || "";

  if (
    !contentType.includes("image") &&
    !contentType.includes("svg")
  ) {
    throw new Error(
      "The marketing creative is not a valid image.",
    );
  }

  const svgBuffer = Buffer.from(
    await response.arrayBuffer(),
  );

  return sharp(svgBuffer)
    .png()
    .toBuffer();
}

/**
 * Registers the image upload with LinkedIn.
 */
async function initializeLinkedInImageUpload(
  accessToken: string,
  ownerUrn: string,
): Promise<LinkedInImageUpload> {
  const response = await fetch(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
        "Content-Type":
          "application/json",
        "Linkedin-Version":
          LINKEDIN_VERSION,
        "X-Restli-Protocol-Version":
          "2.0.0",
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: ownerUrn,
        },
      }),
    },
  );

  let result: unknown = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      extractLinkedInError(result),
    );
  }

  if (
    typeof result !== "object" ||
    result === null ||
    !("value" in result) ||
    typeof result.value !== "object" ||
    result.value === null
  ) {
    throw new Error(
      "LinkedIn returned an invalid image upload response.",
    );
  }

  const value =
    result.value as Record<
      string,
      unknown
    >;

  const uploadUrl =
    typeof value.uploadUrl === "string"
      ? value.uploadUrl
      : "";

  const imageUrn =
    typeof value.image === "string"
      ? value.image
      : "";

  if (!uploadUrl || !imageUrn) {
    throw new Error(
      "LinkedIn did not return the image upload URL and image URN.",
    );
  }

  return {
    uploadUrl,
    imageUrn,
  };
}

/**
 * Uploads the PNG bytes to the URL supplied
 * by LinkedIn's Images API.
 */
async function uploadImageToLinkedIn(
  uploadUrl: string,
  imageBuffer: Buffer,
) {
  const response = await fetch(
    uploadUrl,
    {
      method: "PUT",
      headers: {
        "Content-Type":
          "image/png",
      },
      body: new Uint8Array(imageBuffer),
    },
  );

  if (!response.ok) {
    let details = "";

    try {
      details =
        await response.text();
    } catch {
      details = "";
    }

    console.error(
      "LinkedIn image binary upload failed:",
      {
        status: response.status,
        details,
      },
    );

    throw new Error(
      `LinkedIn image upload failed with HTTP ${response.status}.`,
    );
  }
}

/**
 * Uploads the Adverio creative to LinkedIn
 * and returns the LinkedIn image URN.
 */
async function uploadCreativeToLinkedIn(
  accessToken: string,
  ownerUrn: string,
  imageUrl: string,
): Promise<string> {
  const imageBuffer =
    await downloadAndConvertImage(
      imageUrl,
    );

  const {
    uploadUrl,
    imageUrn,
  } =
    await initializeLinkedInImageUpload(
      accessToken,
      ownerUrn,
    );

  await uploadImageToLinkedIn(
    uploadUrl,
    imageBuffer,
  );

  return imageUrn;
}

export async function publishLinkedInPost(
  ownerId: string,
  message: string,
  imageUrl?: string | null,
): Promise<LinkedInPublishResult> {
  try {
    if (!ownerId) {
      return {
        success: false,
        error: "Missing owner ID.",
      };
    }

    if (!message?.trim()) {
      return {
        success: false,
        error:
          "LinkedIn post content is empty.",
      };
    }

    const supabase =
      createAdminClient();

    /*
     * Get the LinkedIn connection belonging
     * to this user.
     */
    const {
      data: connection,
      error: connectionError,
    } = await supabase
      .from("social_connections")
      .select(
        "platform_user_id, platform_page_name, access_token",
      )
      .eq("owner_id", ownerId)
      .eq("platform", "linkedin")
      .maybeSingle();

    if (connectionError) {
      console.error(
        "LinkedIn connection lookup failed:",
        connectionError,
      );

      return {
        success: false,
        error:
          "Unable to load the LinkedIn connection.",
      };
    }

    if (!connection) {
      return {
        success: false,
        error:
          "No LinkedIn account is connected to this account.",
      };
    }

    const linkedInConnection =
      connection as LinkedInConnection;

    if (
      !linkedInConnection.platform_user_id
    ) {
      return {
        success: false,
        error:
          "LinkedIn member ID is missing from the connection.",
      };
    }

    if (
      !linkedInConnection.access_token
    ) {
      return {
        success: false,
        error:
          "LinkedIn access token is missing.",
      };
    }

    /*
     * LinkedIn member posts use the Person URN.
     */
    const authorUrn =
      `urn:li:person:${linkedInConnection.platform_user_id}`;

    /*
     * If a creative exists, upload it to LinkedIn
     * before creating the post.
     */
    let imageUrn:
      | string
      | null = null;

    if (imageUrl?.trim()) {
      try {
        imageUrn =
          await uploadCreativeToLinkedIn(
            linkedInConnection.access_token,
            authorUrn,
            imageUrl.trim(),
          );

        console.log(
          "LinkedIn creative uploaded successfully:",
          {
            member_id:
              linkedInConnection.platform_user_id,
            image_urn: imageUrn,
          },
        );
      } catch (creativeError) {
        console.error(
          "LinkedIn creative upload failed:",
          creativeError,
        );

        /*
         * Do not block an otherwise valid LinkedIn
         * text post just because the image failed.
         *
         * The post will continue as text-only.
         */
        imageUrn = null;
      }
    }

    /*
     * Build the LinkedIn post.
     *
     * With an image:
     * commentary + image
     *
     * Without an image:
     * commentary only
     */
    const postBody: Record<
      string,
      unknown
    > = {
      author: authorUrn,
      commentary: message.trim(),
      visibility: "PUBLIC",
      distribution: {
        feedDistribution:
          "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor:
        false,
    };

    if (imageUrn) {
      postBody.content = {
        media: {
          id: imageUrn,
          altText:
            "Marketing creative created with Adverio AI",
        },
      };
    }

    /*
     * Publish through the current LinkedIn
     * Posts API.
     */
    const response =
      await fetch(
        "https://api.linkedin.com/rest/posts",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${linkedInConnection.access_token}`,
            "Content-Type":
              "application/json",
            "X-Restli-Protocol-Version":
              "2.0.0",
            "Linkedin-Version":
              LINKEDIN_VERSION,
          },
          body:
            JSON.stringify(
              postBody,
            ),
        },
      );

    let result: unknown = null;

    try {
      result =
        await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      const errorMessage =
        extractLinkedInError(
          result,
        );

      /*
       * LinkedIn can reject a post when the exact
       * same content has already been published.
       */
      if (
        isDuplicateLinkedInError(
          result,
        )
      ) {
        console.warn(
          "LinkedIn rejected duplicate content:",
          {
            member_id:
              linkedInConnection.platform_user_id,
            message:
              message.trim(),
            error:
              errorMessage,
          },
        );

        return {
          success: false,
          duplicate: true,
          error:
            "LinkedIn rejected this post because the same content has already been published.",
        };
      }

      console.error(
        "LinkedIn publishing failed:",
        {
          status:
            response.status,
          result,
        },
      );

      return {
        success: false,
        error:
          errorMessage,
      };
    }

    /*
     * LinkedIn returns the created post ID
     * in the x-restli-id response header.
     */
    const postId =
      response.headers.get(
        "x-restli-id",
      );

    if (!postId) {
      console.error(
        "LinkedIn returned a successful response without a post ID:",
        result,
      );

      return {
        success: false,
        error:
          "LinkedIn did not return a post ID.",
      };
    }

    console.log(
      "LinkedIn post published successfully:",
      {
        member_id:
          linkedInConnection.platform_user_id,
        member_name:
          linkedInConnection.platform_page_name,
        post_id: postId,
        image_urn:
          imageUrn,
      },
    );

    return {
      success: true,
      post_id: postId,
    };
  } catch (error) {
    console.error(
      "LinkedIn publishing error:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown LinkedIn publishing error.",
    };
  }
}