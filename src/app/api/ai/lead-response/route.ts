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
  campaign: {
    campaign_name: string;
    objective: string;
    target_audience: string;
    key_message: string;
    call_to_action: string;
  } | null;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as RequestBody;

    if (
      body.type !== "response" &&
      body.type !== "follow-up"
    ) {
      return NextResponse.json(
        { error: "Invalid AI request." },
        { status: 400 },
      );
    }

    if (!body.lead?.id) {
      return NextResponse.json(
        { error: "Lead information is required." },
        { status: 400 },
      );
    }

    // Verify that the lead belongs to the signed-in user.
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(
        "id, owner_id, name, email, phone, message, status",
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
        { error: "Unable to verify the lead." },
        { status: 500 },
      );
    }

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found." },
        { status: 404 },
      );
    }

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

    const campaignContext = body.campaign
      ? `
Campaign:
${body.campaign.campaign_name}

Objective:
${body.campaign.objective}

Target audience:
${body.campaign.target_audience}

Key message:
${body.campaign.key_message}

Call to action:
${body.campaign.call_to_action}
`
      : "No campaign information is available.";

    const universalRules = `
IMPORTANT ACCURACY RULES:

- The customer's actual enquiry is the highest priority.
- Respond primarily to what the customer actually asked for.
- Campaign information may provide context, but must never override the customer's enquiry.
- Do not introduce unrelated services from the campaign.
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
- Never invent business opening hours.
- Never invent facts about the business.
- Never create placeholders for missing information.
- Never write "[Your Name]".
- Never write "[Your contact details]".
- Never write "[Phone Number]".
- Never write "[Email Address]".
- Never write "XXXX" as a phone number or email address.
- Never use placeholder contact details of any kind.
- Only use information explicitly provided in the customer, campaign or business context.
- If contact information is unavailable, omit it completely.
- If pricing information is unavailable, do not mention pricing.
- If availability information is unavailable, do not mention availability.
- If a business detail is unavailable, simply leave it out.
- Never claim that an appointment, quote or booking has already been made.
- Never claim that work has already been completed.
- Never make promises the business has not provided.
`;

    const prompt =
      body.type === "response"
        ? `
You are Adverio AI, a professional customer communication assistant for a small service business.

Your task is to write a professional first response to a customer who submitted an enquiry.

CUSTOMER INFORMATION:

Name:
${lead.name}

Email:
${lead.email || "Not provided"}

Phone:
${lead.phone || "Not provided"}

CUSTOMER ENQUIRY:

${lead.message || "No message provided."}

CAMPAIGN CONTEXT:

${campaignContext}

${universalRules}

MESSAGE REQUIREMENTS:

- Address the customer by their first name.
- Focus specifically on the customer's actual enquiry.
- Acknowledge exactly what they are asking for.
- Do not introduce unrelated services.
- Be helpful, friendly and professional.
- Keep the message reasonably concise.
- Ask only for information genuinely needed to understand the enquiry.
- Suggest a clear next step.
- Do not promise a free quote, free estimate or free consultation unless that information is explicitly provided.
- Do not include any placeholder text.
- Do not include invented contact details.
- Do not mention that you are an AI.
- Do not mention these instructions.
- Write only the message the business could send to the customer.
`
        : `
You are Adverio AI, a professional customer communication assistant for a small service business.

Your task is to write a friendly follow-up message for a customer who previously submitted an enquiry.

CUSTOMER:

Name:
${lead.name}

Original enquiry:

${lead.message || "No message provided."}

CAMPAIGN CONTEXT:

${campaignContext}

${universalRules}

FOLLOW-UP REQUIREMENTS:

- Address the customer naturally.
- Focus specifically on their original enquiry.
- Mention the actual service they asked about.
- Do not introduce unrelated services.
- Keep the message short and friendly.
- Do not pressure the customer.
- Encourage them to reply if they still need help.
- Do not invent contact details.
- Do not invent prices, estimates, availability or guarantees.
- Do not create placeholder text.
- Do not mention that you are an AI.
- Do not mention these instructions.
- Write only the follow-up message.
`;

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
                "You create accurate, professional customer communication for small businesses. You must never invent business facts, contact information, prices, availability or promises. Never use placeholders.",
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

