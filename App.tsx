
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Hand, Download, Eye, Sparkles, Activity, Settings, Type as TypeIcon, Palette, Sliders
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig, GenerationMode, FontStyle } from './types';
import { SCENARIO_CONFIGS } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';
import { processFinalImage } from './utils/imageComposite';

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1549439602-43ebca2327af?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1617897903246-7392ce73773b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?auto=format&fit=crop&w=800&q=80"
];

const COLORS = [
  { name: '克莱因蓝', hex: '#002FA7' },
  { name: '极致白', hex: '#FFFFFF' },
  { name: '碳黑', hex: '#1C1C1C' },
  { name: '故宫红', hex: '#C12C1F' },
  { name: '路易金', hex: '#D4AF37' },
  { name: '爱马仕橙', hex: '#F37021' },
  { name: '翡翠绿', hex: '#00A86B' },
  { name: '香槟粉', hex: '#F1DDCF' },
  { name: '梦幻紫', hex: '#6D28D9' },
  { name: '天青色', hex: '#87CEEB' }
];

const FONT_OPTIONS: { id: FontStyle; label: string }[] = [
  { id: 'modern', label: '现代黑体' },
  { id: 'elegant', label: '人文楷书' },
  { id: 'brush', label: '苍劲狂草' },
  { id: 'playful', label: '活力圆体' },
  { id: 'serif', label: '经典衬线' },
  { id: 'display', label: '时尚杂志' },
  { id: 'handwriting', label: '手写情怀' },
  { id: 'tech', label: '赛博科技' },
  { id: 'classic', label: '复古经典' },
  { id: 'street', label: '街头涂鸦' },
  { id: 'cursive', label: '极简纤细' }
];

const VALUES_TEXT = "让殿堂级 AI，成为每一个商家的标配。 ✦ 高维科技的最终归宿，是每一个商家的日常。 ✦ 打破技术壁垒，让超级算力为你所用。 ✦ 一切高端的 AI 演进，终将归于对每一个商家的服务。 ✦ ";

