
/**
 * 支付宝 Web Crypto 签名工具集
 * 专为 Cloudflare Edge Runtime 优化，杜绝 Node.js 依赖
 */

// 1. 基础转换工具：字符串转 ArrayBuffer
function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// 2. PEM 格式转 ArrayBuffer (支持 PKCS8 和 SPKI)
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64Lines = pem
    .replace(/-----BEGIN[A-Z0-9 ]+-----/i, '')
    .replace(/-----END[A-Z0-9 ]+-----/i, '')
    .replace(/[\r\n\s]+/g, '');
  const byteStr = atob(b64Lines);
  return str2ab(byteStr);
}

/**
 * 生成签名 (用于预下单和查询接口)
 * @param params 待签名参数对象
 * @param privateKeyPem 私钥字符串 (PKCS8 格式)
 */
export async function signAlipayRequest(params: Record<string, string>, privateKeyPem: string): Promise<string> {
  // 按 ASCII 排序并拼接
  const sortedStr = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  const privateKeyBuffer = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const data = new TextEncoder().encode(sortedStr);
  const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
  
  // ArrayBuffer 转 Base64
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return btoa(String.fromCharCode(...signatureArray));
}

/**
 * 验证签名 (用于异步回调 notify 接口)
 * @param params 支付宝回调的所有参数
 * @param publicKeyPem 支付宝公钥 (SPKI 格式)
 */
export async function verifyAlipayNotify(params: Record<string, string>, publicKeyPem: string): Promise<boolean> {
  const signatureBase64 = params.sign;
  if (!signatureBase64) return false;

  // 1. 提取待验签字符串 (排除 sign 和 sign_type)
  const sortedStr = Object.keys(params)
    .sort()
    .filter(key => key !== 'sign' && key !== 'sign_type')
    .map(key => `${key}=${params[key]}`)
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
