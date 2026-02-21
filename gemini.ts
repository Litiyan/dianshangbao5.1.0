/**
 * Cloudflare Pages Function: /api/gemini
 * 纯原生 REST 代理层，杜绝 SDK 环境报错
 */
export async function onRequestPost(context: { env: { API_KEY: string }; request: Request }) {
  const { request, env } = context;
  const apiKey = env.API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ 
      error: "AUTH_ERROR", 
      message: "服务端 API_KEY 未配置，请在 Cloudflare Pages 控制台添加名为 API_KEY 的环境变量。" 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    const body = await request.json();
    const { model, payload } = body;

    if (!model || !payload) {
      return new Response(JSON.stringify({ error: "INVALID_REQUEST", message: "缺少模型名称或请求体" }), { status: 400 });
    }

    // 构造 Google AI REST API 地址
    const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(GOOGLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new Response(JSON.stringify({
        error: "UPSTREAM_ERROR",
        status: response.status,
        message: errorData.error?.message || "Google API 响应异常",
        details: errorData
      }), { status: response.status, headers: { "Content-Type": "application/json" } });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("[BFF Proxy Error]:", error);
    return new Response(JSON.stringify({ 
      error: "SERVER_ERROR", 
      message: error.message || "后端网关处理异常" 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}