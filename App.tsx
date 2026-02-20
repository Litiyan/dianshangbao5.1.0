import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Aperture, Download, Eye, LayoutGrid, Sparkles, ChevronRight, Activity, Zap
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig, GenerationMode, FontStyle } from './types';
import { SCENARIO_CONFIGS } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';
import { processFinalImage } from './utils/imageComposite';

// 顶级高调 (High-Key) 极简电商摄影图库 - 确保大面积留白与高质感
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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#F9F9F6] font-sans">
      {/* 视觉层一：纯净高调背景瀑布流 */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="flex gap-6 h-[200%] w-full px-6">
          <div className="flex-1 flex flex-col gap-6 animate-marquee-up opacity-[0.1]">
            {[...BG_COLUMNS[0], ...BG_COLUMNS[0], ...BG_COLUMNS[0]].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[4/5] object-cover grayscale brightness-110 contrast-[0.8] rounded-3xl" alt="" />
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-6 animate-marquee-down opacity-[0.15]">
            {[...BG_COLUMNS[1], ...BG_COLUMNS[1], ...BG_COLUMNS[1]].map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[4/5] object-cover grayscale brightness-110 contrast-[0.8] rounded-3xl" alt="" />
            ))}
          </div>
          <div className="hidden lg:flex flex-1 flex flex-col gap-6 animate-marquee-up opacity-[0.1]">
            {[...BG_COLUMNS[0], ...BG_COLUMNS[0], ...BG_COLUMNS[0]].reverse().map((src, i) => (
              <img key={i} src={src} className="w-full aspect-[4/5] object-cover grayscale brightness-110 contrast-[0.8] rounded-3xl" alt="" />
            ))}
          </div>
        </div>
        {/* 极致柔和蒙版 - 消除压抑感 */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-md" />
      </div>

      {/* 视觉层二：巨型印刷排版 (背景装饰) */}
      <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <h2 className="font-serif text-[12vw] italic font-black tracking-[0.3em] text-stone-900/[0.02] uppercase whitespace-nowrap">
          PURE VISUAL
        </h2>
      </div>

      {/* 战役一：极简 Logo 与头部 */}
      <header className="fixed top-0 w-full h-24 z-[70] px-12 flex items-center justify-between border-b border-stone-900/5 bg-white/30 backdrop-blur-xl">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="relative">
            <Aperture className="w-8 h-8 text-orange-500 transition-transform duration-700 group-hover:rotate-180" />
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-[0.15em] text-stone-800">电商宝</span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-sans text-[11px] font-bold tracking-widest text-stone-400 uppercase">
          <span>灵感驱动视觉</span>
          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
        </div>
      </header>

      <main className="relative z-30 w-full max-w-6xl px-6 py-32 flex flex-col items-center">
        {step === 'upload' ? (
          <div className="w-full space-y-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            {/* 战役三：全站字体美学统一 */}
            <div className="text-center space-y-8">
              <h3 className="text-6xl md:text-[92px] font-serif italic text-stone-900 tracking-widest leading-none drop-shadow-sm">
                重塑商业视觉
              </h3>
              <p className="font-sans text-[12px] text-stone-400 tracking-[1em] font-medium uppercase border-y border-stone-100 py-4 inline-block">
                高 级 影 像 的 逻 辑 重 建
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-12 items-start">
              {/* 工作台主面板 */}
              <div className="lg:col-span-7 glass-morphism p-12 space-y-16 rounded-[40px] shadow-2xl shadow-stone-200/50">
                <section>
                  <label className="font-sans text-[12px] text-stone-700 tracking-[0.2em] uppercase mb-10 flex items-center gap-4 font-black">
                    <span className="w-2 h-2 bg-orange-500 rounded-full" />
                    [ 01 ] 视觉锚点注入
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {sourceImages.map((img, idx) => (
                      <div key={idx} className="aspect-square relative group bg-white border border-stone-100 overflow-hidden shadow-sm rounded-3xl transition-all hover:shadow-2xl hover:-translate-y-1">
                        <img src={img} className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" alt="" />
                        <button onClick={() => setSourceImages(s => s.filter((_, i) => i !== idx))} className="absolute top-3 right-3 p-2.5 bg-white/90 text-stone-900 shadow-xl rounded-full hover:bg-orange-500 hover:text-white transition-all transform scale-0 group-hover:scale-100">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {sourceImages.length < 5 && (
                      <label className="aspect-square border-2 border-stone-100 border-dashed hover:border-orange-500 transition-all flex flex-col items-center justify-center cursor-pointer bg-stone-50/20 group hover:bg-white rounded-3xl">
                        <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                        <Plus className="text-stone-300 group-hover:text-orange-500 transition-colors" size={32} strokeWidth={1} />
                        <span className="font-sans text-[10px] mt-4 text-stone-400 tracking-[0.2em] font-bold">添加参考图</span>
                      </label>
                    )}
                  </div>
                </section>

                <section>
                  <label className="font-sans text-[12px] text-stone-700 tracking-[0.2em] uppercase mb-10 flex items-center gap-4 font-black">
                    <span className="w-2 h-2 bg-orange-500 rounded-full" />
                    [ 02 ] 核心场景模版
                  </label>
                  <div className="grid grid-cols-2 gap-5">
                    {SCENARIO_CONFIGS.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => setSelectedScenario(s.id)}
                        className={`flex items-start gap-5 p-5 border rounded-3xl transition-all text-left ${selectedScenario === s.id ? 'border-orange-500 bg-orange-50/50 shadow-sm scale-[1.02]' : 'border-stone-100 bg-white/50 hover:border-stone-300'}`}
                      >
                        <span className="text-2xl mt-0.5 grayscale-[0.5] group-hover:grayscale-0">{s.icon}</span>
                        <div>
                          <div className={`font-sans text-[13px] font-black ${selectedScenario === s.id ? 'text-orange-600' : 'text-stone-800'}`}>{s.name}</div>
                          <div className="text-[11px] text-stone-400 leading-relaxed mt-1 font-medium">{s.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <label className="font-sans text-[12px] text-stone-700 tracking-[0.2em] uppercase mb-10 flex items-center gap-4 font-black">
                    <span className="w-2 h-2 bg-orange-500 rounded-full" />
                    [ 03 ] 场景与光影约束
                  </label>
                  <div className="relative">
                    <textarea 
                      value={userIntent} onChange={(e) => setUserIntent(e.target.value)}
                      placeholder="例如：北欧极简白空间、左侧柔和自然光、呈现细腻的哑光质感..."
                      className="w-full h-40 input-glass p-8 font-sans text-sm text-stone-800 resize-none rounded-3xl border-stone-100 placeholder:text-stone-200 focus:shadow-xl transition-all"
                    />
                    <Sparkles className="absolute bottom-6 right-8 text-stone-100 pointer-events-none" size={24} />
                  </div>
                </section>
              </div>

              {/* 右侧配置区 */}
              <div className="lg:col-span-5 flex flex-col gap-12">
                <div className="glass-morphism p-12 space-y-16 rounded-[40px] shadow-2xl shadow-stone-200/50">
                  <section>
                    <label className="font-sans text-[12px] text-stone-700 tracking-[0.2em] uppercase mb-10 flex items-center gap-4 font-black">
                      <span className="w-2 h-2 bg-orange-500 rounded-full" />
                      [ 04 ] 矢量排版引擎
                    </label>
                    <div className="space-y-8">
                      <div className="relative">
                        <input 
                          type="text" 
                          value={textConfig.title} 
                          placeholder="主标题文案" 
                          onChange={(e) => setTextConfig({...textConfig, title: e.target.value})} 
                          className="w-full bg-white/50 border border-stone-100 px-6 py-5 rounded-2xl font-serif text-2xl focus:border-orange-500 outline-none transition-all placeholder:text-stone-200" 
                        />
                      </div>
                      
                      {/* 战役四：排版引擎选项 UI 优化 */}
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'modern', label: '现代促销', css: 'font-sans font-black tracking-tight' },
                          { id: 'elegant', label: '优雅轻奢', css: 'font-serif italic font-bold' },
                          { id: 'calligraphy', label: '东方书法', css: 'font-serif font-light italic bg-stone-50/30' },
                          { id: 'playful', label: '活力种草', css: 'font-sans tracking-normal font-bold rounded-full' }
                        ].map(style => (
                          <button 
                            key={style.id} 
                            onClick={() => setTextConfig({...textConfig, fontStyle: style.id as FontStyle})} 
                            className={`group relative overflow-hidden py-4 text-[12px] border rounded-2xl transition-all ${textConfig.fontStyle === style.id ? 'bg-stone-900 text-white border-stone-900 shadow-2xl scale-[1.05] z-10' : 'text-stone-400 border-stone-100 hover:border-stone-300 bg-white/40'} ${style.css}`}
                          >
                            <span className="relative z-10">{style.label}</span>
                            <div className="absolute inset-0 bg-stone-100 translate-y-full group-hover:translate-y-0 transition-transform opacity-10" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section>
                    <label className="font-sans text-[12px] text-stone-700 tracking-[0.2em] uppercase mb-10 flex items-center gap-4 font-black">
                      <span className="w-2 h-2 bg-orange-500 rounded-full" />
                      [ 05 ] 渲染引擎模式
                    </label>
                    <div className="flex gap-3 p-2 bg-stone-100/30 rounded-3xl border border-stone-100">
                      <button onClick={() => setMode('precision')} className={`flex-1 py-5 font-sans text-[11px] rounded-2xl tracking-[0.2em] transition-all font-black uppercase ${mode === 'precision' ? 'bg-white text-orange-600 shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}>物理级保真</button>
                      <button onClick={() => setMode('creative')} className={`flex-1 py-5 font-sans text-[11px] rounded-2xl tracking-[0.2em] transition-all font-black uppercase ${mode === 'creative' ? 'bg-white text-orange-600 shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}>艺术级重塑</button>
                    </div>
                  </section>
                </div>

                <button 
                  onClick={executeGeneration} 
                  disabled={isProcessing || sourceImages.length === 0}
                  className="w-full h-28 bg-orange-500 hover:bg-orange-600 text-white rounded-[40px] font-sans font-black tracking-[1em] text-[14px] disabled:opacity-30 uppercase shadow-[0_30px_60px_-15px_rgba(249,115,22,0.4)] transition-all flex items-center justify-center gap-4 active:scale-95"
                >
                  <Sparkles size={24} className="animate-pulse" />
                  <span>启动视觉渲染</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 结果展示视图 - 画廊级展示 */
          <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-1000 px-4">
            {isProcessing ? (
              <div className="flex flex-col items-center space-y-20 py-40">
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <div className="absolute inset-0 border border-orange-500/10 rounded-full animate-pulse scale-125" />
                  <div className="absolute inset-8 border border-orange-500/20 rounded-full animate-spin duration-[10000ms]" />
                  <div className="w-20 h-20 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-full flex items-center justify-center">
                    <Aperture className="text-orange-500 animate-spin duration-[5000ms]" size={40} strokeWidth={1} />
                  </div>
                </div>
                <div className="space-y-8 text-center">
                  <p className="text-stone-900 font-serif italic text-5xl tracking-tight animate-pulse">{LOADING_STEPS[loadingTextIndex]}...</p>
                  <p className="font-sans text-[11px] text-stone-300 tracking-[0.8em] uppercase font-black">Pure Gallery Engine Processing</p>
                </div>
              </div>
            ) : (
              <div className="space-y-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-stone-100 pb-20">
                  <div className="space-y-6">
                    <h2 className="text-7xl font-serif italic text-stone-900 tracking-tighter leading-none">The Masterpiece.</h2>
                    <div className="flex gap-10 font-sans text-[11px] text-stone-400 uppercase tracking-[0.3em] font-black">
                       <span className="flex items-center gap-3 text-orange-500">
                         <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.6)]" /> 
                         渲染已就绪
                       </span>
                       <span className="text-stone-200">/</span>
                       <span>模式: {mode === 'precision' ? '物理级保真' : '艺术级重塑'}</span>
                    </div>
                  </div>
                  <div className="flex gap-5">
                    <button onClick={() => setStep('upload')} className="px-14 py-6 bg-white border border-stone-200 text-stone-600 font-sans text-[12px] font-black tracking-[0.2em] hover:border-stone-900 hover:text-stone-900 transition-all rounded-3xl uppercase shadow-sm">
                      重新配置
                    </button>
                    <a href={resultImage!} download="pure_gallery_render.png" className="px-14 py-6 bg-stone-900 text-white rounded-3xl font-sans text-[12px] font-black tracking-[0.2em] uppercase flex items-center gap-4 hover:bg-orange-500 transition-all shadow-2xl shadow-stone-900/20">
                      <Download size={18} /> 导出作品
                    </a>
                  </div>
                </div>
                
                <div className="relative group glass-morphism p-8 shadow-[0_80px_120px_-20px_rgba(0,0,0,0.08)] rounded-[60px] overflow-hidden bg-white border border-white/50">
                   <div className="relative overflow-hidden rounded-[40px] bg-stone-50 shadow-inner">
                     <img src={resultImage!} className="w-full h-auto transition-transform duration-[3s] ease-out group-hover:scale-[1.05]" alt="Generated result" />
                   </div>
                   
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none">
                     <div className="w-24 h-24 bg-white/90 backdrop-blur-2xl rounded-full flex items-center justify-center border border-white shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-700">
                       <Eye className="text-orange-500" size={40} strokeWidth={1} />
                     </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 w-full h-20 border-t border-stone-900/5 flex items-center justify-center px-12 bg-white/50 backdrop-blur-2xl z-[80]">
        <div className="font-serif text-[11px] text-stone-300 tracking-[1em] uppercase">
          © 2025 // PURE GALLERY // DESIGNED FOR COMMERCE
        </div>
      </footer>

      {error && (
        <div className="fixed bottom-28 right-12 glass-morphism p-12 z-[100] animate-in slide-in-from-right-16 max-w-md border-orange-500/30 rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-5 text-orange-600 mb-8">
            <Activity size={24} />
            <span className="font-sans text-[14px] font-black tracking-widest uppercase">核心渲染中断</span>
          </div>
          <p className="font-sans text-[14px] text-stone-500 leading-relaxed font-medium">{error.msg}</p>
          <button onClick={() => setError(null)} className="mt-10 font-sans text-[12px] text-stone-400 hover:text-orange-500 underline block underline-offset-8 tracking-widest transition-colors font-black uppercase">忽略本次异常</button>
        </div>
      )}
    </div>
  );
};

export default App;
