import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Campaign = {
  id: string;
  owner_id: string;
  campaign_name: string;
  key_message: string;
  call_to_action: string;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createVisualMessage(message: string) {
  const cleaned = message
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "Simplify your marketing with smarter tools.";
  }

  const normalized = cleaned.replace(/[.!?]+$/, "");

  const words = normalized.split(/\s+/);

  if (words.length <= 9) {
    return normalized;
  }

  return `${words.slice(0, 10).join(" ")}...`;
}

function wrapText(
  text: string,
  maxChars: number,
  maxLines: number,
) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (lines.length >= maxLines) {
      break;
    }

    const safeWord =
      word.length > maxChars
        ? `${word.slice(0, maxChars - 3)}...`
        : word;

    const candidate = current
      ? `${current} ${safeWord}`
      : safeWord;

    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }

      if (lines.length >= maxLines) {
        break;
      }

      current = safeWord;
    }
  }

  if (
    current &&
    lines.length < maxLines
  ) {
    lines.push(current);
  }

  return lines;
}

function renderTextLines({
  lines,
  x,
  startY,
  lineHeight,
  fontSize,
  fontWeight = "500",
  fill,
  letterSpacing,
}: {
  lines: string[];
  x: number;
  startY: number;
  lineHeight: number;
  fontSize: number;
  fontWeight?: string | number;
  fill: string;
  letterSpacing?: number;
}) {
  return lines
    .map(
      (line, index) => `
        <text
          x="${x}"
          y="${startY + index * lineHeight}"
          font-family="Arial, Helvetica, sans-serif"
          font-size="${fontSize}"
          font-weight="${fontWeight}"
          ${
            letterSpacing !== undefined
              ? `letter-spacing="${letterSpacing}"`
              : ""
          }
          fill="${fill}"
        >${escapeXml(line)}</text>
      `,
    )
    .join("");
}

