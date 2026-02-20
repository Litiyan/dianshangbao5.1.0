
import { GoogleGenAI, Type } from "@google/genai";
import { MarketAnalysis, ScenarioType, TextConfig, GenerationMode } from "../types";

/**
 * Initialize the Google GenAI client using the provided environment variable.
 * Always use named parameter for apiKey.
 */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 工业级动态提示词工程 (DPE) 引擎 - 物理参数接力版
 */
function buildEnhancedPrompt(
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig,
  mode: GenerationMode
): string {
  
  // 1. 顶层架构约束 (System Guardrails)
  const systemGuardrails = mode === 'precision' 
    ? `
    CRITICAL SYSTEM INSTRUCTION: PHYSICAL TWIN STAGE. 
    You are a Photogrammetry Expert. You MUST build an EMPTY background stage that matches the EXACT physical coordinates of the reference object.
    
    [ABSOLUTE PHYSICAL CONSTRAINTS]
    - MANDATORY Camera Angle: ${analysis.physicalSpecs.cameraPerspective}.
    - MANDATORY Light Source Direction: ${analysis.physicalSpecs.lightingDirection}.
    - MANDATORY Color Temperature: ${analysis.physicalSpecs.colorTemperature}.
    
    The background MUST feel like a logical extension of the object's original environment. 
    The empty center space (pedestal/surface) MUST be ready to receive light and cast shadows consistent with these parameters. 
    DO NOT RENDER THE PRODUCT.
    `
    : `
    CRITICAL SYSTEM INSTRUCTION: ARTISTIC REDRAW & FUSION. 
    You are a world-class CG artist. Integrate the product SEAMLESSLY into a new environment. 
    MAINTAIN brand identity but ELEVATE the visual quality with cinematic light wrapping and environmental reflections.
    `;

  // 2. 图文风格协同引擎
  let synergyBlock = "";
  if (textConfig.isEnabled && (textConfig.title || textConfig.detail)) {
    const semanticSeed = `${textConfig.title} ${textConfig.detail}`.toLowerCase();
    let visualVibe = "Balanced neutral commercial lighting.";
    
    if (/(科技|智能|未来|AI|chip|tech|smart)/.test(semanticSeed)) {
      visualVibe = "Sleek neon accents, cold-toned cyan palette, brushed metal surfaces.";
    } else if (/(新年|年货|喜庆|暖|festival|warm)/.test(semanticSeed)) {
      visualVibe = "Festive warm 2700K lighting, rich red/gold palette.";
    } else if (/(自然|纯净|草本|natural|pure|eco)/.test(semanticSeed)) {
      visualVibe = "Soft morning sunlight, organic textures, airy sage green.";
    } else if (/(奢华|高端|luxury|premium)/.test(semanticSeed)) {
      visualVibe = "Chiaroscuro lighting, dark marble, sharp golden rim lights.";
    }

    synergyBlock = `[TEXT-IMAGE SYNERGY] Mood: ${visualVibe}`;
  }

  // 3. 技术规格
  const technicalSpecs = `
    [TECHNICAL SPECS]
    - CAMERA: Hasselblad H6D, 85mm f/1.4.
    - QUALITY: 8k resolution, raw photorealism, volumetric lighting.
  `.trim();

  return `
    ${systemGuardrails}
    ${synergyBlock}
    [CONTEXT] Scenario: ${scenario}. User Intent: ${userIntent || "Commercial shot."}
    ${technicalSpecs}
    [SAFETY] NO TEXT. ${mode === 'precision' ? 'NO PRODUCT IN CENTER.' : 'FUSE PRODUCT NATURALLY.'}
  `.trim();
}

/**
 * 分析产品并提取物理参数 (使用 gemini-3-pro-preview for complex reasoning)
 */
export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{
        parts: [
          ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
          { text: `
            You are a Photogrammetry Expert. Analyze the product and the original photograph.
            Output JSON with product analysis and physical specifications.
          ` }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productType: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            sellingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedPrompt: { type: Type.STRING },
            isApparel: { type: Type.BOOLEAN },
            perspective: { type: Type.STRING },
            lightingDirection: { type: Type.STRING },
            physicalSpecs: {
              type: Type.OBJECT,
              properties: {
                cameraPerspective: { type: Type.STRING },
                lightingDirection: { type: Type.STRING },
                colorTemperature: { type: Type.STRING }
              },
              required: ["cameraPerspective", "lightingDirection", "colorTemperature"]
            }
          },
          required: ["productType", "targetAudience", "sellingPoints", "suggestedPrompt", "isApparel", "perspective", "lightingDirection", "physicalSpecs"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return {
      ...data,
      perspective: data.perspective || "Eye-level",
      lightingDirection: data.lightingDirection || "Top-Left",
      physicalSpecs: data.physicalSpecs || {
        cameraPerspective: "eye-level straight on",
        lightingDirection: "soft light from top-left",
        colorTemperature: "natural daylight"
      }
    };
  } catch (e) {
    console.error("Analysis error:", e);
    throw new Error("产品参数解析失败，请确保上传清晰的商品图。");
  }
}

/**
 * 根据场景和分析生成背景图像 (使用 gemini-2.5-flash-image)
 */
export async function generateScenarioImage(
  base64Images: string[],
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig,
  mode: GenerationMode
): Promise<string> {
  
  const finalPrompt = buildEnhancedPrompt(scenario, analysis, userIntent, textConfig, mode);
  const ratioMap: Record<string, "1:1" | "9:16" | "16:9" | "3:4" | "4:3"> = { 
    [ScenarioType.MOMENTS_POSTER]: "9:16", 
    [ScenarioType.LIVE_OVERLAY]: "16:9", 
    [ScenarioType.LIVE_GREEN_SCREEN]: "16:9",
    [ScenarioType.MODEL_REPLACEMENT]: "3:4",
    [ScenarioType.BUYER_SHOW]: "3:4"
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ 
      parts: [
        ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })), 
        { text: finalPrompt }
      ] 
    }],
    config: { 
      imageConfig: { 
        aspectRatio: ratioMap[scenario] || "1:1" 
      } 
    }
  });

  // Find the image part in candidates
  for (const candidate of response.candidates || []) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("视觉渲染引擎执行失败。");
}
