
import { verifyAlipayNotify } from "../../../src/utils/alipay";

export async function onRequestPost(context: { env: { ALIPAY_PUBLIC_KEY: string }; request: Request }) {
  const { env, request } = context;
  
  // 1. 解析 Form Data
  const formData = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    params[key] = value.toString();
  }

  try {
    // 2. 验签
    const isValid = await verifyAlipayNotify(params, env.ALIPAY_PUBLIC_KEY);
    
    if (isValid && (params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED')) {
      const outTradeNo = params.out_trade_no;
      console.log(`[ALIPAY SUCCESS] Order: ${outTradeNo}`);
      
      // 此处可执行数据库操作，更新用户权益
      return new Response("success");
    }
  } catch (e) {
    console.error("[ALIPAY NOTIFY ERROR]:", e);
  }

  return new Response("fail");
}
