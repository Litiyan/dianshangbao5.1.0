import React, { useState, useEffect } from 'react';
import { 
  X, Plus, RefreshCw, Zap, ShieldCheck, Activity, Layout, Download, Eye
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig, GenerationMode, FontStyle } from './types';
import { SCENARIO_CONFIGS } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';
import { processFinalImage } from './utils/imageComposite';

const BG_COLUMNS = [
  [
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80"
  ],
  [
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80"
  ]
];

const LOADING_STEPS = [
  "> REVERSE_ENGINEERING_PHOTONS",
  "> NANAO_BANANA_SYNC_0x44",
  "> GEMINI_2.5_PRO_RENDERING",
  "> SYNTHESIZING_VIRTUAL_REALITY"
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
      setError({ title: "CORE_FATAL_ERROR", msg: err.message || "RENDER_HALTED" });
      setStep('upload');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      {/* 战役一：噪点层与背景瀑布 */}
      <div className="noise-layer" />
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="flex gap-4 h-[200%] w-full">
          <div className="flex-1 flex flex-col gap-4 animate-marquee-up opacity-20">
            {[...BG_COLUMNS[0], ...BG_COLUMNS[0], ...BG_COLUMNS[0]].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[4/5] object-cover grayscale brightness-50 contrast-125" />
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-4 animate-marquee-down opacity-25">
            {[...BG_COLUMNS[1], ...BG_COLUMNS[1], ...BG_COLUMNS[1]].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[4/5] object-cover grayscale brightness-50 contrast-125" />
            ))}
          </div>
          <div className="hidden lg:flex flex-1 flex flex-col gap-4 animate-marquee-up opacity-20">
            {[...BG_COLUMNS[0], ...BG_COLUMNS[0], ...BG_COLUMNS[0]].reverse().map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[4/5] object-cover grayscale brightness-50 contrast-125" />
            ))}
          </div>
        </div>
        {/* 修复沉浸背景：动态遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505]/80 to-[#050505]" />
      </div>

      {/* 战役四：赛博引擎光斑 */}
      <div className="engine-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150" />
      <div className="engine-glow top-0 left-0 -translate-x-1/2 -translate-y-1/2 opacity-50" />

      {/* 战役二：殿堂级巨型排版 */}
      <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <h2 className="text-giant uppercase whitespace-nowrap">
          Expert Visual Production
        </h2>
      </div>

      {/* 极客状态标尺 */}
      <div className="fixed top-8 left-8 z-[70] font-mono text-[9px] tracking-[0.4em] text-stone-500/60 uppercase">
        <div className="flex items-center gap-4">
          <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <span>[ X_{mousePos.x} : Y_{mousePos.y} ]</span>
          <span className="text-white/10">//</span>
          <span>NANAO_V2_ACTIVE</span>
        </div>
      </div>

      <header className="fixed top-0 w-full h-24 z-[70] px-12 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-3xl font-serif-display italic text-white tracking-tighter hover:scale-105 transition-transform cursor-pointer">
            电商宝 <span className="text-stone-500 font-light not-italic font-sans">Pro</span>
          </h1>
        </div>
      </header>

      {/* 悬浮毛玻璃中枢 */}
      <main className="relative z-30 w-full max-w-6xl px-6 py-20 flex flex-col items-center">
        {step === 'upload' ? (
          <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            
            <div className="text-center space-y-6">
              <h3 className="text-6xl md:text-[92px] font-serif-display text-white tracking-tighter leading-none italic bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
                Redefine Commerce.
              </h3>
              <p className="font-mono text-[10px] text-stone-500 tracking-[0.6em] uppercase flex items-center justify-center gap-4">
                <span className="h-px w-8 bg-white/10" />
                LIGHT RECONSTRUCTION & LOGIC FUSION
                <span className="h-px w-8 bg-white/10" />
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* 控制中枢：上传与意图 */}
              <div className="lg:col-span-7 glass-morphism p-10 space-y-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[60px]" />
                
                <section>
                  <label className="font-mono text-[11px] text-stone-400 tracking-widest uppercase mb-8 block border-l border-white/20 pl-6">
                    [ 01 ] Visual_Input_Anchor
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sourceImages.map((img, idx) => (
                      <div key={idx} className="aspect-square relative group bg-black border border-white/5 overflow-hidden">
                        <img src={img} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 grayscale hover:grayscale-0" />
                        <button onClick={() => setSourceImages(s => s.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-1 bg-black/80 text-white backdrop-blur-md border border-white/10"><X size={12} /></button>
                      </div>
                    ))}
                    {sourceImages.length < 5 && (
                      <label className="aspect-square border border-white/[0.08] border-dashed hover:border-white/40 transition-all flex flex-col items-center justify-center cursor-pointer bg-white/[0.02] group hover:bg-white/[0.05]">
                        <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                        <Plus className="text-stone-700 group-hover:text-white transition-colors" size={28} strokeWidth={1} />
                        <span className="font-mono text-[8px] mt-4 text-stone-600 tracking-widest uppercase">Add_Anchor</span>
                      </label>
                    )}
                  </div>
                </section>

                <section>
                  <label className="font-mono text-[11px] text-stone-400 tracking-widest uppercase mb-8 block border-l border-white/20 pl-6">
                    [ 02 ] Environmental_Parameters
                  </label>
                  <div className="relative">
                    <textarea 
                      value={userIntent} onChange={(e) => setUserIntent(e.target.value)}
                      placeholder="DESCRIBE_SCENE_CONSTRAINTS_AND_ATMOSPHERE..."
                      className="w-full h-40 input-glass p-8 font-mono text-xs text-stone-300 resize-none leading-relaxed placeholder:text-stone-700"
                    />
                    <div className="absolute bottom-4 right-6 font-mono text-[9px] text-stone-700">LEN: {userIntent.length}</div>
                  </div>
                </section>
              </div>

              {/* 侧边配置 */}
              <div className="lg:col-span-5 flex flex-col gap-8">
                <div className="glass-morphism p-10 space-y-12">
                  <section>
                    <label className="font-mono text-[11px] text-stone-400 tracking-widest uppercase mb-8 block border-l border-white/20 pl-6">
                      [ 03 ] Typography_Engine
                    </label>
                    <div className="space-y-6">
                      <input type="text" value={textConfig.title} placeholder="PRIMARY_MANIFESTO" onChange={(e) => setTextConfig({...textConfig, title: e.target.value})} className="w-full bg-transparent border-b border-white/10 py-3 font-serif-display text-2xl text-white focus:border-white transition-all placeholder:text-stone-800" />
                      <div className="grid grid-cols-2 gap-2">
                        {(['modern', 'elegant', 'calligraphy', 'playful'] as FontStyle[]).map(style => (
                          <button key={style} onClick={() => setTextConfig({...textConfig, fontStyle: style})} className={`py-3 font-mono text-[9px] border transition-all tracking-widest ${textConfig.fontStyle === style ? 'bg-white text-black border-white' : 'text-stone-500 border-white/10 hover:border-white/30'}`}>
                            {style.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section>
                    <label className="font-mono text-[11px] text-stone-400 tracking-widest uppercase mb-8 block border-l border-white/20 pl-6">
                      [ 04 ] Compute_Mode
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setMode('precision')} className={`flex-1 py-4 font-mono text-[9px] border tracking-widest transition-all ${mode === 'precision' ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'border-white/10 text-stone-600'}`}>[ PHYSICAL_SYNC ]</button>
                      <button onClick={() => setMode('creative')} className={`flex-1 py-4 font-mono text-[9px] border tracking-widest transition-all ${mode === 'creative' ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'border-white/10 text-stone-600'}`}>[ ART_REDRAW ]</button>
                    </div>
                  </section>
                </div>

                <button 
                  onClick={executeGeneration} 
                  disabled={isProcessing || sourceImages.length === 0}
                  className="w-full h-24 bg-white text-black font-mono font-bold tracking-[1.2em] text-[11px] hover:bg-stone-200 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-20 uppercase group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-stone-300 w-0 group-hover:w-full transition-all duration-700 ease-out" />
                  <span className="relative z-10">[ INITIATE_RENDER ]</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 结果展示视图 */
          <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-700 px-4">
            {isProcessing ? (
              <div className="flex flex-col items-center space-y-16 py-20">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <div className="absolute inset-0 border border-white/5 rounded-full animate-pulse" />
                  <div className="absolute inset-6 border border-white/20 rounded-full animate-spin duration-[6000ms]" />
                  <Zap className="text-white animate-bounce" size={42} strokeWidth={1} />
                </div>
                <div className="space-y-4 text-center">
                  <p className="text-white font-serif-display italic text-4xl tracking-tight animate-pulse bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white">{LOADING_STEPS[loadingTextIndex]}</p>
                  <p className="font-mono text-[9px] text-stone-600 tracking-[0.8em] uppercase">Processing_Via_Gemini_Neural_Engine</p>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-white/5 pb-12">
                  <div className="space-y-4">
                    <h2 className="text-6xl md:text-7xl font-serif-display italic text-white tracking-tighter leading-none">The Artifact.</h2>
                    <div className="flex gap-6 font-mono text-[10px] text-stone-500 uppercase tracking-[0.2em]">
                       <span className="flex items-center gap-2"><div className="w-1 h-1 bg-green-500 rounded-full" /> HASH_{Math.random().toString(36).substr(7).toUpperCase()}</span>
                       <span>MODE_{mode.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('upload')} className="px-10 py-5 bg-transparent border border-white/10 text-stone-400 font-mono text-[10px] tracking-[0.3em] hover:border-white transition-all uppercase">
                      [ Adjust ]
                    </button>
                    <a href={resultImage!} download className="px-10 py-5 bg-white text-black font-mono text-[10px] font-bold tracking-[0.3em] hover:bg-stone-200 transition-all uppercase flex items-center gap-3">
                      <Download size={14} /> [ Export ]
                    </a>
                  </div>
                </div>
                
                <div className="relative group glass-morphism p-3 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                   <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-orange-500/40 z-20" />
                   <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-orange-500/40 z-20" />
                   
                   <div className="relative overflow-hidden bg-black">
                     <img 
                      src={resultImage!} 
                      className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-1000 ease-out transform group-hover:scale-105" 
                      alt="Output"
                     />
                   </div>
                   
                   {/* 悬浮预览按钮 */}
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                     <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                       <Eye className="text-white" size={24} />
                     </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 底部监控条 */}
      <footer className="fixed bottom-0 w-full h-14 border-t border-white/5 flex items-center justify-between px-12 bg-black/90 backdrop-blur-2xl z-[80]">
        <div className="flex items-center gap-12 font-mono text-[9px] text-stone-600 tracking-[0.4em] uppercase">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            <span>CORE_SYNCED</span>
          </div>
          <span className="hidden lg:inline">THROUGHPUT: 1.2 PB/S</span>
          <span className="hidden lg:inline text-white/5">//</span>
          <span className="hidden lg:inline">ENGINE: NANAO_BANANA_V2.4</span>
        </div>
        <div className="font-mono text-[9px] text-stone-700 tracking-[0.4em] uppercase">
          © 2025 // DIANSHANGBAO_PRO // EST_STUDIO_DIALECT
        </div>
      </footer>

      {error && (
        <div className="fixed bottom-24 right-8 glass-morphism p-8 z-[100] animate-in slide-in-from-right-12 max-w-sm border-red-900/50">
          <div className="flex items-center gap-4 text-red-500 mb-4">
            <Activity size={18} />
            <span className="font-mono text-[11px] font-bold tracking-[0.4em] uppercase">{error.title}</span>
          </div>
          <p className="font-mono text-[10px] text-stone-500 uppercase leading-relaxed tracking-tight">{error.msg}</p>
          <button onClick={() => setError(null)} className="mt-6 font-mono text-[10px] text-stone-400 hover:text-white underline block underline-offset-8 tracking-widest transition-colors">DISMISS_TRACE</button>
        </div>
      )}
    </div>
  );
};

export default App;
