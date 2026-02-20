import { removeBackground } from "@imgly/background-removal";
import { TextConfig, MarketAnalysis, GenerationMode, FontStyle } from "../types";

/**
 * 字体样式配置字典
 */
const FONT_REGISTRY: Record<FontStyle, { family: string; weight: string; google: string }> = {
  modern: { 
    family: 'Noto Sans SC', 
    weight: '900', 
    google: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@900&display=swap' 
  },
  elegant: { 
    family: 'Noto Serif SC', 
    weight: '700', 
    google: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&display=swap' 
  },
  calligraphy: { 
    family: 'Zhi Mang Xing', 
    weight: '400', 
    google: 'https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap' 
  },
  playful: { 
    family: 'ZCOOL KuaiLe', 
    weight: '400', 
    google: 'https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap' 
  }
};

/**
 * 异步预加载云端字体，确保 Canvas 渲染时字体已就绪
 */
async function preloadFont(style: FontStyle = 'modern'): Promise<string> {
  const config = FONT_REGISTRY[style];
  const fontId = `google-font-${style}`;
  
  // 1. 注入 Google Font Link
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = config.google;
    document.head.appendChild(link);
  }

  // 2. 拦截式加载：强制等待浏览器字体对象解析完成
  try {
    const fontDesc = `${config.weight} 16px "${config.family}"`;
    await document.fonts.load(fontDesc);
    return config.family;
  } catch (e) {
    console.warn(`Font load failed for ${style}, falling back to sans-serif`);
    return 'sans-serif';
  }
}

/**
 * 物理级环境融合与场景感知排版引擎
 */
export async function processFinalImage(
  aiResultUrl: string,
  originalImageBase64: string,
  textConfig: TextConfig,
  analysis: MarketAnalysis,
  mode: GenerationMode
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. 资源并发加载 (背景图 + 动态字体)
      const [bgImg, fontFamily] = await Promise.all([
        loadImage(aiResultUrl),
        preloadFont(textConfig.fontStyle)
      ]);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas context failed");

      canvas.width = bgImg.width;
      canvas.height = bgImg.height;

      // 绘制背景
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      // --- Creative 模式：直接进入文字排版 ---
      if (mode === 'creative') {
        renderText(ctx, canvas.width, canvas.height, textConfig, fontFamily);
        return resolve(canvas.toDataURL('image/png', 0.95));
      }

      // --- Precision 模式：执行高精合成链路 ---
      const blob = await fetch(originalImageBase64).then(res => res.blob());
      const mattedBlob = await removeBackground(blob);
      const mattedUrl = URL.createObjectURL(mattedBlob);
      const fgImg = await loadImage(mattedUrl);

      const paddingScale = 0.65;
      const fgRatio = fgImg.width / fgImg.height;
      const canvasRatio = canvas.width / canvas.height;
      let fw, fh;
      if (fgRatio > canvasRatio) {
        fw = canvas.width * paddingScale;
        fh = fw / fgRatio;
      } else {
        fh = canvas.height * paddingScale;
        fw = fh * fgRatio;
      }
      const fx = (canvas.width - fw) / 2;
      const fy = (canvas.height - fh) * 0.65;

      // 矩阵投影
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = fw; shadowCanvas.height = fh;
      const sctx = shadowCanvas.getContext('2d')!;
      sctx.drawImage(fgImg, 0, 0, fw, fh);
      sctx.globalCompositeOperation = 'source-in';
      sctx.fillStyle = 'black';
      sctx.fillRect(0, 0, fw, fh);

      ctx.save();
      let skewX = 0.5; let scaleY = 0.3;
      if (analysis.lightingDirection.toLowerCase().includes('right')) skewX = -0.5;
      if (analysis.perspective.toLowerCase().includes('high')) scaleY = 0.5;
      ctx.globalAlpha = 0.25;
      ctx.filter = 'blur(25px)';
      ctx.setTransform(1, 0, skewX, scaleY, fx + (fw * 0.1), fy + fh);
      ctx.drawImage(shadowCanvas, 0, -fh, fw, fh);
      ctx.restore();

      // 前景绘制
      ctx.save();
      ctx.drawImage(fgImg, fx, fy, fw, fh);
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.05;
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height, fx, fy, fw, fh);
      ctx.restore();

      // 7. 高级文字排版
      renderText(ctx, canvas.width, canvas.height, textConfig, fontFamily);

      const finalBase64 = canvas.toDataURL('image/png', 0.95);
      URL.revokeObjectURL(mattedUrl);
      resolve(finalBase64);
    } catch (error) {
      reject(error);
    }
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 场景感知的高级 Canvas 文字渲染
 */
function renderText(
  ctx: CanvasRenderingContext2D, 
  w: number, 
  h: number, 
  config: TextConfig, 
  fontFamily: string
) {
  if (!config.title && !config.detail) return;
  
  const isVertical = h > w;
  const style = config.fontStyle || 'modern';
  const weight = FONT_REGISTRY[style].weight;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 标题渲染逻辑
  if (config.title) {
    const fs = Math.floor(w * 0.08);
    ctx.font = `${weight} ${fs}px "${fontFamily}"`;
    ctx.fillStyle = "#FFFFFF";

    // 根据字体风格应用不同阴影/特效
    switch(style) {
      case 'calligraphy':
        ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 15;
        break;
      case 'elegant':
        ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 8;
        ctx.letterSpacing = "4px";
        break;
      case 'modern':
        ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4;
        ctx.strokeStyle = "black"; ctx.lineWidth = 2;
        ctx.strokeText(config.title, w / 2, isVertical ? h * 0.15 : h * 0.82);
        break;
      case 'playful':
        ctx.shadowColor = "rgba(249,115,22,0.4)"; ctx.shadowBlur = 10;
        break;
    }

    ctx.fillText(config.title, w / 2, isVertical ? h * 0.15 : h * 0.82);
  }

  // 副标题/卖点渲染逻辑
  if (config.detail) {
    const fs = Math.floor(w * 0.038);
    ctx.font = `600 ${fs}px "${fontFamily}"`;
    const dy = isVertical ? h * 0.22 : h * 0.91;
    
    // 背景胶囊块渲染
    const tw = ctx.measureText(config.detail).width;
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = style === 'playful' ? "rgba(249,115,22,0.8)" : "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.roundRect(w/2 - tw/2 - 15, dy - fs/2 - 8, tw + 30, fs + 16, 30);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(config.detail, w / 2, dy);
  }
  ctx.restore();
}
