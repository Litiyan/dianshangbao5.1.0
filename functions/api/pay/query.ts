
import { signAlipayRequest } from "../../../utils/alipay";

export async function onRequestGet(context: { env: { ALIPAY_APP_ID: string; ALIPAY_PRIVATE_KEY: string }; request: Request }) {
  const { env, request } = context;
  const { searchParams } = new URL(request.url);
  const out_trade_no = searchParams.get("out_trade_no");

  if (!out_trade_no) return new Response("Missing out_trade_no", { status: 400 });

  const now = new Date();
  const timestamp = now.toLocaleString('zh-CN', { 
    hour12: false, 
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).replace(/\//g, '-');

  const commonParams: Record<string, string> = {
    app_id: env.ALIPAY_APP_ID,
    method: "alipay.trade.query",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp,
    version: "1.0",
    biz_content: JSON.stringify({ out_trade_no })
  };

  try {
    const sign = await signAlipayRequest(commonParams, env.ALIPAY_PRIVATE_KEY);
    const query = new URLSearchParams({ ...commonParams, sign }).toString();
    
    const response = await fetch(`https://openapi.alipay.com/gateway.do?${query}`);
    const data: any = await response.json();
    const result = data.alipay_trade_query_response;

    return new Response(JSON.stringify({
      code: result.code === "10000" ? 200 : 500,
      trade_status: result.trade_status, 
      message: result.sub_msg
    }), { headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ code: 500, error: err.message }), { status: 500 });
  }
}
