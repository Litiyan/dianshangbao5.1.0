
import { signAlipayRequest } from "../../../utils/alipay";

export async function onRequestPost(context: { env: { ALIPAY_APP_ID: string; ALIPAY_PRIVATE_KEY: string }; request: Request }) {
  try {
    const { env, request } = context;
    const body = await request.json();
    const amount = String(body.amount || "19.90"); // 强制转字符串防报错
    const subject = body.subject || "电商宝 Pro 无限制算力包";

    const origin = new URL(request.url).origin;
    const out_trade_no = `DSB${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // 🎯 修复：绝对安全的北京时间生成法，保证严格的 yyyy-MM-dd HH:mm:ss
    // Cloudflare 环境下 Date.now() 是 UTC，手动增加 8 小时
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    const timestamp = d.toISOString().replace('T', ' ').substring(0, 19);

    // 组装支付宝要求的公共参数
    const params: Record<string, string> = {
      app_id: env.ALIPAY_APP_ID,
      method: "alipay.trade.precreate",
      format: "JSON",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: timestamp,
      version: "1.0",
      notify_url: `${origin}/api/pay/notify`,
      biz_content: JSON.stringify({
        out_trade_no: out_trade_no,
        total_amount: amount,
        subject: subject
      })
    };

    // 🎯 按 ASCII 排序并拼接
    const keys = Object.keys(params).sort();
    const signStrArr = [];
    for (const key of keys) {
      if (params[key]) {
        signStrArr.push(`${key}=${params[key]}`);
      }
    }
    const signStr = signStrArr.join('&');

    // 生成签名
    const sign = await signAlipayRequest(signStr, env.ALIPAY_PRIVATE_KEY);
    params.sign = sign;

    // 将所有参数组装成 application/x-www-form-urlencoded 格式
    const searchParams = new URLSearchParams();
    for (const key of Object.keys(params)) {
      searchParams.append(key, params[key]);
    }

    // 调用支付宝网关
    const response = await fetch("https://openapi.alipay.com/gateway.do", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      body: searchParams.toString()
    });

    const data: any = await response.json();

    // 解析支付宝响应
    const alipayResponse = data.alipay_trade_precreate_response;

    if (alipayResponse && alipayResponse.code === "10000") {
      return new Response(JSON.stringify({
        code: 200,
        qr_code: alipayResponse.qr_code,
        out_trade_no: out_trade_no
      }), { headers: { "Content-Type": "application/json" } });
    } else {
      throw new Error(JSON.stringify(alipayResponse || data));
    }

  } catch (error: any) {
    console.error("支付宝下单崩溃:", error);
    return new Response(JSON.stringify({
      code: 500,
      msg: "后端统一下单报错",
      error: error.message
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
