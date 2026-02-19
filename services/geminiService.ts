
import { MarketAnalysis, ScenarioType, TextConfig, EcommerceUseCase } from "../types";

/**
 * 核心调用逻辑：通过项目内置的 /api/gemini 接口进行转发
 * 这样可以确保 API Key 安全地留在服务端，并避开前端环境对 SDK 的兼容性限制
 */
async function callBff(payload: any) {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API 服务异常 (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("AI 路由调用失败:", error);
    throw new Error(error.message || "无法连接到 AI 渲染引擎，请检查网络或部署设置。");
  }
}

/**
 * 1. 商品 DNA 深度分析
 * 采用稳定模式，优先确保生成流程不中断
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  // 采用异步但可预期的分析结构，防止部署后初次加载崩溃
  try {
    const payload = {
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
          { text: "Analyze this product. Output JSON: { productType: string, targetAudience: string, sellingPoints: string[], suggestedPrompt: string, isApparel: boolean }" }
        ]
      },
      config: { responseMimeType: "application/json" }
    };
    
    const result = await callBff(payload);
    const analysis = JSON.parse(result.text || "{}");
    
    return {
      productType: analysis.productType || "商品",
      targetAudience: analysis.targetAudience || "通用受众",
      sellingPoints: analysis.sellingPoints || ["高品质", "商业设计"],
      suggestedPrompt: analysis.suggestedPrompt || "Professional studio photography",
      isApparel: analysis.isApparel || false
    };
  } catch (e) {
    // 降级策略：返回基础数据模型
    return {
      productType: "电商商品",
      targetAudience: "大众消费者",
      sellingPoints: ["极致质感", "专业构图"],
      suggestedPrompt: "High-end product shot",
      isApparel: false
    };
  }
}

/**
 * 2. 核心商业场景生成
 * 严格适配 App.tsx 的调用签名，整合用户创意意图
 */
export async function generateScenarioImage(
  base64Images: string[],
  scenario: ScenarioType | EcommerceUseCase,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig,
  modelNationality: string = ""
): Promise<string> {
  
  const textInstruction = (textConfig.title || textConfig.detail)
    ? `Required Overlay Text: Title="${textConfig.title}", Details="${textConfig.detail}". Apply professional typography and ensure high-end commercial aesthetic.`
    : `Pure visual focus, no text overlay.`;

  const finalPrompt = `
    Role: Senior E-commerce Visual Director.
    Scenario: ${scenario}.
    Context: ${analysis.productType} with key features [${analysis.sellingPoints.join('/')}].
    User Creative Intent: ${userIntent}.
    ${modelNationality ? `Regional Localization: Features a ${modelNationality}.` : ''}
    ${textInstruction}
    Technical Standard: 8k resolution, cinematic lighting, photorealistic textures, flawless background integration.
    Requirement: Maintain 100% fidelity of the product's 3D structure using the provided multi-angle references.
  `;

  // 比例智能适配
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
        { text: finalPrompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: (ratioMap[scenario] || "1:1") as any
      }
    }
  };

  const result = await callBff(payload);
  
  // 从返回的 candidates 中提取 inlineData 字节码
  const imgData = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
  
  if (!imgData) {
    throw new Error("AI 引擎未返回有效图像数据，请尝试简化描述。");
  }

  return `data:image/png;base64,${imgData}`;
}

/**
 * 3. 模特换装专用逻辑 (增强兼容性)
 */
export async function generateModelImage(
  base64Image: string,
  analysis: MarketAnalysis,
  showFace: boolean = true
): Promise<string> {
  const prompt = `Professional E-commerce Model Shot: High-fashion ${analysis.productType} showcase. ${showFace ? 'Clear professional face.' : 'Elegant headless crop, focus on texture.'} Studio lighting.`;
  
  const payload = {
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  };

  const result = await callBff(payload);
  const imgData = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
  
  if (!imgData) throw new Error("模特重构失败");
  return `data:image/png;base64,${imgData}`;
}
