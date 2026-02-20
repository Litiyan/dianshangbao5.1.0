
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
  fontStyle?: FontStyle;
}

export interface MarketAnalysis {
  productType: string;
  targetAudience: string;
  sellingPoints: string[];
  suggestedPrompt: string;
  isApparel: boolean;
  perspective: string; // 基础透视描述
  lightingDirection: string; // 基础光源描述
  // 新增：物理逆向规格参数
  physicalSpecs: {
    cameraPerspective: string;  // 例如: "eye-level straight on", "45-degree top-down"
    lightingDirection: string;  // 例如: "soft light from top-left", "harsh front lighting"
    colorTemperature: string;   // 例如: "warm 3000k yellow", "cool 6500k natural daylight"
  };
}

export interface GeneratedImage {
  url: string;
  scenario: ScenarioType;
  platformName: string;
  description: string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
}
