import { GoogleGenAI, Type } from "@google/genai";
import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

// 动态初始化实例
const getAI = () => new GoogleGenAI({ apiKey: (process.env as any).API_KEY });

/**
 * 智能商品分析 (使用 Gemini 3 Flash 进行多图联合理解)
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
          { text: "分析以上产品图片。识别产品类型、核心受众、视觉卖点，并给出一个用于生图的专业构图指令。如果是服装类请标注。返回 JSON 格式。" }
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
      sellingPoints: ["高品质设计", "现代极简"],
      suggestedPrompt: "Professional studio lighting, high resolution",
      isApparel: false
    };
  }
}

/**
 * 商业场景重构 (使用 Gemini 2.5 Flash Image)
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
  
  // 构建增强提示词
  const prompt = `
    TASK: E-commerce High-End Scene Reconstruction.
    PRODUCT TYPE: ${analysis.productType}.
    TARGET SCENARIO: ${scenario}.
    USER SPECIFIC INTENT: ${userIntent}.
    ${modelNationality ? `MODEL: Interaction with ${modelNationality}.` : ''}
    ${textConfig.title ? `TYPOGRAPHY: Integrate text "${textConfig.title}" naturally into the design.` : ''}
    STYLE: Professional commercial photography, 8k, sharp focus on product.
    BASE PROMPT: ${analysis.suggestedPrompt}.
  `;

  // 场景比例映射
  const ratioMap: Record<string, "1:1" | "9:16" | "16:9" | "3:4" | "4:3"> = {
    [ScenarioType.MOMENTS_POSTER]: "9:16",
    [ScenarioType.LIVE_OVERLAY]: "16:9",
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "1:1",
    [ScenarioType.MODEL_REPLACEMENT]: "3:4"
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

  // 提取生成的图像部分
  const candidate = response.candidates?.[0];
  if (!candidate) throw new Error("AI 未生成结果");

  for (const part of candidate.content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("未能从 AI 响应中提取到图像数据。");
}