const App: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'result'>('upload');
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [userIntent, setUserIntent] = useState("");
  const [showLab, setShowLab] = useState(false);
  
  const [textConfig, setTextConfig] = useState<TextConfig>({ 
    title: "", 
    detail: "", 
    isEnabled: true, 
    fontStyle: 'modern',
    mainColor: '#FFFFFF',
    subColor: 'rgba(255,255,255,0.7)',
    fontSize: 8,
    shadowIntensity: 20,
    positionY: 82
  });

  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>(ScenarioType.PLATFORM_MAIN_DETAIL);
  const [mode, setMode] = useState<GenerationMode>('precision');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const results = await Promise.all(files.map(file => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    })));
    setSourceImages(prev => [...prev, ...results].slice(0, 5));
    try {
      const res = await analyzeProduct(results.map(r => (r as string).split(',')[1]));
      setAnalysis(res);
    } catch (err) { console.error(err); }
  };

  const handleGenerate = async () => {
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
      setError(err.message || "视觉引擎执行中断");
      setStep('upload');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#FDFCFB]">
      
      {/* 视觉层一：背景与动画 */}
      <div className="fixed inset-0 z-0 pointer-events-none flex gap-10 px-10">
        <div className="flex-1 flex flex-col gap-10 bg-flow-up opacity-[0.05]">
          {[...BG_IMAGES, ...BG_IMAGES].map((src, i) => <img key={i} src={src} className="w-full aspect-[4/5] object-cover rounded-[40px] grayscale" alt="" />)}
        </div>
        <div className="flex-1 flex flex-col gap-10 bg-flow-down opacity-[0.08]">
          {[...BG_IMAGES, ...BG_IMAGES].reverse().map((src, i) => <img key={i} src={src} className="w-full aspect-[4/5] object-cover rounded-[40px] grayscale" alt="" />)}
        </div>
        <div className="absolute inset-0 bg-white/85 backdrop-blur-3xl" />
      </div>

      <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none select-none">
        <h2 className="text-klein-gradient text-[16vw] font-serif italic font-black tracking-tighter opacity-[0.07] uppercase whitespace-nowrap">REDEFINE</h2>
      </div>

      <div className="fixed bottom-16 left-0 w-full overflow-hidden pointer-events-none z-20 select-none opacity-40">
        <div className="animate-marquee-infinite text-[13px] font-serif italic tracking-[0.3em] text-[#002FA7]">
          <span>{VALUES_TEXT}</span>
          <span>{VALUES_TEXT}</span>
        </div>
      </div>

      {/* 头部：Logo */}
      <header className="fixed top-0 w-full h-24 z-[70] px-12 flex items-center justify-between border-b border-stone-50 bg-white/40 backdrop-blur-md">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="relative p-2 bg-orange-50 rounded-2xl group-hover:scale-110 transition-transform duration-500 animate-pulse">
            <Hand className="w-7 h-7 text-orange-500 drop-shadow-[0_4px_8px_rgba(249,115,22,0.3)]" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-black tracking-widest text-stone-800 leading-none">电商宝</span>
            <span className="text-[9px] font-sans font-black text-[#002FA7] tracking-[0.3em] mt-1.5 uppercase opacity-60">Neural Engine Pro</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-10 text-[10px] font-black text-stone-300 tracking-[0.5em] uppercase">
          <span>高端商业视觉重构实验室</span>
        </div>
      </header>

      <main className="relative z-30 w-full max-w-6xl px-6 py-32 flex flex-col items-center">
        {step === 'upload' ? (
          <div className="w-full space-y-24 reveal-up">
            <div className="text-center space-y-8">
              <h3 className="text-7xl md:text-[110px] font-serif italic text-stone-900 tracking-tighter leading-none">
                文字即灵魂<span className="text-[#002FA7]">.</span>
              </h3>
              <p className="font-sans text-[12px] text-stone-400 tracking-[0.8em] font-black uppercase inline-block border-y border-stone-100 py-4 max-w-2xl">
                搭载 Gemini 顶配神经元集群：亿万次计算，只为这一帧的惊艳。
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-12">
              <div className="lg:col-span-7 glass-panel p-12 space-y-12 rounded-[60px]">
                <section>
                  <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">
                    <span className="w-2.5 h-2.5 bg-[#002FA7] rounded-full shadow-[0_0_15px_rgba(0,47,167,0.4)]" />
                    [ 01 ] 核心锚点注入
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {sourceImages.map((img, i) => (
                      <div key={i} className="aspect-square relative group bg-white rounded-[24px] overflow-hidden border border-stone-50 shadow-sm">
                        <img src={img} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt="" />
                        <button onClick={() => setSourceImages(s => s.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                      </div>
                    ))}
                    {sourceImages.length < 5 && (
                      <label className="aspect-square border-2 border-dashed border-stone-100 rounded-[24px] flex flex-col items-center justify-center cursor-pointer hover:border-[#002FA7] hover:bg-white transition-all group">
                        <input type="file" multiple className="hidden" onChange={handleUpload} />
                        <Plus className="text-stone-200 group-hover:text-[#002FA7]" size={32} />
                        <span className="text-[9px] font-black text-stone-300 mt-3 tracking-widest uppercase">添加图片</span>
                      </label>
                    )}
                  </div>
                </section>

                <section>
                  <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">
                    <span className="w-2.5 h-2.5 bg-[#002FA7] rounded-full shadow-[0_0_15px_rgba(0,47,167,0.4)]" />
                    [ 02 ] 品牌文字设定
                  </label>
                  <div className="space-y-6">
                    <div className="relative group">
                      <input 
                        type="text" 
                        placeholder="主标题：例如 '2025 春季限定'" 
                        value={textConfig.title} 
                        onChange={e => setTextConfig({...textConfig, title: e.target.value})} 
                        className="input-gallery w-full font-serif text-xl" 
                      />
                      <button 
                        onClick={() => setShowLab(true)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-stone-100 hover:bg-[#002FA7] hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-2 group"
                      >
                        <Settings size={14} className="group-hover:rotate-90 transition-transform duration-500" />
                        <span className="text-[10px] font-black uppercase">排版实验室</span>
                      </button>
                    </div>
                    <input 
                      type="text" 
                      placeholder="副标题/卖点详情" 
                      value={textConfig.detail} 
                      onChange={e => setTextConfig({...textConfig, detail: e.target.value})} 
                      className="input-gallery w-full text-xs opacity-80" 
                    />
                  </div>
                </section>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-8">
                <div className="glass-panel p-10 space-y-12 rounded-[48px]">
                  <section>
                    <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">
                      <span className="w-2.5 h-2.5 bg-[#002FA7] rounded-full shadow-[0_0_15px_rgba(0,47,167,0.4)]" />
                      [ 03 ] 环境叙事模版
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {SCENARIO_CONFIGS.slice(0, 4).map(s => (
                        <button key={s.id} onClick={() => setSelectedScenario(s.id)} className={`flex items-start gap-4 p-4 border rounded-[24px] transition-all text-left ${selectedScenario === s.id ? 'border-[#002FA7] bg-[#002FA7]/5' : 'border-stone-50 bg-white/50 hover:border-stone-200'}`}>
                          <span className="text-lg">{s.icon}</span>
                          <div>
                            <div className={`text-[12px] font-black ${selectedScenario === s.id ? 'text-[#002FA7]' : 'text-stone-800'}`}>{s.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section>
                    <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">
                      <span className="w-2.5 h-2.5 bg-[#002FA7] rounded-full shadow-[0_0_15px_rgba(0,47,167,0.4)]" />
                      [ 04 ] 渲染物理约束
                    </label>
                    <div className="flex gap-2 p-1.5 bg-stone-50 rounded-[20px]">
                      <button onClick={() => setMode('precision')} className={`flex-1 py-4 text-[10px] font-black rounded-2xl transition-all ${mode === 'precision' ? 'bg-white text-[#002FA7] shadow-sm' : 'text-stone-300'}`}>物理保真</button>
                      <button onClick={() => setMode('creative')} className={`flex-1 py-4 text-[10px] font-black rounded-2xl transition-all ${mode === 'creative' ? 'bg-white text-[#002FA7] shadow-sm' : 'text-stone-300'}`}>艺术重塑</button>
                    </div>
                  </section>
                </div>

                <button onClick={handleGenerate} disabled={isProcessing || sourceImages.length === 0} className="w-full h-24 bg-orange-500 hover:bg-orange-600 text-white rounded-[32px] font-black tracking-[1em] text-[13px] uppercase shadow-[0_24px_48px_-12px_rgba(249,115,22,0.4)] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20">
                  <Sparkles size={18} />
                  <span>启动渲染引擎</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-5xl reveal-up">
            {isProcessing ? (
              <div className="flex flex-col items-center py-40 space-y-16">
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <div className="absolute inset-0 border border-[#002FA7]/10 rounded-full animate-pulse scale-125" />
                  <div className="w-16 h-16 bg-white shadow-2xl rounded-full flex items-center justify-center animate-bounce">
                    <Hand className="text-orange-500" size={32} />
                  </div>
                </div>
                <div className="text-center space-y-4">
                  <h4 className="text-4xl font-serif italic text-stone-900">神经元集群计算中...</h4>
                  <p className="text-[10px] font-black text-stone-200 tracking-[0.5em] uppercase">Neural Architecture Rendering</p>
                </div>
              </div>
            ) : (
              <div className="space-y-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-stone-100 pb-16">
                  <div className="space-y-4">
                    <h2 className="text-6xl font-serif italic text-stone-900 tracking-tighter leading-none">Result Visual<span className="text-[#002FA7]">.</span></h2>
                    <div className="flex gap-10 text-[10px] font-black text-stone-400 tracking-[0.3em] uppercase">
                       <span className="flex items-center gap-2 text-[#002FA7]"><div className="w-2 h-2 bg-[#002FA7] rounded-full" /> 渲染就绪</span>
                       <span>字体: {FONT_OPTIONS.find(f => f.id === textConfig.fontStyle)?.label}</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setStep('upload')} className="px-10 py-5 bg-white border border-stone-200 text-stone-600 rounded-2xl text-[11px] font-black tracking-[0.2em] uppercase hover:border-stone-900 transition-all">重新配置</button>
                    <a href={resultImage!} download="render.png" className="px-10 py-5 bg-stone-900 text-white rounded-2xl text-[11px] font-black tracking-[0.2em] uppercase flex items-center gap-3 hover:bg-[#002FA7] transition-all shadow-2xl shadow-stone-900/20">
                      <Download size={16} /> 导出作品
                    </a>
                  </div>
                </div>
                <div className="relative group glass-panel p-8 rounded-[64px]">
                   <div className="relative overflow-hidden rounded-[40px] bg-stone-50">
                     <img src={resultImage!} className="w-full h-auto transition-transform duration-[5s] group-hover:scale-[1.03]" alt="" />
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 进阶排版实验室对话框 */}
      {showLab && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xl" onClick={() => setShowLab(false)} />
          <div className="relative w-full max-w-4xl glass-panel p-10 rounded-[48px] shadow-2xl flex flex-col md:flex-row gap-10 max-h-[90vh] overflow-y-auto reveal-up">
            <button onClick={() => setShowLab(false)} className="absolute top-8 right-8 p-3 bg-stone-100 rounded-full hover:bg-orange-500 hover:text-white transition-all"><X size={20} /></button>
            
            <div className="flex-1 space-y-10">
              <div className="flex items-center gap-4 text-[#002FA7]">
                <TypeIcon size={24} />
                <h3 className="text-2xl font-serif italic font-black">矢量排版实验室</h3>
              </div>

              {/* 字体选择器 */}
              <section>
                <label className="text-[10px] font-black text-stone-400 tracking-widest uppercase mb-4 block">字体矩阵库 (Typography Matrix)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {FONT_OPTIONS.map(font => (
                    <button 
                      key={font.id} 
                      onClick={() => setTextConfig({...textConfig, fontStyle: font.id})}
                      className={`py-4 px-3 border rounded-2xl text-[11px] font-black transition-all ${textConfig.fontStyle === font.id ? 'bg-[#002FA7] text-white border-[#002FA7] shadow-lg' : 'bg-white hover:border-stone-300 border-stone-50 text-stone-500'}`}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* 色彩选择器 */}
              <section>
                <label className="text-[10px] font-black text-stone-400 tracking-widest uppercase mb-4 block">品牌色彩美学 (Branding Colors)</label>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map(color => (
                    <button 
                      key={color.hex} 
                      onClick={() => setTextConfig({...textConfig, mainColor: color.hex})}
                      className={`w-12 h-12 rounded-full border-4 transition-all hover:scale-110 shadow-sm ${textConfig.mainColor === color.hex ? 'border-[#002FA7]' : 'border-white'}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                  <div className="flex items-center gap-3 px-4 bg-stone-50 rounded-full border border-stone-100">
                    <Palette size={14} className="text-stone-300" />
                    <input 
                      type="color" 
                      value={textConfig.mainColor} 
                      onChange={e => setTextConfig({...textConfig, mainColor: e.target.value})} 
                      className="w-8 h-8 bg-transparent border-none cursor-pointer"
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="flex-1 space-y-10 border-t md:border-t-0 md:border-l border-stone-50 pt-10 md:pt-0 md:pl-10">
              <div className="flex items-center gap-4 text-orange-500">
                <Sliders size={24} />
                <h3 className="text-2xl font-serif italic font-black">空间维度微调</h3>
              </div>

              <section className="space-y-8">
                <div>
                  <div className="flex justify-between mb-4">
                    <label className="text-[10px] font-black text-stone-400 tracking-widest uppercase">文字比例 (Font Scale)</label>
                    <span className="text-[10px] font-serif italic text-stone-900">{textConfig.fontSize}%</span>
                  </div>
                  <input type="range" min="3" max="30" step="0.5" value={textConfig.fontSize} onChange={e => setTextConfig({...textConfig, fontSize: parseFloat(e.target.value)})} className="w-full accent-[#002FA7]" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-4">
                    <label className="text-[10px] font-black text-stone-400 tracking-widest uppercase">纵向锚点 (Vertical Anchor)</label>
                    <span className="text-[10px] font-serif italic text-stone-900">{textConfig.positionY}%</span>
                  </div>
                  <input type="range" min="5" max="95" step="1" value={textConfig.positionY} onChange={e => setTextConfig({...textConfig, positionY: parseInt(e.target.value)})} className="w-full accent-[#002FA7]" />
                </div>

                <div>
                  <div className="flex justify-between mb-4">
                    <label className="text-[10px] font-black text-stone-400 tracking-widest uppercase">阴影浓度 (Visual Depth)</label>
                    <span className="text-[10px] font-serif italic text-stone-900">{textConfig.shadowIntensity}px</span>
                  </div>
                  <input type="range" min="0" max="80" step="1" value={textConfig.shadowIntensity} onChange={e => setTextConfig({...textConfig, shadowIntensity: parseInt(e.target.value)})} className="w-full accent-[#002FA7]" />
                </div>
              </section>

              <button 
                onClick={() => setShowLab(false)} 
                className="w-full py-6 bg-stone-900 text-white rounded-3xl font-black tracking-widest uppercase text-xs shadow-2xl hover:bg-[#002FA7] transition-all"
              >
                应用神经元参数
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 w-full h-16 border-t border-stone-50 bg-white/60 backdrop-blur-xl flex items-center justify-center px-12 z-[80]">
        <div className="text-[10px] text-stone-200 tracking-[1.5em] font-serif uppercase">© 2025 // PURE GALLERY // NEURAL ENGINE EDITION</div>
      </footer>
    </div>
  );
};

export default App;
