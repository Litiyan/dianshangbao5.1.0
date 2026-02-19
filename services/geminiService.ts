
import { GoogleGenAI } from "@google/genai";
import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

// 初始化函数：每次调用动态创建实例，确保获取最新注入的 API_KEY
const getAI = () => new GoogleGenAI({ apiKey: (process.env as any).API_KEY });

/**
 * 智能商品分析 (Gemini 3 Flash)
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
          { text: "作为电商专家，请分析这些产品图。输出 JSON：{ \"productType\": \"名称\", \"targetAudience\": \"受众\", \"sellingPoints\": [\"卖点\"], \"suggestedPrompt\": \"构图指令\", \"isApparel\": 布尔值 }" }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Analysis Error:", e);
    return {
      productType: "通用商品",
      targetAudience: "大众消费者",
      sellingPoints: ["高品质", "商业设计"],
      suggestedPrompt: "Professional studio lighting",
      isApparel: false
    };
  }
}

/**
 * 商业场景重构 (Gemini 2.5 Flash Image)
 */
export async function generateScenarioImage(
  base64Images: string[],
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig,
  modelNationality: string = ""
): Promise<string> {
  const ai = getAI();
  
  const textInstruction = (textConfig.title || textConfig.detail)
    ? `ADD TYPOGRAPHY: Overlay "${textConfig.title}" and "${textConfig.detail}" in a premium minimalist font.`
    : `NO TEXT: Clean product shot only.`;

  const prompt = `
    TASK: High-end E-commerce Scene Reconstruction.
    PRODUCT: ${analysis.productType}.
    SCENARIO: ${scenario}.
    INTENT: ${userIntent}.
    ${modelNationality ? `MODEL: Featuring a ${modelNationality}.` : ''}
    ${textInstruction}
    STYLE: Professional product photography, 8k, sharp focus on the original product.
  `;

  // 映射业务场景比例
  const ratioMap: Record<string, any> = {
    [ScenarioType.MOMENTS_POSTER]: "9:16",
    [ScenarioType.LIVE_OVERLAY]: "16:9",
    [ScenarioType.LIVE_GREEN_SCREEN]: "16:9",
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "1:1",
    [ScenarioType.CROSS_BORDER_LOCAL]: "1:1"
  };

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

  // 寻找图片输出部分
  const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (imagePart?.inlineData) {
    return `data:image/png;base64,${imagePart.inlineData.data}`;
  }
  
  throw new Error("AI 渲染未返回有效图片，请尝试调整构思。");
}
