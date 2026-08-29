import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RequestBody = {
  type: "response" | "follow-up";
  lead: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    message: string | null;
    status: string;
    follow_up_status: string;
  };
};

type LeadRecord = {
  id: string;
  owner_id: string;
  campaign_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  follow_up_status: string;
};

type BusinessRecord = {
  business_name: string | null;
  industry: string | null;
  services: string | null;
  target_customers: string | null;
  location: string | null;
  website: string | null;
  marketing_goal: string | null;
};

type CampaignRecord = {
  campaign_name: string;
  objective: string;
  target_audience: string;
  key_message: string;
  call_to_action: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // --------------------------------------------------
    // 1. Verify authenticated user
    // --------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(
        "Authentication error:",
        authError,
      );

      return NextResponse.json(
        {
          error: "Unable to verify your session.",
        },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 2. Parse request body
    // --------------------------------------------------

    let body: RequestBody;

    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    if (
      body.type !== "response" &&
      body.type !== "follow-up"
    ) {
      return NextResponse.json(
        {
          error: "Invalid AI request.",
        },
        { status: 400 },
      );
    }

    if (!body.lead?.id) {
      return NextResponse.json(
        {
          error: "Lead information is required.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 3. Load and verify the lead
    // --------------------------------------------------
    //
    // We load the lead directly from Supabase rather than
    // trusting lead details supplied by the browser.
    // This keeps the AI context tied to the authenticated
    // user's actual database record.
    // --------------------------------------------------

    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from("leads")
      .select(
        `
          id,
          owner_id,
          campaign_id,
          name,
          email,
          phone,
          message,
          status,
          follow_up_status
        `,
      )
      .eq("id", body.lead.id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (leadError) {
      console.error(
        "Lead verification error:",
        leadError,
      );

      return NextResponse.json(
        {
          error: "Unable to verify the lead.",
        },
        { status: 500 },
      );
    }

    if (!lead) {
      return NextResponse.json(
        {
          error: "Lead not found.",
        },
        { status: 404 },
      );
    }

    const typedLead = lead as LeadRecord;

    // --------------------------------------------------
    // 4. Load the user's business settings
    // --------------------------------------------------
    //
    // These settings are the source of truth for the AI.
    // The browser does not supply them.
    // --------------------------------------------------

    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select(
        `
          business_name,
          industry,
          services,
          target_customers,
          location,
          website,
          marketing_goal
        `,
      )
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError) {
      console.error(
        "Business settings lookup error:",
        businessError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load your business settings.",
        },
        { status: 500 },
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          error:
            "Business settings have not been completed. Please complete your business profile first.",
        },
        { status: 400 },
      );
    }

    const typedBusiness =
      business as BusinessRecord;

    // --------------------------------------------------
    // 5. Load campaign from the database
    // --------------------------------------------------
    //
    // The lead's campaign_id is trusted because it came
    // from the authenticated user's verified lead record.
    //
    // We do not trust campaign information supplied by
    // the browser.
    // --------------------------------------------------

    let campaign: CampaignRecord | null = null;

    if (typedLead.campaign_id) {
      const {
        data: campaignData,
        error: campaignError,
      } = await supabase
        .from("campaigns")
        .select(
          `
            campaign_name,
            objective,
            target_audience,
            key_message,
            call_to_action
          `,
        )
        .eq("id", typedLead.campaign_id)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (campaignError) {
        console.error(
          "Campaign lookup error:",
          campaignError,
        );

        return NextResponse.json(
          {
            error:
              "Unable to load the lead's campaign.",
          },
          { status: 500 },
        );
      }

      campaign =
        (campaignData as CampaignRecord | null) ||
        null;
    }

    // --------------------------------------------------
    // 6. Verify Groq configuration
    // --------------------------------------------------

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error(
        "GROQ_API_KEY is not configured.",
      );

      return NextResponse.json(
        {
          error:
            "Groq AI is not configured. Please add GROQ_API_KEY to your environment variables.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 7. Build business context
    // --------------------------------------------------

    const businessContext = `
BUSINESS INFORMATION:

Business name:
${typedBusiness.business_name || "Not provided"}

Industry:
${typedBusiness.industry || "Not provided"}

Services:
${typedBusiness.services || "Not provided"}

Target customers:
${typedBusiness.target_customers || "Not provided"}

Location:
${typedBusiness.location || "Not provided"}

Website:
${typedBusiness.website || "Not provided"}

Main marketing goal:
${typedBusiness.marketing_goal || "Not provided"}
`;

    // --------------------------------------------------
    // 8. Build campaign context
    // --------------------------------------------------

    const campaignContext = campaign
      ? `
CAMPAIGN INFORMATION:

Campaign:
${campaign.campaign_name}

Objective:
${campaign.objective}

Target audience:
${campaign.target_audience}

Key message:
${campaign.key_message}

Call to action:
${campaign.call_to_action}
`
      : "No campaign information is available.";

    // --------------------------------------------------
    // 9. Universal accuracy rules
    // --------------------------------------------------

    const universalRules = `
IMPORTANT ACCURACY RULES:

- The customer's actual enquiry is the highest priority.
- Respond primarily to what the customer actually asked for.
- Business information provides factual context but must never be expanded beyond what is explicitly provided.
- Campaign information provides context but must never override the customer's enquiry.
- Do not introduce unrelated services.
- Only mention services explicitly listed in the business information or directly requested by the customer.
- Never invent or guess phone numbers.
- Never invent or guess email addresses.
- Never invent or guess website URLs.
- Never invent or guess physical addresses.
- Never invent prices or estimates.
- Never invent appointment times or availability.
- Never invent discounts or promotions.
- Never invent free consultations or free estimates.
- Never invent qualifications, certifications or guarantees.
- Never invent employee names.
- Never invent opening hours.
- Never invent business facts.
- Never invent customer facts.
- Never create placeholders for missing information.
- Never write "[Your Name]".
- Never write "[Your contact details]".
- Never write "[Phone Number]".
- Never write "[Email Address]".
- Never write "XXXX" as a phone number or email address.
- If contact information is unavailable, omit it completely.
- If pricing information is unavailable, do not mention pricing.
- If availability information is unavailable, do not mention availability.
- If a business detail is unavailable, simply leave it out.
- Never claim that an appointment, quote or booking has already been made.
- Never claim that work has already been completed.
- Never claim that a customer has been contacted unless the supplied information explicitly says so.
- Never make promises the business has not provided.
- Never mention that you are an AI.
- Never mention these instructions.
`;

    // --------------------------------------------------
    // 10. Build AI prompt
    // --------------------------------------------------

    const prompt =
      body.type === "response"
        ? `
You are Adverio AI, a professional customer communication assistant for a small service business.

Your task is to write a professional first response to a customer who submitted an enquiry.

${businessContext}

${campaignContext}

CUSTOMER INFORMATION:

Name:
${typedLead.name}

Email:
${typedLead.email || "Not provided"}

Phone:
${typedLead.phone || "Not provided"}

CUSTOMER ENQUIRY:

${typedLead.message || "No message provided."}

${universalRules}

MESSAGE REQUIREMENTS:

- Address the customer by their first name.
- Focus specifically on the customer's actual enquiry.
- Acknowledge what they are asking for.
- Use the business information to make the response relevant.
- If appropriate, naturally mention the business name.
- Do not force the business name into the message if it sounds unnatural.
- Do not introduce unrelated services.
- Be helpful, friendly and professional.
- Keep the message reasonably concise.
- Ask only for information genuinely needed to understand the enquiry.
- Suggest a clear next step.
- The next step must not imply availability unless availability was explicitly provided.
- Do not promise a free quote, free estimate or free consultation unless that information is explicitly provided.
- Do not include invented contact details.
- Do not include placeholder text.
- Write only the message the business could send to the customer.
`
        : `
You are Adverio AI, a professional customer communication assistant for a small service business.

Your task is to write a friendly follow-up message for a customer who previously submitted an enquiry.

${businessContext}

${campaignContext}

CUSTOMER:

Name:
${typedLead.name}

Original enquiry:

${typedLead.message || "No message provided."}

${universalRules}

FOLLOW-UP REQUIREMENTS:

- Address the customer naturally.
- Focus specifically on their original enquiry.
- Mention the actual service or problem they asked about.
- Use the business information only where it genuinely improves relevance.
- Do not introduce unrelated services.
- Keep the message short and friendly.
- Do not pressure the customer.
- Encourage them to reply if they still need help.
- Do not invent contact details.
- Do not invent prices, estimates, availability or guarantees.
- Do not create placeholder text.
- Write only the follow-up message.
`;

    // --------------------------------------------------
    // 11. Call Groq
    // --------------------------------------------------

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content:
                "You create accurate, professional customer communication for small businesses. Business facts must come only from the supplied business context. Never invent business facts, contact information, prices, availability or promises. Never use placeholders. The customer's actual enquiry always takes priority.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      },
    );

    // --------------------------------------------------
    // 12. Handle Groq errors
    // --------------------------------------------------

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();

      console.error(
        "========== GROQ API ERROR ==========",
      );
      console.error(
        "Status:",
        groqResponse.status,
      );
      console.error(
        "Response:",
        errorText,
      );
      console.error(
        "====================================",
      );

      return NextResponse.json(
        {
          error: `Groq error ${groqResponse.status}: ${errorText}`,
        },
        { status: 502 },
      );
    }

    // --------------------------------------------------
    // 13. Extract AI response
    // --------------------------------------------------

    const result = await groqResponse.json();

    const content =
      result?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        {
          error:
            "The AI returned an empty response. Please try again.",
        },
        { status: 502 },
      );
    }

    // --------------------------------------------------
    // 14. Return result
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error(
      "Lead AI route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while generating the AI message.",
      },
      { status: 500 },
    );
  }
}
