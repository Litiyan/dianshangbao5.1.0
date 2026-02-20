
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Aperture, Download, Eye, LayoutGrid, Sparkles, ChevronRight, Activity
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig, GenerationMode, FontStyle } from './types';
import { SCENARIO_CONFIGS } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';
import { processFinalImage } from './utils/imageComposite';

// 顶级高调 (High-Key) 极简电商摄影图库
const BG_COLUMNS = [
  [
    "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1549439602-43ebca2327af?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1617897903246-7392ce73773b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?auto=format&fit=crop&w=800&q=80"
  ],
  [
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc2069?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1583209814683-c023dd293cc6?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80"
  ]
];

const LOADING_STEPS = [
  "正在解析视觉光子矩阵",
  "算力通道高效同步中",
  "AI 视觉引擎深度渲染",
  "合成最终商业级画质"
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

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => setLoadingTextIndex(prev => (prev + 1) % LOADING_STEPS.length), 2000);
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
      setError({ title: "渲染引擎异常", msg: err.message || "当前队列处理中断" });
      setStep('upload');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#F9F9F6]">
      {/* 视觉层一：纯净高调背景墙 */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="flex gap-6 h-[200%] w-full px-6">
          <div className="flex-1 flex flex-col gap-6 animate-marquee-up opacity-[0.08]">
            {[...BG_COLUMNS[0], ...BG_COLUMNS[0], ...BG_COLUMNS[0]].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[4/5] object-cover grayscale brightness-110 contrast-75 rounded-2xl" alt="" />
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-6 animate-marquee-down opacity-[0.12]">
            {[...BG_COLUMNS[1], ...BG_COLUMNS[1], ...BG_COLUMNS[1]].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[4/5] object-cover grayscale brightness-110 contrast-75 rounded-2xl" alt="" />
            ))}
          </div>
          <div className="hidden lg:flex flex-1 flex flex-col gap-6 animate-marquee-up opacity-[0.08]">
            {[...BG_COLUMNS[0], ...BG_COLUMNS[0], ...BG_COLUMNS[0]].reverse().map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[4/5] object-cover grayscale brightness-110 contrast-75 rounded-2xl" alt="" />
            ))}
          </div>
        </div>
        {/* 极致柔和蒙版 */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-md" />
      </div>

      {/* 视觉层二：巨型印刷排版 (纯减法) */}
      <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <h2 className="font-serif text-[10vw] italic font-black tracking-[0.2em] text-stone-900/[0.03] uppercase whitespace-nowrap">
          REDEFINE COMMERCE
        </h2>
      </div>

      <header className="fixed top-0 w-full h-24 z-[70] px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Aperture className="w-8 h-8 text-orange-500" />
          <span className="font-serif text-2xl font-bold tracking-[0.2em] text-stone-800">电商宝</span>
        </div>
      </header>

      <main className="relative z-30 w-full max-w-6xl px-6 py-24 flex flex-col items-center">
        {step === 'upload' ? (
          <div className="w-full space-y-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="text-center space-y-6">
              <h3 className="text-6xl md:text-[84px] font-serif italic text-stone-900 tracking-tighter leading-none">
                重塑商业视觉
              </h3>
              <p className="font-sans text-[11px] text-stone-400 tracking-[0.8em] font-medium uppercase">
                高 级 影 像 的 逻 辑 重 建
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-10 items-start">
              {/* 左侧工作台 */}
              <div className="lg:col-span-7 glass-morphism p-10 space-y-12 rounded-3xl">
                <section>
                  <label className="font-sans text-[11px] text-stone-500 tracking-widest uppercase mb-8 flex items-center gap-3 font-bold">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    [ 01 ] 视觉锚点注入
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sourceImages.map((img, idx) => (
                      <div key={idx} className="aspect-square relative group bg-white border border-stone-100 overflow-hidden shadow-sm rounded-2xl transition-all hover:shadow-xl">
                        <img src={img} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                        <button onClick={() => setSourceImages(s => s.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-2 bg-white/90 text-stone-900 shadow-lg rounded-full hover:bg-orange-500 hover:text-white transition-all">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {sourceImages.length < 5 && (
                      <label className="aspect-square border-2 border-stone-100 border-dashed hover:border-orange-500 transition-all flex flex-col items-center justify-center cursor-pointer bg-stone-50/30 group hover:bg-white rounded-2xl">
                        <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                        <Plus className="text-stone-300 group-hover:text-orange-500 transition-colors" size={28} strokeWidth={1.5} />
                        <span className="font-sans text-[9px] mt-3 text-stone-400 tracking-widest font-medium">添加参考图</span>
                      </label>
                    )}
                  </div>
                </section>

                <section>
                  <label className="font-sans text-[11px] text-stone-500 tracking-widest uppercase mb-8 flex items-center gap-3 font-bold">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    [ 02 ] 核心场景模版
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {SCENARIO_CONFIGS.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => setSelectedScenario(s.id)}
                        className={`flex items-start gap-4 p-4 border rounded-2xl transition-all text-left ${selectedScenario === s.id ? 'border-orange-500 bg-orange-50/40 shadow-sm' : 'border-stone-100 bg-white/40 hover:border-stone-300'}`}
                      >
                        <span className="text-xl mt-0.5 opacity-80">{s.icon}</span>
                        <div>
                          <div className={`font-sans text-[12px] font-bold ${selectedScenario === s.id ? 'text-orange-600' : 'text-stone-800'}`}>{s.name}</div>
                          <div className="text-[10px] text-stone-400 leading-relaxed mt-1 font-medium">{s.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <label className="font-sans text-[11px] text-stone-500 tracking-widest uppercase mb-8 flex items-center gap-3 font-bold">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    [ 03 ] 场景与光影约束
                  </label>
                  <textarea 
                    value={userIntent} onChange={(e) => setUserIntent(e.target.value)}
                    placeholder="例如：高级灰调极简工作室、左侧柔和自然光、大理石细腻纹理..."
                    className="w-full h-36 input-glass p-6 font-sans text-sm text-stone-800 resize-none rounded-2xl border-stone-100 placeholder:text-stone-200"
                  />
                </section>
              </div>

              {/* 右侧配置区 */}
              <div className="lg:col-span-5 flex flex-col gap-10">
                <div className="glass-morphism p-10 space-y-12 rounded-3xl">
                  <section>
                    <label className="font-sans text-[11px] text-stone-500 tracking-widest uppercase mb-8 flex items-center gap-3 font-bold">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      [ 04 ] 矢量排版引擎
                    </label>
                    <div className="space-y-6">
                      <input type="text" value={textConfig.title} placeholder="主标题文案" onChange={(e) => setTextConfig({...textConfig, title: e.target.value})} className="w-full bg-white/40 border border-stone-100 px-5 py-4 rounded-xl font-serif text-xl focus:border-orange-500 outline-none transition-all placeholder:text-stone-200" />
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'modern', label: '现代促销', css: 'font-sans font-black' },
                          { id: 'elegant', label: '优雅轻奢', css: 'font-serif italic font-bold' },
                          { id: 'calligraphy', label: '东方书法', css: 'font-serif font-light italic bg-stone-50/50' },
                          { id: 'playful', label: '活力种草', css: 'font-sans tracking-normal font-bold' }
                        ].map(style => (
                          <button key={style.id} onClick={() => setTextConfig({...textConfig, fontStyle: style.id as FontStyle})} className={`py-3 text-[11px] border rounded-xl transition-all tracking-widest ${textConfig.fontStyle === style.id ? 'bg-stone-900 text-white border-stone-900 shadow-xl' : 'text-stone-400 border-stone-100 hover:border-stone-300 bg-white/40'} ${style.css}`}>
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section>
                    <label className="font-sans text-[11px] text-stone-500 tracking-widest uppercase mb-8 flex items-center gap-3 font-bold">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      [ 05 ] 渲染引擎模式
                    </label>
                    <div className="flex gap-2 p-1.5 bg-stone-100/50 rounded-2xl">
                      <button onClick={() => setMode('precision')} className={`flex-1 py-4 font-sans text-[11px] rounded-xl tracking-widest transition-all font-bold ${mode === 'precision' ? 'bg-white text-orange-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>物理级保真</button>
                      <button onClick={() => setMode('creative')} className={`flex-1 py-4 font-sans text-[11px] rounded-xl tracking-widest transition-all font-bold ${mode === 'creative' ? 'bg-white text-orange-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>艺术级重塑</button>
                    </div>
                  </section>
                </div>

                <button 
                  onClick={executeGeneration} 
                  disabled={isProcessing || sourceImages.length === 0}
                  className="w-full h-24 bg-orange-500 hover:bg-orange-600 text-white rounded-3xl font-sans font-black tracking-[0.8em] text-[13px] disabled:opacity-30 uppercase shadow-2xl shadow-orange-500/20 transition-all flex items-center justify-center gap-3"
                >
                  <Sparkles size={20} />
                  <span>启动视觉渲染</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 结果展示视图 */
          <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-1000 px-4">
            {isProcessing ? (
              <div className="flex flex-col items-center space-y-16 py-32">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <div className="absolute inset-0 border border-orange-500/10 rounded-full animate-pulse" />
                  <div className="absolute inset-8 border border-orange-500/20 rounded-full animate-spin duration-[8000ms]" />
                  <div className="w-14 h-14 bg-white shadow-2xl rounded-full flex items-center justify-center">
                    <Aperture className="text-orange-500 animate-spin duration-[4000ms]" size={32} strokeWidth={1.5} />
                  </div>
                </div>
                <div className="space-y-6 text-center">
                  <p className="text-stone-900 font-serif italic text-4xl tracking-tight">{LOADING_STEPS[loadingTextIndex]}...</p>
                  <p className="font-sans text-[10px] text-stone-300 tracking-[0.6em] uppercase font-bold">Pure Gallery Engine Processing</p>
                </div>
              </div>
            ) : (
              <div className="space-y-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-stone-100 pb-16">
                  <div className="space-y-4">
                    <h2 className="text-6xl font-serif italic text-stone-900 tracking-tighter leading-none">The Masterpiece.</h2>
                    <div className="flex gap-8 font-sans text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                       <span className="flex items-center gap-2 text-orange-500"><div className="w-2 h-2 bg-orange-500 rounded-full" /> 渲染就绪</span>
                       <span>模式: {mode === 'precision' ? '物理级保真' : '艺术级重塑'}</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setStep('upload')} className="px-12 py-5 bg-white border border-stone-200 text-stone-500 font-sans text-[11px] font-bold tracking-[0.2em] hover:border-stone-900 hover:text-stone-900 transition-all rounded-2xl uppercase">
                      重新配置
                    </button>
                    <a href={resultImage!} download="pure_gallery_render.png" className="px-12 py-5 bg-orange-500 text-white rounded-2xl font-sans text-[11px] font-bold tracking-[0.2em] uppercase flex items-center gap-3 hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20">
                      <Download size={16} /> 导出作品
                    </a>
                  </div>
                </div>
                
                <div className="relative group glass-morphism p-6 shadow-[0_60px_100px_rgba(0,0,0,0.04)] rounded-[40px] overflow-hidden bg-white/50 border border-white">
                   <div className="relative overflow-hidden rounded-[32px] bg-stone-50">
                     <img src={resultImage!} className="w-full h-auto transition-transform duration-[2000ms] group-hover:scale-[1.03]" alt="Generated result" />
                   </div>
                   
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none">
                     <div className="w-20 h-20 bg-white/80 backdrop-blur-xl rounded-full flex items-center justify-center border border-white shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                       <Eye className="text-orange-500" size={32} strokeWidth={1.5} />
                     </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 w-full h-16 border-t border-stone-100 flex items-center justify-center px-12 bg-white/80 backdrop-blur-xl z-[80]">
        <div className="font-serif text-[10px] text-stone-300 tracking-[0.8em] uppercase">
          © 2025 // PURE GALLERY // EST_STUDIO_DIALECT
        </div>
      </footer>

      {error && (
        <div className="fixed bottom-24 right-8 glass-morphism p-10 z-[100] animate-in slide-in-from-right-12 max-w-sm border-orange-500/20 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-4 text-orange-600 mb-6">
            <Activity size={20} />
            <span className="font-sans text-[12px] font-black tracking-widest uppercase">{error.title}</span>
          </div>
          <p className="font-sans text-[13px] text-stone-500 leading-relaxed font-medium">{error.msg}</p>
          <button onClick={() => setError(null)} className="mt-8 font-sans text-[11px] text-stone-400 hover:text-orange-500 underline block underline-offset-8 tracking-widest transition-colors font-bold uppercase">忽略本次异常</button>
        </div>
      )}
    </div>
  );
};

export default App;
