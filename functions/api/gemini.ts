
import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context: { env: { API_KEY: string }; request: Request }) {
  const { request, env } = context;

  try {
    const payload = await request.json();
    const { model, contents, config } = payload;

    // 核心安全：API KEY 仅在服务端持有
    const apiKey = env.API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
      console.error("[BFF] Missing API_KEY in environment");
      return new Response(JSON.stringify({ 
        error: "CONFIG_ERROR", 
        message: "服务端未配置 API_KEY，请在项目设置中添加环境变量。" 
      }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config: config || {}
    });

    return new Response(JSON.stringify({
      text: response.text,
      candidates: response.candidates
    }), {
      headers: { 
        "Content-Type": "application/json",
        "X-AI-Gateway": "E-Commerce-Pro-3.1"
      }
    });
  } catch (error: any) {
    console.error("[Gemini Gateway Error]:", error);
    return new Response(JSON.stringify({ 
      error: "AI_GATEWAY_EXCEPTION", 
      message: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
