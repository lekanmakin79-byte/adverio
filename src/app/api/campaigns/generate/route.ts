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

function isValidCampaign(
  value: unknown,
): value is GeneratedCampaign {
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

/**
 * Common phrases that frequently indicate the AI has invented
 * a business claim that may not have been provided by the user.
 *
 * This is intentionally conservative.
 *
 * We do not automatically reject every occurrence because a
 * phrase such as "contact us quickly" can be harmless.
 *
 * The AI prompt remains the primary protection. This list adds
 * a second safety layer for obvious unsupported claims.
 */
const UNSUPPORTED_CLAIM_PATTERNS = [
  /\b24\s*\/\s*7\b/i,
  /\baround the clock\b/i,
  /\bavailable day and night\b/i,
  /\bavailable anytime\b/i,
  /\bavailable any time\b/i,
  /\bimmediate(?:ly)?\b/i,
  /\brapid response\b/i,
  /\bquick response\b/i,
  /\bfast response\b/i,
  /\bsame[- ]day\b/i,
  /\bnext[- ]day\b/i,
  /\bexperienced team\b/i,
  /\bexperienced electricians?\b/i,
  /\bhighly experienced\b/i,
  /\bfully qualified\b/i,
  /\bfully certified\b/i,
  /\bcertified electricians?\b/i,
  /\bguaranteed\b/i,
  /\bguarantee\b/i,
  /\bno[- ]obligation\b/i,
  /\btransparent pricing\b/i,
  /\btransparent service\b/i,
  /\bbest in\b/i,
  /\bnumber one\b/i,
  /\b#1\b/i,
  /\baward[- ]winning\b/i,
  /\btrusted by\b/i,
  /\bthousands of\b/i,
  /\bhundreds of\b/i,
  /\bfree quote\b/i,
  /\bfree estimate\b/i,
  /\bfree consultation\b/i,
];

function containsUnsupportedClaim(
  campaign: GeneratedCampaign,
): boolean {
  const content = [
    campaign.campaign_name,
    campaign.objective,
    campaign.target_audience,
    campaign.key_message,
    campaign.call_to_action,
    campaign.facebook_post,
    campaign.instagram_post,
    campaign.linkedin_post,
    campaign.email_subject,
    campaign.email_body,
    campaign.follow_up_message,
  ].join("\n");

  return UNSUPPORTED_CLAIM_PATTERNS.some((pattern) =>
    pattern.test(content),
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
          error:
            "You must be logged in to generate a campaign.",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 2. Read request
    // --------------------------------------------------

    const body = await request.json();

    const promotion =
      typeof body.promotion === "string"
        ? body.promotion.trim()
        : "";

    if (!promotion) {
      return NextResponse.json(
        {
          error:
            "Please tell us what you want to promote.",
        },
        { status: 400 },
      );
    }

    if (promotion.length > 2000) {
      return NextResponse.json(
        {
          error:
            "Your campaign description is too long.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 3. Get business profile
    // --------------------------------------------------

    const { data: business, error: businessError } =
      await supabase
        .from("businesses")
        .select(
          "business_name, industry, services, target_customers, location, website, marketing_goal",
        )
        .eq("owner_id", user.id)
        .maybeSingle();

    if (businessError) {
      console.error(
        "Business lookup error:",
        businessError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load your business profile.",
        },
        { status: 500 },
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          error:
            "Please complete your business setup first.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 4. Generate campaign with Groq
    // --------------------------------------------------

    const systemPrompt = `
You are Adverio AI, an expert marketing strategist for small service businesses.

Your job is to create practical, useful and TRUTHFUL marketing campaigns.

The most important rule is:

NEVER INVENT BUSINESS FACTS.

You have two sources of factual information:

1. BUSINESS PROFILE
2. USER PROMOTION REQUEST

Only treat information explicitly contained in those two sources as factual.

If information is not provided, do not assume it.

BUSINESS PROFILE

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

USER PROMOTION REQUEST

${promotion}

==================================================
STRICT FACTUAL ACCURACY RULES
==================================================

Never invent or assume:

- opening hours
- availability
- 24/7 service
- emergency availability
- response times
- same-day service
- next-day service
- staff numbers
- employee names
- years of experience
- qualifications
- certifications
- licences
- awards
- reviews
- testimonials
- customer numbers
- customer results
- guarantees
- warranties
- discounts
- promotions
- prices
- estimates
- free quotes
- free consultations
- appointment availability
- booking availability
- payment methods
- service areas
- additional locations
- equipment
- materials
- brands
- accreditations
- insurance
- claims that the business is the best
- claims that the business is number one
- claims that the business is trusted by large numbers of customers

If a fact is missing, simply do not mention it.

Do not replace missing facts with attractive marketing language that implies the fact.

For example:

BAD:
"Available 24/7."

If 24/7 availability was not explicitly provided.

BAD:
"Our experienced electricians provide rapid response."

If experience and response time were not explicitly provided.

BAD:
"Get your free quote today."

If a free quote was not explicitly provided.

GOOD:
"Get in touch to discuss your electrical repair needs."

==================================================
IMPORTANT DISTINCTION
==================================================

You MAY describe the services that are explicitly provided.

For example, if the business profile says:

"Domestic electrical repairs, installations, lighting and emergency"

you may say:

"Domestic electrical repairs and installations."

You may also naturally describe the customer's problem without claiming the business has capabilities that were not provided.

You may use persuasive language such as:

- professional
- reliable
- practical
- helpful
- local

ONLY when the wording does not introduce a specific factual claim that was not provided.

When in doubt, use neutral wording.

==================================================
CALL TO ACTION RULES
==================================================

Use safe CTAs such as:

- Contact us
- Get in touch
- Send us an enquiry
- Tell us what you need
- Discuss your requirements
- Request more information
- Message us

Do not automatically use:

- Book now
- Call now
- Get an immediate response
- Get your free quote
- Claim your discount

unless the relevant information is explicitly provided.

==================================================
EMAIL RULES
==================================================

Do not write:

"Dear Homeowner"

unless the target audience genuinely makes that appropriate.

Prefer:

"Hi,"

or

"Hello,"

The email must not invent:

- opening hours
- availability
- pricing
- staff qualifications
- response times
- guarantees
- free services

Do not create fake signatures.

Do not write:

"Best regards,
The ABC Electrical Services Team"

unless a team identity was explicitly provided.

It is acceptable to finish with a simple sentence such as:

"Please get in touch if you would like to discuss your requirements."

==================================================
SOCIAL MEDIA RULES
==================================================

Do not use hashtags that imply unsupported facts.

For example, do not create:

#24x7
#FastResponse
#AwardWinning
#BestElectrician

unless those facts were explicitly provided.

==================================================
FOLLOW-UP RULES
==================================================

The follow-up must relate directly to the original promotion.

Keep it short.

Do not introduce new services.

Do not introduce new offers.

Do not invent availability.

Do not pressure the customer.

==================================================
OUTPUT
==================================================

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

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        temperature: 0.4,
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

    const content =
      completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          error:
            "The AI did not return a campaign.",
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
        throw new Error(
          "AI response is missing required campaign fields.",
        );
      }

      campaign = parsed;
    } catch (parseError) {
      console.error(
        "AI campaign parsing error:",
        parseError,
      );

      console.error(
        "AI response:",
        content,
      );

      return NextResponse.json(
        {
          error:
            "The AI returned an unexpected response. Please try generating the campaign again.",
        },
        { status: 502 },
      );
    }

    // --------------------------------------------------
    // 6. Additional safety validation
    // --------------------------------------------------

    if (containsUnsupportedClaim(campaign)) {
      console.error(
        "Campaign rejected because it contains a potentially unsupported business claim.",
      );

      return NextResponse.json(
        {
          error:
            "The AI generated content containing a business claim that could not be verified. Please try generating the campaign again.",
        },
        { status: 422 },
      );
    }

    // --------------------------------------------------
    // 7. Save campaign to Supabase
    // --------------------------------------------------

    const {
      data: savedCampaign,
      error: saveError,
    } = await supabase
      .from("campaigns")
      .insert({
        owner_id: user.id,
        campaign_name:
          campaign.campaign_name,
        objective: campaign.objective,
        target_audience:
          campaign.target_audience,
        key_message:
          campaign.key_message,
        call_to_action:
          campaign.call_to_action,
        facebook_post:
          campaign.facebook_post,
        instagram_post:
          campaign.instagram_post,
        linkedin_post:
          campaign.linkedin_post,
        email_subject:
          campaign.email_subject,
        email_body:
          campaign.email_body,
        follow_up_message:
          campaign.follow_up_message,
        status: "draft",
      })
      .select("*")
      .single();

    if (saveError) {
      console.error(
        "Campaign save error:",
        saveError,
      );

      return NextResponse.json(
        {
          error:
            "The campaign was generated but could not be saved. Please try again.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 8. Return saved campaign
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      campaign: savedCampaign,
    });
  } catch (error) {
    console.error(
      "Campaign generation error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while generating your campaign. Please try again.",
      },
      { status: 500 },
    );
  }
}
