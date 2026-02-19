import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

const BFF_ENDPOINT = '/api/gemini';

/**
 * 场景矩阵分发器：环境感知版
 */
function buildScenarioPrompt(
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig
): string {
  const scenarioMatrix: Record<string, string> = {
    [ScenarioType.PLATFORM_MAIN_DETAIL]: `Professional Studio Set. Clean pedestal. Softbox lighting. High contrast.`,
    [ScenarioType.BUYER_SHOW]: `Lifestyle setting. Cozy wooden table or linen. Natural dapple light.`,
    [ScenarioType.MOMENTS_POSTER]: `9:16 vertical. Massive negative space. Cinematic moody spotlighting.`,
    [ScenarioType.LIVE_GREEN_SCREEN]: `16:9 landscape. Luxurious showroom. f/1.2 deep bokeh blur.`,
    [ScenarioType.MODEL_REPLACEMENT]: `Fashion studio backdrop. High-key lighting. Elegant architectural space.`,
    [ScenarioType.CROSS_BORDER_LOCAL]: `Modern Western minimalist interior. Bright even daylight. light oak wood.`,
    [ScenarioType.TEXT_EDIT_TRANSLATE]: `Completely sterile background surface. No items or text.`,
    [ScenarioType.LIVE_OVERLAY]: `Empty glass platform with floating neon particles. Tech-savvy glassmorphism.`
  };

  return `
    [ACTING ROLE]
    Senior Commercial Scenographer & Lighting Director.

    [ENVIRONMENT CONTEXT]
    Product: ${analysis.productType}
    Platform Aesthetic: ${scenario}

    [CRITICAL PHYSICAL MATCHING]
    - PERSPECTIVE: The background stage MUST match a [${analysis.perspective}] camera angle.
    - LIGHTING DIRECTION: The primary light source MUST come from [${analysis.lightingDirection}].
    - CONSISTENCY: Shadows on the background must logically align with a light source from ${analysis.lightingDirection}.

    [USER INTENT]
    ${userIntent || "High-end commercial quality."}

    [CRITICAL MANDATE - EMPTY STAGE]
    !!! GENERATE THE BACKGROUND SCENE ONLY. CENTER STAGE MUST BE 100% EMPTY AND VACANT. NO OBJECTS.
    !!! DO NOT RENDER ANY TEXT OR CHARACTERS.

    [TECHNICAL]
    8k, photorealistic, cinematic, masterpiece.
  `.trim();
}

async function sendRequest(model: string, payload: any) {
  const response = await fetch(BFF_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, payload })
  });
  if (!response.ok) throw new Error("API Request Failed");
  return await response.json();
}

/**
 * 视觉深度分析：新增透视与光源提取
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  const payload = {
    contents: [{
      parts: [
        ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
        { text: "Analyze this product. Output JSON: {productType, targetAudience, sellingPoints[], suggestedPrompt, isApparel, perspective, lightingDirection}. \n'perspective' should be specific (e.g. 'Eye-level straight', 'High angle 45-degree'). \n'lightingDirection' should be from object perspective (e.g. 'Top-Left', 'Front', 'Back')." }
      ]
    }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const result = await sendRequest('gemini-3-flash-preview', payload);
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  
  try {
    const data = JSON.parse(text);
    return {
      ...data,
      perspective: data.perspective || "Eye-level",
      lightingDirection: data.lightingDirection || "Top-Left"
    };
  } catch (e) {
    return {
      productType: "Product", targetAudience: "Consumers", sellingPoints: [], suggestedPrompt: "", isApparel: false,
      perspective: "Eye-level", lightingDirection: "Top-Left"
    };
  }
}

export async function generateScenarioImage(
  base64Images: string[],
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig
): Promise<string> {
  const finalPrompt = buildScenarioPrompt(scenario, analysis, userIntent, textConfig);
  const ratioMap: any = { [ScenarioType.MOMENTS_POSTER]: "9:16", [ScenarioType.LIVE_OVERLAY]: "16:9", [ScenarioType.LIVE_GREEN_SCREEN]: "16:9" };

  const payload = {
    contents: [{ parts: [...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })), { text: finalPrompt }] }],
    generationConfig: { imageConfig: { aspectRatio: ratioMap[scenario] || "1:1" } }
  };

  const result = await sendRequest('gemini-2.5-flash-image', payload);
  const part = result.candidates?.[0]?.content?.parts.find((p: any) => p.inlineData);
  if (part) return `data:image/png;base64,${part.inlineData.data}`;
  throw new Error("No image returned");
}
