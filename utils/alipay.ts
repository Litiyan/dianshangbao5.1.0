
/**
 * 支付宝 Web Crypto 签名工具集
 * 专为 Cloudflare Edge Runtime 优化，杜绝 Node.js 依赖
 */

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  // 严格剥离头部、尾部，以及所有的换行符和空格
  const b64Lines = pem.replace(/-----BEGIN[A-Z0-9 ]+-----/i, '')
                      .replace(/-----END[A-Z0-9 ]+-----/i, '')
                      .replace(/[\r\n\s]+/g, '');
  const byteStr = atob(b64Lines); // 强制使用原生的 atob
  return str2ab(byteStr);
}

/**
 * 生成签名 (用于预下单接口)
 * @param paramsStr 待签名字符串 (已按 ASCII 排序)
 * @param privateKeyPem 私钥字符串 (PKCS8 格式)
 */
export async function signAlipayRequest(paramsStr: string, privateKeyPem: string): Promise<string> {
  const privateKeyBuffer = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const data = new TextEncoder().encode(paramsStr);
  const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
  
  // ArrayBuffer 转 Base64
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureBase64 = btoa(String.fromCharCode.apply(null, signatureArray));
  return signatureBase64;
}

/**
 * 验证签名 (用于异步回调 notify 接口)
 * @param params 支付宝回调的所有参数对象
 * @param publicKeyPem 支付宝公钥 (SPKI 格式)
 */
export async function verifyAlipayNotify(params: Record<string, string>, publicKeyPem: string): Promise<boolean> {
  const signatureBase64 = params.sign;
  if (!signatureBase64) return false;

  // 1. 提取待验签字符串 (排除 sign 和 sign_type)
  const sortedStr = Object.keys(params)
    .sort()
    .filter(key => key !== 'sign' && key !== 'sign_type')
    .map(key => {
      // 支付宝回调参数中，value 需要是原始字符串（不需要 URL Decode，FormData 已处理）
      return `${key}=${params[key]}`;
    })
    .join('&');

  const publicKeyBuffer = pemToArrayBuffer(publicKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const data = new TextEncoder().encode(sortedStr);
  const signatureByteStr = atob(signatureBase64);
  const signatureBuffer = str2ab(signatureByteStr);

  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signatureBuffer, data);
}
