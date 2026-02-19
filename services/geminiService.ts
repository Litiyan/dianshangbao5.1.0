import { GoogleGenAI, Type } from "@google/genai";
import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

/**
 * 严格按照指令：使用 process.env.API_KEY 初始化
 */
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Critical: API_KEY is missing in process.env. Check deployment settings.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

/**
 * 产品视觉分析 (Gemini 3 Flash)
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
          { text: "作为电商专家，分析这些产品图。识别：产品类型、受众、核心卖点、是否为服装。返回 JSON 格式。" }
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

    // 正确用法：使用 .text 属性
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    console.error("Analysis Failed:", e);
    return {
      productType: "通用商品",
      targetAudience: "大众",
      sellingPoints: ["高品质"],
      suggestedPrompt: "professional product photography, studio lighting",
      isApparel: false
    };
  }
}

/**
 * 视觉重构生图 (Gemini 2.5 Flash Image)
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

  const prompt = `Commercial visual reconstruction for ${scenario}. Product: ${analysis.productType}. Selling points: ${analysis.sellingPoints.join(', ')}. Intent: ${userIntent}. Style: ${analysis.suggestedPrompt}. Quality: 8k, photorealistic, cinematic lighting.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: ratioMap[scenario] || "1:1"
      }
    }
  });

  // 遍历结果寻找图像数据
  const candidate = response.candidates?.[0];
  if (candidate) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("模型未返回有效图像。");
}