import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

const BFF_ENDPOINT = '/api/gemini';

/**
 * 场景矩阵分发器：构造专业商业视觉指令
 */
function buildScenarioPrompt(
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig
): string {
  // 核心场景指令库
  const scenarioMatrix: Record<string, string> = {
    [ScenarioType.PLATFORM_MAIN_DETAIL]: `
      Role: Top-tier Commercial Still-life Photographer. 
      Technique: 50mm lens, sharp focus on the product, f/8 aperture for deep depth of field. 
      Lighting: Professional studio 3-point lighting (key, fill, and back lights). 
      Background: Clean, minimalist background (subtle gradient or soft reflection) that creates zero distraction. 
      Vibe: High-conversion Taobao/JD style, premium texture, crisp details.`,

    [ScenarioType.BUYER_SHOW]: `
      Role: Real consumer posting a social media review. 
      Technique: Shot on iPhone 15 Pro, handheld, slightly imperfect but aesthetic composition. 
      Lighting: Natural indoor room lighting with soft window light, no professional studio lights. 
      Environment: Casual lifestyle setting (e.g., real living room, a genuine wooden desk with minor everyday items). 
      Vibe: UGC (User Generated Content) style, ultra-authentic, relatable, high trust factor.`,

    [ScenarioType.MOMENTS_POSTER]: `
      Role: High-end Social Media Art Director. 
      Composition: 9:16 vertical. Heavy use of negative space (deliberate empty space) at the top or bottom for typography placement. 
      Technique: 35mm lens for wide lifestyle impact. 
      Vibe: Emotional, cinematic color grading, 'Instaworthy' aesthetic, soft shadows, airy and premium feel.`,

    [ScenarioType.LIVE_GREEN_SCREEN]: `
      Role: Virtual Production Set Designer. 
      Technique: Extremely shallow depth of field (f/1.2) creating heavy bokeh blur for the background. 
      Context: This is a backdrop for a professional live streamer. 
      Setting: Luxurious showroom or futuristic high-tech studio matching the product's identity. 
      Lighting: Even, soft ambient glow, consistent perspective with the product.`,

    [ScenarioType.MODEL_REPLACEMENT]: `
      Role: Vogue Fashion Photographer. 
      Technique: High-fashion portraiture. Focus on photorealistic human model features. 
      Skin: Emphasize extremely realistic skin texture (micro-pores, natural subsurface scattering, peach fuzz). 
      Vibe: High-end lifestyle, diverse and authentic facial features, anti-uncanny valley, masterpiece quality.`,

    [ScenarioType.CROSS_BORDER_LOCAL]: `
      Role: International Brand Strategist. 
      Context: Localize for global markets (Amazon/Shopee). 
      Environment: Local authentic architecture and lifestyle decor matching Western or SEA demographics. 
      Lighting: Bright, sunny, high-key commercial lighting popular in international e-commerce.`,

    [ScenarioType.TEXT_EDIT_TRANSLATE]: `
      Role: Graphic Design Master. 
      Task: Remove all messy or foreign text from the original product. 
      Layout: Optimize product placement to allow for clean, bilingual typography. 
      Vibe: Modern Swiss-design style, clean lines, high legibility.`,

    [ScenarioType.LIVE_OVERLAY]: `
      Role: UI/UX Live Broadcast Designer. 
      Style: Semi-transparent technological glassmorphism. 
      Features: Neon accents, placeholder spaces for branding, interactive UI elements integrated into the 3D space. 
      Lighting: Dynamic, vibrant studio colors.`
  };

  // 组装最终指令
  return `
    [ACTING ROLE]
    ${scenarioMatrix[scenario] || "Senior Commercial Photographer"}

    [PRODUCT CONTEXT]
    Product Type: ${analysis.productType}
    Core Selling Points: ${analysis.sellingPoints.join(', ')}
    AI Suggested Style: ${analysis.suggestedPrompt}

    [USER SPECIFIC INTENT]
    ${userIntent || "Optimize for maximum commercial conversion."}

    [TYPOGRAPHY INTEGRATION]
    Planned Text: Title "${textConfig.title}", Details "${textConfig.detail}". 
    Instruction: Preserve spatial depth. Integrate text fields into the visual hierarchy without overlapping key product features.

    [TECHNICAL CONSTRAINTS]
    Quality: 8k resolution, photorealistic, cinematic commercial lighting, masterpiece, no distorted textures, correct physical shadows.
  `.trim();
}

/**
 * 通用请求分发器
 */
async function sendRequest(model: string, payload: any) {
  const response = await fetch(BFF_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, payload })
  });

  if (response.status === 429) {
    throw new Error("API 配额已耗尽，请确保 Cloudflare 后端已正确配置付费项目或稍后再试。");
  }

  const data = await response.json();
  if (data.error) throw new Error(data.message || "AI 引擎响应错误");
  return data;
}

/**
 * 任务一：产品视觉深度分析 (使用 Gemini 3 Flash)
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  const payload = {
    contents: [{
      parts: [
        ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
        { text: "Analyze these product images. Output ONLY a JSON object: {productType, targetAudience, sellingPoints[], suggestedPrompt, isApparel:boolean}." }
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const result = await sendRequest('gemini-3-flash-preview', payload);
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  
  try {
    return JSON.parse(text);
  } catch (e) {
    return {
      productType: "Commercial Product",
      targetAudience: "Global Consumers",
      sellingPoints: ["Quality Manufacturing"],
      suggestedPrompt: "professional studio photography",
      isApparel: false
    };
  }
}

/**
 * 任务二：商业场景重构生图 (使用 Gemini 2.5 Flash Image)
 */
export async function generateScenarioImage(
  base64Images: string[],
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig
): Promise<string> {
  
  // 使用场景矩阵构造高度专业化的 Prompt
  const finalPrompt = buildScenarioPrompt(scenario, analysis, userIntent, textConfig);

  const ratioMap: Record<string, string> = {
    [ScenarioType.MOMENTS_POSTER]: "9:16",
    [ScenarioType.LIVE_OVERLAY]: "16:9",
    [ScenarioType.LIVE_GREEN_SCREEN]: "16:9",
    [ScenarioType.MODEL_REPLACEMENT]: "3:4",
    [ScenarioType.BUYER_SHOW]: "3:4",
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "1:1"
  };

  const payload = {
    contents: [{
      parts: [
        ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
        { text: finalPrompt }
      ]
    }],
    generationConfig: {
      imageConfig: {
        aspectRatio: ratioMap[scenario] || "1:1"
      }
    }
  };

  const result = await sendRequest('gemini-2.5-flash-image', payload);
  
  const parts = result.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("AI 引擎未返回图像数据，请尝试调整意图描述或更换更清晰的素材。");
}
