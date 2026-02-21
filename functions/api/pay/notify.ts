
import { verifySignature } from "../../../utils/alipay";

export async function onRequestPost(context: { env: { ALIPAY_PUBLIC_KEY: string }; request: Request }) {
  const { env, request } = context;
  
  // 1. 解析 Form Data
  const formData = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    params[key] = value.toString();
  }

  const sign = params.sign;
  if (!sign) return new Response("fail");

  try {
    // 2. 验签
    const isValid = await verifySignature(params, sign, env.ALIPAY_PUBLIC_KEY);
    
    if (isValid && params.trade_status === 'TRADE_SUCCESS') {
      const outTradeNo = params.out_trade_no;
      const totalAmount = params.total_amount;
      
      console.log(`[Payment Success] Order: ${outTradeNo}, Amount: ${totalAmount}`);
      
      // TODO: 执行数据库加分操作 (D1 Database)
      // await context.env.DB.prepare("UPDATE users SET credits = credits + ? WHERE order_no = ?")
      //   .bind(parseInt(totalAmount) * 10, outTradeNo).run();

      return new Response("success");
    }
  } catch (e) {
    console.error("Notify Error:", e);
  }

  return new Response("fail");
}
