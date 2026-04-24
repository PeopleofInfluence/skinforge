/**
 * Minecraft 64x64 skin UV layout utilities.
 * All coordinates are in pixels on the 64x64 texture.
 *
 * Layout reference (modern format, since 1.8):
 *
 *  Head (8,8)–(16,16) front face
 *  Head outer (40,8)–(48,16) front face
 *  Body (20,20)–(28,32) front
 *  Body outer (20,36)–(28,48) front
 *  Right arm (44,20)–(48,32) front [classic: 4px wide, slim: 3px]
 *  Left arm (36,52)–(40,64) front [classic: 4px wide, slim: 3px]
 *  Right arm outer (44,36)–(48,48) front
 *  Left arm outer (52,52)–(56,64) front
 *  Right leg (4,20)–(8,32) front
 *  Left leg (20,52)–(24,64) front
 *  Right leg outer (4,36)–(8,48) front
 *  Left leg outer (4,52)–(8,64) front
 */

export interface UVRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Returns the primary front-face UV rect for each part
export function getLayerUV(
  layer: string,
  bodyType: "classic" | "slim" = "classic"
): UVRect {
  const armWidth = bodyType === "slim" ? 3 : 4;

  const uvMap: Record<string, UVRect> = {
    head: { x: 8, y: 8, w: 8, h: 8 },
    headOuter: { x: 40, y: 8, w: 8, h: 8 },
    body: { x: 20, y: 20, w: 8, h: 12 },
    bodyOuter: { x: 20, y: 36, w: 8, h: 12 },
    rightArm: { x: 44, y: 20, w: armWidth, h: 12 },
    rightArmOuter: { x: 44, y: 36, w: armWidth, h: 12 },
    leftArm: { x: 36, y: 52, w: armWidth, h: 12 },
    leftArmOuter: { x: 52, y: 52, w: armWidth, h: 12 },
    rightLeg: { x: 4, y: 20, w: 4, h: 12 },
    rightLegOuter: { x: 4, y: 36, w: 4, h: 12 },
    leftLeg: { x: 20, y: 52, w: 4, h: 12 },
    leftLegOuter: { x: 4, y: 52, w: 4, h: 12 },
  };

  return uvMap[layer] ?? { x: 0, y: 0, w: 8, h: 8 };
}

export const SKIN_WIDTH = 64;
export const SKIN_HEIGHT = 64;

/** Convert a 64x64 canvas to a PNG data URL */
export function canvasToPng(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/** Load a PNG data URL or File into a 64x64 ImageData */
export async function loadSkinImageData(
  source: string | File
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = SKIN_WIDTH;
      canvas.height = SKIN_HEIGHT;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, SKIN_WIDTH, SKIN_HEIGHT);
      ctx.drawImage(img, 0, 0, SKIN_WIDTH, SKIN_HEIGHT);
      resolve(ctx.getImageData(0, 0, SKIN_WIDTH, SKIN_HEIGHT));
    };
    img.onerror = reject;

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}

/** Merge two skins: take outfit (body/arms/legs) from src1, face from src2 */
export function mergeSkins(
  base: ImageData,
  overlay: ImageData
): ImageData {
  const result = new ImageData(SKIN_WIDTH, SKIN_HEIGHT);
  // Copy entire base skin first
  result.data.set(base.data);

  // Copy head region from overlay (face texture: x=8,y=8 to x=16,y=16)
  for (let y = 8; y < 16; y++) {
    for (let x = 8; x < 16; x++) {
      const idx = (y * SKIN_WIDTH + x) * 4;
      result.data[idx] = overlay.data[idx];
      result.data[idx + 1] = overlay.data[idx + 1];
      result.data[idx + 2] = overlay.data[idx + 2];
      result.data[idx + 3] = overlay.data[idx + 3];
    }
  }

  return result;
}

/** Create a blank (all transparent) 64x64 skin ImageData */
export function createBlankSkin(): ImageData {
  return new ImageData(SKIN_WIDTH, SKIN_HEIGHT);
}

/**
 * Post-processes an AI-generated skin by spreading colors from painted pixels
 * into adjacent near-black (unfilled) pixels. Runs multiple passes so it fills
 * the narrow side/back face strips that the AI typically leaves black.
 *
 * Only touches pixels that are near-pure-black with full opacity (the AI's
 * "I didn't paint here" default). Transparent pixels are left alone.
 */
