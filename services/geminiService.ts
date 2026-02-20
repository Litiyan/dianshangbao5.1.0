import { MarketAnalysis, ScenarioType, TextConfig } from "../types";

const BFF_ENDPOINT = '/api/gemini';

/**
 * 工业级动态提示词工程 (Dynamic Prompt Engineering) 引擎
 * 核心逻辑：语义氛围提取 + 物理参数强压 + 硬件级摄影规范
 */
function buildEnhancedPrompt(
  scenario: ScenarioType,
  analysis: MarketAnalysis,
  userIntent: string,
  textConfig: TextConfig
): string {
  
  // 1. 顶层架构约束 (System Guardrails) - 最高权重指令，锁定输出边界
  const systemGuardrails = `
    CRITICAL SYSTEM INSTRUCTION: 
    You are a world-class commercial set designer for high-end fashion and tech brands. 
    Your ONLY task is to create a hyper-realistic EMPTY background stage. 
    DO NOT generate the main product, bottles, or any placeholder items in the center. 
    Focus on impeccable microscopic details: sharp wood grain, realistic water droplets, physically accurate caustic reflections, and authentic dust motes in light beams. 
    The center stage MUST remain a logical, clean empty space for post-production compositing.
  `.trim();

  // 2. 图文风格协同引擎 (Text-Image Synergy Engine)
  // 解析文字语义意象，将其转化为视觉指令 (Lighting, Color, Material)
  let synergyBlock = "";
  if (textConfig.isEnabled && (textConfig.title || textConfig.detail)) {
    const semanticSeed = `${textConfig.title} ${textConfig.detail}`.toLowerCase();
    let visualVibe = "Use professional, balanced neutral commercial lighting.";
    
    // 语义路由分支
    if (/(科技|智能|极速|未来|AI|芯片|tech|smart|future|cyber)/.test(semanticSeed)) {
      visualVibe = "Sleek neon accents, cold-toned cyan and deep blue palette, brushed aluminum or tempered glass surfaces, subtle digital bokeh.";
    } else if (/(新年|年货|喜庆|暖|节日|送礼|festival|gift|warm|celebration)/.test(semanticSeed)) {
      visualVibe = "Festive warm lighting (2700K), rich red and gold color palette, soft glowing embers or warm candle-light bokeh, velvet textures.";
    } else if (/(自然|纯净|草本|有机|森林|露水|natural|pure|organic|eco)/.test(semanticSeed)) {
      visualVibe = "Soft morning sunlight, organic textures (raw linen, weathered stone), airy color palette with sage green and off-white, natural shadows.";
    } else if (/(奢华|高端|极致|黑金|精品|luxury|premium|elite|gold)/.test(semanticSeed)) {
      visualVibe = "Sophisticated chiaroscuro lighting, expansive negative space, premium materials like dark nero marquina marble or matte silk, sharp golden rim lights.";
    }

    synergyBlock = `
      [TEXT-IMAGE SYNERGY]
      The visual mood MUST perfectly harmonize with the following promotional text: "${textConfig.title}". 
      ${visualVibe}
      The palette and lighting must feel like a direct extension of the text's semantic soul.
    `.trim();
  }

  // 3. 平台与场景细节 (Scenario Context)
  const scenarioMatrix: Record<string, string> = {
    [ScenarioType.PLATFORM_MAIN_DETAIL]: "Composition: E-commerce standard. Focus: Minimalist product pedestal, 3-point softbox studio setup.",
    [ScenarioType.BUYER_SHOW]: "Composition: Lifestyle UGC. Focus: Domestic environment, warm daylight from side window, authentic cluttered-but-clean look.",
    [ScenarioType.MOMENTS_POSTER]: "Composition: 9:16 Vertical. Focus: High negative space at top/bottom, dramatic key light on the base surface.",
    [ScenarioType.LIVE_GREEN_SCREEN]: "Composition: 16:9 Landscape. Focus: Depth-rich luxury interior, f/1.2 blur, highly immersive showroom vibe.",
    [ScenarioType.CROSS_BORDER_LOCAL]: "Composition: Amazon Global. Focus: Scandinavian minimalism, bright high-key lighting, bright oak or white stone."
  };

  // 4. 摄影机与材质强约束 (Camera & Material Forcing)
  const technicalSpecs = `
    [TECHNICAL SPECIFICATIONS]
    - CAMERA: Shot on Hasselblad H6D-400c, 85mm f/1.4 prime lens.
    - APERTURE: f/5.6 for optimal environmental detail sharpness.
    - PERSPECTIVE: Mandatory [${analysis.perspective}] camera angle.
    - LIGHTING DIRECTION: Primary source MUST arrive from [${analysis.lightingDirection}].
    - POST-PROCESSING: Cinematic color grading, 8k resolution, raw photorealism, volumetric lighting (God rays), zero AI artifacts.
  `.trim();

  // 最终拼装过程
  return `
    ${systemGuardrails}

    ${synergyBlock}

    [SCENARIO MANDATE]
    ${scenarioMatrix[scenario] || "Professional Commercial Stage."}
    Additional User Intent: ${userIntent || "Premium quality background."}

    ${technicalSpecs}

    [FINAL SAFETY CHECK]
    REITERATION: DO NOT RENDER ANY PRODUCT. DO NOT RENDER ANY TEXT. 
    OUTPUT ONLY THE EMPTY, PHOTOREALISTIC STAGE.
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
  textConfig: TextConfig
): Promise<string> {
  
  // 执行增强型 Prompt 引擎
  const finalPrompt = buildEnhancedPrompt(scenario, analysis, userIntent, textConfig);

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
  throw new Error("Render stage empty background failed.");
}
