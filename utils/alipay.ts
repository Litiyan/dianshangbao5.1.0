
/**
 * 支付宝移动端/Edge 环境签名工具集
 * 基于 Web Crypto API，杜绝 Node.js 依赖
 */

export async function signParams(params: Record<string, string>, privateKeyPem: string): Promise<string> {
  const sortedStr = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  const privateKey = await importPrivateKey(privateKeyPem);
  const encoder = new TextEncoder();
  const data = encoder.encode(sortedStr);

  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    data
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifySignature(params: Record<string, string>, sign: string, publicKeyPem: string): Promise<boolean> {
  // 1. 提取待验签字符串 (排除 sign 和 sign_type)
  const sortedStr = Object.keys(params)
    .sort()
    .filter(key => key !== 'sign' && key !== 'sign_type')
    .map(key => `${key}=${decodeURIComponent(params[key])}`)
    .join('&');

  const publicKey = await importPublicKey(publicKeyPem);
  const encoder = new TextEncoder();
  const data = encoder.encode(sortedStr);
  const signature = Uint8Array.from(atob(sign), c => c.charCodeAt(0));

  return await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    publicKey,
    signature,
    data
  );
}

// 辅助：PEM 转 ArrayBuffer 并导入私钥 (PKCS8)
async function importPrivateKey(pem: string) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    binary.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// 辅助：PEM 转 ArrayBuffer 并导入公钥 (SPKI)
async function importPublicKey(pem: string) {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s/g, "");
  const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "spki",
    binary.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}
