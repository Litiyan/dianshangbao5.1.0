
import { signParams } from "../../../utils/alipay";

export async function onRequestPost(context: { env: { ALIPAY_APP_ID: string; ALIPAY_PRIVATE_KEY: string }; request: Request }) {
  const { env, request } = context;
  const { amount, subject } = await request.json();

  // 动态获取当前域名，确保 notify_url 准确
  const origin = new URL(request.url).origin;
  const out_trade_no = `DSB${Date.now()}${Math.floor(Math.random() * 1000)}`;
  
  const commonParams: Record<string, string> = {
    app_id: env.ALIPAY_APP_ID,
    method: "alipay.trade.precreate",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }).replace(/\//g, '-'),
    version: "1.0",
    notify_url: `${origin}/api/pay/notify`,
    biz_content: JSON.stringify({
      out_trade_no,
      total_amount: amount,
      subject: subject || "电商宝算力充值",
    })
  };

  try {
    const sign = await signParams(commonParams, env.ALIPAY_PRIVATE_KEY);
    const query = new URLSearchParams({ ...commonParams, sign }).toString();
    
    const response = await fetch(`https://openapi.alipay.com/gateway.do?${query}`);
    const data: any = await response.json();
    const result = data.alipay_trade_precreate_response;
    
    if (result.code === "10000") {
      return new Response(JSON.stringify({
        code: 200,
        qr_code: result.qr_code,
        out_trade_no
      }), { headers: { "Content-Type": "application/json" } });
    } else {
      return new Response(JSON.stringify({ code: 500, message: result.sub_msg || "下单失败" }), { status: 500 });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ code: 500, error: err.message }), { status: 500 });
  }
}
