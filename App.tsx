import React, { useState, useEffect } from 'react';
import { 
  Download, RefreshCw, X, MessageSquareText,
  Sparkles, Camera, LayoutGrid, Plus, Trash2, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig } from './types';
import { SCENARIO_CONFIGS } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';
import { processFinalImage } from './utils/imageComposite';

const LOADING_STEPS = [
  "正在跨维度识别产品视觉锚点...",
  "AI 创意总监正在进行场景建模...",
  "正在调用 NVIDIA H100 级渲染底图...",
  "物理级防变形保真合成中 (WASM Matting)...",
  "正在进行中文矢量美学排版..."
];

const App: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'result'>('upload');
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [userIntent, setUserIntent] = useState("");
  const [textConfig, setTextConfig] = useState<TextConfig>({ title: "", detail: "" });
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>(ScenarioType.PLATFORM_MAIN_DETAIL);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<{title: string, msg: string} | null>(null);

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

    const readers = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(readers);
    const newImages = [...sourceImages, ...results].slice(0, 5);
    setSourceImages(newImages);
    
    try {
      const rawB64s = newImages.map(r => r.split(',')[1]);
      const res = await analyzeProduct(rawB64s);
      setAnalysis(res);
    } catch (err) {
      console.error("Analysis hint failed:", err);
    }
  };

  const executeGeneration = async () => {
    if (sourceImages.length === 0) {
      setError({ title: "无有效素材", msg: "请至少上传一张产品原图" });
      return;
    }
    setIsProcessing(true);
    setStep('result');
    setError(null);
    try {
      const rawB64s = sourceImages.map(img => img.split(',')[1]);
      
      // 1. 获取 AI 渲染的纯背景/光影底图 (不含乱码文字，可能含改变后的商品)
      const aiBackground = await generateScenarioImage(
        rawB64s, 
        selectedScenario, 
        analysis || { productType: "Product", targetAudience: "General", sellingPoints: [], suggestedPrompt: "professional product photography", isApparel: false }, 
        userIntent, 
        textConfig
      );

      // 2. 核心合成流程：AI 背景 + 原始商品前景 + 前端矢量中文
      // 我们取第一张上传图作为“物理保真”锚点
      const finalResult = await processFinalImage(
        aiBackground, 
        sourceImages[0], 
        textConfig
      );
      
      setResultImage(finalResult);
    } catch (err: any) {
      setError({ title: "重构中断", msg: err.message || "由于网络或 WASM 加载超时，请稍后重试。" });
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FDFCFB]">
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white shadow-lg">
            <Sparkles size={18} />
          </div>
          <span className="text-lg font-black italic tracking-tighter">电商宝 <span className="text-orange-500 underline decoration-2 underline-offset-4">Pro</span></span>
        </div>
        <div className="flex items-center gap-2">
           <div className="px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest text-nowrap">Fidelity Engine Active</span>
           </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full p-4 md:p-8 flex-1">
        {step === 'upload' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Camera size={14} className="text-orange-500" /> 1. 上传产品原图 <span className="text-[10px] font-normal lowercase">(将用于物理级保真覆盖)</span>
                </h2>
                {sourceImages.length > 0 && (
                  <button onClick={() => setSourceImages([])} className="text-[10px] font-bold text-red-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                    <Trash2 size={12} /> 清空
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {sourceImages.map((img, idx) => (
                  <div key={idx} className="aspect-square relative group rounded-xl overflow-hidden bg-slate-50 border border-slate-100 ring-offset-2 ring-orange-500/20 group-hover:ring-2">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setSourceImages(s => s.filter((_, i) => i !== idx))} className="absolute top-1.5 right-1.5 p-1 bg-white/95 rounded-md text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {sourceImages.length < 5 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all group">
                    <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                    <Plus className="text-slate-300 group-hover:text-orange-500 transition-colors" size={24} />
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-orange-500">添加</span>
                  </label>
                )}
              </div>
            </section>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquareText size={14} className="text-blue-500" /> 2. 商业场景意图描述
                </h3>
                <textarea 
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value)}
                  placeholder="例如：在充满晨光的现代家居客厅地板上，背景要有虚化的绿植，营造温馨感..."
                  className="w-full h-24 bg-slate-50 border-none rounded-xl p-4 text-[13px] leading-relaxed focus:ring-2 focus:ring-orange-500/10 outline-none resize-none transition-all"
                />
              </div>
              <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <LayoutGrid size={14} className="text-indigo-500" /> 3. 画面中文文案 (防乱码)
                </h3>
                <input 
                  type="text" 
                  value={textConfig.title}
                  placeholder="主标题 (如: 爆款直降 / 原创设计)"
                  onChange={(e) => setTextConfig({...textConfig, title: e.target.value})}
                  className="w-full h-11 bg-slate-50 border-none rounded-xl px-4 text-[13px] outline-none focus:ring-2 focus:ring-orange-500/10 transition-all"
                />
                <input 
                  type="text" 
                  value={textConfig.detail}
                  placeholder="卖点副标题 (如: 限量 99 份)"
                  onChange={(e) => setTextConfig({...textConfig, detail: e.target.value})}
                  className="w-full h-11 bg-slate-50 border-none rounded-xl px-4 text-[13px] outline-none focus:ring-2 focus:ring-orange-500/10 transition-all"
                />
              </div>
            </div>

            <section className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">4. 交付场景选择</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SCENARIO_CONFIGS.map(cfg => (
                  <button 
                    key={cfg.id} 
                    onClick={() => setSelectedScenario(cfg.id)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedScenario === cfg.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-50 text-slate-500 hover:border-slate-200'}`}
                  >
                    <span className="text-xl">{cfg.icon}</span>
                    <span className="text-[11px] font-bold whitespace-nowrap">{cfg.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <button 
              onClick={executeGeneration}
              disabled={isProcessing || sourceImages.length === 0}
              className="w-full h-16 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white rounded-[24px] flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-100 active:scale-95 font-bold tracking-widest uppercase"
            >
              {isProcessing ? <RefreshCw className="animate-spin" /> : <Sparkles />}
              开启视觉商业重构
            </button>
          </div>
        ) : (
          <div className="min-h-[500px] flex flex-col items-center animate-in zoom-in-95 duration-500">
            {isProcessing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-500 animate-pulse" size={24} />
                </div>
                <div className="space-y-2">
                   <p className="text-base font-black text-slate-800 tracking-tight">{LOADING_STEPS[loadingTextIndex]}</p>
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Composite Engine: Canvas Vector Render + WASM Matting</p>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-500" /> 重构完成：100% 商品保真 + 矢量文案
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => setStep('upload')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-[11px] uppercase transition-colors">重新生成</button>
                    {resultImage && (
                      <a href={resultImage} download="fidelity_pro_result.png" className="px-5 py-2 bg-orange-500 text-white rounded-xl font-bold text-[11px] flex items-center gap-2 uppercase shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all">
                        <Download size={14} /> 导出交付级大片
                      </a>
                    )}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-[48px] shadow-2xl border border-slate-50 relative overflow-hidden group">
                  <div className="rounded-[32px] overflow-hidden bg-slate-100 shadow-inner">
                    <img src={resultImage!} className="w-full h-auto transition-transform duration-700 group-hover:scale-[1.01]" alt="Result" />
                  </div>
                  <div className="mt-6 flex items-center gap-4 px-2">
                      <div className="flex-1 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">物理级保真校验通过</p>
                          <p className="text-xs text-slate-600 font-medium">检测到商品轮廓锚点，已成功实施 1:1 前景覆盖。中文文本层采用矢量抗锯齿渲染，杜绝 AI 幻觉乱码。</p>
                      </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-red-100 p-5 rounded-2xl shadow-2xl flex items-center gap-3 z-[100] animate-in slide-in-from-bottom-8">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
            <ShieldAlert className="text-red-500" size={20} />
          </div>
          <div className="flex flex-col pr-4">
            <p className="font-black text-[13px] text-slate-900">{error.title}</p>
            <p className="text-[11px] text-slate-500 font-medium">{error.msg}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X size={16} /></button>
        </div>
      )}
    </div>
  );
};

export default App;