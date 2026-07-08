import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Analyze captured thoughts endpoint (Extract tags, smart summary, and suggestions)
app.post("/api/brain/analyze", async (req, res) => {
  try {
    const { content, type } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Content must be a non-empty string." });
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
      contents: `Type: ${type || 'Note'}\nContent: "${content}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            smartSummary: {
              type: Type.STRING,
              description: "A refined actionable summary or headline."
            },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 highly relevant tags."
            },
            suggestedArea: {
              type: Type.STRING,
              description: "One of: Work, Personal, Education, Side Projects, or null."
            },
            suggestedProject: {
              type: Type.STRING,
              description: "Suggested project name or null."
            },
            suggestedSubProject: {
              type: Type.STRING,
              description: "Suggested subproject name or null."
            }
          },
          required: ["smartSummary", "suggestedTags"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Gemini Analyze Error:", error);
    res.status(500).json({
      error: "Failed to analyze content using Gemini.",
      details: error.message
    });
  }
});

// 2. Chat with your external brain endpoint
app.post("/api/brain/chat", async (req, res) => {
  try {
    const { messages, items } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const ai = getGeminiClient();
    const model = "gemini-3.5-flash";

    // Format current brain contents for the model
    const brainContext = items && Array.isArray(items) && items.length > 0
      ? items.map((it, idx) => {
          return `${idx + 1}. [${it.type}] (Area: ${it.area || 'None'}, Project: ${it.project || 'None'}, SubProject: ${it.subProject || 'None'}) - Content: "${it.content}" | Tags: ${it.tags.join(', ')} | Status: ${it.completed ? 'Completed' : 'Pending'} | Created: ${it.createdAt}`;
        }).join('\n')
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
    // The format should be: { role: 'user' | 'model', parts: [{ text: ... }] }
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({
      error: "Failed to chat with External Brain using Gemini.",
      details: error.message
    });
  }
});

// Proxy all other /api routes to the Next.js backend on port 3001
app.all("/api/*", async (req, res) => {
  try {
    const backendUrl = `http://127.0.0.1:3001${req.originalUrl}`;
    
    let body = undefined;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      body = JSON.stringify(req.body);
    }

    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(req.headers)) {
      if (typeof val === "string" && key.toLowerCase() !== "host" && key.toLowerCase() !== "content-length") {
        headers[key] = val;
      }
    }
    headers["content-type"] = "application/json";

    const response = await fetch(backendUrl, {
      method: req.method,
      headers,
      body,
    });

    res.status(response.status);
    const data = await response.json().catch(() => null);
    if (data) {
      res.json(data);
    } else {
      res.end();
    }
  } catch (error: any) {
    console.error("Proxy Error:", error.message);
    res.status(500).json({ error: "Failed to connect to Next.js backend." });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AMBIT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
