
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Zap, Activity, Download, Eye, LayoutGrid
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
  "> 正在解析视觉光子矩阵...",
  "> 算力通道 Nanao_Banana_Pro 同步中...",
  "> Gemini 2.5 视觉引擎渲染中...",
  "> 正在合成最终商业物理图像..."
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
      interval = setInterval(() => setLoadingTextIndex(prev => (prev + 1) % LOADING_STEPS.length), 1800);
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
    setError(null);
    try {
      const currentAnalysis = analysis || await analyzeProduct([sourceImages[0].split(',')[1]]);
      const aiResult = await generateScenarioImage(
        sourceImages.map(img => img.split(',')[1]), 
        selectedScenario, currentAnalysis, userIntent, textConfig, mode
      );
      const finalResult = await processFinalImage(aiResult, sourceImages[0], textConfig, currentAnalysis, mode);
      setResultImage(finalResult);
    } catch (err: any) {
      setError({ title: "核心算力异常", msg: err.message || "渲染队列中断" });
      setStep('upload');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#F9F9F6]">
      {/* 视觉层一：背景流动效果 */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="flex gap-4 h-[200%] w-full">
          <div className="flex-1 flex flex-col gap-4 animate-marquee-up opacity-10">
            {[...BG_COLUMNS[0], ...BG_COLUMNS[0], ...BG_COLUMNS[0]].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[4/5] object-cover grayscale brightness-110" alt="" />
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-4 animate-marquee-down opacity-15">
            {[...BG_COLUMNS[1], ...BG_COLUMNS[1], ...BG_COLUMNS[1]].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[4/5] object-cover grayscale brightness-110" alt="" />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#F9F9F6] via-transparent to-[#F9F9F6]" />
      </div>

      {/* 视觉层二：状态标尺 */}
      <div className="fixed top-8 left-8 z-[70] font-mono text-[9px] tracking-[0.4em] text-orange-500 uppercase">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
          <span>[ X_{mousePos.x} : Y_{mousePos.y} ]</span>
          <span className="text-stone-300">//</span>
          <span className="text-stone-400">CORE_V2.4_PRO</span>
        </div>
      </div>

      <header className="fixed top-0 w-full h-24 z-[70] px-12 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-2xl font-serif-display italic text-stone-900 tracking-tighter hover:scale-105 transition-transform cursor-pointer">
            电商宝 <span className="text-orange-500 font-bold not-italic font-sans ml-1 text-sm tracking-widest">PRO</span>
          </h1>
        </div>
      </header>

      <main className="relative z-30 w-full max-w-6xl px-6 py-24 flex flex-col items-center">
        {step === 'upload' ? (
          <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="text-center space-y-4">
              <h3 className="text-6xl md:text-[80px] font-serif-display text-stone-900 tracking-tighter leading-none italic">
                重塑商业视觉.
              </h3>
              <p className="font-mono text-[10px] text-stone-400 tracking-[0.6em] uppercase">光影解构与逻辑重塑</p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* 左侧：内容输入 */}
              <div className="lg:col-span-7 glass-morphism p-8 space-y-10">
                <section>
                  <label className="font-mono text-[11px] text-stone-500 tracking-widest uppercase mb-6 block border-l-2 border-orange-500 pl-4 font-bold">
                    [ 01 ] 视觉锚点注入
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sourceImages.map((img, idx) => (
                      <div key={idx} className="aspect-square relative group bg-stone-100 border border-stone-200 overflow-hidden shadow-sm rounded-lg">
                        <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                        <button onClick={() => setSourceImages(s => s.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-1.5 bg-white text-stone-900 shadow-xl border border-stone-100 rounded-full hover:bg-orange-500 hover:text-white transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {sourceImages.length < 5 && (
                      <label className="aspect-square border-2 border-stone-200 border-dashed hover:border-orange-500 transition-all flex flex-col items-center justify-center cursor-pointer bg-white/40 group hover:bg-white rounded-lg">
                        <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                        <Plus className="text-stone-300 group-hover:text-orange-500 transition-colors" size={24} />
                        <span className="font-sans text-[9px] mt-2 text-stone-400 tracking-widest uppercase text-center px-2">添加参考</span>
                      </label>
                    )}
                  </div>
                </section>

                <section>
                  <label className="font-mono text-[11px] text-stone-500 tracking-widest uppercase mb-6 block border-l-2 border-orange-500 pl-4 font-bold">
                    [ 02 ] 核心场景模版
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {SCENARIO_CONFIGS.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => setSelectedScenario(s.id)}
                        className={`flex items-start gap-3 p-3 border transition-all text-left rounded-lg ${selectedScenario === s.id ? 'border-orange-500 bg-orange-50/50 shadow-sm' : 'border-stone-100 bg-white/50 hover:border-stone-300'}`}
                      >
                        <span className="text-lg mt-0.5">{s.icon}</span>
                        <div>
                          <div className={`font-sans text-[11px] font-bold ${selectedScenario === s.id ? 'text-orange-600' : 'text-stone-700'}`}>{s.name}</div>
                          <div className="text-[9px] text-stone-400 leading-tight mt-0.5">{s.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <label className="font-mono text-[11px] text-stone-500 tracking-widest uppercase mb-6 block border-l-2 border-orange-500 pl-4 font-bold">
                    [ 03 ] 氛围与光影指令
                  </label>
                  <textarea 
                    value={userIntent} onChange={(e) => setUserIntent(e.target.value)}
                    placeholder="例如：北欧极简厨房、午后柔和阳光从左侧射入、大理石台面..."
                    className="w-full h-32 input-glass p-5 font-sans text-sm text-stone-800 resize-none rounded-lg focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </section>
              </div>

              {/* 右侧：排版与启动 */}
              <div className="lg:col-span-5 flex flex-col gap-8">
                <div className="glass-morphism p-8 space-y-10">
                  <section>
                    <label className="font-mono text-[11px] text-stone-500 tracking-widest uppercase mb-6 block border-l-2 border-orange-500 pl-4 font-bold">
                      [ 04 ] 矢量排版引擎
                    </label>
                    <div className="space-y-4">
                      <input type="text" value={textConfig.title} placeholder="主标题文案" onChange={(e) => setTextConfig({...textConfig, title: e.target.value})} className="w-full bg-white/50 border border-stone-100 px-4 py-3 rounded-lg font-serif-display text-xl focus:border-orange-500 outline-none transition-all" />
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'modern', label: '现代促销' },
                          { id: 'elegant', label: '优雅轻奢' },
                          { id: 'calligraphy', label: '东方书法' },
                          { id: 'playful', label: '活力种草' }
                        ].map(style => (
                          <button key={style.id} onClick={() => setTextConfig({...textConfig, fontStyle: style.id as FontStyle})} className={`py-2.5 font-sans text-[10px] border rounded-lg transition-all tracking-widest font-bold ${textConfig.fontStyle === style.id ? 'bg-stone-900 text-white border-stone-900 shadow-md' : 'text-stone-400 border-stone-100 hover:border-stone-300 bg-white/50'}`}>
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section>
                    <label className="font-mono text-[11px] text-stone-500 tracking-widest uppercase mb-6 block border-l-2 border-orange-500 pl-4 font-bold">
                      [ 05 ] 渲染引擎模式
                    </label>
                    <div className="flex gap-2 p-1 bg-stone-100 rounded-xl">
                      <button onClick={() => setMode('precision')} className={`flex-1 py-3 font-sans text-[10px] rounded-lg tracking-widest transition-all font-bold ${mode === 'precision' ? 'bg-white text-orange-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>物理级保真</button>
                      <button onClick={() => setMode('creative')} className={`flex-1 py-3 font-sans text-[10px] rounded-lg tracking-widest transition-all font-bold ${mode === 'creative' ? 'bg-white text-orange-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>艺术级重塑</button>
                    </div>
                  </section>
                </div>

                <button 
                  onClick={executeGeneration} 
                  disabled={isProcessing || sourceImages.length === 0}
                  className="w-full h-24 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-sans font-black tracking-[0.6em] text-[12px] disabled:opacity-30 uppercase shadow-2xl shadow-orange-500/20 transition-all flex flex-col items-center justify-center gap-2"
                >
                  <Zap size={20} className={isProcessing ? 'animate-pulse' : ''} />
                  <span>启动视觉渲染引擎</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 结果展示视图 */
          <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-700 px-4">
            {isProcessing ? (
              <div className="flex flex-col items-center space-y-12 py-20">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <div className="absolute inset-0 border border-orange-500/10 rounded-full animate-pulse" />
                  <div className="absolute inset-6 border border-orange-500/20 rounded-full animate-spin duration-[6000ms]" />
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <LayoutGrid className="text-white" size={24} />
                  </div>
                </div>
                <div className="space-y-4 text-center">
                  <p className="text-stone-900 font-serif-display italic text-4xl tracking-tight animate-pulse">{LOADING_STEPS[loadingTextIndex]}</p>
                  <p className="font-mono text-[9px] text-stone-400 tracking-[0.8em] uppercase">Processing Via Neural Logic Engine</p>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-stone-100 pb-12">
                  <div className="space-y-4">
                    <h2 className="text-5xl md:text-6xl font-serif-display italic text-stone-900 tracking-tighter leading-none">The Artifact.</h2>
                    <div className="flex gap-6 font-mono text-[10px] text-orange-500 uppercase tracking-widest font-bold">
                       <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> 渲染完成</span>
                       <span className="text-stone-300">模式: {mode === 'precision' ? '物理保真' : '艺术重塑'}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('upload')} className="px-10 py-5 bg-white border border-stone-200 text-stone-500 font-sans text-[11px] font-bold tracking-[0.2em] hover:border-orange-500 hover:text-orange-500 transition-all rounded-xl uppercase">
                      重新配置
                    </button>
                    <a href={resultImage!} download="product_render.png" className="px-10 py-5 bg-orange-500 text-white rounded-xl font-sans text-[11px] font-bold tracking-[0.2em] uppercase flex items-center gap-3 hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/10">
                      <Download size={14} /> 导出作品
                    </a>
                  </div>
                </div>
                
                <div className="relative group glass-morphism p-4 shadow-2xl rounded-3xl overflow-hidden bg-white/50 border border-white">
                   <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-orange-500 z-20 m-4 rounded-tl-lg" />
                   <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-orange-500 z-20 m-4 rounded-br-lg" />
                   
                   <div className="relative overflow-hidden rounded-2xl bg-stone-50">
                     <img src={resultImage!} className="w-full h-auto transition-transform duration-1000 group-hover:scale-[1.02]" alt="Generated result" />
                   </div>
                   
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                     <div className="w-16 h-16 bg-white/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white shadow-2xl">
                       <Eye className="text-orange-500" size={24} />
                     </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 w-full h-14 border-t border-stone-100 flex items-center justify-between px-12 bg-white/80 backdrop-blur-2xl z-[80]">
        <div className="flex items-center gap-12 font-mono text-[9px] text-stone-400 tracking-[0.4em] uppercase">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-orange-500 font-bold">CORE_STABLE</span>
          </div>
          <span className="hidden lg:inline">ENGINE: DIANSHANGBAO_V2.4_PRO</span>
        </div>
        <div className="font-mono text-[9px] text-stone-300 tracking-[0.4em] uppercase">
          © 2025 // STUDIO_DIALECT
        </div>
      </footer>

      {error && (
        <div className="fixed bottom-24 right-8 glass-morphism p-8 z-[100] animate-in slide-in-from-right-12 max-w-sm border-orange-500/20 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-4 text-orange-600 mb-4">
            <Activity size={18} />
            <span className="font-mono text-[11px] font-bold tracking-[0.4em] uppercase">{error.title}</span>
          </div>
          <p className="font-sans text-[12px] text-stone-500 leading-relaxed">{error.msg}</p>
          <button onClick={() => setError(null)} className="mt-6 font-sans text-[10px] text-stone-400 hover:text-orange-500 underline block underline-offset-8 tracking-widest transition-colors">忽略堆栈信息</button>
        </div>
      )}
    </div>
  );
};

export default App;