export function fixAISkinBlackSides(imageData: ImageData): ImageData {
  const w = imageData.width;
  const h = imageData.height;
  let data = new Uint8ClampedArray(imageData.data);

  const isUnfilled = (d: Uint8ClampedArray, idx: number) =>
    d[idx] < 25 && d[idx + 1] < 25 && d[idx + 2] < 25 && d[idx + 3] > 200;

  // Up to 30 passes — enough to fill a ~15px wide solid-black strip from both sides
  for (let pass = 0; pass < 30; pass++) {
    const next = new Uint8ClampedArray(data);
    let changed = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (!isUnfilled(data, idx)) continue;

        // Average all 8 non-black opaque neighbours
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const nidx = (ny * w + nx) * 4;
            if (!isUnfilled(data, nidx) && data[nidx + 3] > 200) {
              rSum += data[nidx];
              gSum += data[nidx + 1];
              bSum += data[nidx + 2];
              count++;
            }
          }
        }

        if (count > 0) {
          next[idx]     = Math.round(rSum / count);
          next[idx + 1] = Math.round(gSum / count);
          next[idx + 2] = Math.round(bSum / count);
          next[idx + 3] = 255;
          changed = true;
        }
      }
    }

    data = next;
    if (!changed) break; // nothing left to fill
  }

  return new ImageData(data, w, h);
}

/**
 * Returns a copy of the ImageData with all outer layer (jacket/hat/sleeve)
 * pixel regions cleared to transparent. Used to hide the outer layer in the
 * 3D viewer without relying on skinview3d mesh visibility APIs.
 *
 * Outer layer UV regions (64×64 modern skin format):
 *   Hat        x=32..63  y=0..15
 *   R-leg-out  x=0..15   y=32..47
 *   Body-out   x=16..31  y=32..47
 *   R-arm-out  x=40..55  y=32..47
 *   L-leg-out  x=0..15   y=48..63
 *   L-arm-out  x=48..63  y=48..63
 */
export function stripOuterLayer(src: ImageData): ImageData {
  const copy = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const w = src.width;
  const regions = [
    { x: 32, y: 0,  w: 32, h: 16 }, // hat / head outer
    { x: 0,  y: 32, w: 16, h: 16 }, // right leg outer
    { x: 16, y: 32, w: 16, h: 16 }, // body outer (jacket)
    { x: 40, y: 32, w: 16, h: 16 }, // right arm outer (sleeve)
    { x: 0,  y: 48, w: 16, h: 16 }, // left leg outer
    { x: 48, y: 48, w: 16, h: 16 }, // left arm outer (sleeve)
  ];
  for (const r of regions) {
    for (let py = r.y; py < r.y + r.h && py < src.height; py++) {
      for (let px = r.x; px < r.x + r.w && px < w; px++) {
        const idx = (py * w + px) * 4;
        copy.data[idx] = 0;
        copy.data[idx + 1] = 0;
        copy.data[idx + 2] = 0;
        copy.data[idx + 3] = 0;
      }
    }
  }
  return copy;
}

/** Flood fill algorithm for the paint bucket tool */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: [number, number, number, number]
): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  const startIdx = (startY * width + startX) * 4;
  const targetColor: [number, number, number, number] = [
    data[startIdx],
    data[startIdx + 1],
    data[startIdx + 2],
    data[startIdx + 3],
  ];

  // If target color equals fill color, nothing to do
  if (
    targetColor[0] === fillColor[0] &&
    targetColor[1] === fillColor[1] &&
    targetColor[2] === fillColor[2] &&
    targetColor[3] === fillColor[3]
  ) {
    return imageData;
  }

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<number>();

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const key = y * width + x;
    if (visited.has(key)) continue;
    visited.add(key);

    const idx = key * 4;
    if (
      data[idx] !== targetColor[0] ||
      data[idx + 1] !== targetColor[1] ||
      data[idx + 2] !== targetColor[2] ||
      data[idx + 3] !== targetColor[3]
    ) {
      continue;
    }

    data[idx] = fillColor[0];
    data[idx + 1] = fillColor[1];
    data[idx + 2] = fillColor[2];
    data[idx + 3] = fillColor[3];

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return new ImageData(data, width, height);
}

/** Parse a hex color string (#RRGGBB or #RRGGBBAA) to RGBA */
export function hexToRgba(hex: string): [number, number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const a = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}

/** Convert RGBA to hex */
export function rgbaToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
