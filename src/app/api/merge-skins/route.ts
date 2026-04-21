import { NextRequest, NextResponse } from "next/server";

/**
 * Merges two 64x64 skins server-side:
 * - outfit (body/arms/legs pixels) from skin A
 * - face from skin B (head region: x=8–15, y=8–15)
 *
 * Both inputs are base64-encoded PNG data URLs.
 * Returns a base64-encoded PNG data URL of the merged skin.
 *
 * Note: This uses pure pixel manipulation; no canvas API (server env).
 * We decode the PNG manually using raw pixel arrays passed from client.
 */
export async function POST(req: NextRequest) {
  const { pixelsA, pixelsB } = await req.json() as {
    pixelsA: number[];
    pixelsB: number[];
  };

  if (!pixelsA || !pixelsB) {
    return NextResponse.json(
      { error: "pixelsA and pixelsB (RGBA flat arrays) are required." },
      { status: 400 }
    );
  }

  const WIDTH = 64;
  const HEIGHT = 64;
  const SIZE = WIDTH * HEIGHT * 4;

  if (pixelsA.length !== SIZE || pixelsB.length !== SIZE) {
    return NextResponse.json(
      { error: "Each pixel array must be 64*64*4 = 16384 values." },
      { status: 400 }
    );
  }

  // Start with all of skin A
  const result = [...pixelsA];

  // Copy head face (x=8..15, y=8..15) from skin B
  for (let y = 8; y < 16; y++) {
    for (let x = 8; x < 16; x++) {
      const idx = (y * WIDTH + x) * 4;
      result[idx] = pixelsB[idx];
      result[idx + 1] = pixelsB[idx + 1];
      result[idx + 2] = pixelsB[idx + 2];
      result[idx + 3] = pixelsB[idx + 3];
    }
  }

  // Return flat RGBA array — client will re-render to canvas
  return NextResponse.json({ pixels: result });
}
