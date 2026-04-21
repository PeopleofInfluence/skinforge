import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const stabilityKey = process.env.STABILITY_API_KEY;

  const { prompt, bodyType } = await req.json();
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  if (stabilityKey) {
    return generateWithStability(prompt, bodyType, stabilityKey);
  }

  return NextResponse.json(
    { error: "No API key configured. Add STABILITY_API_KEY to .env.local" },
    { status: 500 }
  );
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
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Stability AI error ${response.status}: ${text}` },
        { status: response.status }
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