function createMarketingSvg(
  campaign: Campaign,
) {
  const visualMessage =
    createVisualMessage(
      campaign.key_message,
    );

  const titleLines = wrapText(
    campaign.campaign_name,
    23,
    2,
  );

  const messageLines = wrapText(
    visualMessage,
    31,
    2,
  );

  const ctaText =
    campaign.call_to_action
      .trim()
      .slice(0, 20) || "Get started";

  const titleSvg = renderTextLines({
    lines: titleLines,
    x: 90,
    startY: 290,
    lineHeight: 64,
    fontSize: 54,
    fontWeight: 800,
    fill: "#0f172a",
  });

  const messageSvg = renderTextLines({
    lines: messageLines,
    x: 90,
    startY: 485,
    lineHeight: 48,
    fontSize: 32,
    fontWeight: 500,
    fill: "#334155",
  });

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1200"
  height="1200"
  viewBox="0 0 1200 1200"
>
  <defs>

    <linearGradient
      id="brandGradient"
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >
      <stop
        offset="0%"
        stop-color="#2563eb"
      />

      <stop
        offset="100%"
        stop-color="#4f46e5"
      />
    </linearGradient>

    <linearGradient
      id="softGradient"
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >
      <stop
        offset="0%"
        stop-color="#eff6ff"
      />

      <stop
        offset="100%"
        stop-color="#eef2ff"
      />
    </linearGradient>

    <filter
      id="cardShadow"
      x="-20%"
      y="-20%"
      width="140%"
      height="140%"
    >
      <feDropShadow
        dx="0"
        dy="10"
        stdDeviation="18"
        flood-opacity="0.10"
      />
    </filter>

  </defs>

  <!-- BACKGROUND -->

  <rect
    width="1200"
    height="1200"
    fill="#f8fafc"
  />

  <rect
    x="0"
    y="0"
    width="1200"
    height="14"
    fill="url(#brandGradient)"
  />

  <!-- HERO AREA -->

  <rect
    x="55"
    y="55"
    width="1090"
    height="560"
    rx="40"
    fill="url(#softGradient)"
  />

  <!-- Decorative circles -->

  <circle
    cx="1050"
    cy="140"
    r="190"
    fill="#dbeafe"
    opacity="0.75"
  />

  <circle
    cx="1050"
    cy="140"
    r="125"
    fill="#bfdbfe"
    opacity="0.65"
  />

  <circle
    cx="1050"
    cy="140"
    r="65"
    fill="#93c5fd"
    opacity="0.50"
  />

  <!-- BRAND -->

  <text
    x="90"
    y="110"
    font-family="Arial, Helvetica, sans-serif"
    font-size="30"
    font-weight="800"
    letter-spacing="4"
    fill="#2563eb"
  >ADVERIO AI</text>

  <text
    x="90"
    y="143"
    font-family="Arial, Helvetica, sans-serif"
    font-size="16"
    font-weight="600"
    letter-spacing="2"
    fill="#64748b"
  >AI MARKETING AUTOMATION</text>

  <!-- CAMPAIGN LABEL -->

  <rect
    x="90"
    y="190"
    width="215"
    height="44"
    rx="22"
    fill="#dbeafe"
  />

  <text
    x="197"
    y="218"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="14"
    font-weight="800"
    letter-spacing="1"
    fill="#1d4ed8"
  >MARKETING CAMPAIGN</text>

  <!-- CAMPAIGN TITLE -->

  ${titleSvg}

  <!-- SEPARATION LINE -->

  <rect
    x="90"
    y="385"
    width="90"
    height="7"
    rx="3.5"
    fill="url(#brandGradient)"
  />

  <!-- MESSAGE LABEL -->

  <text
    x="90"
    y="440"
    font-family="Arial, Helvetica, sans-serif"
    font-size="17"
    font-weight="800"
    letter-spacing="2"
    fill="#2563eb"
  >THE MESSAGE</text>

  <!-- MAIN MESSAGE -->

  ${messageSvg}

  <!-- CTA CARD -->

  <rect
    x="70"
    y="650"
    width="1060"
    height="170"
    rx="32"
    fill="url(#brandGradient)"
    filter="url(#cardShadow)"
  />

  <circle
    cx="1030"
    cy="735"
    r="105"
    fill="#ffffff"
    opacity="0.07"
  />

  <circle
    cx="1030"
    cy="735"
    r="65"
    fill="#ffffff"
    opacity="0.07"
  />

  <text
    x="115"
    y="695"
    font-family="Arial, Helvetica, sans-serif"
    font-size="15"
    font-weight="800"
    letter-spacing="2"
    fill="#bfdbfe"
  >READY TO TAKE THE NEXT STEP?</text>

  <!-- CTA BUTTON -->

  <rect
    x="105"
    y="715"
    width="320"
    height="70"
    rx="35"
    fill="#ffffff"
  />

  <text
    x="265"
    y="760"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="26"
    font-weight="800"
    fill="#2563eb"
  >${escapeXml(ctaText)}</text>

  <!-- BENEFIT CARD -->

  <rect
    x="70"
    y="855"
    width="1060"
    height="180"
    rx="32"
    fill="#ffffff"
    stroke="#e2e8f0"
    stroke-width="2"
    filter="url(#cardShadow)"
  />

  <circle
    cx="130"
    cy="915"
    r="27"
    fill="#dbeafe"
  />

  <path
    d="M117 915 L126 924 L144 904"
    fill="none"
    stroke="#2563eb"
    stroke-width="5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <text
    x="175"
    y="923"
    font-family="Arial, Helvetica, sans-serif"
    font-size="17"
    font-weight="800"
    letter-spacing="2"
    fill="#2563eb"
  >WHY THIS MATTERS</text>

  ${renderTextLines({
    lines: messageLines,
    x: 175,
    startY: 970,
    lineHeight: 36,
    fontSize: 24,
    fontWeight: 500,
    fill: "#475569",
  })}

  <!-- FOOTER -->

  <line
    x1="90"
    y1="1080"
    x2="1110"
    y2="1080"
    stroke="#e2e8f0"
    stroke-width="2"
  />

  <text
    x="90"
    y="1125"
    font-family="Arial, Helvetica, sans-serif"
    font-size="20"
    font-weight="800"
    fill="#334155"
  >Powered by Adverio AI</text>

  <text
    x="1110"
    y="1125"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="15"
    font-weight="600"
    fill="#94a3b8"
  >Create • Promote • Automate</text>

</svg>
`;
}

export async function POST(
  request: Request,
  { params }: PageProps,
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        { status: 401 },
      );
    }

    const { data: campaign, error } =
      await supabase
        .from("campaigns")
        .select(
          "id, owner_id, campaign_name, key_message, call_to_action",
        )
        .eq("id", id)
        .eq("owner_id", user.id)
        .maybeSingle();

    if (error) {
      console.error(
        "Campaign lookup error:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load the campaign.",
        },
        { status: 500 },
      );
    }

    if (!campaign) {
      return NextResponse.json(
        {
          error: "Campaign not found.",
        },
        { status: 404 },
      );
    }

    const typedCampaign =
      campaign as Campaign;

    const svg =
      createMarketingSvg(
        typedCampaign,
      );

    const generationId =
      `${Date.now()}-${crypto.randomUUID()}`;

    const filePath =
      `${user.id}/${typedCampaign.id}/${generationId}.svg`;

    const admin =
      createAdminClient();

    const fileBuffer =
      Buffer.from(
        svg,
        "utf8",
      );

    const { error: uploadError } =
      await admin.storage
        .from(
          "marketing-creatives",
        )
        .upload(
          filePath,
          fileBuffer,
          {
            contentType:
              "image/svg+xml",
            upsert: false,
            cacheControl: "0",
          },
        );

    if (uploadError) {
      console.error(
        "Creative upload error:",
        uploadError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to save the marketing creative.",
        },
        { status: 500 },
      );
    }

    const {
      data: publicUrlData,
    } =
      admin.storage
        .from(
          "marketing-creatives",
        )
        .getPublicUrl(
          filePath,
        );

    const imageUrl =
      publicUrlData.publicUrl;

    const { error: updateError } =
      await admin
        .from("campaigns")
        .update({
          image_url: imageUrl,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          typedCampaign.id,
        )
        .eq(
          "owner_id",
          user.id,
        );

    if (updateError) {
      console.error(
        "Campaign image URL update error:",
        updateError,
      );

      return NextResponse.json(
        {
          error:
            "Creative was created, but the campaign could not be updated.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error(
      "Creative generation error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to generate the marketing creative.",
      },
      { status: 500 },
    );
  }
}