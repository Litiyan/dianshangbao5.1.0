
import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

const API_ENDPOINT = '/api/gemini';

/**
 * 统一 BFF 调用接口
 */
async function callGeminiBff(payload: any) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({ error: "RESPONSE_NOT_JSON" }));
    if (!response.ok) {
      throw new Error(data.message || (data.error && data.error.message) || `请求失败: ${response.status}`);
    }
    return data;
  } catch (error: any) {
    console.error("BFF 调用错误:", error);
    throw error;
  }
}

/**
 * 1. 深度分析多图产品 DNA (使用 Gemini 3 Flash)
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  const modelName = 'gemini-3-flash-preview'; 
  const imageParts = base64Images.map(img => ({
    inlineData: { data: img, mimeType: 'image/png' }
  }));
  
  const systemPrompt = `你是一名资深电商视觉专家和市场分析师。
  请根据提供的【多角度】产品图片（包含细节、包装、多视角），进行深度分析。
  必须输出纯 JSON 格式（不要包含 markdown 代码块标签）: 
  { 
    "productType": "产品名称", 
    "targetAudience": "核心受众描述", 
    "sellingPoints": ["卖点1", "卖点2", "卖点3"], 
    "suggestedPrompt": "核心视觉风格建议", 
    "isApparel": true/false 
  }`;

  const payload = {
    model: modelName,
    contents: { parts: [...imageParts, { text: systemPrompt }] },
    config: { responseMimeType: "application/json" }
  };

  const result = await callGeminiBff(payload);
  let rawText = result.text || "";
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson) as MarketAnalysis;
}

/**
 * 2. 核心场景重构引擎 (使用 Gemini 2.5 Flash Image)
 */
export async function generateScenarioImage(
  base64Images: string[],
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig,
  modelNationality: string = ""
): Promise<string> {
  const modelName = 'gemini-2.5-flash-image';
  const imageParts = base64Images.map(img => ({
    inlineData: { data: img, mimeType: 'image/png' }
  }));

  // 场景特化指令集
  const scenarioPrompts: Record<ScenarioType, string> = {
    [ScenarioType.CROSS_BORDER_LOCAL]: "Create a high-end commercial photo for international markets (Amazon/eBay). The background and lighting must feel authentic to Western or specific local aesthetics. Clean, professional, and trustworthy.",
    [ScenarioType.TEXT_EDIT_TRANSLATE]: "Erase ALL existing labels or text on the product. Replace with high-quality digital printing of new text. The background should be a modern studio setup.",
    [ScenarioType.MODEL_REPLACEMENT]: `A professional ${modelNationality || 'global'} model interacting naturally with the product. High fashion photography style, focus on the product, realistic skin textures.`,
    [ScenarioType.MOMENTS_POSTER]: "9:16 vertical poster design. Apply 'Marketing Sticker' style (牛皮癣式营销). Use bold colors, promotional icons, and high-impact visual hierarchy. Very attention-grabbing for social media feed.",
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "1:1 Taobao/JD professional main image. Commercial studio softbox lighting. High contrast, sharp details. Centered composition.",
    [ScenarioType.BUYER_SHOW]: "Simulate a high-quality user-generated photo. Shot with a modern smartphone in a cozy home environment. Natural window light, slightly messy but aesthetically pleasing background. Real shadows.",
    [ScenarioType.LIVE_OVERLAY]: "16:9 landscape layout. Product placed on the right or left third. Leave clear center-middle space for a live streamer. Add glowing edge effects or brand overlays.",
    [ScenarioType.LIVE_GREEN_SCREEN]: "16:9 ultra-high definition virtual background. A futuristic or luxury minimalist showroom. Deep bokeh effect. Optimized for real-time video keying."
  };

  const typographyInstruction = (textConfig.title || textConfig.detail) ? `
    DYNAMIC TYPOGRAPHY MANDATE:
    1. Overlay Title: "${textConfig.title}" (Use bold, premium commercial typography)
    2. Detail Caption: "${textConfig.detail}" (Use clean, readable graphic design layout)
    3. Position the text artistically to avoid covering the core product features.
  ` : "No text overlay needed.";

  const finalPrompt = `
    CORE TASK: Reconstruct the product into a ${scenario} scenario.
    USER CREATIVE INTENT: ${userIntent}.
    SCENARIO DIRECTIVES: ${scenarioPrompts[scenario]}.
    PRODUCT CONTEXT: ${analysis.productType} featuring ${analysis.sellingPoints.join(', ')}.
    ${typographyInstruction}
    VISUAL QUALITY: 8k resolution, cinematic lighting, photorealistic materials. 
    IMPORTANT: Strictly preserve the product's 3D geometry and details from the provided multi-angle references. Remove original background completely.
  `;

  // 比例映射
  const ratioMap: Record<string, string> = {
    [ScenarioType.MOMENTS_POSTER]: "9:16",
    [ScenarioType.LIVE_OVERLAY]: "16:9",
    [ScenarioType.LIVE_GREEN_SCREEN]: "16:9",
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "1:1",
    [ScenarioType.CROSS_BORDER_LOCAL]: "1:1",
    [ScenarioType.TEXT_EDIT_TRANSLATE]: "1:1",
    [ScenarioType.MODEL_REPLACEMENT]: "3:4",
    [ScenarioType.BUYER_SHOW]: "3:4"
  };

  const payload = {
    model: modelName,
    contents: { parts: [...imageParts, { text: finalPrompt }] },
    config: { 
      imageConfig: { 
        aspectRatio: (ratioMap[scenario] || "1:1") as any
      }
    }
  };

  const result = await callGeminiBff(payload);
  const imgPart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  const imgData = imgPart?.inlineData?.data;
  
  if (!imgData) throw new Error("AI 渲染引擎返回异常，请稍后重试。");
  return `data:image/png;base64,${imgData}`;
}
