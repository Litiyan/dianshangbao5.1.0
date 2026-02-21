
import { verifyAlipayNotify } from "../../../utils/alipay";

export async function onRequestPost(context: { env: { ALIPAY_PUBLIC_KEY: string }; request: Request }) {
  const { env, request } = context;
  
  // 1. 解析 Form Data
  const formData = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    params[key] = value.toString();
  }

  try {
    // 2. 验签 (直接传入 params 对象)
    const isValid = await verifyAlipayNotify(params, env.ALIPAY_PUBLIC_KEY);
    
    if (isValid && (params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED')) {
      const outTradeNo = params.out_trade_no;
      const totalAmount = params.total_amount;
      
      console.log(`[ALIPAY SUCCESS] Order: ${outTradeNo}, Amount: ${totalAmount}`);
      
      // TODO: 这里接入 D1 数据库执行算力加分
      // await context.env.DB.prepare("UPDATE users SET credits = credits + 1000 WHERE order_no = ?").bind(outTradeNo).run();

      return new Response("success");
    }
  } catch (e) {
    console.error("[ALIPAY NOTIFY ERROR]:", e);
  }

  // 验签失败或状态不对必须返回 fail
  return new Response("fail");
}
