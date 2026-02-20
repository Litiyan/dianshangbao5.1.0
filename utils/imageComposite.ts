import { removeBackground } from "@imgly/background-removal";
import { TextConfig, MarketAnalysis, GenerationMode } from "../types";

/**
 * 物理级环境融合与智能避让合成引擎
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
      // 1. 加载 AI 生成的结果（可能是空背景，也可能是包含产品的全景）
      const bgImg = await loadImage(aiResultUrl);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas context failed");

      canvas.width = bgImg.width;
      canvas.height = bgImg.height;

      // 绘制底层
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      // --- 分支：艺术重塑模式 (Creative) 直接跳过产品合成，保留 AI 的融合效果 ---
      if (mode === 'creative') {
        if (textConfig.title || textConfig.detail) {
          renderText(ctx, canvas.width, canvas.height, textConfig);
        }
        return resolve(canvas.toDataURL('image/png', 0.95));
      }

      // --- 分支：物理保真模式 (Precision) 执行高精合成链路 ---
      
      // 2. 提取商品前景 (WASM 离屏处理)
      const blob = await fetch(originalImageBase64).then(res => res.blob());
      const mattedBlob = await removeBackground(blob);
      const mattedUrl = URL.createObjectURL(mattedBlob);
      const fgImg = await loadImage(mattedUrl);

      // 3. 计算商品布局
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

      // 4. 绘制矩阵变换投影
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = fw;
      shadowCanvas.height = fh;
      const sctx = shadowCanvas.getContext('2d')!;
      sctx.drawImage(fgImg, 0, 0, fw, fh);
      sctx.globalCompositeOperation = 'source-in';
      sctx.fillStyle = 'black';
      sctx.fillRect(0, 0, fw, fh);

      ctx.save();
      let skewX = 0.5; 
      let scaleY = 0.3;
      if (analysis.lightingDirection.toLowerCase().includes('right')) skewX = -0.5;
      if (analysis.perspective.toLowerCase().includes('high')) scaleY = 0.5;

      ctx.globalAlpha = 0.25;
      ctx.filter = 'blur(25px)';
      ctx.setTransform(1, 0, skewX, scaleY, fx + (fw * 0.1), fy + fh);
      ctx.drawImage(shadowCanvas, 0, -fh, fw, fh);
      ctx.restore();

      // 5. 绘制接触影
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.filter = 'blur(8px)';
      ctx.beginPath();
      ctx.ellipse(fx + fw/2, fy + fh, fw * 0.45, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'black';
      ctx.fill();
      ctx.restore();

      // 6. 绘制商品本体并注入环境光包裹
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.drawImage(fgImg, fx, fy, fw, fh);
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.05;
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height, fx, fy, fw, fh);
      ctx.restore();

      // 7. 文字排版
      if (textConfig.title || textConfig.detail) {
        renderText(ctx, canvas.width, canvas.height, textConfig);
      }

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

function renderText(ctx: CanvasRenderingContext2D, w: number, h: number, config: TextConfig) {
  const isVertical = h > w;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (config.title) {
    const fs = Math.floor(w * 0.08);
    ctx.font = `900 ${fs}px sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 10;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(config.title, w / 2, isVertical ? h * 0.15 : h * 0.82);
  }
  if (config.detail) {
    const fs = Math.floor(w * 0.04);
    ctx.font = `600 ${fs}px sans-serif`;
    const dy = isVertical ? h * 0.22 : h * 0.91;
    const tw = ctx.measureText(config.detail).width;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.roundRect(w/2 - tw/2 - 15, dy - fs/2 - 8, tw + 30, fs + 16, 30);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(config.detail, w / 2, dy);
  }
  ctx.restore();
}
