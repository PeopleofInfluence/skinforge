export type BodyType = "classic" | "slim";

export type LayerName =
  | "head"
  | "body"
  | "rightArm"
  | "leftArm"
  | "rightLeg"
  | "leftLeg"
  | "headOuter"
  | "bodyOuter"
  | "rightArmOuter"
  | "leftArmOuter"
  | "rightLegOuter"
  | "leftLegOuter";

export interface Layer {
  name: LayerName;
  label: string;
  visible: boolean;
  locked: boolean;
}

export type Tool = "pencil" | "eraser" | "fill" | "eyedropper" | "select";

export interface SkinData {
  id: string;
  name: string;
  tags: string[];
  pixels: string; // base64 encoded 64x64 RGBA pixel data
  bodyType: BodyType;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  previewUrl?: string;
}

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  bodyType: BodyType;
  timestamp: string;
  resultUrl?: string;
}

export interface EditorState {
  tool: Tool;
  color: string;
  zoom: number;
  activeLayer: LayerName;
  layers: Layer[];
  bodyType: BodyType;
  showGrid: boolean;
}

export interface HistoryEntry {
  pixels: ImageData;
  description: string;
}

export type AnimationType = "idle" | "walk" | "run";

export interface PreviewSettings {
  bodyType: BodyType;
  animation: AnimationType;
  rotating: boolean;
}
