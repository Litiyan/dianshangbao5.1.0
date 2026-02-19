
import { GoogleGenAI } from "@google/genai";

/**
 * 这是 Cloudflare Pages / Vercel 的服务端函数
 * 它具有访问环境变量的权限，且不会暴露给前端
 */
export async function onRequestPost(context: { env: { API_KEY: string }; request: Request }) {
  const { request, env } = context;

  try {
    const payload = await request.json();
    const { model, contents, config } = payload;

    // 在服务端，我们从环境变量中安全获取 Key
    // 支持 env 对象获取（Cloudflare）或 process.env（Node）
    const apiKey = env.API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
      console.error("[BFF] Missing API_KEY configuration");
      return new Response(JSON.stringify({ 
        error: "SERVER_CONFIG_ERROR", 
        message: "服务端 API_KEY 未配置，请联系管理员。" 
      }), { status: 500 });
    }

    // 严格遵循 SDK 初始化规范
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // 调用生成接口
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents: contents,
      config: config || {}
    });

    // 返回解析后的结果
    return new Response(JSON.stringify({
      text: response.text,
      candidates: response.candidates
    }), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (error: any) {
    console.error("[Gemini BFF Critical Error]:", error);
    return new Response(JSON.stringify({ 
      error: "INTERNAL_AI_GATEWAY_ERROR", 
      message: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
