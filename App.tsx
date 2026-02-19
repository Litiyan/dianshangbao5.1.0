import React, { useState, useEffect } from 'react';
import { 
  Download, RefreshCw, Bot, 
  CheckCircle2, ShieldAlert, X, MessageSquareText,
  Sparkles, Camera, LayoutGrid, Plus, Trash2
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig } from './types';
import { SCENARIO_CONFIGS } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';

const LOADING_MESSAGES = [
  "正在解析多维产品特征...",
  "AI 创意总监正在构思构图...",
  "正在模拟 8K 商业光效...",
  "正在导出高保真交付素材..."
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
        setLoadingTextIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
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
    
    setIsProcessing(true);
    try {
      const rawB64s = newImages.map(r => r.split(',')[1]);
      const res = await analyzeProduct(rawB64s);
      setAnalysis(res);
    } catch (err) {
      console.error("Analysis Failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const startGeneration = async () => {
    if (sourceImages.length === 0) {
      setError({ title: "素材缺失", msg: "请至少上传一张产品原图" });
      return;
    }
    setIsProcessing(true);
    setStep('result');
    setError(null);
    try {
      const rawB64s = sourceImages.map(img => img.split(',')[1]);
      const res = await generateScenarioImage(
        rawB64s, 
        selectedScenario, 
        analysis || { productType: "Product", targetAudience: "General", sellingPoints: [], suggestedPrompt: "", isApparel: false }, 
        userIntent, 
        textConfig
      );
      setResultImage(res);
    } catch (err: any) {
      setError({ title: "生成失败", msg: err.message || "由于网络或 API 限制，无法完成重构。" });
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <header className="h-20 bg-white/80 backdrop-blur border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter">电商宝 <span className="text-orange-500">PRO</span></h1>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Engine Ready</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full p-6 md:p-8 flex-1 space-y-8">
        {step === 'upload' ? (
          <div className="space-y-8">
            {/* 上传卡片 */}
            <div className="card-container">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Camera className="text-orange-500 w-6 h-6" />
                  <h2 className="text-xl font-bold">产品原图素材 <span className="text-slate-400 font-normal text-sm">(最多5张)</span></h2>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {sourceImages.map((img, idx) => (
                  <div key={idx} className="aspect-square relative group rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setSourceImages(s => s.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {sourceImages.length < 5 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all">
                    <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                    <Plus className="text-slate-400" />
                    <span className="mt-2 text-[10px] font-bold text-slate-400 uppercase">上传素材</span>
                  </label>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 card-container space-y-4">
                <div className="flex items-center gap-3">
                  <MessageSquareText className="text-blue-500 w-6 h-6" />
                  <h2 className="text-xl font-bold">场景构想</h2>
                </div>
                <textarea 
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value)}
                  placeholder="如：极简客厅、阳光桌面、大理石背景..."
                  className="w-full h-32 bg-slate-50 border-none rounded-2xl p-6 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all resize-none"
                />
              </div>

              <div className="card-container space-y-6">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="text-indigo-500 w-6 h-6" />
                  <h2 className="text-xl font-bold">文案配置</h2>
                </div>
                <input 
                  type="text" 
                  value={textConfig.title}
                  placeholder="主标题 (如: New Arrival)"
                  onChange={(e) => setTextConfig({...textConfig, title: e.target.value})}
                  className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-sm outline-none"
                />
              </div>
            </div>

            <div className="card-container">
              <h2 className="text-xl font-bold mb-6">业务交付场景</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SCENARIO_CONFIGS.map(cfg => (
                  <button 
                    key={cfg.id} 
                    onClick={() => setSelectedScenario(cfg.id)}
                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${selectedScenario === cfg.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-50 text-slate-500 hover:border-slate-200'}`}
                  >
                    <span className="text-2xl">{cfg.icon}</span>
                    <span className="text-xs font-bold">{cfg.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={startGeneration}
              disabled={isProcessing || sourceImages.length === 0}
              className="btn-primary w-full h-20 text-xl font-black uppercase tracking-widest"
            >
              {isProcessing ? <RefreshCw className="animate-spin" /> : <Sparkles />}
              <span className="ml-3">立即重构视觉场景</span>
            </button>
          </div>
        ) : (
          <div className="min-h-[500px] flex flex-col items-center">
            {isProcessing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
                <h3 className="text-xl font-bold text-slate-800">{LOADING_MESSAGES[loadingTextIndex]}</h3>
              </div>
            ) : (
              <div className="w-full space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-500" /> 重构完成
                  </h2>
                  <div className="flex gap-4">
                    <button onClick={() => setStep('upload')} className="px-6 py-2 bg-slate-100 rounded-xl font-bold text-sm">返回修改</button>
                    {resultImage && (
                      <a href={resultImage} download="result.png" className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                        <Download size={14} /> 导出图片
                      </a>
                    )}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-[48px] shadow-2xl border border-slate-100">
                  <img src={resultImage!} className="w-full h-auto rounded-[32px] shadow-lg" />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-red-100 p-6 rounded-3xl shadow-2xl flex items-center gap-4 z-[100] animate-bounce">
          <ShieldAlert className="text-red-500" />
          <div>
            <p className="font-bold text-sm">{error.title}</p>
            <p className="text-xs text-slate-500">{error.msg}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
        </div>
      )}
    </div>
  );
};

export default App;