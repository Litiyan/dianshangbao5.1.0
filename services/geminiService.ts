import { GoogleGenAI, Type } from "@google/genai";
import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

/**
 * 严格按照指令：使用 process.env.API_KEY 初始化
 */
const getAIClient = () => {
    return new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
};

/**
 * 产品多维深度分析（Gemini 3 Flash）
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
          { text: "作为资深电商视觉专家，分析这些产品图。识别：产品类型、受众、核心卖点、是否为服装类。并生成一段专业的英语商业摄影提示词(suggestedPrompt)。返回 JSON。" }
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

    // 核心修正：使用 response.text 属性而非方法
    const text = response.text;
    return JSON.parse(text || "{}");
  } catch (e) {
    console.error("Analysis Failure:", e);
    // 降级策略
    return {
      productType: "通用商品",
      targetAudience: "全网用户",
      sellingPoints: ["专业质感"],
      suggestedPrompt: "professional studio product photography, clean background",
      isApparel: false
    };
  }
}

/**
 * 商业视觉重构（Gemini 2.5 Flash Image）
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

  const prompt = `
    Product: ${analysis.productType}.
    Business Scenario: ${scenario}.
    Merchant Intent: ${userIntent || 'Commercial quality'}.
    Brand Slogan: ${textConfig.title}.
    Style Reference: ${analysis.suggestedPrompt}.
    Quality: High-end commercial photography, 8k, photorealistic, cinematic lighting.
    Ensure the product details are perfectly preserved while merging into the new background.
  `;

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

  // 遍历结果寻找图像
  const candidate = response.candidates?.[0];
  if (candidate) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("模型未返回有效图像，请尝试更换素材或调整描述。");
}