
export enum ScenarioType {
  CROSS_BORDER_LOCAL = 'CROSS_BORDER_LOCAL',
  TEXT_EDIT_TRANSLATE = 'TEXT_EDIT_TRANSLATE',
  MODEL_REPLACEMENT = 'MODEL_REPLACEMENT',
  MOMENTS_POSTER = 'MOMENTS_POSTER',
  PLATFORM_MAIN_DETAIL = 'PLATFORM_MAIN_DETAIL',
  BUYER_SHOW = 'BUYER_SHOW',
  LIVE_OVERLAY = 'LIVE_OVERLAY',
  LIVE_GREEN_SCREEN = 'LIVE_GREEN_SCREEN'
}

export type GenerationMode = 'precision' | 'creative';
export type FontStyle = 'modern' | 'elegant' | 'calligraphy' | 'playful';

export interface TextConfig {
  title: string;
  detail: string;
  isEnabled?: boolean;
  fontStyle?: FontStyle; // 新增：排版风格
}

export interface MarketAnalysis {
  productType: string;
  targetAudience: string;
  sellingPoints: string[];
  suggestedPrompt: string;
  isApparel: boolean;
  perspective: string;
  lightingDirection: string;
}

export interface GeneratedImage {
  url: string;
  scenario: ScenarioType;
  platformName: string;
  description: string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
}
