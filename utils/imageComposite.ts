import { removeBackground } from "@imgly/background-removal";
import { TextConfig } from "../types";

/**
 * 核心引擎：将 AI 背景、原始商品前景、前端文案合成为最终大片
 */
export async function processFinalImage(
  aiBackgroundUrl: string,
  originalImageBase64: string,
  textConfig: TextConfig
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. 提取商品前景 (使用 WASM 纯前端抠图)
      const blob = await fetch(originalImageBase64).then(res => res.blob());
      const mattedBlob = await removeBackground(blob);
      const mattedUrl = URL.createObjectURL(mattedBlob);

      // 2. 加载背景图与前景图
      const [bgImg, fgImg] = await Promise.all([
        loadImage(aiBackgroundUrl),
        loadImage(mattedUrl)
      ]);

      // 3. 创建 Canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");

      // 统一画质尺寸
      canvas.width = bgImg.width;
      canvas.height = bgImg.height;

      // 第一层：绘制 AI 生成的底图 (提供光影氛围)
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      // 第二层：商品保真覆盖 (1:1 物理对齐)
      // 计算商品在底图中的位置，通常居中显示或根据构图自适应
      const scale = 0.7; // 稍微缩小一点防止贴边
      const fgWidth = canvas.width * scale;
      const fgHeight = (fgImg.height / fgImg.width) * fgWidth;
      const x = (canvas.width - fgWidth) / 2;
      const y = (canvas.height - fgHeight) / 2;
      
      // 绘制一个轻微的接触阴影补偿 AI 生成背景中可能消失的阴影
      ctx.shadowColor = "rgba(0,0,0,0.15)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;
      ctx.drawImage(fgImg, x, y, fgWidth, fgHeight);
      ctx.shadowColor = "transparent"; // 重置阴影

      // 第三层：矢量文字排版 (零乱码)
      if (textConfig.title || textConfig.detail) {
        renderText(ctx, canvas.width, canvas.height, textConfig);
      }

      // 导出最终图像
      const finalBase64 = canvas.toDataURL('image/png', 0.95);
      
      // 释放内存
      URL.revokeObjectURL(mattedUrl);
      resolve(finalBase64);

    } catch (error) {
      console.error("Composite Engine Error:", error);
      reject(error);
    }
  });
}

/**
 * 加载图片 Promise 封装
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
 * 商业视觉文本排版引擎
 */
function renderText(ctx: CanvasRenderingContext2D, w: number, h: number, config: TextConfig) {
  const isVertical = h > w; // 针对 9:16 的特殊排版
  
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. 绘制标题
  if (config.title) {
    const fontSize = Math.floor(w * 0.08);
    ctx.font = `900 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    
    // 文本阴影确保可读性
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    
    // 渐变色或纯白
    const titleY = isVertical ? h * 0.15 : h * 0.82;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(config.title, w / 2, titleY);
  }

  // 2. 绘制副标题/卖点
  if (config.detail) {
    const fontSize = Math.floor(w * 0.04);
    ctx.font = `500 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.shadowBlur = 6;
    
    const detailY = isVertical ? h * 0.22 : h * 0.90;
    
    // 绘制一个胶囊底色 (Pill Background) 增加品质感
    const textWidth = ctx.measureText(config.detail).width;
    const padding = 20;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.roundRect(w/2 - textWidth/2 - padding, detailY - fontSize/2 - 8, textWidth + padding*2, fontSize + 16, 30);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(config.detail, w / 2, detailY);
  }

  ctx.restore();
}
