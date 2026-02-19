import { GoogleGenAI, Type } from "@google/genai";
import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

// 严格遵循最新初始化规范
const getAI = () => new GoogleGenAI({ apiKey: (process.env as any).API_KEY });

export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
          { text: "分析以上产品图片。识别产品类型、核心受众、视觉卖点，并给出专业构图指令。返回 JSON。" }
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

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("AI Analysis Error:", e);
    return {
      productType: "通用商品",
      targetAudience: "大众消费者",
      sellingPoints: ["高品质"],
      suggestedPrompt: "High-end product photography",
      isApparel: false
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
  const ai = getAI();
  const prompt = `
    E-commerce High-End Scene Reconstruction.
    Product: ${analysis.productType}.
    Scenario: ${scenario}.
    Intent: ${userIntent}.
    Text: ${textConfig.title}.
    Style: Commercial photography, 8k, sharp.
    Base: ${analysis.suggestedPrompt}.
  `;

  const ratioMap: any = {
    [ScenarioType.MOMENTS_POSTER]: "9:16",
    [ScenarioType.LIVE_OVERLAY]: "16:9",
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "1:1"
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
      imageConfig: { aspectRatio: ratioMap[scenario] || "1:1" }
    }
  });

  const part = response.candidates?.[0]?.content.parts.find(p => p.inlineData);
  if (part?.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  throw new Error("AI 无法生成符合要求的商业场景图片。");
}