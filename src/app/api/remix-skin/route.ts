import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "STABILITY_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const { prompt, imageBase64, bodyType } = await req.json();
  if (!prompt || !imageBase64) {
    return NextResponse.json(
      { error: "prompt and imageBase64 are required." },
      { status: 400 }
    );
  }

  const skinTypeHint =
    bodyType === "slim"
      ? "Alex model (slim arms)"
      : "Steve model (classic arms)";

  const fullPrompt = [
    `Restyle this Minecraft character skin as: ${prompt}.`,
    `${skinTypeHint}, 64x64 pixel art texture,`,
    `maintain the UV sprite sheet layout, pixel art style,`,
    `vibrant colours, no background`,
  ].join(" ");

  try {
    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");
    const imageBlob = new Blob([imageBuffer], { type: "image/png" });

    const formData = new FormData();
    formData.append("image", imageBlob, "skin.png");
    formData.append("prompt", fullPrompt);
    formData.append("output_format", "png");
    formData.append("mode", "image-to-image");
    formData.append("strength", "0.75");

    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/sd3",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "image/*",
        },
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

    const resultBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(resultBuffer).toString("base64");
    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64}`,
    });
  } catch (err) {
    console.error("remix-skin error:", err);
    return NextResponse.json(
      { error: "Failed to remix skin." },
      { status: 500 }
    );
  }
}
