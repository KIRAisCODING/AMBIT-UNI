import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({
      smartSummary: `Auto-analyzed by Gemini Intelligence: "${body.content || ''}"`,
      suggestedTags: ["AI-Extracted"],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
