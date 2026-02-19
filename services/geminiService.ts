import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

const BFF_ENDPOINT = '/api/gemini';

/**
 * 场景矩阵分发器：针对不同商业平台进行审美注入
 */
function buildScenarioPrompt(
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig
): string {
  // 核心场景指令字典 - 注入平台专属审美 (Platform-Specific Aesthetics)
  const scenarioMatrix: Record<string, string> = {
    [ScenarioType.PLATFORM_MAIN_DETAIL]: `
      Role: Professional E-commerce Studio Set Designer. 
      Platform Aesthetic: Taobao/JD High-conversion Main Image. 
      Technique: Professional e-commerce studio setting. A clean, minimalist acrylic or matte display pedestal. 
      Lighting: Softbox 3-point lighting. Clean gradient background. 
      Focus: 50mm lens perspective. High contrast and highly commercial. 
      MANDATE: The center stage MUST BE COMPLETELY EMPTY. No product or objects allowed.`,

    [ScenarioType.BUYER_SHOW]: `
      Role: Aesthetic Lifestyle Content Creator. 
      Platform Aesthetic: Xiaohongshu (Little Red Book) / UGC Review. 
      Environment: A cozy wooden coffee table or textured linen cloth in a cozy sunlit room. 
      Lighting: Natural dappled window light coming from the side. Warm, inviting color grading. 
      Focus: 35mm lens with beautiful bokeh in the background. Ultra-authentic, slightly casual room environment.
      MANDATE: Center surface must be clear and ready for product placement. No items on the table.`,

    [ScenarioType.MOMENTS_POSTER]: `
      Role: Social Media Art Director. 
      Platform Aesthetic: WeChat Moments Editorial Poster. 
      Composition: 9:16 vertical. Massive negative space at the top and bottom for text. 
      Environment: A highly textured surface (like dark marble or raw stone) at the bottom. 
      Lighting: Cinematic and moody lighting. Dramatic spotlighting on the empty surface. 
      MANDATE: No pre-rendered products. Only the atmospheric empty surface.`,

    [ScenarioType.LIVE_GREEN_SCREEN]: `
      Role: Virtual Studio Architect. 
      Platform Aesthetic: Professional Live Stream Backdrop. 
      Composition: 16:9 landscape. An expansive, luxurious room or high-end retail store. 
      Technique: Extremely shallow depth of field (f/1.2), making the entire background heavily blurred with beautiful bokeh. 
      MANDATE: Ensure the central platform or standing area is vacant and clean.`,

    [ScenarioType.MODEL_REPLACEMENT]: `
      Role: High-Fashion Editorial Scenographer. 
      Platform Aesthetic: Vogue / Fashion Brand Listing. 
      Environment: An empty high-fashion studio backdrop or an elegant outdoor architectural space. 
      Lighting: High-key fashion lighting with soft shadows.
      MANDATE: Provide environmental lighting only. No model or product in the scene.`,

    [ScenarioType.CROSS_BORDER_LOCAL]: `
      Role: International Brand Strategist. 
      Platform Aesthetic: Amazon / Global Marketplace Listing. 
      Environment: Modern Western minimalist interior or pure white infinity cove. 
      Surfaces: Scandinavian style (light oak wood or clean terrazzo). 
      Lighting: Bright, even daylight. Highly professional Amazon style.
      MANDATE: A clear, empty countertop or table surface.`,

    [ScenarioType.TEXT_EDIT_TRANSLATE]: `
      Role: Minimalist Interior Photographer. 
      Platform Aesthetic: Global Catalog Background.
      Task: Create a completely sterile, texture-rich background surface. 
      MANDATE: No items, no text, no distractions. Pure surface for translation overlay.`,

    [ScenarioType.LIVE_OVERLAY]: `
      Role: Tech UI/UX Visual Designer. 
      Platform Aesthetic: Interactive Live Stream UI. 
      Style: Empty glass platform with floating neon particles and tech-savvy glassmorphism elements. 
      MANDATE: Central stage must be empty and ready for dynamic content.`
  };

  // 综合组装指令集
  return `
    [ACTING ROLE]
    ${scenarioMatrix[scenario] || "Professional Commercial Background Designer"}

    [ENVIRONMENT CONTEXT]
    Product Context (for lighting match): ${analysis.productType}
    User Custom Intent: ${userIntent || "High-end, commercially viable lighting."}

    [CRITICAL MANDATE - EMPTY STAGE]
    !!! ABSOLUTELY CRITICAL: GENERATE THE BACKGROUND SCENE ONLY. 
    !!! DO NOT RENDER ANY PRODUCT, BOTTLE, BOX, OR ITEM ON THE MAIN SURFACE.
    !!! THE CENTER STAGE MUST BE 100% EMPTY AND VACANT. 
    The resulting image MUST BE A PURE VISUAL BACKGROUND (STAGE) WITHOUT ANY OBJECTS IN THE CENTER.

    [CRITICAL RESTRICTION - TYPOGRAPHY]
    !!! IMPORTANT: DO NOT RENDER ANY TEXT, LETTERS, OR CHARACTERS ON THE IMAGE.

    [TECHNICAL CONSTRAINTS]
    8k resolution, photorealistic, cinematic lighting, masterpiece, clean textures, no artifacts, physically accurate shadows for the environment.
  `.trim();
}

async function sendRequest(model: string, payload: any) {
  const response = await fetch(BFF_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, payload })
  });

  if (response.status === 429) {
    throw new Error("API 配额已耗尽，请稍后再试。");
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
 * 任务二：根据平台审美生成空背景舞台 (使用 Gemini 2.5 Flash Image)
 */
export async function generateScenarioImage(
  base64Images: string[],
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig
): Promise<string> {
  
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

  throw new Error("AI 引擎未返回图像数据，请稍后重试。");
}
