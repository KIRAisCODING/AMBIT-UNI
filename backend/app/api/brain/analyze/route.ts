import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

// Lazy-initialize Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate and apply AI rate limiting (10 req/min)
    const { session, errorResponse } = await authenticateAndRateLimit("ai");
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { content, type } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content must be a non-empty string." },
        { status: 400 }
      );
    }

    // Input payload size check (max 5000 characters)
    if (content.length > 5000) {
      return NextResponse.json(
        { error: "Content length exceeds maximum limit of 5000 characters." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isMockGemini =
      !apiKey ||
      apiKey === "your-gemini-api-key" ||
      apiKey === "MY_GEMINI_API_KEY" ||
      apiKey === "MOCK_KEY";

    if (isMockGemini) {
      const summary =
        content.split(" ").slice(0, 10).join(" ") +
        (content.split(" ").length > 10 ? "..." : "");
      const tags = ["captured"];
      const lowerContent = content.toLowerCase();
      if (
        lowerContent.includes("work") ||
        lowerContent.includes("job") ||
        lowerContent.includes("meeting")
      )
        tags.push("work");
      if (
        lowerContent.includes("personal") ||
        lowerContent.includes("health") ||
        lowerContent.includes("buy")
      )
        tags.push("personal");
      if (
        lowerContent.includes("study") ||
        lowerContent.includes("learn") ||
        lowerContent.includes("read")
      )
        tags.push("education");

      const suggestedArea = tags.includes("work")
        ? "Work"
        : tags.includes("education")
        ? "Education"
        : "Personal";

      return NextResponse.json({
        smartSummary: summary,
        suggestedTags: tags.slice(0, 3),
        suggestedArea,
        suggestedProject: null,
        suggestedSubProject: null,
      });
    }

    const ai = getGeminiClient();
    const model = "gemini-3.5-flash";

    const systemInstruction = `You are the core intelligence of AMBIT, a premium 'External Brain' productivity system.
Your job is to analyze a newly captured piece of content (which could be a Task, Idea, Note, or Journal) and extract structured insights.

Analyze the content and return a JSON object with:
1. "smartSummary": A highly polished, refined, brief summary or actionable headline of the thought (max 10-15 words).
2. "suggestedTags": An array of 2-3 short, relevant keyword tags (lowercase, single-word or hyphenated, e.g. "database", "ui-design", "fitness").
3. "suggestedArea": Suggest one of the default Areas: "Work", "Personal", "Education", "Side Projects" (or null if none fits).
4. "suggestedProject": Suggest a fitting Project name (or null if none fits).
5. "suggestedSubProject": Suggest a fitting Subproject name (or null if none fits).

Keep suggestions humble, highly contextual, and elegant.`;

    const response = await ai.models.generateContent({
      model,
      contents: `Type: ${type || "Note"}\nContent: "${content}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            smartSummary: {
              type: Type.STRING,
              description: "A refined actionable summary or headline.",
            },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 highly relevant tags.",
            },
            suggestedArea: {
              type: Type.STRING,
              description:
                "One of: Work, Personal, Education, Side Projects, or null.",
            },
            suggestedProject: {
              type: Type.STRING,
              description: "Suggested project name or null.",
            },
            suggestedSubProject: {
              type: Type.STRING,
              description: "Suggested subproject name or null.",
            },
          },
          required: ["smartSummary", "suggestedTags"],
        },
      },
    });

    const text = response.text || "{}";
    const data = JSON.parse(text.trim());
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Gemini Analyze Error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze content using Gemini.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
