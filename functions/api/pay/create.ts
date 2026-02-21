
import { signAlipayRequest } from "../../../utils/alipay";

export async function onRequestPost(context: { env: { ALIPAY_APP_ID: string; ALIPAY_PRIVATE_KEY: string }; request: Request }) {
  const { env, request } = context;
  const { amount, subject } = await request.json();

  const origin = new URL(request.url).origin;
  const out_trade_no = `DSB${Date.now()}${Math.floor(Math.random() * 1000)}`;
  
  // 生成支付宝要求的时间格式: yyyy-MM-dd HH:mm:ss
  const now = new Date();
  const timestamp = now.toLocaleString('zh-CN', { 
    hour12: false, 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\//g, '-');

  const commonParams: Record<string, string> = {
    app_id: env.ALIPAY_APP_ID,
    method: "alipay.trade.precreate",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp,
    version: "1.0",
    notify_url: `${origin}/api/pay/notify`,
    biz_content: JSON.stringify({
      out_trade_no,
      total_amount: amount,
      subject: subject || "电商宝 Pro 无限制算力包",
    })
  };

  try {
    const sign = await signAlipayRequest(commonParams, env.ALIPAY_PRIVATE_KEY);
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
      return new Response(JSON.stringify({ code: 500, message: result.sub_msg || "支付宝下单失败" }), { status: 500 });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ code: 500, error: err.message }), { status: 500 });
  }
}
