import React, { useState, useEffect } from 'react';
import { 
  Upload, Download, RefreshCw, Bot, 
  CheckCircle2, ShieldAlert, X, MessageSquareText,
  Sparkles, Image as ImageIcon, Camera, LayoutGrid, Plus, Trash2, ChevronRight
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig } from './types';
import { SCENARIO_CONFIGS } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';

const LOADING_MESSAGES = [
  "正在解析多维产品特征...",
  "AI 创意总监正在构思构图...",
  "正在模拟 8K 商业光效...",
  "正在进行本土化视觉重构...",
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
    
    // 自动进行静默分析
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

  const removeImage = (index: number) => {
    setSourceImages(prev => prev.filter((_, i) => i !== index));
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
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col">
      {/* 顶部导航 */}
      <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter">电商宝 <span className="text-orange-500">PRO</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest animate-pulse">
            AI Engine Connected
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full p-8 flex-1">
        {step === 'upload' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 上传区域 */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Camera className="text-orange-500 w-6 h-6" />
                  <h2 className="text-xl font-bold">产品原图素材 <span className="text-slate-400 font-normal text-sm">(最多5张)</span></h2>
                </div>
                {sourceImages.length > 0 && (
                  <button onClick={() => setSourceImages([])} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                    <Trash2 size={14} /> 清空全部
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {sourceImages.map((img, idx) => (
                  <div key={idx} className="aspect-square relative group rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
                    <img src={img} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(idx)} 
                      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {sourceImages.length < 5 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all group">
                    <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-100 transition-all">
                      <Plus className="text-slate-400 group-hover:text-orange-500" />
                    </div>
                    <span className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">点击上传</span>
                  </label>
                )}
              </div>
            </div>

            {/* 创意引导 */}
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <MessageSquareText className="text-blue-500 w-6 h-6" />
                  <h2 className="text-xl font-bold">画面构想描述</h2>
                </div>
                <textarea 
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value)}
                  placeholder="例如：放置在极简风北欧客厅、大理石桌面，有午后的自然斜射阳光..."
                  className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-6 text-sm focus:ring-4 focus:ring-orange-500/5 outline-none transition-all resize-none"
                />
              </div>

              <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="text-indigo-500 w-6 h-6" />
                  <h2 className="text-xl font-bold">文案排版</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">主标题 (如 50% OFF)</label>
                    <input 
                      type="text" 
                      value={textConfig.title}
                      onChange={(e) => setTextConfig({...textConfig, title: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm focus:ring-2 focus:ring-orange-500/10 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 业务场景 */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
              <h2 className="text-xl font-bold mb-6">业务交付场景</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SCENARIO_CONFIGS.map(cfg => (
                  <button 
                    key={cfg.id} 
                    onClick={() => setSelectedScenario(cfg.id)}
                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${selectedScenario === cfg.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-50 text-slate-500 hover:border-slate-200'}`}
                  >
                    <span className="text-2xl">{cfg.icon}</span>
                    <span className="text-xs font-bold whitespace-nowrap">{cfg.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 生成按钮 */}
            <button 
              onClick={startGeneration}
              disabled={isProcessing || sourceImages.length === 0}
              className="w-full h-24 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white rounded-[40px] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-orange-200 active:scale-[0.98]"
            >
              {isProcessing ? <RefreshCw className="animate-spin" /> : <Sparkles />}
              <span className="text-xl font-black tracking-widest uppercase">开始 AI 视觉重构</span>
            </button>
          </div>
        ) : (
          <div className="min-h-[600px] flex flex-col items-center animate-in fade-in duration-700">
            {isProcessing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                <div className="w-24 h-24 border-8 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{LOADING_MESSAGES[loadingTextIndex]}</h3>
              </div>
            ) : (
              <div className="w-full space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <CheckCircle2 size={24} />
                    </div>
                    <h2 className="text-2xl font-black">重构任务完成</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStep('upload')} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 font-bold text-sm transition-colors">重新调整</button>
                    {resultImage && (
                      <a href={resultImage} download="commerce-pro-result.png" className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-2xl text-white font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-orange-100">
                        <Download size={16} /> 导出结果
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden">
                  <div className="aspect-auto min-h-[400px] flex items-center justify-center bg-slate-50 rounded-[40px] overflow-hidden">
                    {resultImage && <img src={resultImage} className="max-w-full h-auto shadow-2xl" />}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 错误提示 */}
      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-white border-2 border-red-100 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4">
          <ShieldAlert className="text-red-500" />
          <div className="flex flex-col">
            <p className="font-bold text-sm text-slate-900">{error.title}</p>
            <p className="text-xs text-slate-500">{error.msg}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
        </div>
      )}
    </div>
  );
};

export default App;