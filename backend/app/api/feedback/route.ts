import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VALID_CLARITY = [
  'Very confusing',
  'Somewhat confusing',
  'Neutral',
  'Mostly clear',
  'Immediately clear'
];

const VALID_WORKFLOW = [
  "Doesn't make sense",
  'Somewhat confusing',
  'Makes sense',
  'Very intuitive'
];

const VALID_FEATURES = [
  'Inbox',
  'Areas / Projects / SubProjects',
  'Tasks',
  'Habits',
  'Calendar',
  'Analytics',
  'Settings',
  'Other'
];

const VALID_REGULAR_USE = [
  'Definitely',
  'Probably',
  'Maybe',
  'Probably not',
  'No'
];

export async function POST(req: Request) {
  try {
    // 1. Verify authenticated session
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Parse request payload
    const body = await req.json();
    const {
      rating,
      clarity,
      workflowUnderstanding,
      featuresUsed,
      confusion,
      frustration,
      usefulPart,
      missingFeature,
      regularUse,
      missMost,
      recommendationScore,
      additionalFeedback,
      route
    } = body;

    // 3. Validation Rules
    // Question 1: Rating (1-5) - Required
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: "Rating must be a value between 1 and 5." }, { status: 400 });
    }

    // Question 2: Clarity (Predefined options) - Required
    if (!clarity || !VALID_CLARITY.includes(clarity)) {
      return NextResponse.json({ error: "Invalid response for clarity question." }, { status: 400 });
    }

    // Question 3: Workflow sense (Predefined options) - Required
    if (!workflowUnderstanding || !VALID_WORKFLOW.includes(workflowUnderstanding)) {
      return NextResponse.json({ error: "Invalid response for workflow understanding question." }, { status: 400 });
    }

    // Question 4: Features used (Predefined options list) - Required (at least one selection)
    if (!Array.isArray(featuresUsed) || featuresUsed.length === 0) {
      return NextResponse.json({ error: "Please select at least one feature you used." }, { status: 400 });
    }
    for (const feat of featuresUsed) {
      if (!VALID_FEATURES.includes(feat)) {
        return NextResponse.json({ error: `Invalid feature selection: ${feat}` }, { status: 400 });
      }
    }

    // Optional Question 5: Confusion (Max length 5000)
    if (confusion && typeof confusion === 'string' && confusion.length > 5000) {
      return NextResponse.json({ error: "Response for confusion text is too long (Max 5000 characters)." }, { status: 400 });
    }

    // Optional Question 6: Frustration (Max length 5000)
    if (frustration && typeof frustration === 'string' && frustration.length > 5000) {
      return NextResponse.json({ error: "Response for frustration text is too long (Max 5000 characters)." }, { status: 400 });
    }

    // Optional Question 7: Useful Part (Max length 5000)
    if (usefulPart && typeof usefulPart === 'string' && usefulPart.length > 5000) {
      return NextResponse.json({ error: "Response for useful features text is too long (Max 5000 characters)." }, { status: 400 });
    }

    // Optional Question 8: Missing Feature (Max length 5000)
    if (missingFeature && typeof missingFeature === 'string' && missingFeature.length > 5000) {
      return NextResponse.json({ error: "Response for missing feature text is too long (Max 5000 characters)." }, { status: 400 });
    }

    // Question 9: Regular Use (Predefined options) - Required
    if (!regularUse || !VALID_REGULAR_USE.includes(regularUse)) {
      return NextResponse.json({ error: "Invalid response for regular use question." }, { status: 400 });
    }

    // Optional Question 10: Miss Most (Max length 5000)
    if (missMost && typeof missMost === 'string' && missMost.length > 5000) {
      return NextResponse.json({ error: "Response for miss most text is too long (Max 5000 characters)." }, { status: 400 });
    }

    // Optional Question 11: Recommendation Score (0-10)
    let parsedRecScore = null;
    if (recommendationScore !== undefined && recommendationScore !== null && recommendationScore !== '') {
      parsedRecScore = parseInt(recommendationScore, 10);
      if (isNaN(parsedRecScore) || parsedRecScore < 0 || parsedRecScore > 10) {
        return NextResponse.json({ error: "Recommendation score must be a value between 0 and 10." }, { status: 400 });
      }
    }

    // Optional Question 12: Additional Feedback (Max length 5000)
    if (additionalFeedback && typeof additionalFeedback === 'string' && additionalFeedback.length > 5000) {
      return NextResponse.json({ error: "Response for additional feedback text is too long (Max 5000 characters)." }, { status: 400 });
    }

    // Route validation (Max length 500)
    if (route && typeof route === 'string' && route.length > 500) {
      return NextResponse.json({ error: "Route context is too long (Max 500 characters)." }, { status: 400 });
    }

    // 4. Create and store feedback entry
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        rating: parsedRating,
        clarity,
        workflowUnderstanding,
        featuresUsed,
        confusion: confusion || null,
        frustration: frustration || null,
        usefulPart: usefulPart || null,
        missingFeature: missingFeature || null,
        regularUse,
        missMost: missMost || null,
        recommendationScore: parsedRecScore,
        additionalFeedback: additionalFeedback || null,
        route: route || "Settings",
      }
    });

    return NextResponse.json({ success: true, id: feedback.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
