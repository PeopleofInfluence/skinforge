import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const stabilityKey = process.env.STABILITY_API_KEY;

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to generate skins." }, { status: 401 });
  }

  // Atomically decrement one credit — returns remaining count, null if none left
  const { data: creditsRemaining, error: creditError } = await supabase.rpc("use_ai_credit");
  if (creditError) {
    console.error("Credit check error:", creditError);
    return NextResponse.json({ error: "Failed to check credits." }, { status: 500 });
  }
  if (creditsRemaining === null) {
    return NextResponse.json(
      { error: "No credits remaining. Purchase more to continue generating." },
      { status: 402 },
    );
  }

  const { prompt, bodyType } = await req.json();
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  if (!stabilityKey) {
    return NextResponse.json(
      { error: "No API key configured. Add STABILITY_API_KEY to .env.local" },
      { status: 500 },
    );
  }

  const result = await generateWithStability(prompt, bodyType, stabilityKey);
  if (!result.ok) return result;

  // Attach remaining credits to successful response so frontend can update its counter
  const body = await result.json();
  return NextResponse.json({ ...body, creditsRemaining });
}

async function generateWithStability(prompt: string, bodyType: string, apiKey: string) {
  const skinTypeHint = bodyType === "slim" ? "Alex slim arms" : "Steve classic arms";

  const fullPrompt = [
    `minecraft pixel art skin, ${prompt},`,
    `${skinTypeHint}, 2D flat sprite,`,
    `pixel art style, retro game character,`,
    `solid block colours, sharp pixel edges,`,
    `no background, transparent background`,
  ].join(" ");

  const negativePrompt = [
    "3D, realistic, photograph, blurry, smooth,",
    "gradient, shadow, lighting, render, CGI,",
    "text, watermark, border, frame",
  ].join(" ");

  try {
    const formData = new FormData();
    formData.append("prompt", fullPrompt);
    formData.append("negative_prompt", negativePrompt);
    formData.append("output_format", "png");
    formData.append("width", "512");
    formData.append("height", "512");
    formData.append("steps", "40");
    formData.append("cfg_scale", "10");

    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/sd3",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
        body: formData,
      },
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Stability AI error ${response.status}: ${text}` },
        { status: response.status },
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");
    return NextResponse.json({ imageUrl: `data:image/png;base64,${base64}` });
  } catch (err) {
    console.error("Stability error:", err);
    return NextResponse.json({ error: "Failed to generate skin." }, { status: 500 });
  }
}
