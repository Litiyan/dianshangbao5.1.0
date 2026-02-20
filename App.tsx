import React, { useState, useEffect } from 'react';
import { 
  X, Plus, RefreshCw, Zap, ShieldCheck, Activity, ChevronRight, Layout
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig, GenerationMode, FontStyle } from './types';
import { SCENARIO_CONFIGS } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';
import { processFinalImage } from './utils/imageComposite';

const BG_COLUMNS = [
  [
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=600&q=80"
  ],
  [
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80"
  ]
];

const LOADING_STEPS = [
  "> REVERSE_ENGINEERING_LIGHTING...",
  "> SYNCING_NANAO_BANANA_CORE...",
  "> MAPPING_GEMINI_CLUSTER_OUTPUT...",
  "> FINALIZING_PHYSICAL_TWIN..."
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
    const handleMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => setLoadingTextIndex(prev => (prev + 1) % LOADING_STEPS.length), 1500);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
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
      const finalResult = await processFinalImage(aiResult, sourceImages[0], textConfig, currentAnalysis, mode);
      setResultImage(finalResult);
    } catch (err: any) {
      setError({ title: "CORE_FAILURE", msg: err.message || "HALTED" });
      setStep('upload');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      <div className="grain-overlay" />

      {/* 战役一：全屏沉浸式图库背景 */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <div className="flex gap-4 h-[200%] w-full">
          <div className="flex-1 flex flex-col gap-4 animate-marquee-up">
            {[...BG_COLUMNS[0], ...BG_COLUMNS[0]].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[3/4] object-cover grayscale brightness-50" />
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-4 animate-marquee-down">
            {[...BG_COLUMNS[1], ...BG_COLUMNS[1]].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[3/4] object-cover grayscale brightness-50" />
            ))}
          </div>
          <div className="hidden lg:flex flex-1 flex flex-col gap-4 animate-marquee-up">
            {[...BG_COLUMNS[0], ...BG_COLUMNS[0]].reverse().map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[3/4] object-cover grayscale brightness-50" />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505]/40 to-[#050505]" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      </div>

      {/* 战役二：殿堂级巨型排版 */}
      <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <h2 className="text-giant text-white/[0.03] uppercase whitespace-nowrap">
          Expert Visual Production
        </h2>
      </div>

      {/* 战役三：鼠标实时坐标追踪 */}
      <div className="fixed top-8 left-8 z-50 font-mono text-[9px] tracking-[0.4em] text-stone-600 uppercase">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
          <span>[ X : {mousePos.x} // Y : {mousePos.y} ]</span>
        </div>
        <div className="mt-1">SYS_CORE: NANAO_BANANA_V2 // GEMINI_2.5_PRO</div>
      </div>

      {/* 战役四：悬浮毛玻璃工作台 */}
      <main className="relative z-30 w-full max-w-6xl px-6 py-20 flex flex-col items-center">
        {step === 'upload' ? (
          <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            
            <div className="text-center space-y-4">
              <h1 className="text-6xl md:text-8xl font-serif text-white tracking-tighter leading-none italic">
                Redefine Commerce.
              </h1>
              <p className="font-mono text-xs text-stone-500 tracking-[0.5em] uppercase">
                Reverse Engineering Light & Logic
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* 控制中枢：上传与意图 */}
              <div className="lg:col-span-7 glass-morphism p-8 space-y-10">
                <section>
                  <label className="font-mono text-[10px] text-stone-500 tracking-widest uppercase mb-6 block border-l-2 border-orange-500/50 pl-4">
                    {">"} Visual_Input_Anchor
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sourceImages.map((img, idx) => (
                      <div key={idx} className="aspect-square relative group bg-black border border-white/5">
                        <img src={img} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all grayscale" />
                        <button onClick={() => setSourceImages(s => s.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-black/80 text-white"><X size={12} /></button>
                      </div>
                    ))}
                    {sourceImages.length < 5 && (
                      <label className="aspect-square border border-white/10 border-dashed hover:border-white/40 transition-all flex flex-col items-center justify-center cursor-pointer bg-white/5 group">
                        <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                        <Plus className="text-stone-700 group-hover:text-white" size={24} />
                      </label>
                    )}
                  </div>
                </section>

                <section>
                  <label className="font-mono text-[10px] text-stone-500 tracking-widest uppercase mb-6 block border-l-2 border-orange-500/50 pl-4">
                    {">"} Reconstruction_Intent
                  </label>
                  <textarea 
                    value={userIntent} onChange={(e) => setUserIntent(e.target.value)}
                    placeholder="ENTER_PROMPT_CONSTRAINTS..."
                    className="w-full h-32 bg-black/40 border border-white/5 p-6 font-mono text-xs text-stone-300 focus:outline-none focus:border-white/20 transition-all resize-none"
                  />
                </section>
              </div>

              {/* 侧边配置 */}
              <div className="lg:col-span-5 flex flex-col gap-8">
                <div className="glass-morphism p-8 space-y-10">
                  <section>
                    <label className="font-mono text-[10px] text-stone-500 tracking-widest uppercase mb-6 block border-l-2 border-orange-500/50 pl-4">
                      {">"} Typography_Mapping
                    </label>
                    <div className="space-y-4">
                      <input type="text" value={textConfig.title} placeholder="PRIMARY_TITLE" onChange={(e) => setTextConfig({...textConfig, title: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-2 font-serif text-lg text-white focus:outline-none focus:border-white/40" />
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
                    <label className="font-mono text-[10px] text-stone-500 tracking-widest uppercase mb-6 block border-l-2 border-orange-500/50 pl-4">
                      {">"} Generation_Mode
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setMode('precision')} className={`flex-1 py-3 font-mono text-[9px] border ${mode === 'precision' ? 'bg-orange-500 border-orange-500 text-white' : 'border-white/10 text-stone-600'}`}>[ PRECISION ]</button>
                      <button onClick={() => setMode('creative')} className={`flex-1 py-3 font-mono text-[9px] border ${mode === 'creative' ? 'bg-orange-500 border-orange-500 text-white' : 'border-white/10 text-stone-600'}`}>[ CREATIVE ]</button>
                    </div>
                  </section>
                </div>

                <button 
                  onClick={executeGeneration} 
                  disabled={isProcessing || sourceImages.length === 0}
                  className="w-full h-24 bg-white text-black font-mono font-black tracking-[1em] text-[10px] hover:bg-stone-200 active:scale-95 transition-all shadow-2xl disabled:opacity-20 uppercase"
                >
                  [ Initiate_Render ]
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 结果渲染视图 */
          <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-700">
            {isProcessing ? (
              <div className="flex flex-col items-center space-y-12">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 border border-white/10 animate-pulse" />
                  <div className="absolute inset-4 border border-white/20 animate-spin duration-[4000ms]" />
                  <Zap className="text-white animate-bounce" size={32} />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-white font-serif italic text-3xl tracking-tight animate-pulse">{LOADING_STEPS[loadingTextIndex]}</p>
                  <p className="font-mono text-[8px] text-stone-600 tracking-[0.5em] uppercase">Processing_Via_Gemini_Vision_Core</p>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="flex items-end justify-between border-b border-white/10 pb-8">
                  <div className="space-y-1">
                    <h2 className="text-5xl font-serif italic text-white tracking-tight">The_Artifact.</h2>
                    <p className="font-mono text-[9px] text-stone-600 uppercase tracking-widest">Render_Complete // ID: {Math.random().toString(36).substr(7).toUpperCase()}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('upload')} className="px-8 py-4 bg-transparent border border-white/10 text-stone-400 font-mono text-[10px] tracking-widest hover:border-white transition-all">
                      [ RECONFIG ]
                    </button>
                    <a href={resultImage!} download className="px-8 py-4 bg-white text-black font-mono text-[10px] font-bold tracking-widest hover:bg-stone-200 transition-all">
                      [ EXPORT_FILE ]
                    </a>
                  </div>
                </div>
                
                <div className="relative group glass-morphism p-2 shadow-2xl">
                   <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-orange-500/50" />
                   <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-orange-500/50" />
                   <img src={resultImage!} className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-1000 ease-out" />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 底部监控条 */}
      <footer className="fixed bottom-0 w-full h-12 border-t border-white/5 flex items-center justify-between px-12 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-10 font-mono text-[8px] text-stone-600 tracking-[0.4em] uppercase">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>Core_Stable</span>
          </div>
          <span className="hidden md:inline">Neural_Throughput: 840 TFLOPS</span>
          <span className="hidden md:inline">Encryption: AES-256_ACTIVE</span>
        </div>
        <div className="font-mono text-[8px] text-stone-600 tracking-[0.4em] uppercase">
          © 2025 // DIANSHANGBAO_PRO // DIALECT_MODE_V4
        </div>
      </footer>

      {error && (
        <div className="fixed bottom-24 right-8 glass-morphism p-6 z-[100] animate-in slide-in-from-right-12">
          <div className="flex items-center gap-4 text-red-500 mb-2">
            <Activity size={16} />
            <span className="font-mono text-[10px] font-bold tracking-[0.4em] uppercase">{error.title}</span>
          </div>
          <p className="font-mono text-[9px] text-stone-500 max-w-[240px] uppercase leading-relaxed">{error.msg}</p>
          <button onClick={() => setError(null)} className="mt-4 font-mono text-[9px] text-stone-400 hover:text-white underline block underline-offset-4 tracking-widest">DISMISS_TRACE</button>
        </div>
      )}
    </div>
  );
};

export default App;
