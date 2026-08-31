import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const VALID_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
] as const;

const VALID_STATUSES = [
  "active",
  "paused",
] as const;

type Frequency = (typeof VALID_FREQUENCIES)[number];
type AutomationStatus = (typeof VALID_STATUSES)[number];

type CreateAutomationBody = {
  campaign_id?: unknown;
  frequency?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  status?: unknown;
};

type UpdateAutomationBody = {
  id?: unknown;
  status?: unknown;
  frequency?: unknown;
  start_date?: unknown;
  end_date?: unknown;
};

type CampaignForTasks = {
  id: string;
  campaign_name?: string | null;
  objective?: string | null;
  target_audience?: string | null;
  key_message?: string | null;
  call_to_action?: string | null;
  facebook_post: string | null;
  instagram_post: string | null;
  linkedin_post: string | null;
  email_subject: string | null;
  email_body: string | null;
  follow_up_message: string | null;
};

type AutomationForTasks = {
  id: string;
  owner_id: string;
  campaign_id: string;
  status: AutomationStatus;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
};

type GeneratedDailyContent = {
  day: number;
  angle: string;
  channel: string;
  content: string;
};

/*
 * --------------------------------------------------------
 * MARKETING ANGLES
 * --------------------------------------------------------
 *
 * These angles are deliberately fixed so that the AI must
 * approach the SAME campaign from a different perspective
 * on every scheduled occurrence.
 *
 * The campaign objective and business facts never change.
 */

const MARKETING_ANGLES = [
  "Problem / Pain Point",
  "Time Saving",
  "Consistency",
  "Educational Tip",
  "Customer Benefit",
  "Business Owner Perspective",
  "Productivity",
  "Common Marketing Challenge",
  "Practical Solution",
  "Awareness",
  "Growth Opportunity",
  "Direct Invitation",
] as const;

/*
 * --------------------------------------------------------
 * AVAILABLE CHANNELS
 * --------------------------------------------------------
 */

function getAvailableChannels(
  campaign: CampaignForTasks,
): string[] {
  return [
    campaign.facebook_post?.trim()
      ? "facebook"
      : null,

    campaign.instagram_post?.trim()
      ? "instagram"
      : null,

    campaign.linkedin_post?.trim()
      ? "linkedin"
      : null,

    campaign.email_body?.trim() ||
    campaign.email_subject?.trim()
      ? "email"
      : null,
  ].filter(
    (channel): channel is string =>
      channel !== null,
  );
}

/*
 * --------------------------------------------------------
 * GENERATE DAILY MARKETING CONTENT
 * --------------------------------------------------------
 *
 * IMPORTANT:
 *
 * The AI is NOT being asked to create 12 new campaigns.
 *
 * It is being asked to create 12 different marketing
 * executions of ONE campaign.
 *
 * Every day receives a predetermined angle.
 */

