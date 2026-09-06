import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentUserHasFeature } from "@/lib/plans";

type RequestBody = {
  type: "response" | "follow-up" | "intelligence";
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
  body.type !== "follow-up" &&
  body.type !== "intelligence"
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
// 2b. Professional feature access
// --------------------------------------------------
//
// AI Lead Intelligence is a Professional feature.
// Free users keep the existing response and follow-up
// functionality.
//

if (body.type === "intelligence") {
  const hasAdvancedAI =
    await currentUserHasFeature("advanced_ai");

  if (!hasAdvancedAI) {
    return NextResponse.json(
      {
        error:
          "AI Lead Intelligence is available on the Professional plan.",
      },
      { status: 403 },
    );
  }
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
- The BUSINESS INFORMATION describes the actual business that owns the lead.
- Adverio AI is the software platform and must not be confused with the business providing the service.
- Business information provides factual context but must never be expanded beyond what is explicitly provided.
- Campaign information provides context but must never override the customer's enquiry.
- Only mention services explicitly listed in the business information or directly requested by the customer.
- If the customer directly requests a service listed in the business information, treat that service as relevant.
- Never introduce an unrelated service.
- Never invent or guess phone numbers.
- Never invent or guess email addresses.
- Never invent or guess website URLs.
- Never invent or guess physical addresses.
- Never infer a location for the customer from the business location.
- Never infer that the customer is located in the business location.
- Never invent prices or estimates.
- Never invent appointment times or availability.
- Never say that a visit can be arranged unless the business information explicitly establishes that such visits are offered and the message does not imply a confirmed appointment.
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

    const businessRoleContext = `
IMPORTANT BUSINESS ROLE:

Adverio AI is the software platform providing the AI assistance.

The BUSINESS INFORMATION below describes the actual business that owns this lead and is being marketed through Adverio AI.

When analysing or responding to the customer:
- Treat the business in BUSINESS INFORMATION as the service provider.
- Do not treat "Adverio AI" as the customer's service business.
- Judge the customer's enquiry against the actual business name, industry and services supplied below.
- If the customer's enquiry directly matches a service listed by the business, treat it as a relevant business enquiry.
- If the enquiry does not match the business's stated services, identify it as potentially unrelated.
- Never invent additional services to make an enquiry appear relevant.
`;
	
	const prompt =
  body.type === "response"
    ? `
You are Adverio AI, a professional customer communication assistant for a small service business.

Your task is to write a professional first response to a customer who submitted an enquiry.

${businessRoleContext}

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
- - Suggest a clear next step that does not assume a booking, visit, quote, availability or specific process unless that information is explicitly provided.
- The next step must not imply availability unless availability was explicitly provided.
- Do not promise a free quote, free estimate or free consultation unless that information is explicitly provided.
- Do not include invented contact details.
- Do not include placeholder text.
- Write only the message the business could send to the customer.
- Do not ask for the customer's full address unless the supplied business information or customer enquiry makes an address genuinely necessary.
- Never mention a specific city, town or area unless it is explicitly supplied by the customer or is necessary factual business context.
- Do not assume the customer is in the business's location.
`
    : body.type === "follow-up"
      ? `
You are Adverio AI, a professional customer communication assistant for a small service business.

Your task is to write a friendly follow-up message for a customer who previously submitted an enquiry.

${businessRoleContext}

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
`
      : `
You are Adverio AI's Professional Lead Intelligence engine for a small business.

Your task is to analyse a customer enquiry and provide a structured assessment that helps the business decide how to handle the lead.

CUSTOMER INFORMATION:

Name:
${typedLead.name}

Email:
${typedLead.email || "Not provided"}

Phone:
${typedLead.phone || "Not provided"}

Current lead status:
${typedLead.status}

Current follow-up status:
${typedLead.follow_up_status}

CUSTOMER ENQUIRY:

${typedLead.message || "No message provided."}

${businessRoleContext}

${businessContext}

${campaignContext}

${universalRules}

LEAD INTELLIGENCE RULES:

- First determine whether the customer's enquiry is relevant to the actual business.
- Compare the customer's requested service or problem with the services explicitly listed in BUSINESS INFORMATION.
- If the requested service is explicitly listed, this is a strong relevance signal.
- If the requested service is not listed, do not assume the business provides it.
- Campaign information may help establish the intended marketing context, but it must not override the actual business services.
- A clear request for a listed service is a positive conversion signal.
- A specific enquiry can be considered a positive signal, but do not exaggerate its meaning.
- Do not invent customer needs, budget, urgency, location, timeframe or purchase intent.
- Do not assume the customer is ready to buy.
- Do not assume the customer has agreed to anything.
- Do not infer the customer's location from the business location.
- Missing information should be identified as a potential concern rather than guessed.
- The score must reflect the evidence actually available.
- The score must consider both relevance and strength of the enquiry.
- A relevant, specific service request should normally receive a higher score than an unrelated enquiry, all else being equal.
- An unrelated enquiry should normally receive a low score unless other supplied evidence indicates otherwise.
- Priority should reflect the strength and clarity of the enquiry, not invented urgency.
- Qualification should reflect the available evidence.
- Recommended action must be practical and appropriate for the actual business.
- Recommended action must not promise availability, pricing, visits, quotes or outcomes that have not been established.
- Keep the assessment concise and useful to a small business owner.

Return ONLY valid JSON using exactly this structure:

{
  "lead_score": 0,
  "priority": "Low",
  "qualification": "Needs review",
  "assessment": "",
  "recommended_action": "",
  "conversion_signals": [],
  "potential_concerns": []
}

Additional requirements:

- lead_score must be an integer from 0 to 100.
- priority must be exactly one of: "Low", "Medium", "High".
- qualification must be a short assessment such as "Strong potential", "Potential", "Needs review", "Low intent", or "Relevant enquiry".
- assessment must explain both the relevance of the enquiry to the business and the evidence supporting the score.
- recommended_action must give the business a sensible next step based only on the supplied information.
- conversion_signals must contain only signals supported by the enquiry.
- potential_concerns must contain only genuine missing information or concerns supported by the available information.
- If the enquiry is relevant to a listed business service, do not describe it as unrelated to the business.
- Do not mention Adverio AI as though it were the service business.
- Do not include markdown.
- Do not include code fences.
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
  body.type === "intelligence"
    ? "You analyse customer enquiries for small businesses. Return accurate structured lead intelligence based only on supplied information. Never invent customer facts, business facts, prices, availability, urgency, budget, contact information or promises. Missing information must remain missing. Return valid JSON exactly as requested."
    : "You create accurate, professional customer communication for small businesses. Business facts must come only from the supplied business context. Never invent business facts, contact information, prices, availability or promises. Never use placeholders. The customer's actual enquiry always takes priority.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens:
  body.type === "intelligence"
    ? 700
    : 500,
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

console.log(
  "AI lead intelligence raw response:",
  content,
);

// --------------------------------------------------
// 13b. Validate Professional AI Lead Intelligence
// --------------------------------------------------

if (body.type === "intelligence") {
  try {
    const cleanedContent = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const intelligence =
      JSON.parse(cleanedContent);

    const validPriorities = [
      "Low",
      "Medium",
      "High",
    ];

    if (
      typeof intelligence.lead_score !==
        "number" ||
      intelligence.lead_score < 0 ||
      intelligence.lead_score > 100 ||
      !Number.isInteger(
        intelligence.lead_score,
      ) ||
      !validPriorities.includes(
        intelligence.priority,
      ) ||
      typeof intelligence.qualification !==
        "string" ||
      typeof intelligence.assessment !==
        "string" ||
      typeof intelligence.recommended_action !==
        "string" ||
      !Array.isArray(
        intelligence.conversion_signals,
      ) ||
      !Array.isArray(
        intelligence.potential_concerns,
      )
    ) {
      console.error(
        "Invalid AI lead intelligence structure:",
        intelligence,
      );

      return NextResponse.json(
        {
          error:
            "The AI returned an invalid lead intelligence assessment. Please try again.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      intelligence: {
        lead_score: intelligence.lead_score,
        priority: intelligence.priority,
        qualification:
          intelligence.qualification.trim(),
        assessment:
          intelligence.assessment.trim(),
        recommended_action:
          intelligence.recommended_action.trim(),
        conversion_signals:
          intelligence.conversion_signals
            .filter(
              (item: unknown) =>
                typeof item === "string",
            )
            .map((item: string) =>
              item.trim(),
            )
            .filter(Boolean),
        potential_concerns:
          intelligence.potential_concerns
            .filter(
              (item: unknown) =>
                typeof item === "string",
            )
            .map((item: string) =>
              item.trim(),
            )
            .filter(Boolean),
      },
    });
  } catch (parseError) {
    console.error(
      "AI lead intelligence JSON parsing error:",
      parseError,
    );

    return NextResponse.json(
      {
        error:
          "The AI returned an invalid lead intelligence assessment. Please try again.",
      },
      { status: 502 },
    );
  }
}

// --------------------------------------------------
// 14. Return normal response/follow-up result
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
