
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Sparkles, Camera, LayoutGrid, Plus, CheckCircle2, 
  RefreshCw, Activity, Zap, ShieldCheck, Palette, 
  Type, Feather, PenTool, Smile, MousePointer2
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig, GenerationMode, FontStyle } from './types';
import { SCENARIO_CONFIGS } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';
import { processFinalImage } from './utils/imageComposite';

// 高端电商占位图集
const BG_IMAGES = [
  "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80", // 香水
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80", // 手表
  "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80", // 家具
  "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80", // 护肤
  "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80", // 科技
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80", // 耳机
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80", // 相机
  "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80"  // 眼镜
];

const LOADING_STEPS = [
  "> INITIALIZING_NANAO_BANANA_V2...",
  "> REVERSE_ENGINEERING_PHOTONS...",
  "> SYNCHRONIZING_COGNITIVE_NODES...",
  "> EXECUTING_HYPER_RENDER..."
];

const App: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'result'>('upload');
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [userIntent, setUserIntent] = useState("");
  const [textConfig, setTextConfig] = useState<TextConfig>({ 
    title: "", detail: "", isEnabled: true, fontStyle: 'modern'
  });
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>(ScenarioType.PLATFORM_MAIN_DETAIL);
  const [mode, setMode] = useState<GenerationMode>('precision');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<{title: string, msg: string} | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => setLoadingTextIndex(prev => (prev + 1) % LOADING_STEPS.length), 1800);
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
        selectedScenario, currentAnalysis, userIntent, textConfig, mode
      );
      const finalResult = await processFinalImage(
        aiResult, sourceImages[0], textConfig, currentAnalysis, mode
      );
      setResultImage(finalResult);
    } catch (err: any) {
      setError({ title: "CORE_FATAL_ERROR", msg: err.message || "RENDER_ENGINE_HALTED" });
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-stone-300 font-sans overflow-hidden">
      <style>{`
        @keyframes scrollUp {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes scrollDown {
          from { transform: translateY(-50%); }
          to { transform: translateY(0); }
        }
        .animate-scroll-up { animation: scrollUp 40s linear infinite; }
        .animate-scroll-down { animation: scrollDown 45s linear infinite; }
      `}</style>

      {/* 战役一：全屏沉浸式图库背景 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <div className="flex gap-4 h-[200%] w-full">
          <div className="flex-1 flex flex-col gap-4 animate-scroll-up">
            {[...BG_IMAGES, ...BG_IMAGES].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[3/4] object-cover grayscale brightness-50" />
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-4 animate-scroll-down">
            {[...BG_IMAGES, ...BG_IMAGES].reverse().map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[3/4] object-cover grayscale brightness-50" />
            ))}
          </div>
          <div className="hidden md:flex flex-1 flex flex-col gap-4 animate-scroll-up">
            {[...BG_IMAGES, ...BG_IMAGES].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[3/4] object-cover grayscale brightness-50" />
            ))}
          </div>
        </div>
        {/* 背景蒙版：营造深度感 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]"></div>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
      </div>

      {/* 战役二：殿堂级巨型排版 */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none select-none">
        <h2 className="text-[12vw] font-serif italic text-white/5 font-black leading-none tracking-tighter uppercase whitespace-nowrap">
          Expert Visual Production
        </h2>
      </div>

      {/* 战役三：赛博极客微交互 */}
      <div className="fixed top-8 left-8 z-50 flex flex-col gap-1 font-mono text-[10px] tracking-[0.3em] text-stone-500 uppercase">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span>[ System Active ]</span>
        </div>
        <span>[ X : {mousePos.x} // Y : {mousePos.y} ]</span>
        <span>[ Node : Gemini_2.5_Pro ]</span>
      </div>

      <header className="fixed top-0 w-full h-24 z-50 px-12 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-3xl font-serif italic text-white tracking-tighter">
            电商宝 <span className="text-stone-500 font-light not-italic">Pro</span>
          </h1>
        </div>
      </header>

      {/* 战役四：悬浮毛玻璃中枢 */}
      <main className="relative z-20 pt-32 pb-40 px-6 max-w-7xl mx-auto min-h-screen flex flex-col items-center justify-center">
        {step === 'upload' ? (
          <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            
            {/* 巨型标题 */}
            <div className="text-center space-y-4">
              <h3 className="text-5xl md:text-7xl font-serif text-white tracking-tight leading-none">
                Redefine Commerce <br/>
                <span className="text-stone-500 italic">Through Light & Logic.</span>
              </h3>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              
              {/* 工作台左翼：素材注入 */}
              <div className="lg:col-span-7 bg-stone-900/40 backdrop-blur-2xl border border-white/5 p-8 shadow-2xl">
                <div className="space-y-8">
                  <section>
                    <label className="font-mono text-[10px] text-stone-500 tracking-widest uppercase mb-6 block underline decoration-stone-800 underline-offset-8">
                      {">"} Visual_Anchor_Input
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {sourceImages.map((img, idx) => (
                        <div key={idx} className="aspect-square relative group border border-white/10 overflow-hidden bg-black">
                          <img src={img} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all grayscale" />
                          <button onClick={() => setSourceImages(s => s.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-black/80 text-white"><X size={12} /></button>
                        </div>
                      ))}
                      {sourceImages.length < 5 && (
                        <label className="aspect-square border border-white/10 border-dashed hover:border-white/40 transition-all flex flex-col items-center justify-center cursor-pointer bg-white/5 group">
                          <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                          <Plus className="text-stone-600 group-hover:text-white" size={20} />
                          <span className="font-mono text-[8px] mt-2 text-stone-600 uppercase tracking-tighter">Attach_File</span>
                        </label>
                      )}
                    </div>
                  </section>

                  <section>
                    <label className="font-mono text-[10px] text-stone-500 tracking-widest uppercase mb-6 block underline decoration-stone-800 underline-offset-8">
                      {">"} Environmental_Parameters
                    </label>
                    <textarea 
                      value={userIntent} onChange={(e) => setUserIntent(e.target.value)}
                      placeholder="DESCRIBE_RECONSTRUCTION_GOALS..."
                      className="w-full h-32 bg-black/40 border border-white/5 p-6 font-mono text-xs text-stone-300 focus:outline-none focus:border-white/20 transition-all resize-none"
                    />
                  </section>
                </div>
              </div>

              {/* 工作台右翼：排版与部署 */}
              <div className="lg:col-span-5 flex flex-col gap-8">
                <div className="bg-stone-900/40 backdrop-blur-2xl border border-white/5 p-8 shadow-2xl space-y-8">
                  <section>
                    <label className="font-mono text-[10px] text-stone-500 tracking-widest uppercase mb-6 block underline decoration-stone-800 underline-offset-8">
                      {">"} Typography_Engine
                    </label>
                    <div className="space-y-4">
                      <input type="text" value={textConfig.title} placeholder="PRIMARY_MANIFESTO" onChange={(e) => setTextConfig({...textConfig, title: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 font-serif text-lg focus:outline-none focus:border-white/40 transition-all" />
                      <div className="grid grid-cols-2 gap-2">
                        {(['modern', 'elegant', 'calligraphy', 'playful'] as FontStyle[]).map(style => (
                          <button key={style} onClick={() => setTextConfig({...textConfig, fontStyle: style})} className={`py-2 font-mono text-[9px] border transition-all ${textConfig.fontStyle === style ? 'bg-white text-black border-white' : 'text-stone-500 border-white/10 hover:border-white/30'}`}>
                            {style.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section>
                    <label className="font-mono text-[10px] text-stone-500 tracking-widest uppercase mb-6 block underline decoration-stone-800 underline-offset-8">
                      {">"} Target_Deployment
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SCENARIO_CONFIGS.slice(0, 4).map(cfg => (
                        <button key={cfg.id} onClick={() => setSelectedScenario(cfg.id)} className={`p-3 text-left border transition-all flex flex-col gap-1 ${selectedScenario === cfg.id ? 'bg-white text-black border-white' : 'bg-black/20 border-white/5 text-stone-500 hover:border-white/20'}`}>
                          <span className="text-[10px] font-mono font-bold">{cfg.name}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                {/* 启动按钮：极致仪式感 */}
                <button 
                  onClick={executeGeneration} 
                  disabled={isProcessing || sourceImages.length === 0}
                  className="w-full h-24 bg-white text-black font-mono font-black tracking-[0.8em] text-xs hover:bg-stone-200 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)] disabled:opacity-30 uppercase"
                >
                  [ Initiate_Render ]
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 渲染输出态 */
          <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-700">
            {isProcessing ? (
              <div className="flex flex-col items-center space-y-12">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 border-2 border-white/5 animate-pulse"></div>
                  <div className="absolute inset-4 border-2 border-white/20 animate-spin duration-[4000ms]"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="text-white animate-bounce" size={32} />
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-white font-serif italic text-2xl tracking-tight animate-pulse">{LOADING_STEPS[loadingTextIndex]}</p>
                  <p className="font-mono text-[8px] text-stone-600 tracking-[0.4em] uppercase">Processing_via_Gemini_Vision_Core</p>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-5xl font-serif italic text-white leading-none">The_Artifact.</h2>
                    <div className="font-mono text-[9px] text-stone-500 flex gap-4 uppercase tracking-widest">
                      <span>Hash: {Math.random().toString(36).substr(7).toUpperCase()}</span>
                      <span>// Mode: {mode.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep('upload')} className="px-8 py-4 bg-transparent border border-white/10 text-stone-400 font-mono text-[10px] tracking-widest hover:border-white transition-all">
                      [ RECONFIG ]
                    </button>
                    <a href={resultImage!} download className="px-8 py-4 bg-white text-black font-mono text-[10px] font-bold tracking-widest hover:bg-stone-200 transition-all">
                      [ PERSIST_IMAGE ]
                    </a>
                  </div>
                </div>
                
                <div className="relative group bg-stone-900/50 p-2 border border-white/5 backdrop-blur-3xl shadow-2xl">
                   <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-white/40"></div>
                   <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-white/40"></div>
                   <img src={resultImage!} className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-1000" />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 极简页脚监控 */}
      <footer className="fixed bottom-0 w-full h-12 border-t border-white/5 flex items-center justify-between px-12 bg-black/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-8 font-mono text-[8px] text-stone-600 tracking-[0.3em] uppercase">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Status: Core_Operational</span>
          </div>
          <span className="hidden md:inline">Memory: 12.4GB_Allocated</span>
          <span className="hidden md:inline">Engine: Nanao_Banana_V2_Mirror</span>
        </div>
        <div className="font-mono text-[8px] text-stone-600 tracking-[0.3em] uppercase">
          © 2025 // DIANSHANGBAO_PRO // REDEFINING_VISION
        </div>
      </footer>

      {error && (
        <div className="fixed bottom-20 right-8 bg-black/90 border border-red-900/50 p-6 backdrop-blur-xl z-[100] animate-in slide-in-from-right-12">
          <div className="flex items-center gap-4 text-red-500 mb-2">
            <Activity size={16} />
            <span className="font-mono text-[10px] font-bold tracking-[0.3em] uppercase">{error.title}</span>
          </div>
          <p className="font-mono text-[9px] text-stone-500 max-w-[240px] uppercase leading-relaxed">{error.msg}</p>
          <button onClick={() => setError(null)} className="mt-4 font-mono text-[9px] text-stone-400 hover:text-white underline">Dismiss_Stack_Trace</button>
        </div>
      )}
    </div>
  );
};

export default App;