async function generateDailyMarketingContent(
  campaign: CampaignForTasks,
  channels: string[],
  occurrenceCount: number,
): Promise<GeneratedDailyContent[]> {
  const uniqueChannels = [
    ...new Set(channels),
  ];

  const channelInstructions = uniqueChannels
    .map((channel) => `- ${channel}`)
    .join("\n");

  const marketingAngles = [
    "Problem / pain point",
    "Time saving",
    "Consistency",
    "Educational tip",
    "Customer benefit",
    "Business-owner perspective",
    "Productivity",
    "Common marketing challenge",
    "Practical solution",
    "Awareness",
    "Growth",
    "Direct invitation",
  ];

  const selectedAngles = marketingAngles
    .slice(0, occurrenceCount);

  const systemPrompt = `
You are the marketing content engine for Adverio AI.

Your job is to create different daily marketing content variations
for ONE existing marketing campaign.

IMPORTANT:
You are NOT creating a new campaign.
You are creating different marketing angles for the SAME campaign.

CORE OBJECTIVE:

Every daily variation must promote or market the SAME business,
products, services, offer, or marketing objective contained in the
original campaign.

The campaign objective and business facts must remain consistent
across every daily variation.

STRICT FACT-PRESERVATION RULES:

1. Preserve the original campaign objective.

2. Preserve the original target audience.

3. Preserve the original key message.

4. Preserve all factual information explicitly provided in the campaign.

5. Only mention products, services, features, offers, prices, locations,
   customers, guarantees, awards, results, or capabilities that are
   explicitly supported by the campaign information.

6. Never invent a product.

7. Never invent a service.

8. Never invent a feature.

9. Never invent a price.

10. Never invent a discount.

11. Never invent a promotion.

12. Never invent a guarantee.

13. Never invent an award.

14. Never invent a customer number.

15. Never invent a testimonial.

16. Never invent a review.

17. Never invent a business location.

18. Never invent opening hours or availability.

19. Never invent revenue figures.

20. Never invent conversion rates.

21. Never invent percentages.

22. Never invent statistics.

23. Never invent research findings.

24. Never invent industry averages.

25. The content should help the business promote or market its existing products and services.

26. Do not mention that the content was generated by AI.

27. Do not use Markdown formatting.

28. Do not make claims about specific results, savings, revenue, growth percentages, time reductions, customer numbers, conversion rates, or performance unless those claims are explicitly provided in the campaign information.

29. Do not use phrases such as "save hours", "cut your marketing time in half", "increase revenue", "boost sales", "guaranteed results", "instant results", or similar measurable claims unless they are explicitly supported by the campaign information.

30. Do not imply that the business has customers, testimonials, awards, locations, staff, experience, results, or achievements unless those facts are explicitly provided in the campaign information.

31. Avoid generic hype and exaggerated marketing language. Keep the content credible, natural, professional, and useful.

32. Each variation must feel like a genuinely different piece of marketing content, not the same message with a few words changed.

33. Vary the opening sentence, sentence structure, rhythm, vocabulary, and presentation between days.

34. Avoid repeatedly starting content with phrases such as "Adverio AI", "Running a small business", "Imagine", "Meet Adverio AI", "As a founder", or "Ready to".

35. Do not repeatedly use the same call to action. Where appropriate, vary between natural calls to action such as getting in touch, learning more, exploring the platform, discussing requirements, or seeing how it works.

36. Do not invent facts to make the content more persuasive.

37. Every variation must remain faithful to the original campaign objective, audience, message, offer, products, services, and available functionality.

38. The content should promote the existing business, products, and services rather than creating a new product, service, offer, discount, or promotion.

39. For email content, write a natural email rather than a social-media post placed inside an email.

40. For LinkedIn content, use a professional business-oriented tone.

41. For Instagram content, make the content concise, engaging, and conversational.

42. For Facebook content, make the content approachable and suitable for a small-business audience.

43. Use the information provided in the campaign as the source of truth.

44. Never use information that is not supported by the campaign information.

45. The purpose of the daily variations is to give the business multiple ways to promote the SAME campaign over time, not to create different campaigns.


46. Do not create unsupported comparisons such as "the best",
    "number one", "fastest", "cheapest", "most popular", or
    "leading" unless explicitly supported by the campaign.

47. Do not create fake urgency.

48. Do not create fake scarcity.

49. Do not create a new offer.

50. Do not change the campaign objective.

51. Do not turn a general benefit into a guaranteed result.

52. Do not present assumptions as facts.

SAFE MARKETING LANGUAGE:

When the campaign supports a general benefit, use careful language such
as:

- "can help"
- "designed to help"
- "makes it easier to"
- "helps businesses"
- "can simplify"
- "can support"
- "helps you"
- "designed to make"
- "a practical way to"

Avoid unsupported absolute or guaranteed claims.

DAILY ANGLE RULES:

Each day must use a substantially different marketing angle.

The angle must change the way the SAME campaign is presented,
not change the campaign itself.

Possible angles include:

- Problem / pain point
- Time saving
- Consistency
- Educational tip
- Customer benefit
- Business-owner perspective
- Productivity
- Common marketing challenge
- Practical solution
- Awareness
- Engagement
- Growth
- How it works
- Frequently overlooked opportunity
- Direct invitation
- Simplicity
- Organisation
- Convenience
- Marketing consistency
- Day-to-day business challenge

Do not repeat an angle unless there are not enough suitable angles.

CONTENT VARIATION RULES:

1. Do not repeat the same opening sentence.

2. Do not repeatedly use the same hook.

3. Do not repeatedly use the same sentence structure.

4. Do not simply rewrite the original campaign twelve times.

5. Each variation must feel like a genuinely different marketing message.

6. Keep the underlying business facts consistent.

7. Keep the campaign objective consistent.

8. Keep the target audience consistent.

9. Keep the content relevant to the selected channel.

10. Avoid unnecessary repetition of the same call to action.

11. Do not introduce unrelated topics.

12. Do not mention that the content was generated by AI.

13. Do not mention these instructions.

14. Do not use Markdown.

CHANNEL RULES:

Facebook:
Write conversational, approachable marketing content suitable for
business owners and customers.

Instagram:
Write concise, engaging marketing content suitable for social media.
Use a strong opening and keep the message easy to read.

LinkedIn:
Write professional, business-focused content suitable for founders,
business owners, professionals, entrepreneurs, and decision-makers.

Email:
Write a useful, professional email.
Return the subject and body together inside the content field.

GENERAL BUSINESS RULE:

The purpose of the content is to help the business promote or market
its existing business, products, and services.

Do not change what the business sells or does.

Do not create a new business proposition.

Do not create facts that are not present in the campaign.

MARKETING QUALITY RULE:

Every variation should answer at least one of these questions:

- What problem does this help address?
- What benefit does this provide?
- Why might the target audience care?
- How can this simplify marketing?
- What opportunity might the business be missing?
- How can the business use the existing product or service?
- Why should the audience take the requested next step?

The answer must always remain grounded in the original campaign.

Possible channels:

${channelInstructions}

RETURN FORMAT:

Return ONLY valid JSON.

Return exactly this structure:

{
  "content": [
    {
      "day": 1,
      "angle": "string",
      "channel": "string",
      "content": "string"
    }
  ]
}

Return exactly ${occurrenceCount} variations.

Each day number must be unique and sequential.

Each variation must contain:

- day
- angle
- channel
- content
`;



  /*
   * Send only the essential campaign information.
   *
   * We deliberately do NOT send all existing social posts
   * and email content because doing so makes the request
   * unnecessarily large and can exceed Groq's TPM limit.
   */
  const campaignInformation = `
CAMPAIGN NAME:
${campaign.campaign_name ?? ""}

OBJECTIVE:
${campaign.objective ?? ""}

TARGET AUDIENCE:
${campaign.target_audience ?? ""}

KEY MESSAGE:
${campaign.key_message ?? ""}

CALL TO ACTION:
${campaign.call_to_action ?? ""}

BUSINESS CONTENT ALREADY PROVIDED:

FACEBOOK:
${campaign.facebook_post ?? ""}

INSTAGRAM:
${campaign.instagram_post ?? ""}

LINKEDIN:
${campaign.linkedin_post ?? ""}

EMAIL:
${campaign.email_body ?? ""}
`;

  const completion =
    await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0.8,
      max_completion_tokens: 3500,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `
Create ${occurrenceCount} different daily
marketing content variations.

Each day MUST use a different marketing angle.

Do not change the campaign objective,
audience, key message, products, services,
or business facts.

Campaign information:

${campaignInformation}
`,
        },
      ],
    });

  const content =
    completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error(
      "The AI did not return daily marketing content.",
    );
  }

  const cleanedContent = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: {
    content?: unknown;
  };

  try {
    parsed = JSON.parse(cleanedContent);
  } catch {
    console.error(
      "Invalid JSON returned by daily marketing AI:",
      cleanedContent,
    );

    throw new Error(
      "The AI returned invalid JSON for daily marketing content.",
    );
  }

  if (
    !parsed ||
    !Array.isArray(parsed.content)
  ) {
    throw new Error(
      "The AI returned an invalid daily marketing content structure.",
    );
  }

  const generated =
    parsed.content as GeneratedDailyContent[];

  if (generated.length < occurrenceCount) {
    throw new Error(
      `The AI returned only ${generated.length} daily variations instead of ${occurrenceCount}.`,
    );
  }

  const normalized = generated
    .slice(0, occurrenceCount)
    .map((item, index) => ({
      day:
        typeof item.day === "number"
          ? item.day
          : index + 1,

      angle:
        typeof item.angle === "string"
          ? item.angle.trim()
          : selectedAngles[index],

      channel:
        typeof item.channel === "string" &&
        uniqueChannels.includes(
          item.channel.trim().toLowerCase(),
        )
          ? item.channel.trim().toLowerCase()
          : uniqueChannels[
              index % uniqueChannels.length
            ],

      content:
        typeof item.content === "string"
          ? item.content.trim()
          : "",
    }))
    .filter(
      (item) =>
        item.content.length > 0,
    );

  if (normalized.length < occurrenceCount) {
    throw new Error(
      `The AI returned only ${normalized.length} usable daily variations instead of ${occurrenceCount}.`,
    );
  }

  /*
   * Make sure the AI did not accidentally repeat
   * the same marketing angle.
   */
  const angleKeys = normalized.map(
    (item) =>
      item.angle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim(),
  );

  const uniqueAngleCount =
    new Set(angleKeys).size;

  if (
    uniqueAngleCount < occurrenceCount
  ) {
    console.warn(
      "Daily marketing AI returned repeated marketing angles.",
    );
  }

  return normalized.slice(
    0,
    occurrenceCount,
  );
}


