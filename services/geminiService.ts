import { MarketAnalysis, ScenarioType, TextConfig, GenerationMode } from "../types";

const BFF_ENDPOINT = '/api/gemini';

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
        { text: `
          You are a Photogrammetry Expert. Analyze the product and the original photograph.
          Output JSON ONLY with this schema:
          {
            "productType": "string",
            "targetAudience": "string",
            "sellingPoints": ["string"],
            "suggestedPrompt": "string",
            "isApparel": boolean,
            "perspective": "string",
            "lightingDirection": "string",
            "physicalSpecs": {
              "cameraPerspective": "precise camera angle and height",
              "lightingDirection": "primary light source orientation (e.g. top-left at 45deg)",
              "colorTemperature": "description of the color tone and kelvin"
            }
          }
        ` }
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
      lightingDirection: data.lightingDirection || "Top-Left",
      physicalSpecs: data.physicalSpecs || {
        cameraPerspective: "eye-level straight on",
        lightingDirection: "soft light from top-left",
        colorTemperature: "natural daylight"
      }
    };
  } catch (e) {
    throw new Error("产品参数解析失败，请确保上传清晰的商品图。");
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
  throw new Error("视觉渲染引擎执行失败。");
}
