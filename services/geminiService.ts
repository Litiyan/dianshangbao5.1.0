import { GoogleGenAI, Type } from "@google/genai";
import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

/**
 * 初始化客户端
 * 注：由于 vite.config.ts 的 define 配置，process.env.API_KEY 将在浏览器中可用
 */
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * 产品多维深度分析（使用 Gemini 3 Flash）
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
          { text: "作为电商专家，分析这些产品图。识别：产品类型、受众、核心卖点、是否为服装。并给出一个构思极佳的英语生图提示词。请返回 JSON。" }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productType: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            sellingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedPrompt: { type: Type.STRING },
            isApparel: { type: Type.BOOLEAN }
          },
          required: ["productType", "targetAudience", "sellingPoints", "suggestedPrompt", "isApparel"]
        }
      }
    });

    // 规范：使用 .text 属性而非方法
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    console.error("Analysis Error:", e);
    return {
      productType: "通用商品",
      targetAudience: "全网用户",
      sellingPoints: ["专业质感"],
      suggestedPrompt: "professional product photography, studio lighting",
      isApparel: false
    };
  }
}

/**
 * 视觉场景重构（使用 Gemini 2.5 Flash Image）
 */
export async function generateScenarioImage(
  base64Images: string[],
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig
): Promise<string> {
  const ai = getAIClient();
  
  const ratioMap: Record<string, "1:1" | "3:4" | "4:3" | "9:16" | "16:9"> = {
    [ScenarioType.MOMENTS_POSTER]: "9:16",
    [ScenarioType.LIVE_OVERLAY]: "16:9",
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "1:1",
    [ScenarioType.MODEL_REPLACEMENT]: "3:4",
    [ScenarioType.BUYER_SHOW]: "3:4"
  };

  const finalPrompt = `
    TASK: Commercial visual reconstruction.
    SCENARIO: ${scenario}
    PRODUCT_INFO: ${analysis.productType}, ${analysis.sellingPoints.join(', ')}
    USER_WISH: ${userIntent || 'High-end aesthetic'}
    OVERLAY_TEXT: ${textConfig.title}
    REFERENCE_STYLE: ${analysis.suggestedPrompt}
    QUALITY: Photorealistic, 8k, cinematic lighting.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
        { text: finalPrompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: ratioMap[scenario] || "1:1"
      }
    }
  });

  // 规范：从 parts 中提取 inlineData
  const candidate = response.candidates?.[0];
  if (candidate) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("AI 引擎未能生成有效图像。");
}