
import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context: { env: { API_KEY: string }; request: Request }) {
  const { request, env } = context;

  try {
    const payload = await request.json();
    const { model, contents, config } = payload;

    // 优先从环境变量读取，如果 process.env 不存在则从 context.env 读取（Cloudflare 标准）
    const apiKey = env.API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
      throw new Error("API_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config: config || {}
    });

    // 按照 SDK 指南使用 getter 访问文本
    return new Response(JSON.stringify({
      text: response.text,
      candidates: response.candidates
    }), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error: any) {
    console.error("[Gemini BFF Critical Error]:", error);
    return new Response(JSON.stringify({ 
      error: "SERVER_AI_EXCEPTION", 
      message: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
