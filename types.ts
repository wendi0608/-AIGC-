export interface StylePreset {
  id: string;
  name: string;
  description: string;
  promptModifier: string; // Text to append/prepend
  thumbnail: string;
}

export interface GeneratedImage {
  id: string;
  data: string; // Base64
  prompt: string;
  timestamp: number;
  aspectRatio: string;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export type BrandTone = 'default' | 'minimalist' | 'luxury' | 'energetic' | 'corporate' | 'playful';

export interface GenerationConfig {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: AspectRatio;
  styleId: string;
  referenceImage?: string; // Base64
}

export enum AppState {
  IDLE,
  GENERATING,
  SUCCESS,
  ERROR
}