import { MarketAnalysis, ScenarioType, TextConfig, GenerationMode } from "../types";

const BFF_ENDPOINT = '/api/gemini';

/**
 * 工业级动态提示词工程 (Dynamic Prompt Engineering) 引擎
 */
function buildEnhancedPrompt(
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig,
  mode: GenerationMode
): string {
  
  // 1. 顶层架构约束 (System Guardrails) - 根据模式分流
  const systemGuardrails = mode === 'precision' 
    ? `
    CRITICAL SYSTEM INSTRUCTION: EMPTY STAGE ONLY. 
    You are a commercial set designer. DO NOT draw or render the main product. 
    Create a highly realistic EMPTY background stage. 
    Leave a logical empty space in the center (e.g., a pedestal or cleared surface) for a product to be composited later. 
    Match lighting direction [${analysis.lightingDirection}] and perspective [${analysis.perspective}] strictly.
    Focus on impeccable microscopic details: sharp wood grain, realistic water droplets.
    `
    : `
    CRITICAL SYSTEM INSTRUCTION: ARTISTIC REDRAW & FUSION. 
    You are a world-class CG artist. Integrate the provided reference product image(s) SEAMLESSLY into a new environment. 
    MAINTAIN the core geometry, brand colors, and identity of the product strictly. 
    ELEVATE the visual quality: add environmental light wrapping, subsurface scattering, and breathtaking cinematic reflections. 
    The product must look like it was physically present during the shot, reflecting its surroundings.
    `;

  // 2. 图文风格协同引擎
  let synergyBlock = "";
  if (textConfig.isEnabled && (textConfig.title || textConfig.detail)) {
    const semanticSeed = `${textConfig.title} ${textConfig.detail}`.toLowerCase();
    let visualVibe = "Use professional, balanced neutral commercial lighting.";
    
    if (/(科技|智能|极速|未来|AI|chip|tech|smart|future|cyber)/.test(semanticSeed)) {
      visualVibe = "Sleek neon accents, cold-toned cyan palette, brushed aluminum surfaces.";
    } else if (/(新年|年货|喜庆|暖|节日|送礼|festival|gift|warm|celebration)/.test(semanticSeed)) {
      visualVibe = "Festive warm lighting (2700K), rich red and gold palette, velvet textures.";
    } else if (/(自然|纯净|草本|有机|natural|pure|organic|eco)/.test(semanticSeed)) {
      visualVibe = "Soft morning sunlight, organic textures (linen, stone), airy sage green tones.";
    } else if (/(奢华|高端|极致|黑金|luxury|premium|elite|gold)/.test(semanticSeed)) {
      visualVibe = "Sophisticated chiaroscuro lighting, dark Nero Marquina marble, sharp golden rim lights.";
    }

    synergyBlock = `
      [TEXT-IMAGE SYNERGY]
      Match mood with: "${textConfig.title}". 
      ${visualVibe}
    `.trim();
  }

  // 3. 场景描述
  const scenarioMatrix: Record<string, string> = {
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "E-commerce standard studio. Focus on premium product pedestal and clean 3-point lighting.",
    [ScenarioType.BUYER_SHOW]: "Lifestyle UGC environment. Authentic home setting with soft window light.",
    [ScenarioType.MOMENTS_POSTER]: "9:16 Vertical. High drama, strong negative space for text at top and bottom.",
    [ScenarioType.LIVE_GREEN_SCREEN]: "16:9 Landscape. Luxury interior showroom, deep cinematic bokeh.",
    [ScenarioType.CROSS_BORDER_LOCAL]: "Global minimalist style. Scandinavian light oak, bright high-key daylight."
  };

  // 4. 技术规格
  const technicalSpecs = `
    [TECHNICAL SPECIFICATIONS]
    - CAMERA: Hasselblad H6D, 85mm f/1.4.
    - PERSPECTIVE: ${analysis.perspective}.
    - LIGHTING: Primary light from ${analysis.lightingDirection}.
    - QUALITY: 8k resolution, raw photorealism, volumetric lighting, cinematic grading.
  `.trim();

  return `
    ${systemGuardrails}
    ${synergyBlock}
    [CONTEXT]
    ${scenarioMatrix[scenario] || "Commercial Stage."}
    Intent: ${userIntent || "Commercial masterpiece."}
    ${technicalSpecs}
    [SAFETY]
    NO TEXT IN IMAGE. ${mode === 'precision' ? 'NO PRODUCT IN CENTER.' : 'INTEGRATE PRODUCT PERFECTLY.'}
  `.trim();
}

async function sendRequest(model: string, payload: any) {
  const response = await fetch(BFF_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, payload })
  });
  if (!response.ok) throw new Error("AI Gateway Error");
  return await response.json();
}

export async function analyzeProduct(base64Images: string[]): Promise<MarketAnalysis> {
  const payload = {
    contents: [{
      parts: [
        ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })),
        { text: "Analyze this product. Output JSON ONLY: {productType, targetAudience, sellingPoints[], suggestedPrompt, isApparel, perspective, lightingDirection}." }
      ]
    }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const result = await sendRequest('gemini-3-flash-preview', payload);
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  
  try {
    const data = JSON.parse(text);
    return {
      ...data,
      perspective: data.perspective || "Eye-level",
      lightingDirection: data.lightingDirection || "Top-Left"
    };
  } catch (e) {
    return {
      productType: "Product", targetAudience: "Consumer", sellingPoints: [], suggestedPrompt: "", isApparel: false,
      perspective: "Eye-level", lightingDirection: "Top-Left"
    };
  }
}

export async function generateScenarioImage(
  base64Images: string[],
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig,
  mode: GenerationMode
): Promise<string> {
  
  const finalPrompt = buildEnhancedPrompt(scenario, analysis, userIntent, textConfig, mode);
  const ratioMap: any = { 
    [ScenarioType.MOMENTS_POSTER]: "9:16", 
    [ScenarioType.LIVE_OVERLAY]: "16:9", 
    [ScenarioType.LIVE_GREEN_SCREEN]: "16:9" 
  };

  const payload = {
    contents: [{ 
      parts: [
        ...base64Images.map(data => ({ inlineData: { data, mimeType: 'image/png' } })), 
        { text: finalPrompt }
      ] 
    }],
    generationConfig: { 
      imageConfig: { 
        aspectRatio: ratioMap[scenario] || "1:1" 
      } 
    }
  };

  const result = await sendRequest('gemini-2.5-flash-image', payload);
  const part = result.candidates?.[0]?.content?.parts.find((p: any) => p.inlineData);
  
  if (part) return `data:image/png;base64,${part.inlineData.data}`;
  throw new Error("Render process failed.");
}
