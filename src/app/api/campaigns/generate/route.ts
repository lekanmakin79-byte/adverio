import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

type GeneratedCampaign = {
  campaign_name: string;
  objective: string;
  target_audience: string;
  key_message: string;
  call_to_action: string;
  facebook_post: string;
  instagram_post: string;
  linkedin_post: string;
  email_subject: string;
  email_body: string;
  follow_up_message: string;
};

function isValidCampaign(value: unknown): value is GeneratedCampaign {
  if (!value || typeof value !== "object") {
    return false;
  }

  const campaign = value as Record<string, unknown>;

  const requiredFields = [
    "campaign_name",
    "objective",
    "target_audience",
    "key_message",
    "call_to_action",
    "facebook_post",
    "instagram_post",
    "linkedin_post",
    "email_subject",
    "email_body",
    "follow_up_message",
  ];

  return requiredFields.every(
    (field) =>
      typeof campaign[field] === "string" &&
      campaign[field].trim().length > 0,
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // --------------------------------------------------
    // 1. Check authentication
    // --------------------------------------------------

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be logged in to generate a campaign.",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 2. Read request
    // --------------------------------------------------

    const body = await request.json();

    const promotion = String(body.promotion ?? "").trim();

    if (!promotion) {
      return NextResponse.json(
        {
          error: "Please tell us what you want to promote.",
        },
        { status: 400 },
      );
    }

    if (promotion.length > 2000) {
      return NextResponse.json(
        {
          error: "Your campaign description is too long.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 3. Get business profile
    // --------------------------------------------------

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select(
        "business_name, industry, services, target_customers, location, website, marketing_goal",
      )
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError) {
      console.error("Business lookup error:", businessError);

      return NextResponse.json(
        {
          error: "Unable to load your business profile.",
        },
        { status: 500 },
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          error: "Please complete your business setup first.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 4. Generate campaign with Groq
    // --------------------------------------------------

    const systemPrompt = `
You are Adverio AI, an expert marketing strategist for small service businesses.

Your job is to create practical, truthful and useful marketing campaigns.

BUSINESS INFORMATION

Business name:
${business.business_name}

Industry:
${business.industry}

Services:
${business.services}

Target customers:
${business.target_customers}

Location:
${business.location}

Website:
${business.website || "Not provided"}

Main marketing goal:
${business.marketing_goal}

IMPORTANT CONTENT RULES

Only use information provided in the business profile or the user's promotion request.

Never invent:
- prices
- discounts
- guarantees
- qualifications
- certifications
- awards
- reviews
- years of experience
- staff numbers
- response times
- locations
- opening hours
- customer results
- claims that the business is the "best", "number one" or similar unless explicitly provided.

Do not tell customers to "swipe up" because this wording is not appropriate for every platform.

Use a natural call to action such as:
- Contact us
- Get in touch
- Request a quote
- Book a consultation
- Message us

Avoid deceptive, exaggerated or misleading marketing claims.

The content should be suitable for a legitimate small business.

Create:

1. Campaign name
2. Marketing objective
3. Target audience
4. Key message
5. Call to action
6. Facebook post
7. Instagram post
8. LinkedIn post
9. Email subject
10. Email body
11. Follow-up message

Return ONLY valid JSON.

Do not use Markdown.
Do not wrap the JSON in code fences.

Use exactly this structure:

{
  "campaign_name": "string",
  "objective": "string",
  "target_audience": "string",
  "key_message": "string",
  "call_to_action": "string",
  "facebook_post": "string",
  "instagram_post": "string",
  "linkedin_post": "string",
  "email_subject": "string",
  "email_body": "string",
  "follow_up_message": "string"
}
`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0.7,
      max_completion_tokens: 3000,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Create a marketing campaign for this promotion:

${promotion}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          error: "The AI did not return a campaign.",
        },
        { status: 502 },
      );
    }

    // --------------------------------------------------
    // 5. Parse AI response
    // --------------------------------------------------

    let campaign: GeneratedCampaign;

    try {
      const cleanedContent = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleanedContent);

      if (!isValidCampaign(parsed)) {
        throw new Error("AI response is missing required campaign fields.");
      }

      campaign = parsed;
    } catch (parseError) {
      console.error("AI campaign parsing error:", parseError);
      console.error("AI response:", content);

      return NextResponse.json(
        {
          error:
            "The AI returned an unexpected response. Please try generating the campaign again.",
        },
        { status: 502 },
      );
    }

    // --------------------------------------------------
    // 6. Save campaign to Supabase
    // --------------------------------------------------

    const { data: savedCampaign, error: saveError } = await supabase
      .from("campaigns")
      .insert({
        owner_id: user.id,
        campaign_name: campaign.campaign_name,
        objective: campaign.objective,
        target_audience: campaign.target_audience,
        key_message: campaign.key_message,
        call_to_action: campaign.call_to_action,
        facebook_post: campaign.facebook_post,
        instagram_post: campaign.instagram_post,
        linkedin_post: campaign.linkedin_post,
        email_subject: campaign.email_subject,
        email_body: campaign.email_body,
        follow_up_message: campaign.follow_up_message,
        status: "draft",
      })
      .select("*")
      .single();

    if (saveError) {
      console.error("Campaign save error:", saveError);

      return NextResponse.json(
        {
          error:
            "The campaign was generated but could not be saved. Please try again.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 7. Return saved campaign
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      campaign: savedCampaign,
    });
  } catch (error) {
    console.error("Campaign generation error:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while generating your campaign. Please try again.",
      },
      { status: 500 },
    );
  }
}
