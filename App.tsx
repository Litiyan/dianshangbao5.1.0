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
  "分析原图透视与光源分布...",
  "构建同步光影的 AI 置景舞台...",
  "WASM 商品高精抠图处理...",
  "执行矩阵变换物理投影合成...",
  "矢量中文美学排版注入..."
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
      const aiBackground = await generateScenarioImage(
        sourceImages.map(img => img.split(',')[1]), 
        selectedScenario, 
        currentAnalysis, 
        userIntent, 
        textConfig
      );
      const finalResult = await processFinalImage(
        aiBackground, 
        sourceImages[0], 
        textConfig,
        currentAnalysis
      );
      setResultImage(finalResult);
    } catch (err: any) {
      setError({ title: "合成失败", msg: err.message });
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
        <div className="px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 flex items-center gap-1.5">
           <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Harmonization Engine v2</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full p-4 md:p-8 flex-1">
        {step === 'upload' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Camera size={14} className="text-orange-500" /> 1. 上传产品素材</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {sourceImages.map((img, idx) => (
                  <div key={idx} className="aspect-square relative group rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setSourceImages(s => s.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-white rounded-md text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                  </div>
                ))}
                {sourceImages.length < 5 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 group">
                    <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                    <Plus className="text-slate-300 group-hover:text-orange-500" size={24} />
                  </label>
                )}
              </div>
            </section>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-[32px] p-6 shadow-sm space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MessageSquareText size={14} /> 2. 场景描述</h3>
                <textarea value={userIntent} onChange={(e) => setUserIntent(e.target.value)} placeholder="描述你想要的环境..." className="w-full h-24 bg-slate-50 border-none rounded-xl p-4 text-[13px] focus:ring-2 focus:ring-orange-500/10 outline-none resize-none" />
              </div>
              <div className="bg-white rounded-[32px] p-6 shadow-sm space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={14} /> 3. 画面文案</h3>
                <input type="text" value={textConfig.title} placeholder="主标题" onChange={(e) => setTextConfig({...textConfig, title: e.target.value})} className="w-full h-11 bg-slate-50 border-none rounded-xl px-4 text-[13px] outline-none" />
                <input type="text" value={textConfig.detail} placeholder="卖点" onChange={(e) => setTextConfig({...textConfig, detail: e.target.value})} className="w-full h-11 bg-slate-50 border-none rounded-xl px-4 text-[13px] outline-none" />
              </div>
            </div>

            <section className="bg-white rounded-[32px] p-6 shadow-sm">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">4. 交付平台</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SCENARIO_CONFIGS.map(cfg => (
                  <button key={cfg.id} onClick={() => setSelectedScenario(cfg.id)} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedScenario === cfg.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-50 text-slate-500'}`}>
                    <span className="text-xl">{cfg.icon}</span>
                    <span className="text-[11px] font-bold">{cfg.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <button onClick={executeGeneration} disabled={isProcessing || sourceImages.length === 0} className="w-full h-16 bg-orange-500 hover:bg-orange-600 text-white rounded-[24px] flex items-center justify-center gap-3 font-bold tracking-widest shadow-xl active:scale-95 transition-all">
              {isProcessing ? <RefreshCw className="animate-spin" /> : <Sparkles />}
              执行物理光影重构
            </button>
          </div>
        ) : (
          <div className="min-h-[500px] flex flex-col items-center animate-in zoom-in-95">
            {isProcessing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
                <div className="space-y-1">
                   <p className="text-base font-black text-slate-800">{LOADING_STEPS[loadingTextIndex]}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Harmonization Logic: Perspective & Matrix Shadow</p>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black flex items-center gap-2"><CheckCircle2 className="text-emerald-500" /> 重构完成</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setStep('upload')} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-[11px]">返回修改</button>
                    <a href={resultImage!} download="commerce_pro.png" className="px-5 py-2 bg-orange-500 text-white rounded-xl font-bold text-[11px] flex items-center gap-2">导出结果</a>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-[48px] shadow-2xl border border-slate-50 overflow-hidden">
                  <img src={resultImage!} className="w-full h-auto rounded-[32px]" alt="Result" />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-red-100 p-5 rounded-2xl shadow-2xl flex items-center gap-3 z-[100] animate-in slide-in-from-bottom-8">
          <ShieldAlert className="text-red-500" />
          <div className="flex flex-col pr-4">
            <p className="font-black text-[13px]">{error.title}</p>
            <p className="text-[11px] text-slate-500">{error.msg}</p>
          </div>
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}
    </div>
  );
};

export default App;