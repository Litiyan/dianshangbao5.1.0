import { removeBackground } from "@imgly/background-removal";
import { TextConfig } from "../types";

/**
 * 核心引擎：空景舞台合成方案
 */
export async function processFinalImage(
  aiBackgroundUrl: string,
  originalImageBase64: string,
  textConfig: TextConfig
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. 提取商品前景 (WASM 纯前端抠图)
      const blob = await fetch(originalImageBase64).then(res => res.blob());
      const mattedBlob = await removeBackground(blob);
      const mattedUrl = URL.createObjectURL(mattedBlob);

      // 2. 并行加载资源
      const [bgImg, fgImg] = await Promise.all([
        loadImage(aiBackgroundUrl),
        loadImage(mattedUrl)
      ]);

      // 3. 初始化主画布
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas context failed");

      canvas.width = bgImg.width;
      canvas.height = bgImg.height;

      // ---------------------------------------------------------
      // 第一层：绘制 AI 渲染的纯空景舞台 (提供光影氛围)
      // ---------------------------------------------------------
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      // ---------------------------------------------------------
      // 第二层：商品物理合成 (核心逻辑)
      // ---------------------------------------------------------
      // 智能缩放计算：保持 aspect ratio，占据画布高度约 60-70%
      const paddingScale = 0.65;
      let fgWidth, fgHeight;
      const fgRatio = fgImg.width / fgImg.height;
      const canvasRatio = canvas.width / canvas.height;

      if (fgRatio > canvasRatio) {
        // 商品太宽
        fgWidth = canvas.width * paddingScale;
        fgHeight = fgWidth / fgRatio;
      } else {
        // 商品太高
        fgHeight = canvas.height * paddingScale;
        fgWidth = fgHeight * fgRatio;
      }

      // 计算位置：水平居中，垂直偏下（模拟站在平面上，重心在 60% 位置）
      const x = (canvas.width - fgWidth) / 2;
      const y = (canvas.height - fgHeight) * 0.65;

      // --- 物理阴影补偿 (Grounding Shadows) ---
      ctx.save();
      // A. 环境遮蔽阴影 (Ambient Occlusion style)
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 50;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 25;
      
      // B. 接触点强化影 (Contact Shadow)
      // 绘制一个微小的模糊圆角矩形作为接触点加深
      const contactCtx = canvas.getContext('2d');
      if (contactCtx) {
        ctx.beginPath();
        ctx.ellipse(x + fgWidth / 2, y + fgHeight - 5, fgWidth * 0.4, 15, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fill();
      }

      // 绘制原始商品 (100% 物理细节，无 AI 篡改)
      ctx.drawImage(fgImg, x, y, fgWidth, fgHeight);
      ctx.restore();

      // ---------------------------------------------------------
      // 第三层：矢量文字排版 (零乱码)
      // ---------------------------------------------------------
      if (textConfig.title || textConfig.detail) {
        renderText(ctx, canvas.width, canvas.height, textConfig);
      }

      // 导出高保真结果
      const finalBase64 = canvas.toDataURL('image/png', 0.95);
      
      // 内存管理
      URL.revokeObjectURL(mattedUrl);
      resolve(finalBase64);

    } catch (error) {
      console.error("Composite Engine Error:", error);
      reject(error);
    }
  });
}

/**
 * 图片加载工具
 */
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
 * 矢量文字排版引擎
 */
function renderText(ctx: CanvasRenderingContext2D, w: number, h: number, config: TextConfig) {
  const isVertical = h > w;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. 主标题渲染
  if (config.title) {
    const fontSize = Math.floor(w * 0.085);
    ctx.font = `900 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    
    // 文本立体感
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    
    const titleY = isVertical ? h * 0.12 : h * 0.82;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(config.title, w / 2, titleY);
  }

  // 2. 副标题/胶囊卖点渲染
  if (config.detail) {
    const fontSize = Math.floor(w * 0.045);
    ctx.font = `600 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    const detailY = isVertical ? h * 0.20 : h * 0.91;
    
    // 绘制品质胶囊底框
    const textWidth = ctx.measureText(config.detail).width;
    const px = 24;
    const py = 12;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.roundRect(w/2 - textWidth/2 - px, detailY - fontSize/2 - py, textWidth + px*2, fontSize + py*2, 40);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(config.detail, w / 2, detailY);
  }

  ctx.restore();
}
