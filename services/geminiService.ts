import { MarketAnalysis, ImageStyle, ImageCategory } from "../types";

// ✅ 核心修改：指向我们自己的 Cloudflare 后端，而不是直接连 Google
const API_ENDPOINT = '/api/gemini';

/**
 * 通用 BFF 调用函数
 * 负责把数据打包发给 functions/api/gemini.ts
 */
async function callGeminiBff(payload: any) {
  try {
    console.log("正在呼叫后端:", API_ENDPOINT);
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`服务请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;

  } catch (error: any) {
    console.error("BFF 调用失败:", error);
    // 转换成用户能看懂的人话
    if (error.message.includes("Failed to fetch")) {
      throw new Error("网络连接中断，请检查您的网络或 Cloudflare 部署状态。");
    }
    throw error;
  }
}

/**
 * 1. 分析产品 (调用后端 gemini-2.0-flash)
 */
export async function analyzeProduct(base64Image: string): Promise<MarketAnalysis> {
  const payload = {
    action: 'analyze', // 告诉后端我要做分析
    image: base64Image
  };

  try {
    const result = await callGeminiBff(payload);
    // 后端已经帮我们处理好 JSON 了，直接用
    return result as MarketAnalysis;
  } catch (error) {
    console.error("分析失败:", error);
    // 失败兜底数据，防止页面白屏
    return {
      productType: "未识别商品",
      targetAudience: "通用",
      sellingPoints: ["高品质", "设计感"],
      suggestedPrompt: "Product photography",
      recommendedCategories: ["DISPLAY"],
      marketingCopy: { title: "新品上市", shortDesc: "品质之选", tags: ["热销"] },
      isApparel: false
    };
  }
}

/**
 * 2. 生成图片 (调用后端 gemini-2.5-flash-image)
 */
export async function generateProductDisplay(
  base64Image: string,
  style: ImageStyle,
  category: ImageCategory,
  aspectRatio: string,
  marketAnalysis: MarketAnalysis,
  fineTunePrompts: string[],
  isUltraHD: boolean,
  chatHistory: { role: 'user' | 'assistant', text: string }[] = []
): Promise<string> {
  
  const payload = {
    action: 'generate', // 告诉后端我要生图
    image: base64Image,
    params: {
      style,
      category,
      aspectRatio,
      marketAnalysis,
      fineTunePrompts,
      isUltraHD,
      chatHistory
    }
  };

  const result = await callGeminiBff(payload);
  
  if (result.image) {
    return result.image; // 后端直接返回 Base64
  }
  
  throw new Error("生成失败：后端未返回图片数据");
}

// 占位函数，防止报错
export async function generatePreview(base64Image: string) {
    return generateProductDisplay(base64Image, 'MINIMALIST', 'DISPLAY', '1:1', {} as any, [], false);
}

export async function generateMarketingSuite(base64Image: string, analysis: any) {
    // 简单起见，这里演示并发调用
    return Promise.all([
        generateProductDisplay(base64Image, 'MINIMALIST', 'DISPLAY', '1:1', analysis, [], false),
        generateProductDisplay(base64Image, 'LIFESTYLE', 'SOCIAL', '3:4', analysis, [], false)
    ]);
}

export async function generateModelImage(base64Image: string) {
    return generateProductDisplay(base64Image, 'FASHION', 'MODEL', '3:4', {} as any, ['Asian model'], false);
}