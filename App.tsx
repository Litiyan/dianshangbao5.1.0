
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Hand, Download, Eye, Sparkles, Activity, Settings, Type as TypeIcon, Palette, Sliders, MessageSquare, Zap
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
  { name: '梦幻紫', hex: '#6D28D9' }
];

const FONT_OPTIONS: { id: FontStyle; label: string }[] = [
  { id: 'modern', label: '现代黑体' },
  { id: 'elegant', label: '人文楷书' },
  { id: 'brush', label: '苍劲狂草' },
  { id: 'tech', label: '赛博科技' },
  { id: 'display', label: '时尚杂志' },
  { id: 'street', label: '街头涂鸦' },
  { id: 'serif', label: '经典衬线' },
  { id: 'handwriting', label: '手写情怀' }
];

const VALUES_TEXT = "亿万次神经元计算，只为这一帧的惊艳。 ✦ 殿堂级 AI，已成为您的视觉资产。 ✦ 打破技术壁垒，重塑商业叙事逻辑。 ✦ 高端视觉进化，始于每一次点击。 ✦ ";

const App: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'result'>('upload');
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [userIntent, setUserIntent] = useState("");
  const [showLab, setShowLab] = useState(false);
  
  // 神经元参数配置
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
      // 这里的 userIntent 将包含对话框中输入的细节调整指令
      const aiResult = await generateScenarioImage(
        sourceImages.map(img => img.split(',')[1]), 
        selectedScenario, currentAnalysis, userIntent, textConfig, mode
      );
      const finalResult = await processFinalImage(aiResult, sourceImages[0], textConfig, currentAnalysis, mode);
      setResultImage(finalResult);
      setShowLab(false); // 生成后关闭实验室面板
    } catch (err: any) {
      setError(err.message || "神经元集群同步异常");
      setStep('upload');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#FDFCFB]">
      
      {/* 动态背景层 */}
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
        <h2 className="text-klein-gradient text-[16vw] font-serif italic font-black tracking-tighter opacity-[0.07] uppercase whitespace-nowrap">NEURAL</h2>
      </div>

      <div className="fixed bottom-16 left-0 w-full overflow-hidden pointer-events-none z-20 select-none opacity-40">
        <div className="animate-marquee-infinite text-[13px] font-serif italic tracking-[0.3em] text-[#002FA7]">
          <span>{VALUES_TEXT}</span>
          <span>{VALUES_TEXT}</span>
        </div>
      </div>

      {/* 头部导航 */}
      <header className="fixed top-0 w-full h-24 z-[70] px-12 flex items-center justify-between border-b border-stone-50 bg-white/40 backdrop-blur-md">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="relative p-2.5 bg-orange-50 rounded-2xl group-hover:scale-110 transition-all duration-500 animate-pulse shadow-sm">
            <Hand className="w-7 h-7 text-orange-500 drop-shadow-[0_4px_8px_rgba(249,115,22,0.3)]" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-black tracking-widest text-stone-800 leading-none">电商宝</span>
            <span className="text-[9px] font-sans font-black text-[#002FA7] tracking-[0.3em] mt-1.5 uppercase opacity-60">Neural Engine v2.5</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-10 text-[10px] font-black text-stone-300 tracking-[0.5em] uppercase">
          <span>顶配神经元集群驱动</span>
        </div>
      </header>

      <main className="relative z-30 w-full max-w-6xl px-6 py-32 flex flex-col items-center">
        {step === 'upload' ? (
          <div className="w-full space-y-20 reveal-up">
            <div className="text-center space-y-8">
              <h3 className="text-7xl md:text-[100px] font-serif italic text-stone-900 tracking-tighter leading-none">
                视觉即资产<span className="text-[#002FA7]">.</span>
              </h3>
              <p className="font-sans text-[13px] text-stone-500 tracking-[0.6em] font-black uppercase inline-block border-y border-stone-100 py-5 max-w-3xl leading-relaxed">
                搭载 Gemini 顶配神经元集群：亿万次计算，只为这一帧的惊艳。
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-12">
              <div className="lg:col-span-7 glass-panel p-12 space-y-12 rounded-[60px]">
                <section>
                  <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">
                    <span className="w-2.5 h-2.5 bg-[#002FA7] rounded-full shadow-[0_0_15px_rgba(0,47,167,0.4)] animate-pulse" />
                    [ 01 ] 核心锚点注入
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {sourceImages.map((img, i) => (
                      <div key={i} className="aspect-square relative group bg-white rounded-[24px] overflow-hidden border border-stone-50 shadow-sm transition-transform hover:-translate-y-1">
                        <img src={img} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt="" />
                        <button onClick={() => setSourceImages(s => s.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                      </div>
                    ))}
                    {sourceImages.length < 5 && (
                      <label className="aspect-square border-2 border-dashed border-stone-100 rounded-[24px] flex flex-col items-center justify-center cursor-pointer hover:border-[#002FA7] hover:bg-white transition-all group">
                        <input type="file" multiple className="hidden" onChange={handleUpload} />
                        <Plus className="text-stone-200 group-hover:text-[#002FA7] transition-transform group-hover:rotate-90 duration-500" size={32} />
                        <span className="text-[9px] font-black text-stone-300 mt-3 tracking-widest uppercase">添加锚点图片</span>
                      </label>
                    )}
                  </div>
                </section>

                <section>
                  <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">
                    <span className="w-2.5 h-2.5 bg-[#002FA7] rounded-full shadow-[0_0_15px_rgba(0,47,167,0.4)] animate-pulse" />
                    [ 02 ] 品牌文字预设
                  </label>
                  <div className="space-y-6">
                    <div className="relative group">
                      <input 
                        type="text" 
                        placeholder="输入主标题文案" 
                        value={textConfig.title} 
                        onChange={e => setTextConfig({...textConfig, title: e.target.value})} 
                        className="input-gallery w-full font-serif text-xl" 
                      />
                      <button 
                        onClick={() => setShowLab(true)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-stone-100 hover:bg-[#002FA7] hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-2 group"
                      >
                        <Zap size={14} className="group-hover:fill-current" />
                        <span className="text-[10px] font-black uppercase">神经元实验室</span>
                      </button>
                    </div>
                    <input 
                      type="text" 
                      placeholder="副标题 / 核心卖点详情" 
                      value={textConfig.detail} 
                      onChange={e => setTextConfig({...textConfig, detail: e.target.value})} 
                      className="input-gallery w-full text-xs opacity-70" 
                    />
                  </div>
                </section>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-8">
                <div className="glass-panel p-10 space-y-12 rounded-[48px]">
                  <section>
                    <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">
                      <span className="w-2.5 h-2.5 bg-[#002FA7] rounded-full shadow-[0_0_15px_rgba(0,47,167,0.4)] animate-pulse" />
                      [ 03 ] 环境叙事
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {SCENARIO_CONFIGS.slice(0, 4).map(s => (
                        <button key={s.id} onClick={() => setSelectedScenario(s.id)} className={`flex items-start gap-4 p-4 border rounded-[24px] transition-all text-left group ${selectedScenario === s.id ? 'border-[#002FA7] bg-[#002FA7]/5' : 'border-stone-50 bg-white/50 hover:border-stone-200'}`}>
                          <span className="text-xl group-hover:scale-110 transition-transform">{s.icon}</span>
                          <div>
                            <div className={`text-[12px] font-black ${selectedScenario === s.id ? 'text-[#002FA7]' : 'text-stone-800'}`}>{s.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section>
                    <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">
                      <span className="w-2.5 h-2.5 bg-[#002FA7] rounded-full shadow-[0_0_15px_rgba(0,47,167,0.4)] animate-pulse" />
                      [ 04 ] 渲染约束
                    </label>
                    <div className="flex gap-2 p-1.5 bg-stone-50 rounded-[20px] border border-stone-100/50">
                      <button onClick={() => setMode('precision')} className={`flex-1 py-4 text-[10px] font-black rounded-2xl transition-all ${mode === 'precision' ? 'bg-white text-[#002FA7] shadow-sm' : 'text-stone-300'}`}>物理保真</button>
                      <button onClick={() => setMode('creative')} className={`flex-1 py-4 text-[10px] font-black rounded-2xl transition-all ${mode === 'creative' ? 'bg-white text-[#002FA7] shadow-sm' : 'text-stone-300'}`}>艺术重构</button>
                    </div>
                  </section>
                </div>

                <button onClick={handleGenerate} disabled={isProcessing || sourceImages.length === 0} className="group relative w-full h-24 bg-orange-500 hover:bg-orange-600 text-white rounded-[32px] font-black tracking-[1em] text-[13px] uppercase shadow-[0_24px_48px_-12px_rgba(249,115,22,0.4)] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20">
                  <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                  <span>启动渲染引擎</span>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px]" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-5xl reveal-up">
            {isProcessing ? (
              <div className="flex flex-col items-center py-40 space-y-16">
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <div className="absolute inset-0 border border-[#002FA7]/20 rounded-full animate-ping scale-150 opacity-20" />
                  <div className="absolute inset-0 border-4 border-dashed border-[#002FA7]/10 rounded-full animate-spin duration-[20s]" />
                  <div className="w-20 h-20 bg-white shadow-2xl rounded-[32px] flex items-center justify-center animate-bounce">
                    <Hand className="text-orange-500" size={40} />
                  </div>
                </div>
                <div className="text-center space-y-4">
                  <h4 className="text-4xl font-serif italic text-stone-900">神经元集群亿万级计算中...</h4>
                  <p className="text-[10px] font-black text-stone-300 tracking-[0.6em] uppercase">Neural Architecture Synching</p>
                </div>
              </div>
            ) : (
              <div className="space-y-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-stone-100 pb-16">
                  <div className="space-y-4">
                    <h2 className="text-6xl font-serif italic text-stone-900 tracking-tighter leading-none">The Frame<span className="text-[#002FA7]">.</span></h2>
                    <div className="flex gap-10 text-[10px] font-black text-stone-400 tracking-[0.3em] uppercase">
                       <span className="flex items-center gap-2 text-[#002FA7]"><div className="w-2 h-2 bg-[#002FA7] rounded-full shadow-[0_0_8px_rgba(0,47,167,0.5)]" /> 渲染就绪</span>
                       <span>模式: {mode === 'precision' ? '物理保真' : '艺术重塑'}</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setStep('upload')} className="px-10 py-5 bg-white border border-stone-200 text-stone-600 rounded-2xl text-[11px] font-black tracking-[0.2em] uppercase hover:border-stone-900 transition-all active:scale-95 shadow-sm">重新配置</button>
                    <a href={resultImage!} download="render.png" className="px-10 py-5 bg-stone-900 text-white rounded-2xl text-[11px] font-black tracking-[0.2em] uppercase flex items-center gap-3 hover:bg-[#002FA7] transition-all shadow-2xl shadow-stone-900/20 active:scale-95">
                      <Download size={16} /> 导出作品
                    </a>
                  </div>
                </div>
                <div className="relative group glass-panel p-8 rounded-[64px] transition-all hover:shadow-[0_80px_120px_-20px_rgba(0,0,0,0.15)]">
                   <div className="relative overflow-hidden rounded-[40px] bg-stone-50 shadow-inner">
                     <img src={resultImage!} className="w-full h-auto transition-transform duration-[6s] group-hover:scale-[1.02]" alt="" />
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 神经元微调实验室 (Neural Tuning Lab) 对话框 */}
      {showLab && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-hidden">
          <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-xl" onClick={() => setShowLab(false)} />
          <div className="relative w-full max-w-5xl glass-panel p-10 rounded-[48px] shadow-2xl flex flex-col lg:flex-row gap-10 max-h-[90vh] overflow-y-auto reveal-up bg-white/90">
            <button onClick={() => setShowLab(false)} className="absolute top-8 right-8 p-3 bg-stone-100 rounded-full hover:bg-orange-500 hover:text-white transition-all z-10"><X size={20} /></button>
            
            {/* 左侧：细节调整对话框 (Instruction Dialogue Box) */}
            <div className="flex-1 space-y-10">
              <div className="flex items-center gap-4 text-[#002FA7]">
                <MessageSquare size={24} />
                <h3 className="text-2xl font-serif italic font-black">视觉指令中枢</h3>
              </div>
              
              <section className="space-y-6">
                <label className="text-[10px] font-black text-stone-400 tracking-widest uppercase block">细节调整对话框 (Neural Instructions)</label>
                <div className="relative">
                  <textarea 
                    value={userIntent}
                    onChange={(e) => setUserIntent(e.target.value)}
                    placeholder="请输入对渲染效果的微调指令。例如：'让光线更具戏剧性'、'增加大理石反光'、'背景中加入一束晨光'..."
                    className="w-full h-48 bg-stone-50 border border-stone-100 rounded-[28px] p-8 font-sans text-sm text-stone-700 resize-none outline-none focus:border-[#002FA7] transition-all placeholder:text-stone-300"
                  />
                  <div className="absolute bottom-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-[#002FA7]/10 rounded-full">
                    <Zap size={10} className="text-[#002FA7]" />
                    <span className="text-[9px] font-black text-[#002FA7] uppercase tracking-tighter">神经元直接对话</span>
                  </div>
                </div>
                <div className="p-6 bg-orange-50/50 border border-orange-100 rounded-[24px]">
                  <p className="text-[11px] text-orange-600/80 leading-relaxed font-medium">
                    提示：细节调整指令将直接覆盖或增强现有的环境叙事逻辑。请输入具体而富有空间感的描述，以获得最佳渲染效果。
                  </p>
                </div>
              </section>

              <section>
                <label className="text-[10px] font-black text-stone-400 tracking-widest uppercase mb-4 block">品牌色彩美学 (Branding Colors)</label>
                <div className="flex flex-wrap gap-4">
                  {COLORS.map(color => (
                    <button 
                      key={color.hex} 
                      onClick={() => setTextConfig({...textConfig, mainColor: color.hex})}
                      className={`w-12 h-12 rounded-full border-4 transition-all hover:scale-110 shadow-sm ${textConfig.mainColor === color.hex ? 'border-[#002FA7]' : 'border-white'}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                  <div className="flex items-center gap-4 px-5 bg-white rounded-full border border-stone-100 shadow-sm">
                    <Palette size={14} className="text-stone-400" />
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

            {/* 右侧：排版矩阵与物理微调 */}
            <div className="flex-1 space-y-10 border-t lg:border-t-0 lg:border-l border-stone-100 pt-10 lg:pt-0 lg:pl-10">
              <div className="flex items-center gap-4 text-orange-500">
                <Sliders size={24} />
                <h3 className="text-2xl font-serif italic font-black">排版与物理微调</h3>
              </div>

              <section>
                <label className="text-[10px] font-black text-stone-400 tracking-widest uppercase mb-4 block">字体矩阵库 (Typography Matrix)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3">
                  {FONT_OPTIONS.map(font => (
                    <button 
                      key={font.id} 
                      onClick={() => setTextConfig({...textConfig, fontStyle: font.id})}
                      className={`py-4 px-3 border rounded-2xl text-[11px] font-black transition-all ${textConfig.fontStyle === font.id ? 'bg-[#002FA7] text-white border-[#002FA7] shadow-lg' : 'bg-white hover:border-stone-300 border-stone-100 text-stone-500'}`}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-8">
                <div>
                  <div className="flex justify-between mb-4">
                    <label className="text-[10px] font-black text-stone-400 tracking-widest uppercase">文字比例 (Font Scale)</label>
                    <span className="text-[10px] font-serif italic text-stone-900 font-bold">{textConfig.fontSize}%</span>
                  </div>
                  <input type="range" min="2" max="35" step="0.5" value={textConfig.fontSize} onChange={e => setTextConfig({...textConfig, fontSize: parseFloat(e.target.value)})} className="w-full accent-[#002FA7]" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-4">
                    <label className="text-[10px] font-black text-stone-400 tracking-widest uppercase">纵向锚点 (Vertical Anchor)</label>
                    <span className="text-[10px] font-serif italic text-stone-900 font-bold">{textConfig.positionY}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="1" value={textConfig.positionY} onChange={e => setTextConfig({...textConfig, positionY: parseInt(e.target.value)})} className="w-full accent-[#002FA7]" />
                </div>

                <div>
                  <div className="flex justify-between mb-4">
                    <label className="text-[10px] font-black text-stone-400 tracking-widest uppercase">阴影浓度 (Visual Depth)</label>
                    <span className="text-[10px] font-serif italic text-stone-900 font-bold">{textConfig.shadowIntensity}px</span>
                  </div>
                  <input type="range" min="0" max="100" step="1" value={textConfig.shadowIntensity} onChange={e => setTextConfig({...textConfig, shadowIntensity: parseInt(e.target.value)})} className="w-full accent-[#002FA7]" />
                </div>
              </section>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowLab(false)} 
                  className="flex-1 py-6 bg-stone-100 text-stone-600 rounded-[28px] font-black tracking-widest uppercase text-[11px] hover:bg-stone-200 transition-all active:scale-95"
                >
                  暂存参数
                </button>
                <button 
                  onClick={handleGenerate} 
                  disabled={isProcessing}
                  className="flex-[2] py-6 bg-stone-900 text-white rounded-[28px] font-black tracking-widest uppercase text-[11px] shadow-2xl hover:bg-[#002FA7] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20"
                >
                  <Sparkles size={14} />
                  应用并立即渲染
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 w-full h-16 border-t border-stone-50 bg-white/70 backdrop-blur-xl flex items-center justify-center px-12 z-[80]">
        <div className="text-[10px] text-stone-300 tracking-[1.5em] font-serif uppercase">© 2025 // PURE GALLERY // NEURAL ENGINE PRO</div>
      </footer>
    </div>
  );
};

export default App;