/*
 * --------------------------------------------------------
 * VALIDATION HELPERS
 * --------------------------------------------------------
 */

function isValidFrequency(
  value: unknown,
): value is Frequency {
  return (
    typeof value === "string" &&
    VALID_FREQUENCIES.includes(
      value as Frequency,
    )
  );
}

function isValidStatus(
  value: unknown,
): value is AutomationStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(
      value as AutomationStatus,
    )
  );
}

function isValidDate(
  value: unknown,
): value is string {
  if (typeof value !== "string") {
    return false;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00`,
  );

  return !Number.isNaN(
    date.getTime(),
  );
}

function addFrequency(
  date: Date,
  frequency: Frequency,
): Date {
  const next = new Date(date);

  if (frequency === "daily") {
    next.setDate(
      next.getDate() + 1,
    );
  } else if (
    frequency === "weekly"
  ) {
    next.setDate(
      next.getDate() + 7,
    );
  } else if (
    frequency === "monthly"
  ) {
    next.setMonth(
      next.getMonth() + 1,
    );
  }

  return next;
}

/*
 * --------------------------------------------------------
 * BUILD MARKETING AUTOMATION TASKS
 * --------------------------------------------------------
 *
 * Supported channels:
 *
 * facebook
 * instagram
 * linkedin
 * email
 *
 * follow_up is intentionally NOT used here.
 */

function buildTasks(
  campaign: CampaignForTasks,
  automation: AutomationForTasks,
  dailyContent: GeneratedDailyContent[],
) {
  const tasks: {
    owner_id: string;
    automation_id: string;
    campaign_id: string;
    channel: string;
    scheduled_for: string;
    status: string;
    content: string;
  }[] = [];

  let currentDate = new Date(
    `${automation.start_date}T09:00:00`,
  );

  const endDate =
    automation.end_date
      ? new Date(
          `${automation.end_date}T23:59:59`,
        )
      : null;

  const maxOccurrences =
    Math.min(
      12,
      dailyContent.length,
    );

  for (
    let occurrence = 0;
    occurrence < maxOccurrences;
    occurrence += 1
  ) {
    if (
      endDate &&
      currentDate > endDate
    ) {
      break;
    }

    const generatedContent =
      dailyContent[occurrence];

    if (
      !generatedContent ||
      !generatedContent.content.trim()
    ) {
      continue;
    }

    tasks.push({
      owner_id:
        automation.owner_id,

      automation_id:
        automation.id,

      campaign_id:
        automation.campaign_id,

      channel:
        generatedContent.channel,

      scheduled_for:
        currentDate.toISOString(),

      status: "scheduled",

      content:
        generatedContent.content.trim(),
    });

    currentDate = addFrequency(
      currentDate,
      automation.frequency,
    );
  }

  return tasks;
}

/*
 * --------------------------------------------------------
 * GET
 * --------------------------------------------------------
 */

export async function GET() {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        { status: 401 },
      );
    }

    const {
      data: automations,
      error,
    } = await supabase
      .from("marketing_automations")
      .select(
        `
          id,
          owner_id,
          campaign_id,
          status,
          frequency,
          start_date,
          end_date,
          created_at,
          updated_at,
          campaigns (
            id,
            campaign_name,
            status
          )
        `,
      )
      .eq(
        "owner_id",
        user.id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (error) {
      console.error(
        "Marketing automations GET error:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load marketing automations.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      automations:
        automations ?? [],
    });
  } catch (error) {
    console.error(
      "Marketing automations GET route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while loading automations.",
      },
      { status: 500 },
    );
  }
}

/*
 * --------------------------------------------------------
 * POST
 * --------------------------------------------------------
 *
 * Create automation and generate the first 12
 * marketing tasks.
 */

export async function POST(
  request: Request,
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        { status: 401 },
      );
    }

    let body: CreateAutomationBody;

    try {
      body =
        (await request.json()) as CreateAutomationBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const campaignId =
      body.campaign_id;

    if (
      typeof campaignId !== "string" ||
      !campaignId.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Campaign ID is required.",
        },
        { status: 400 },
      );
    }

    const frequency =
      body.frequency === undefined
        ? "daily"
        : body.frequency;

    if (
      !isValidFrequency(
        frequency,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid frequency. Use daily, weekly or monthly.",
        },
        { status: 400 },
      );
    }

    const requestedStatus =
      body.status === undefined
        ? "paused"
        : body.status;

    if (
      !isValidStatus(
        requestedStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid automation status. Use active or paused.",
        },
        { status: 400 },
      );
    }

    const startDate =
      body.start_date === undefined
        ? new Date()
            .toISOString()
            .slice(0, 10)
        : body.start_date;

    if (
      !isValidDate(startDate)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid start date. Use YYYY-MM-DD.",
        },
        { status: 400 },
      );
    }

    let endDate:
      | string
      | null = null;

    if (
      body.end_date !==
      undefined
    ) {
      if (
        body.end_date === null ||
        body.end_date === ""
      ) {
        endDate = null;
      } else if (
        isValidDate(
          body.end_date,
        )
      ) {
        endDate =
          body.end_date;
      } else {
        return NextResponse.json(
          {
            error:
              "Invalid end date. Use YYYY-MM-DD.",
          },
          { status: 400 },
        );
      }
    }

    if (
      endDate &&
      new Date(
        `${endDate}T00:00:00`,
      ) <
        new Date(
          `${startDate}T00:00:00`,
        )
    ) {
      return NextResponse.json(
        {
          error:
            "End date cannot be earlier than start date.",
        },
        { status: 400 },
      );
    }

    /*
     * Verify campaign ownership and retrieve
     * all campaign facts required by the AI.
     */

    const {
      data: campaign,
      error: campaignError,
    } = await supabase
      .from("campaigns")
      .select(
        `
          id,
          owner_id,
          campaign_name,
          objective,
          target_audience,
          key_message,
          call_to_action,
          status,
          facebook_post,
          instagram_post,
          linkedin_post,
          email_subject,
          email_body,
          follow_up_message
        `,
      )
      .eq(
        "id",
        campaignId,
      )
      .eq(
        "owner_id",
        user.id,
      )
      .maybeSingle();

    if (campaignError) {
      console.error(
        "Marketing automation campaign lookup error:",
        campaignError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify the campaign.",
        },
        { status: 500 },
      );
    }

    if (!campaign) {
      return NextResponse.json(
        {
          error:
            "Campaign not found or you do not have access to it.",
        },
        { status: 404 },
      );
    }

    if (
      campaign.status ===
      "completed"
    ) {
      return NextResponse.json(
        {
          error:
            "Completed campaigns cannot be automated.",
        },
        { status: 400 },
      );
    }

    /*
     * Only one automation per campaign.
     */

    const {
      data: existingAutomation,
      error: existingError,
    } = await supabase
      .from(
        "marketing_automations",
      )
      .select(
        "id, status",
      )
      .eq(
        "campaign_id",
        campaignId,
      )
      .eq(
        "owner_id",
        user.id,
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing automation lookup error:",
        existingError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to check existing automations.",
        },
        { status: 500 },
      );
    }

    if (existingAutomation) {
      return NextResponse.json(
        {
          error:
            "This campaign already has a marketing automation.",
          automation:
            existingAutomation,
        },
        { status: 409 },
      );
    }

    /*
     * Create automation.
     */

    const {
      data: automation,
      error: automationError,
    } = await supabase
      .from(
        "marketing_automations",
      )
      .insert({
        owner_id:
          user.id,

        campaign_id:
          campaignId,

        status:
          requestedStatus,

        frequency,

        start_date:
          startDate,

        end_date:
          endDate,

        updated_at:
          new Date().toISOString(),
      })
      .select(
        `
          id,
          owner_id,
          campaign_id,
          status,
          frequency,
          start_date,
          end_date,
          created_at,
          updated_at
        `,
      )
      .single();

    if (
      automationError ||
      !automation
    ) {
      console.error(
        "Marketing automation insert error:",
        automationError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to create the marketing automation.",
        },
        { status: 500 },
      );
    }

    const automationForTasks:
      AutomationForTasks = {
      id: automation.id,
      owner_id:
        automation.owner_id,
      campaign_id:
        automation.campaign_id,
      status:
        automation.status as AutomationStatus,
      frequency:
        automation.frequency as Frequency,
      start_date:
        automation.start_date,
      end_date:
        automation.end_date,
    };

    const campaignForTasks:
      CampaignForTasks = {
      id: campaign.id,
      campaign_name:
        campaign.campaign_name,
      objective:
        campaign.objective,
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
    };

    const availableChannels =
      getAvailableChannels(
        campaignForTasks,
      );

    if (
      availableChannels.length ===
      0
    ) {
      await supabase
        .from(
          "marketing_automations",
        )
        .delete()
        .eq(
          "id",
          automation.id,
        )
        .eq(
          "owner_id",
          user.id,
        );

      return NextResponse.json(
        {
          error:
            "The campaign does not contain any usable marketing content.",
        },
        { status: 400 },
      );
    }

    /*
     * Generate the 12 unique daily angles.
     */

    let dailyContent:
      GeneratedDailyContent[];

    try {
      dailyContent =
        await generateDailyMarketingContent(
          campaignForTasks,
          availableChannels,
          12,
        );
    } catch (generationError) {
      console.error(
        "Daily marketing content generation error:",
        generationError,
      );

      await supabase
        .from(
          "marketing_automations",
        )
        .delete()
        .eq(
          "id",
          automation.id,
        )
        .eq(
          "owner_id",
          user.id,
        );

      return NextResponse.json(
        {
          error:
            "Unable to generate the daily marketing content.",
        },
        { status: 500 },
      );
    }

    const tasks =
      buildTasks(
        campaignForTasks,
        automationForTasks,
        dailyContent,
      );

    if (
      tasks.length > 0
    ) {
      const {
        error: taskError,
      } = await supabase
        .from(
          "marketing_tasks",
        )
        .insert(tasks);

      if (taskError) {
        console.error(
          "Marketing task creation error:",
          taskError,
        );

        await supabase
          .from(
            "marketing_automations",
          )
          .delete()
          .eq(
            "id",
            automation.id,
          )
          .eq(
            "owner_id",
            user.id,
          );

        return NextResponse.json(
          {
            error:
              "Unable to create the automation tasks.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        automation,
        tasks_created:
          tasks.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Marketing automation POST route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating the marketing automation.",
      },
      { status: 500 },
    );
  }
}

/*
 * --------------------------------------------------------
 * PATCH
 * --------------------------------------------------------
 *
 * Update an automation and rebuild its scheduled tasks
 * when scheduling settings change.
 */

export async function PATCH(
  request: Request,
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        { status: 401 },
      );
    }

    let body: UpdateAutomationBody;

    try {
      body =
        (await request.json()) as UpdateAutomationBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        { status: 400 },
      );
    }

    if (
      typeof body.id !== "string" ||
      !body.id.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Automation ID is required.",
        },
        { status: 400 },
      );
    }

    const automationId =
      body.id;

    const {
      data: existingAutomation,
      error: lookupError,
    } = await supabase
      .from(
        "marketing_automations",
      )
      .select(
        `
          id,
          owner_id,
          campaign_id,
          status,
          frequency,
          start_date,
          end_date
        `,
      )
      .eq(
        "id",
        automationId,
      )
      .eq(
        "owner_id",
        user.id,
      )
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Automation PATCH lookup error:",
        lookupError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to find the automation.",
        },
        { status: 500 },
      );
    }

    if (!existingAutomation) {
      return NextResponse.json(
        {
          error:
            "Automation not found.",
        },
        { status: 404 },
      );
    }

    const updates:
      Record<
        string,
        unknown
      > = {
      updated_at:
        new Date().toISOString(),
    };

    if (
      body.status !==
      undefined
    ) {
      if (
        !isValidStatus(
          body.status,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid automation status. Use active or paused.",
          },
          { status: 400 },
        );
      }

      updates.status =
        body.status;
    }

    if (
      body.frequency !==
      undefined
    ) {
      if (
        !isValidFrequency(
          body.frequency,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid frequency. Use daily, weekly or monthly.",
          },
          { status: 400 },
        );
      }

      updates.frequency =
        body.frequency;
    }

    if (
      body.start_date !==
      undefined
    ) {
      if (
        !isValidDate(
          body.start_date,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid start date. Use YYYY-MM-DD.",
          },
          { status: 400 },
        );
      }

      updates.start_date =
        body.start_date;
    }

    if (
      body.end_date !==
      undefined
    ) {
      if (
        body.end_date !==
          null &&
        body.end_date !==
          "" &&
        !isValidDate(
          body.end_date,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid end date. Use YYYY-MM-DD.",
          },
          { status: 400 },
        );
      }

      updates.end_date =
        body.end_date ===
          "" ||
        body.end_date ===
          null
          ? null
          : body.end_date;
    }

    const finalStartDate =
      (updates.start_date as
        | string
        | undefined) ??
      existingAutomation.start_date;

    const finalEndDate =
      updates.end_date !==
      undefined
        ? (updates.end_date as
            | string
            | null)
        : existingAutomation.end_date;

    if (
      finalEndDate &&
      new Date(
        `${finalEndDate}T00:00:00`,
      ) <
        new Date(
          `${finalStartDate}T00:00:00`,
        )
    ) {
      return NextResponse.json(
        {
          error:
            "End date cannot be earlier than start date.",
        },
        { status: 400 },
      );
    }

    const {
      data: updatedAutomation,
      error: updateError,
    } = await supabase
      .from(
        "marketing_automations",
      )
      .update(updates)
      .eq(
        "id",
        automationId,
      )
      .eq(
        "owner_id",
        user.id,
      )
      .select(
        `
          id,
          owner_id,
          campaign_id,
          status,
          frequency,
          start_date,
          end_date,
          created_at,
          updated_at
        `,
      )
      .single();

    if (
      updateError ||
      !updatedAutomation
    ) {
      console.error(
        "Marketing automation PATCH error:",
        updateError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to update the marketing automation.",
        },
        { status: 500 },
      );
    }

    /*
     * Rebuild scheduled tasks when the schedule changes
     * or the automation is resumed.
     */
    const shouldRebuildTasks =
      body.status === "active" ||
      body.frequency !==
        undefined ||
      body.start_date !==
        undefined ||
      body.end_date !==
        undefined;

    if (
      shouldRebuildTasks
    ) {
      /*
       * Delete only scheduled tasks.
       *
       * Completed and failed tasks remain preserved.
       */
      const {
        error:
          taskDeleteError,
      } = await supabase
        .from(
          "marketing_tasks",
        )
        .delete()
        .eq(
          "automation_id",
          automationId,
        )
        .eq(
          "owner_id",
          user.id,
        )
        .eq(
          "status",
          "scheduled",
        );

      if (taskDeleteError) {
        console.error(
          "Automation scheduled task cleanup error:",
          taskDeleteError,
        );
      }

      /*
       * Retrieve the COMPLETE campaign.
       *
       * This is important because the AI needs the original
       * campaign objective, target audience, key message and
       * business facts when rebuilding tasks.
       */

      const {
        data: campaign,
        error: campaignError,
      } = await supabase
        .from(
          "campaigns",
        )
        .select(
          `
            id,
            campaign_name,
            objective,
            target_audience,
            key_message,
            call_to_action,
            facebook_post,
            instagram_post,
            linkedin_post,
            email_subject,
            email_body,
            follow_up_message
          `,
        )
        .eq(
          "id",
          updatedAutomation.campaign_id,
        )
        .eq(
          "owner_id",
          user.id,
        )
        .maybeSingle();

      if (campaignError) {
        console.error(
          "Automation task rebuild campaign error:",
          campaignError,
        );

        return NextResponse.json({
          success: true,
          automation:
            updatedAutomation,
          warning:
            "Automation updated, but scheduled tasks could not be rebuilt.",
        });
      }

      if (!campaign) {
        return NextResponse.json({
          success: true,
          automation:
            updatedAutomation,
          warning:
            "Automation updated, but scheduled tasks could not be rebuilt because the campaign was not found.",
        });
      }

      /*
       * If the automation is paused, there is nothing
       * else to schedule.
       */
      if (
        updatedAutomation.status ===
        "paused"
      ) {
        return NextResponse.json({
          success: true,
          automation:
            updatedAutomation,
          tasks_created: 0,
        });
      }

      const automationForTasks:
        AutomationForTasks = {
        id:
          updatedAutomation.id,

        owner_id:
          updatedAutomation.owner_id,

        campaign_id:
          updatedAutomation.campaign_id,

        status:
          updatedAutomation.status as AutomationStatus,

        frequency:
          updatedAutomation.frequency as Frequency,

        start_date:
          updatedAutomation.start_date,

        end_date:
          updatedAutomation.end_date,
      };

      const campaignForTasks:
        CampaignForTasks = {
        id:
          campaign.id,

        campaign_name:
          campaign.campaign_name,

        objective:
          campaign.objective,

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
      };

      const availableChannels =
        getAvailableChannels(
          campaignForTasks,
        );

      if (
        availableChannels.length ===
        0
      ) {
        return NextResponse.json({
          success: true,
          automation:
            updatedAutomation,
          tasks_created: 0,
          warning:
            "Automation updated, but the campaign has no usable marketing channels.",
        });
      }

      let dailyContent:
        GeneratedDailyContent[];

      try {
        dailyContent =
          await generateDailyMarketingContent(
            campaignForTasks,
            availableChannels,
            12,
          );
      } catch (generationError) {
        console.error(
          "Automation PATCH daily content generation error:",
          generationError,
        );

        return NextResponse.json({
          success: true,
          automation:
            updatedAutomation,
          tasks_created: 0,
          warning:
            "Automation updated, but fresh daily marketing content could not be generated.",
        });
      }

      const tasks =
        buildTasks(
          campaignForTasks,
          automationForTasks,
          dailyContent,
        );

      if (
        tasks.length > 0
      ) {
        const {
          error: taskError,
        } = await supabase
          .from(
            "marketing_tasks",
          )
          .insert(tasks);

        if (taskError) {
          console.error(
            "Automation PATCH task creation error:",
            taskError,
          );

          return NextResponse.json({
            success: true,
            automation:
              updatedAutomation,
            tasks_created: 0,
            warning:
              "Automation updated, but the new scheduled tasks could not be created.",
          });
        }
      }

      return NextResponse.json({
        success: true,
        automation:
          updatedAutomation,
        tasks_created:
          tasks.length,
      });
    }

    return NextResponse.json({
      success: true,
      automation:
        updatedAutomation,
    });
  } catch (error) {
    console.error(
      "Marketing automation PATCH route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while updating the marketing automation.",
      },
      { status: 500 },
    );
  }
}

/*
 * --------------------------------------------------------
 * DELETE
 * --------------------------------------------------------
 *
 * Delete an automation and all of its tasks.
 */

export async function DELETE(
  request: Request,
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        { status: 401 },
      );
    }

    const {
      searchParams,
    } = new URL(
      request.url,
    );

    const automationId =
      searchParams.get(
        "id",
      );

    if (!automationId) {
      return NextResponse.json(
        {
          error:
            "Automation ID is required.",
        },
        { status: 400 },
      );
    }

    const {
      data: automation,
      error: lookupError,
    } = await supabase
      .from(
        "marketing_automations",
      )
      .select(
        "id, owner_id",
      )
      .eq(
        "id",
        automationId,
      )
      .eq(
        "owner_id",
        user.id,
      )
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Automation DELETE lookup error:",
        lookupError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to find the automation.",
        },
        { status: 500 },
      );
    }

    if (!automation) {
      return NextResponse.json(
        {
          error:
            "Automation not found.",
        },
        { status: 404 },
      );
    }

    /*
     * Delete tasks first.
     */
    const {
      error:
        taskDeleteError,
    } = await supabase
      .from(
        "marketing_tasks",
      )
      .delete()
      .eq(
        "automation_id",
        automationId,
      )
      .eq(
        "owner_id",
        user.id,
      );

    if (taskDeleteError) {
      console.error(
        "Automation task delete error:",
        taskDeleteError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to delete the automation tasks.",
        },
        { status: 500 },
      );
    }

    /*
     * Delete the automation.
     */
    const {
      error:
        automationDeleteError,
    } = await supabase
      .from(
        "marketing_automations",
      )
      .delete()
      .eq(
        "id",
        automationId,
      )
      .eq(
        "owner_id",
        user.id,
      );

    if (
      automationDeleteError
    ) {
      console.error(
        "Automation delete error:",
        automationDeleteError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to delete the marketing automation.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Marketing automation deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Marketing automation DELETE route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while deleting the marketing automation.",
      },
      { status: 500 },
    );
  }
}
