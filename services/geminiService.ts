import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

const BFF_ENDPOINT = '/api/gemini';

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
    throw new Error("API 配额已耗尽或请求频率过快，请检查 Cloudflare 绑定状态。");
  }

  const data = await response.json();
  if (data.error) throw new Error(data.message || "请求 AI 服务时发生未知错误");
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
        { text: "Role: Senior E-commerce Visual Expert. Task: Analyze the provided product images and output a STRICT JSON object with these keys: productType, targetAudience, sellingPoints (array), suggestedPrompt (English description for AI generation), isApparel (boolean)." }
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
    console.error("JSON Parse Error on Analysis:", e);
    return {
      productType: "Ecommerce Product",
      targetAudience: "Global Consumers",
      sellingPoints: ["High Quality", "Professional Design"],
      suggestedPrompt: "professional studio product photography, clean background",
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
  
  // 场景映射与专业 Prompt 构造
  const scenarioPrompts: Record<string, string> = {
    [ScenarioType.CROSS_BORDER_LOCAL]: "Place the product in an authentic local lifestyle environment relative to international markets (Amazon/Shopee style). Localized decor and lighting.",
    [ScenarioType.TEXT_EDIT_TRANSLATE]: "Clear any existing messy text. Prepare spaces for professional typography. High-end graphic design layout.",
    [ScenarioType.MODEL_REPLACEMENT]: "Replace original model with a high-fashion human model matching diverse global demographics. Photorealistic skin textures.",
    [ScenarioType.MOMENTS_POSTER]: "High-impact social media marketing layout. 9:16 vertical composition. Bold visual hierarchy.",
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "Clean, high-conversion studio photography for Taobao/JD. Soft professional shadows, premium texture.",
    [ScenarioType.BUYER_SHOW]: "Realistic home-style snap-shot lighting. Natural environment, casual but aesthetic composition.",
    [ScenarioType.LIVE_OVERLAY]: "Technological futuristic overlay design. Translucent elements, branding space, neon accents.",
    [ScenarioType.LIVE_GREEN_SCREEN]: "Ultra-HD virtual studio background. Consistent perspective with product. Depth of field."
  };

  const ratioMap: Record<string, string> = {
    [ScenarioType.MOMENTS_POSTER]: "9:16",
    [ScenarioType.LIVE_OVERLAY]: "16:9",
    [ScenarioType.LIVE_GREEN_SCREEN]: "16:9",
    [ScenarioType.MODEL_REPLACEMENT]: "3:4",
    [ScenarioType.BUYER_SHOW]: "3:4",
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "1:1"
  };

  const systemPrompt = `Role: World-Class Commercial Photographer & Visual Artist.
Task: Reconstruct the product visual for [${scenario}].
Scenario Context: ${scenarioPrompts[scenario] || ""}
Product Intelligence: ${analysis.productType}, Selling points: ${analysis.sellingPoints.join(', ')}.
User Custom Intent: ${userIntent || "Enhance commercial value"}.
Typography Request: Title "${textConfig.title || ""}", Detail "${textConfig.detail || ""}". Integrate text seamlessly into the visual hierarchy.
Final Output: 8k resolution, cinematic commercial lighting, masterpiece quality.`;

  const payload = {
    contents: [{
      parts: [
        ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
        { text: systemPrompt }
      ]
    }],
    generationConfig: {
      imageConfig: {
        aspectRatio: ratioMap[scenario] || "1:1"
      }
    }
  };

  const result = await sendRequest('gemini-2.5-flash-image', payload);
  
  // 遍历寻找图像 Part
  const parts = result.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("模型响应成功，但未包含图像数据。请尝试简化提示词或检查素材质量。");
}