import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { GoogleGenAI } from "@google/genai";
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
    const { messages, items } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required." },
        { status: 400 }
      );
    }

    // Input payload size check (max 10000 characters combined)
    const messagesLength = messages.reduce(
      (acc: number, m: any) => acc + (m.text?.length || 0),
      0
    );
    if (messagesLength > 10000) {
      return NextResponse.json(
        { error: "Messages combined length exceeds limit of 10000 characters." },
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
      const lastUserMessage = messages[messages.length - 1]?.text || "";
      const lowerMessage = lastUserMessage.toLowerCase();
      let responseText =
        "Hello! I am AMBIT, your external brain (running in mock/offline mode because no Gemini API key is configured).\n\n";

      if (
        lowerMessage.includes("task") ||
        lowerMessage.includes("todo") ||
        lowerMessage.includes("item")
      ) {
        const pendingTasks =
          items && Array.isArray(items)
            ? items.filter((it: any) => !it.completed)
            : [];
        if (pendingTasks.length > 0) {
          responseText +=
            "Here are your pending tasks:\n" +
            pendingTasks
              .map(
                (it: any) =>
                  `- **${it.content}** (${it.area || "No Area"})`
              )
              .join("\n");
        } else {
          responseText +=
            "You don't have any pending tasks in your brain right now. Try capturing some ideas or tasks!";
        }
      } else if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
        responseText +=
          "Hello! How can I assist you with your captured thoughts and workspace today?";
      } else {
        responseText += `I'm ready to help you search or organize your workspace. You asked: "${lastUserMessage}". Try asking about your tasks or capture a new idea!`;
      }
      return NextResponse.json({ text: responseText });
    }

    const ai = getGeminiClient();
    const model = "gemini-3.5-flash";

    // Format current brain contents for the model
    const brainContext =
      items && Array.isArray(items) && items.length > 0
        ? items
            .map((it, idx) => {
              return `${idx + 1}. [${it.type}] (Area: ${it.area || "None"}, Project: ${it.project || "None"}, SubProject: ${it.subProject || "None"}) - Content: "${it.content}" | Tags: ${(it.tags || []).join(", ")} | Status: ${it.completed ? "Completed" : "Pending"} | Created: ${it.createdAt}`;
            })
            .join("\n")
        : "Your external brain database is currently empty. Encourage the user to capture some ideas!";

    const systemInstruction = `You are AMBIT, the user's high-intelligence External Brain.
You have access to the user's captured thoughts, notes, projects, habits, and tasks.
Here is the current state of the user's captured External Brain:
--------------------
${brainContext}
--------------------

Instructions:
1. Provide highly refined, crisp, helpful, and concise answers based on the captured data.
2. If the user asks about their tasks, projects, or notes, extract and format them beautifully using markdown lists and clean bold tags.
3. Keep the tone minimal, professional, modern, and friendly.
4. If they ask to organize or find something not in their brain, explain what you found or didn't find, and offer advice.
5. Use bullet points or small bento-like lists to make responses scannable.`;

    // Convert messages array to Gemini contents
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
      },
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    return NextResponse.json(
      {
        error: "Failed to chat with External Brain using Gemini.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
