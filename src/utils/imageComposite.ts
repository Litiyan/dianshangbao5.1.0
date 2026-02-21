
import { removeBackground } from "@imgly/background-removal";
import { TextConfig, MarketAnalysis, GenerationMode, FontStyle } from "../types";

const FONT_REGISTRY: Record<FontStyle, { family: string; weight: string; google: string }> = {
  modern: { family: 'Noto Sans SC', weight: '900', google: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@900&display=swap' },
  elegant: { family: 'Noto Serif SC', weight: '700', google: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&display=swap' },
  calligraphy: { family: 'Ma Shan Zheng', weight: '400', google: 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap' },
  playful: { family: 'ZCOOL KuaiLe', weight: '400', google: 'https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap' },
  brush: { family: 'Zhi Mang Xing', weight: '400', google: 'https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap' },
  serif: { family: 'Cinzel', weight: '700', google: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap' },
  display: { family: 'Playfair Display', weight: '900', google: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&display=swap' },
  handwriting: { family: 'Dancing Script', weight: '700', google: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap' },
  tech: { family: 'Montserrat', weight: '900', google: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap' },
  classic: { family: 'Libre Baskerville', weight: '700', google: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&display=swap' },
  street: { family: 'Permanent Marker', weight: '400', google: 'https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap' },
  cursive: { family: 'Sacramento', weight: '400', google: 'https://fonts.googleapis.com/css2?family=Sacramento&display=swap' }
};

async function preloadFont(style: FontStyle): Promise<string> {
  const config = FONT_REGISTRY[style];
  const fontId = `font-${style}`;
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

function calculateShadowParams(lightingDir: string, perspective: string) {
  const dir = lightingDir.toLowerCase();
  const per = perspective.toLowerCase();
  let skewX = 0.5; let scaleY = 0.3; let offsetX = 10; let offsetY = 5;
  if (dir.includes('left')) skewX = 0.6;
  if (dir.includes('right')) skewX = -0.6;
  if (dir.includes('front')) { skewX = 0.1; offsetY = 20; }
  if (dir.includes('back')) { skewX = 0.2; offsetY = -10; }
  if (per.includes('top-down')) scaleY = 0.6;
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

      const { skewX, scaleY, offsetX, offsetY } = calculateShadowParams(analysis.physicalSpecs.lightingDirection, analysis.physicalSpecs.cameraPerspective);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = fw; shadowCanvas.height = fh;
      const sctx = shadowCanvas.getContext('2d')!;
      sctx.drawImage(fgImg, 0, 0, fw, fh);
      sctx.globalCompositeOperation = 'source-in';
      sctx.fillStyle = 'black';
      sctx.fillRect(0, 0, fw, fh);

      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.filter = 'blur(35px)';
      ctx.setTransform(1, 0, skewX, scaleY, fx + offsetX, fy + fh + offsetY);
      ctx.drawImage(shadowCanvas, 0, -fh, fw, fh);
      ctx.restore();

      ctx.save();
      ctx.drawImage(fgImg, fx, fy, fw, fh);
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
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => resolve(img); img.onerror = () => reject(new Error("Image Load Error"));
    img.src = src;
  });
}

function renderText(ctx: CanvasRenderingContext2D, w: number, h: number, config: TextConfig, fontFamily: string) {
  if (!config.title && !config.detail) return;
  const style = config.fontStyle;
  const weight = FONT_REGISTRY[style]?.weight || '900';
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  
  const yPos = (h * config.positionY) / 100;

  if (config.title) {
    const fs = Math.floor(w * (config.fontSize / 100));
    ctx.font = `${weight} ${fs}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = config.mainColor;
    
    if (config.shadowIntensity > 0) {
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = config.shadowIntensity;
      ctx.shadowOffsetX = config.shadowIntensity / 4;
      ctx.shadowOffsetY = config.shadowIntensity / 4;
    }
    
    ctx.fillText(config.title, w / 2, yPos);
  }
  
  if (config.detail) {
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    const fs = Math.floor(w * 0.04);
    ctx.font = `400 ${fs}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = config.subColor || config.mainColor;
    ctx.fillText(config.detail, w / 2, yPos + (w * (config.fontSize / 100)) * 0.85);
  }
  ctx.restore();
}
