
import React, { useState, useEffect } from 'react';
import { 
  Download, RefreshCw, X, MessageSquareText,
  Sparkles, Camera, LayoutGrid, Plus, Trash2, CheckCircle2, ShieldAlert,
  Zap, ShieldCheck, Palette, Type, Feather, PenTool, Smile, ChevronRight, Activity
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig, GenerationMode, FontStyle } from './types';
import { SCENARIO_CONFIGS } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';
import { processFinalImage } from './utils/imageComposite';

const LOADING_STEPS = [
  "> INITIALIZING NANAO_BANANA_VISION_V2 CORE...",
  "> ANALYZING PHOTOGRAMMETRY DATA...",
  "> RECONSTRUCTING LIGHTING MANIFOLD...",
  "> GEMINI_2.5_CLUSTER EXECUTING RENDER...",
  "> SYNTHESIZING VISUAL ANCHORS..."
];

const App: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'result'>('upload');
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [userIntent, setUserIntent] = useState("");
  const [textConfig, setTextConfig] = useState<TextConfig>({ 
    title: "", 
    detail: "", 
    isEnabled: true,
    fontStyle: 'modern'
  });
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>(ScenarioType.PLATFORM_MAIN_DETAIL);
  const [mode, setMode] = useState<GenerationMode>('precision');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<{title: string, msg: string} | null>(null);

  useEffect(() => {
    const scenarioToFont: Record<string, FontStyle> = {
      [ScenarioType.PLATFORM_MAIN_DETAIL]: 'modern',
      [ScenarioType.BUYER_SHOW]: 'playful',
      [ScenarioType.MODEL_REPLACEMENT]: 'elegant',
      [ScenarioType.MOMENTS_POSTER]: 'modern',
      [ScenarioType.CROSS_BORDER_LOCAL]: 'modern',
      [ScenarioType.TEXT_EDIT_TRANSLATE]: 'elegant',
      [ScenarioType.LIVE_GREEN_SCREEN]: 'modern',
      [ScenarioType.LIVE_OVERLAY]: 'modern',
    };
    setTextConfig(prev => ({ ...prev, fontStyle: scenarioToFont[selectedScenario] || 'modern' }));
  }, [selectedScenario]);

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    const readers = files.map(file => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    }));
    const results = await Promise.all(readers);
    setSourceImages(prev => [...prev, ...results].slice(0, 5));
    try {
      const res = await analyzeProduct(results.map(r => (r as string).split(',')[1]));
      setAnalysis(res);
    } catch (err) { console.error(err); }
  };

  const executeGeneration = async () => {
    if (sourceImages.length === 0) return;
    setIsProcessing(true);
    setStep('result');
    try {
      const currentAnalysis = analysis || await analyzeProduct([sourceImages[0].split(',')[1]]);
      const aiResult = await generateScenarioImage(
        sourceImages.map(img => img.split(',')[1]), 
        selectedScenario, 
        currentAnalysis, 
        userIntent, 
        textConfig,
        mode
      );
      const finalResult = await processFinalImage(
        aiResult, 
        sourceImages[0], 
        textConfig,
        currentAnalysis,
        mode
      );
      setResultImage(finalResult);
    } catch (err: any) {
      setError({ title: "CORE_SYSTEM_FAILURE", msg: err.message || "RENDER_ENGINE_HALTED" });
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0D] text-stone-300 font-sans selection:bg-orange-500/30 selection:text-white">
      {/* 顶部导航：赛博禅意风格 */}
      <header className="h-20 border-b border-stone-800/50 px-8 flex items-center justify-between backdrop-blur-xl sticky top-0 z-50">
        <div className="flex flex-col">
          <h1 className="text-2xl font-serif italic tracking-tight text-stone-100 flex items-center gap-3">
            电商宝 <span className="text-stone-500 font-light not-italic">Pro</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="font-mono text-[9px] text-stone-600 tracking-[0.2em] uppercase">
              Multimodal Engine Active // v4.5.2
            </span>
          </div>
        </div>
        
        <div className="hidden md:flex gap-8 font-mono text-[10px] tracking-widest text-stone-500 uppercase">
          <div className="flex flex-col items-end">
            <span className="text-stone-400">Cognitive Core</span>
            <span>Nanao Banana V2</span>
          </div>
          <div className="flex flex-col items-end border-l border-stone-800 pl-8">
            <span className="text-stone-400">Process cluster</span>
            <span>Gemini 2.5 Pro</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full p-6 md:p-12 flex-1">
        {step === 'upload' ? (
          <div className="space-y-12 animate-in fade-in duration-1000">
            
            {/* 核心模式切换：极简方正感 */}
            <div className="flex border border-stone-800/60 rounded-none bg-stone-900/40 p-1">
              {(['precision', 'creative'] as const).map(m => (
                <button 
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-4 px-6 font-mono text-[11px] tracking-[0.3em] uppercase transition-all relative ${
                    mode === m ? 'text-stone-100 bg-stone-800 shadow-inner' : 'text-stone-600 hover:text-stone-400'
                  }`}
                >
                  {m === 'precision' ? '[ PHYSICAL_PRECISION ]' : '[ ARTISTIC_CREATIVE ]'}
                  {mode === m && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>}
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-12 gap-12">
              {/* 左侧：输入区 */}
              <div className="lg:col-span-7 space-y-12">
                
                {/* 视觉锚点上传 */}
                <section>
                  <label className="font-mono text-[10px] text-stone-500 tracking-widest uppercase mb-4 block underline decoration-stone-800 underline-offset-8">
                    {">"} AWAITING_VISUAL_INPUT // 视觉锚点上传
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sourceImages.map((img, idx) => (
                      <div key={idx} className="aspect-square relative group bg-stone-900 border border-stone-800 overflow-hidden">
                        <img src={img} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity grayscale hover:grayscale-0 duration-500" />
                        <button 
                          onClick={() => setSourceImages(s => s.filter((_, i) => i !== idx))}
                          className="absolute top-2 right-2 p-1.5 bg-black/80 text-stone-400 hover:text-white transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {sourceImages.length < 5 && (
                      <label className="aspect-square border border-stone-800 border-dashed hover:border-stone-500 transition-colors flex flex-col items-center justify-center cursor-pointer group bg-stone-900/20">
                        <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                        <Plus className="text-stone-700 group-hover:text-stone-400 transition-colors" size={20} />
                        <span className="font-mono text-[9px] mt-4 text-stone-600 tracking-tighter uppercase group-hover:text-stone-400 transition-colors">
                          Add_Anchor
                        </span>
                      </label>
                    )}
                  </div>
                </section>

                {/* 场景描述：暗色输入 */}
                <section>
                  <label className="font-mono text-[10px] text-stone-500 tracking-widest uppercase mb-4 block underline decoration-stone-800 underline-offset-8">
                    {">"} CONTEXTUAL_INTENT // 场景重构意图
                  </label>
                  <div className="relative group">
                    <textarea 
                      value={userIntent} 
                      onChange={(e) => setUserIntent(e.target.value)} 
                      placeholder="ENTER SCENE RECONSTRUCTION PARAMETERS..." 
                      className="w-full h-40 bg-stone-900/60 border border-stone-800 p-6 text-sm font-mono tracking-tight text-stone-300 placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-all resize-none"
                    />
                    <div className="absolute bottom-4 right-4 text-[9px] font-mono text-stone-700 uppercase">
                      ln: {userIntent.split('\n').length} // ch: {userIntent.length}
                    </div>
                  </div>
                </section>
              </div>

              {/* 右侧：配置区 */}
              <div className="lg:col-span-5 space-y-12">
                
                {/* 画面文案 */}
                <section className="bg-stone-900/30 border border-stone-800/40 p-8 space-y-6">
                  <h3 className="font-mono text-[10px] text-stone-500 tracking-widest uppercase block underline decoration-stone-800 underline-offset-8 mb-4">
                    {">"} TYPOGRAPHIC_MANIFEST // 文案排版映射
                  </h3>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      value={textConfig.title} 
                      placeholder="PRIMARY_TITLE" 
                      onChange={(e) => setTextConfig({...textConfig, title: e.target.value})} 
                      className="w-full bg-stone-950 border-b border-stone-800 p-3 text-[13px] font-mono focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                    <input 
                      type="text" 
                      value={textConfig.detail} 
                      placeholder="DETAIL_SPEC" 
                      onChange={(e) => setTextConfig({...textConfig, detail: e.target.value})} 
                      className="w-full bg-stone-950 border-b border-stone-800 p-3 text-[13px] font-mono focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1 pt-4">
                    {(['modern', 'elegant', 'calligraphy', 'playful'] as FontStyle[]).map(style => {
                      const names = { modern: 'MODERN', elegant: 'SERIF', calligraphy: 'ZEN', playful: 'TYPE' };
                      return (
                        <button 
                          key={style}
                          onClick={() => setTextConfig({...textConfig, fontStyle: style})}
                          className={`py-2 text-[9px] font-mono tracking-widest border transition-all ${
                            textConfig.fontStyle === style 
                              ? 'bg-stone-100 text-stone-950 border-stone-100' 
                              : 'text-stone-600 border-stone-800 hover:border-stone-600'
                          }`}
                        >
                          {names[style]}
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* 交付平台 */}
                <section>
                  <h3 className="font-mono text-[10px] text-stone-500 tracking-widest uppercase block underline decoration-stone-800 underline-offset-8 mb-6">
                    {">"} TARGET_DEPLOYMENT // 交付场景
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {SCENARIO_CONFIGS.map(cfg => (
                      <button 
                        key={cfg.id} 
                        onClick={() => setSelectedScenario(cfg.id)} 
                        className={`p-4 text-left border transition-all flex flex-col gap-2 ${
                          selectedScenario === cfg.id 
                            ? 'bg-stone-100 border-stone-100 text-stone-950 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                            : 'bg-stone-900/40 border-stone-800/60 text-stone-600 hover:border-stone-500'
                        }`}
                      >
                        <span className="text-lg grayscale-0">{cfg.icon}</span>
                        <span className="text-[10px] font-mono tracking-tight font-bold">{cfg.name.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {/* 执行按钮 */}
            <div className="pt-8">
              <button 
                onClick={executeGeneration} 
                disabled={isProcessing || sourceImages.length === 0}
                className="group relative w-full h-20 bg-stone-100 text-stone-950 flex items-center justify-center overflow-hidden hover:bg-white active:scale-[0.99] transition-all disabled:opacity-20 disabled:grayscale"
              >
                <div className="absolute inset-0 w-0 bg-stone-300 group-hover:w-full transition-all duration-700 ease-out"></div>
                <div className="relative flex items-center gap-4 font-mono font-black tracking-[0.6em] uppercase text-sm">
                  {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : null}
                  [ EXECUTE_RENDER ]
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* 结果展示与渲染态 */
          <div className="min-h-[600px] flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
            {isProcessing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12">
                <div className="relative w-24 h-24">
                   <div className="absolute inset-0 border border-stone-800 animate-pulse"></div>
                   <div className="absolute inset-4 border border-stone-600 animate-spin duration-[3000ms]"></div>
                   <div className="absolute inset-8 border border-stone-400 animate-ping"></div>
                </div>
                <div className="space-y-3">
                   <p className="text-stone-100 font-mono text-[13px] tracking-wider animate-pulse italic">
                     {LOADING_STEPS[loadingTextIndex]}
                   </p>
                   <p className="font-mono text-[9px] text-stone-600 uppercase tracking-[0.4em]">
                     Processing via cluster: GPU_STATION_B04
                   </p>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-12 pb-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-800 pb-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-serif italic text-stone-100 tracking-tight">Render Output</h2>
                    <div className="font-mono text-[10px] text-stone-500 uppercase tracking-widest flex items-center gap-3">
                       <span>Hash: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                       <span className="text-stone-800">//</span>
                       <span>Mode: {mode.toUpperCase()}</span>
                       <span className="text-stone-800">//</span>
                       <span>Source: {analysis?.productType.toUpperCase() || 'UNKNOWN'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setStep('upload')} 
                      className="px-8 py-3 bg-stone-900 border border-stone-800 text-stone-400 font-mono text-[10px] tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors"
                    >
                      [ ADJUST ]
                    </button>
                    <a 
                      href={resultImage!} 
                      download={`RENDER_PRO_${Date.now()}.png`} 
                      className="px-8 py-3 bg-stone-100 text-stone-950 font-mono text-[10px] tracking-[0.2em] uppercase hover:bg-white transition-colors"
                    >
                      [ DOWNLOAD ]
                    </a>
                  </div>
                </div>
                
                <div className="bg-stone-950 p-2 border border-stone-800/40 relative shadow-2xl">
                   {/* 装饰性边框 */}
                   <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-stone-600"></div>
                   <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-stone-600"></div>
                   
                   <img 
                    src={resultImage!} 
                    className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-1000 ease-out" 
                    alt="Final Render" 
                   />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 状态监控条：低调硬核 */}
      <footer className="h-10 border-t border-stone-800/30 px-8 flex items-center justify-between bg-black/40 backdrop-blur-sm fixed bottom-0 w-full z-50">
        <div className="flex items-center gap-6 font-mono text-[9px] text-stone-600 tracking-widest uppercase">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>[SYS.ACTIVE]</span>
          </div>
          <span>COGNITIVE_CORE: NANAO_BANANA_VISION_V2</span>
          <span className="hidden md:inline text-stone-800">//</span>
          <span className="hidden md:inline">MULTIMODAL_ENGINE: GEMINI_2.5_CLUSTER</span>
          <span className="hidden md:inline text-stone-800">//</span>
          <span className="hidden md:inline">CONNECTION: SECURE_WSS_TLS_1.3</span>
        </div>
        <div className="font-mono text-[9px] text-stone-600 tracking-widest uppercase">
          LATENCY: 124MS // STABILITY: 99.9%
        </div>
      </footer>

      {/* 错误浮层 */}
      {error && (
        <div className="fixed bottom-16 right-8 bg-stone-950 border border-red-900/50 p-6 rounded-none shadow-2xl flex flex-col gap-4 z-[100] animate-in slide-in-from-right-8 max-w-sm">
          <div className="flex items-center gap-3 text-red-500">
            <Activity size={18} />
            <span className="font-mono text-xs font-black tracking-widest uppercase italic underline decoration-red-900 underline-offset-4">{error.title}</span>
          </div>
          <p className="font-mono text-[10px] text-stone-500 leading-relaxed uppercase tracking-tight">
            CRITICAL_EXCEPTION_DETECTED: {error.msg}
          </p>
          <button 
            onClick={() => setError(null)} 
            className="self-end font-mono text-[10px] text-stone-400 hover:text-white transition-colors border-b border-stone-800 hover:border-stone-500"
          >
            [ DISMISS ]
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
