import { removeBackground } from "@imgly/background-removal";
import { TextConfig, MarketAnalysis, GenerationMode, FontStyle } from "../types";

const FONT_REGISTRY: Record<FontStyle, { family: string; weight: string; google: string }> = {
  modern: { family: 'Noto Sans SC', weight: '900', google: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@900&display=swap' },
  elegant: { family: 'Noto Serif SC', weight: '700', google: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&display=swap' },
  calligraphy: { family: 'Zhi Mang Xing', weight: '400', google: 'https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap' },
  playful: { family: 'ZCOOL KuaiLe', weight: '400', google: 'https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap' }
};

async function preloadFont(style: FontStyle = 'modern'): Promise<string> {
  const config = FONT_REGISTRY[style];
  const fontId = `google-font-${style}`;
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link');
    link.id = fontId; link.rel = 'stylesheet'; link.href = config.google;
    document.head.appendChild(link);
  }
  try {
    const fontDesc = `${config.weight} 16px "${config.family}"`;
    await Promise.race([document.fonts.load(fontDesc), new Promise((_, r) => setTimeout(r, 2000))]);
    return config.family;
  } catch { return 'sans-serif'; }
}

/**
 * 物理参数到 Canvas 阴影矩阵的映射引擎
 */
function calculateShadowParams(lightingDir: string, perspective: string) {
  const dir = lightingDir.toLowerCase();
  const per = perspective.toLowerCase();

  let skewX = 0.5;   // 默认向右倾斜
  let scaleY = 0.3;  // 默认投影高度
  let offsetX = 10;
  let offsetY = 5;

  // 光源水平分量
  if (dir.includes('left')) skewX = 0.6;
  if (dir.includes('right')) skewX = -0.6;
  if (dir.includes('front')) { skewX = 0.1; offsetY = 20; }
  if (dir.includes('back')) { skewX = 0.2; offsetY = -10; }

  // 透视分量
  if (per.includes('top-down') || per.includes('high')) scaleY = 0.6;
  if (per.includes('eye-level')) scaleY = 0.25;

  return { skewX, scaleY, offsetX, offsetY };
}

export async function processFinalImage(
  aiResultUrl: string,
  originalImageBase64: string,
  textConfig: TextConfig,
  analysis: MarketAnalysis,
  mode: GenerationMode
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const [bgImg, fontFamily] = await Promise.all([
        loadImage(aiResultUrl),
        preloadFont(textConfig.fontStyle)
      ]);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas context failed");

      canvas.width = bgImg.width;
      canvas.height = bgImg.height;
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      if (mode === 'creative') {
        renderText(ctx, canvas.width, canvas.height, textConfig, fontFamily);
        return resolve(canvas.toDataURL('image/png', 0.95));
      }

      // 物理保真合成链路
      const blob = await fetch(originalImageBase64).then(res => res.blob());
      const mattedBlob = await removeBackground(blob);
      const mattedUrl = URL.createObjectURL(mattedBlob);
      const fgImg = await loadImage(mattedUrl);

      const paddingScale = 0.65;
      const fgRatio = fgImg.width / fgImg.height;
      let fw, fh;
      if (fgRatio > (canvas.width / canvas.height)) {
        fw = canvas.width * paddingScale; fh = fw / fgRatio;
      } else {
        fh = canvas.height * paddingScale; fw = fh * fgRatio;
      }
      const fx = (canvas.width - fw) / 2;
      const fy = (canvas.height - fh) * 0.65;

      // 1. 动态阴影矩阵运算 (环境光影逆向)
      const { skewX, scaleY, offsetX, offsetY } = calculateShadowParams(
        analysis.physicalSpecs.lightingDirection, 
        analysis.physicalSpecs.cameraPerspective
      );

      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = fw; shadowCanvas.height = fh;
      const sctx = shadowCanvas.getContext('2d')!;
      sctx.drawImage(fgImg, 0, 0, fw, fh);
      sctx.globalCompositeOperation = 'source-in';
      sctx.fillStyle = 'black';
      sctx.fillRect(0, 0, fw, fh);

      // 绘制长投影 (Cast Shadow)
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.filter = 'blur(35px)';
      ctx.setTransform(1, 0, skewX, scaleY, fx + offsetX, fy + fh + offsetY);
      ctx.drawImage(shadowCanvas, 0, -fh, fw, fh);
      ctx.restore();

      // 2. 增强接触影 (Contact Shadow) - 增加“贴地感”
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.filter = 'blur(10px)';
      ctx.beginPath();
      ctx.ellipse(fx + fw/2, fy + fh, fw * 0.4, 15, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fill();
      ctx.restore();

      // 3. 绘制产品本体 + 环境色溢出融合
      ctx.save();
      ctx.drawImage(fgImg, fx, fy, fw, fh);
      // 环境光微调 - 叠加背景色到前景边缘
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.08;
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height, fx, fy, fw, fh);
      ctx.restore();

      renderText(ctx, canvas.width, canvas.height, textConfig, fontFamily);
      const finalBase64 = canvas.toDataURL('image/png', 0.95);
      URL.revokeObjectURL(mattedUrl);
      resolve(finalBase64);
    } catch (error: any) {
      reject(new Error(`视觉物理引擎异常: ${error.message}`));
    }
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image Load Error"));
    img.src = src;
  });
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function renderText(ctx: CanvasRenderingContext2D, w: number, h: number, config: TextConfig, fontFamily: string) {
  if (!config.title && !config.detail) return;
  const isVertical = h > w;
  const style = config.fontStyle || 'modern';
  const weight = FONT_REGISTRY[style]?.weight || '900';
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (config.title) {
    const fs = Math.floor(w * 0.08);
    ctx.font = `${weight} ${fs}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = style === 'calligraphy' ? 15 : 0;
    if (style === 'modern') { ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3; }
    ctx.fillText(config.title, w / 2, isVertical ? h * 0.15 : h * 0.82);
  }
  if (config.detail) {
    const fs = Math.floor(w * 0.038);
    ctx.font = `600 ${fs}px "${fontFamily}", sans-serif`;
    const dy = isVertical ? h * 0.22 : h * 0.91;
    const tw = ctx.measureText(config.detail).width;
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = style === 'playful' ? "rgba(249,115,22,0.85)" : "rgba(0,0,0,0.45)";
    drawRoundedRect(ctx, w/2 - tw/2 - 15, dy - fs/2 - 8, tw + 30, fs + 16, 12);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(config.detail, w / 2, dy);
  }
  ctx.restore();
}
