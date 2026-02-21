
import { signAlipayRequest } from "../../../utils/alipay";

export async function onRequestGet(context: { env: { ALIPAY_APP_ID: string; ALIPAY_PRIVATE_KEY: string }; request: Request }) {
  try {
    const { env, request } = context;
    const { searchParams } = new URL(request.url);
    const out_trade_no = searchParams.get("out_trade_no");

    if (!out_trade_no) return new Response("Missing out_trade_no", { status: 400 });

    const d = new Date(Date.now() + 8 * 3600 * 1000);
    const timestamp = d.toISOString().replace('T', ' ').substring(0, 19);

    const params: Record<string, string> = {
      app_id: env.ALIPAY_APP_ID,
      method: "alipay.trade.query",
      format: "JSON",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: timestamp,
      version: "1.0",
      biz_content: JSON.stringify({ out_trade_no })
    };

    const keys = Object.keys(params).sort();
    const signStr = keys.map(k => `${k}=${params[k]}`).join('&');
    const sign = await signAlipayRequest(signStr, env.ALIPAY_PRIVATE_KEY);
    params.sign = sign;

    const queryParams = new URLSearchParams();
    for (const key of Object.keys(params)) {
      queryParams.append(key, params[key]);
    }

    const response = await fetch(`https://openapi.alipay.com/gateway.do?${queryParams.toString()}`);
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
