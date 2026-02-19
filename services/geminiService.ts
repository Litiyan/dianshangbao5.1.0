
import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

/**
 * 稳健的通用调用函数 (原生 Fetch)
 * 调用内部部署的 /api/gemini 路由，由后端函数安全处理 API Key 和 SDK
 */
async function callBffGateway(payload: any) {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `网络异常: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Gateway Call Failed:", error);
    throw new Error(error.message || "生成服务连接失败");
  }
}

/**
 * 1. 商品 DNA 智能分析
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  try {
    const payload = {
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
          { text: "Task: Product DNA Analysis. Return ONLY JSON: { productType: string, targetAudience: string, sellingPoints: string[], suggestedPrompt: string, isApparel: boolean }" }
        ]
      },
      config: { responseMimeType: "application/json" }
    };
    
    const result = await callBffGateway(payload);
    const data = JSON.parse(result.text || "{}");
    
    return {
      productType: data.productType || "电商商品",
      targetAudience: data.targetAudience || "通用受众",
      sellingPoints: data.sellingPoints || ["专业构图", "极致细节"],
      suggestedPrompt: data.suggestedPrompt || "Commercial product photography",
      isApparel: data.isApparel || false
    };
  } catch (e) {
    return {
      productType: "商品",
      targetAudience: "通用",
      sellingPoints: ["高品质", "商业摄影"],
      suggestedPrompt: "Studio shot",
      isApparel: false
    };
  }
}

/**
 * 2. 核心商业生图 (原生 Fetch 实现)
 */
export async function generateScenarioImage(
  base64Images: string[],
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig,
  modelNationality: string = ""
): Promise<string> {
  
  const textPrompt = (textConfig.title || textConfig.detail)
    ? `GRAPHIC DESIGN: Overlay text "${textConfig.title}" and subtitle "${textConfig.detail}" in a professional commercial layout.`
    : `NO TEXT: Pure photographic output.`;

  const prompt = `
    ROLE: Professional E-commerce Visual Director.
    TASK: Generate a ${scenario} scene for ${analysis.productType}.
    USER INTENT: ${userIntent}.
    ${modelNationality ? `MODEL: Featuring a ${modelNationality}.` : ''}
    ${textPrompt}
    MANDATORY: 8k photorealistic, cinematic lighting, 100% product fidelity from references.
  `;

  const ratioMap: Record<string, string> = {
    [ScenarioType.MOMENTS_POSTER]: "9:16",
    [ScenarioType.LIVE_OVERLAY]: "16:9",
    [ScenarioType.LIVE_GREEN_SCREEN]: "16:9",
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "1:1"
  };

  const payload = {
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
  };

  const result = await callBffGateway(payload);
  const imgData = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
  
  if (!imgData) throw new Error("AI 未返回图片，请稍后重试");
  return `data:image/png;base64,${imgData}`;
}

/**
 * 3. 模特生成专用
 */
export async function generateModelImage(
  base64Image: string,
  analysis: MarketAnalysis,
  showFace: boolean = true
): Promise<string> {
  const payload = {
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/png' } },
        { text: `Fashion photography: A professional model wearing this ${analysis.productType}. ${showFace ? 'Clear face.' : 'Headless crop.'} Studio light.` }
      ]
    }
  };

  const result = await callBffGateway(payload);
  const imgData = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
  
  if (!imgData) throw new Error("模特重构失败");
  return `data:image/png;base64,${imgData}`;
}
