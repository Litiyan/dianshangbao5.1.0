
import React, { useState, useEffect } from 'react';
import { 
  Upload, Download, RefreshCw, Bot, 
  CheckCircle2, ShieldAlert, X, MessageSquareText,
  Sparkles, Image as ImageIcon, Camera, LayoutGrid, Plus, Trash2
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig } from './types';
import { SCENARIO_CONFIGS, MODEL_NATIONALITY } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';

const LOADING_MESSAGES = [
  "正在读取多图立体特征...",
  "AI 视觉导演正在构思排版...",
  "正在渲染 8K 级商业光影...",
  "正在为您匹配最佳本土化风格...",
  "正在计算文字与产品的交互位置...",
  "正在导出高保真电商素材...",
];

const App: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'result'>('upload');
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [userIntent, setUserIntent] = useState("");
  const [textConfig, setTextConfig] = useState<TextConfig>({ title: "", detail: "" });
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>(ScenarioType.PLATFORM_MAIN_DETAIL);
  const [selectedNationality, setSelectedNationality] = useState("Asian model");
  
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
      }, 2500);
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
      // 提取纯 Base64 供 SDK 使用
      const rawB64s = newImages.map(r => r.includes(',') ? r.split(',')[1] : r);
      const res = await analyzeProduct(rawB64s);
      setAnalysis(res);
    } catch (err: any) {
      console.error("Product analysis error:", err);
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
      const rawB64s = sourceImages.map(img => img.includes(',') ? img.split(',')[1] : img);
      const res = await generateScenarioImage(
        rawB64s, 
        selectedScenario, 
        analysis || { productType: "Product", targetAudience: "General", sellingPoints: [], suggestedPrompt: "", isApparel: false }, 
        userIntent, 
        textConfig,
        selectedNationality
      );
      setResultImage(res);
    } catch (err: any) {
      setError({ title: "重构失败", msg: err.message || "生成过程出现未知错误" });
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-orange-100">
      <nav className="h-20 bg-white/80 backdrop-blur-xl sticky top-0 z-[100] px-8 flex items-center justify-between border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight leading-none">电商宝 <span className="text-orange-500">3.1 Pro</span></h1>
            <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mt-1">AI 商业视觉工作站</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-emerald-600 uppercase">系统已就绪</span>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto p-8">
        {step === 'upload' ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom duration-700">
            <section className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                <MessageSquareText size={200} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                      <MessageSquareText className="w-6 h-6 text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-black italic tracking-tight">告诉 AI 您的构思</h2>
                  </div>
                  <textarea 
                    value={userIntent}
                    onChange={(e) => setUserIntent(e.target.value)}
                    placeholder="例如：'将这款包放在极简风格的北欧客厅，午后柔和斜射光'..."
                    className="w-full h-44 bg-slate-50 border border-slate-100 rounded-[32px] p-8 text-lg focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all resize-none shadow-inner placeholder:text-slate-300"
                  />
                </div>
                
                <div className="lg:col-span-5 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight">文字美化排版</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">主标题</p>
                      <input 
                        type="text" 
                        value={textConfig.title}
                        onChange={(e) => setTextConfig({...textConfig, title: e.target.value})}
                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">详情标签</p>
                      <input 
                        type="text" 
                        value={textConfig.detail}
                        onChange={(e) => setTextConfig({...textConfig, detail: e.target.value})}
                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">产品多角度素材</h2>
                  </div>
                </div>
                <div className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 border border-slate-100">
                  {sourceImages.length} / 5
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                {sourceImages.map((img, idx) => (
                  <div key={idx} className="relative group w-40 h-40 rounded-[32px] overflow-hidden shadow-lg">
                    <img src={img} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <button onClick={() => removeImage(idx)} className="p-3 bg-white rounded-2xl">
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
                {sourceImages.length < 5 && (
                  <label className="w-40 h-40 rounded-[32px] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all">
                    <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                    <Plus className="w-8 h-8 text-slate-300" />
                  </label>
                )}
              </div>
            </section>

            <section className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black tracking-tight">落地业务场景矩阵</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {SCENARIO_CONFIGS.map(cfg => (
                  <button 
                    key={cfg.id} 
                    onClick={() => setSelectedScenario(cfg.id)} 
                    className={`p-8 rounded-[40px] border-2 transition-all ${selectedScenario === cfg.id ? 'bg-slate-900 text-white border-slate-900 shadow-2xl' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                  >
                    <span className="text-4xl block mb-4">{cfg.icon}</span>
                    <span className="text-[12px] font-black uppercase">{cfg.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <button 
              onClick={startGeneration} 
              disabled={isProcessing || sourceImages.length === 0} 
              className="w-full h-24 bg-orange-500 text-white rounded-[48px] font-black text-2xl uppercase tracking-[0.3em] shadow-2xl disabled:bg-slate-200 flex items-center justify-center gap-6"
            >
              {isProcessing ? <RefreshCw className="animate-spin w-10 h-10" /> : <Sparkles className="w-10 h-10" />}
              开始商业重构
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-1000">
            <div className="bg-white rounded-[64px] p-16 shadow-sm border border-slate-100 min-h-[800px] flex flex-col items-center relative overflow-hidden">
              {isProcessing && (
                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                  <div className="w-32 h-32 border-8 border-orange-50 border-t-orange-500 rounded-full animate-spin mb-12"></div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{LOADING_MESSAGES[loadingTextIndex]}</h3>
                </div>
              )}
              {resultImage && (
                <div className="w-full space-y-16">
                  <div className="flex items-center justify-between">
                    <h2 className="text-4xl font-black tracking-tight">商业交付已就绪</h2>
                    <button onClick={() => setStep('upload')} className="px-10 py-4 bg-slate-900 text-white rounded-3xl font-black text-xs">返回修改</button>
                  </div>
                  <div className="max-w-4xl mx-auto rounded-[60px] overflow-hidden shadow-2xl">
                    <img src={resultImage} className="w-full h-auto" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-white px-12 py-8 rounded-[48px] shadow-2xl border-2 border-red-50 flex items-center gap-8 z-[200]">
          <ShieldAlert className="text-red-500" size={32} />
          <p className="text-lg font-black text-slate-800">{error.msg}</p>
          <button onClick={() => setError(null)} className="p-4 hover:bg-slate-50 rounded-2xl"><X size={24} /></button>
        </div>
      )}
    </div>
  );
};

export default App;
