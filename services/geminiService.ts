
import { GoogleGenAI } from "@google/genai";
import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

// 初始化 AI 实例，直接从注入的环境变量读取 Key
const getAiClient = () => new GoogleGenAI({ apiKey: (process.env as any).API_KEY });

/**
 * 1. 商品 DNA 智能分析
 * 使用 Gemini 3 Flash 进行快速识别
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
          { text: "请分析这些商品图片。必须以简洁的 JSON 格式输出，不要包含 Markdown 标记：{ \"productType\": \"商品名称\", \"targetAudience\": \"目标受众\", \"sellingPoints\": [\"卖点1\", \"卖点2\"], \"suggestedPrompt\": \"构图建议\", \"isApparel\": 布尔值 }" }
        ]
      },
      config: { 
        responseMimeType: "application/json"
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    return {
      productType: data.productType || "电商商品",
      targetAudience: data.targetAudience || "大众消费者",
      sellingPoints: data.sellingPoints || ["专业构图", "极致细节"],
      suggestedPrompt: data.suggestedPrompt || "Commercial product photography",
      isApparel: !!data.isApparel
    };
  } catch (e) {
    console.error("Analysis error:", e);
    return {
      productType: "商品",
      targetAudience: "通用",
      sellingPoints: ["高品质", "商业摄影"],
      suggestedPrompt: "Professional studio shot",
      isApparel: false
    };
  }
}

/**
 * 2. 核心商业场景重构
 * 使用专业图像生成模型
 */
export async function generateScenarioImage(
  base64Images: string[],
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig,
  modelNationality: string = ""
): Promise<string> {
  const ai = getAiClient();
  
  const textPrompt = (textConfig.title || textConfig.detail)
    ? `GRAPHIC DESIGN MANDATE: Overlay text "${textConfig.title}" and subtitle "${textConfig.detail}" elegantly. Ensure clear visibility.`
    : `VISUAL FOCUS: No text overlays, focus on product integration.`;

  const prompt = `
    TASK: E-commerce Product Scene Reconstruction.
    SCENARIO: ${scenario}.
    USER CREATIVE INTENT: ${userIntent}.
    PRODUCT: ${analysis.productType} (${analysis.sellingPoints.join(', ')}).
    ${modelNationality ? `MODEL: Use a ${modelNationality}.` : ''}
    ${textPrompt}
    QUALITY: 8k photorealistic, commercial studio lighting.
    IMPORTANT: Preserve the original product shape and color from the provided photos.
  `;

  const ratioMap: Record<string, string> = {
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
        aspectRatio: (ratioMap[scenario] || "1:1") as any
      }
    }
  });

  // 遍历结果寻找图像部分
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("AI 渲染引擎未返回结果，请检查输入后重试。");
}
