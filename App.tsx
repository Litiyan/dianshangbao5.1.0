
import React, { useState, useEffect } from 'react';
import { 
  Upload, Download, RefreshCw, Bot, 
  CheckCircle2, ShieldAlert, X, MessageSquareText,
  Sparkles, Image as ImageIcon, Camera, LayoutGrid, Plus, Trash2, Globe, Scan, UserSquare, ShoppingBag, Clapperboard, Monitor
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

  // 轮播加载文字
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
    
    // 静默分析产品特征
    setIsProcessing(true);
    try {
      const rawB64s = newImages.map(r => r.split(',')[1]);
      const res = await analyzeProduct(rawB64s);
      setAnalysis(res);
    } catch (err: any) {
      console.error("产品分析异常:", err);
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
    try {
      const rawB64s = sourceImages.map(img => img.split(',')[1]);
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
      setError({ title: "重构失败", msg: err.message });
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
            
            {/* 1. 核心创意意图 */}
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
                    placeholder="例如：'将这款包放在极简风格的北欧客厅，午后柔和斜射光，背景要有昂贵的石材纹理'..."
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
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">主标题 (艺术化处理)</p>
                      <input 
                        type="text" 
                        value={textConfig.title}
                        onChange={(e) => setTextConfig({...textConfig, title: e.target.value})}
                        placeholder="如：2024 夏季爆款"
                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">详情标签 (智能擦除与翻译)</p>
                      <input 
                        type="text" 
                        value={textConfig.detail}
                        onChange={(e) => setTextConfig({...textConfig, detail: e.target.value})}
                        placeholder="如：限时 5 折 / 全网首发"
                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. 多视角原图管理 */}
            <section className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">产品多角度素材</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">支持 5 张以内：主图、侧面、细节、包装</p>
                  </div>
                </div>
                <div className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 border border-slate-100">
                  {sourceImages.length} / 5
                </div>
              </div>
              
              <div className="flex flex-wrap gap-6">
                {sourceImages.map((img, idx) => (
                  <div key={idx} className="relative group w-40 h-40 rounded-[32px] overflow-hidden shadow-lg ring-1 ring-slate-100">
                    <img src={img} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <button onClick={() => removeImage(idx)} className="p-3 bg-white rounded-2xl shadow-xl hover:scale-110 transition-transform">
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
                {sourceImages.length < 5 && (
                  <label className="w-40 h-40 rounded-[32px] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50/20 transition-all group relative">
                    <input type="file" multiple accept="image/*" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors mb-3">
                      <Plus className="w-6 h-6 text-slate-300 group-hover:text-orange-600" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">添加新视角</span>
                  </label>
                )}
              </div>
            </section>

            {/* 3. 落地业务场景 */}
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
                    className={`flex flex-col items-center p-8 rounded-[40px] border-2 transition-all text-center group ${selectedScenario === cfg.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.03]' : 'bg-slate-50/50 border-slate-50 text-slate-400 hover:bg-white hover:border-slate-200 hover:text-slate-900'}`}
                  >
                    <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">{cfg.icon}</span>
                    <span className="text-[12px] font-black uppercase tracking-widest leading-tight">{cfg.name}</span>
                    <span className={`text-[9px] mt-2 font-bold uppercase tracking-widest ${selectedScenario === cfg.id ? 'text-slate-400' : 'text-slate-300'}`}>{cfg.ratio}</span>
                  </button>
                ))}
              </div>

              {selectedScenario === ScenarioType.MODEL_REPLACEMENT && (
                <div className="mt-10 pt-10 border-t border-slate-100 space-y-5 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">设定模特国籍与特征</p>
                  <div className="flex flex-wrap gap-3">
                    {MODEL_NATIONALITY.map(nat => (
                      <button 
                        key={nat.id} 
                        onClick={() => setSelectedNationality(nat.prompt)}
                        className={`px-8 py-3 rounded-2xl text-[11px] font-black border-2 transition-all ${selectedNationality === nat.prompt ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}
                      >
                        {nat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <button 
              onClick={startGeneration} 
              disabled={isProcessing || sourceImages.length === 0} 
              className="w-full h-24 bg-orange-500 text-white rounded-[48px] font-black text-2xl uppercase tracking-[0.3em] shadow-2xl shadow-orange-100 hover:bg-orange-600 transition-all active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none flex items-center justify-center gap-6 group"
            >
              {isProcessing ? <RefreshCw className="animate-spin w-10 h-10" /> : <Sparkles className="w-10 h-10 group-hover:rotate-12 transition-transform" />}
              开始商业重构
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-1000">
            <div className="bg-white rounded-[64px] p-16 shadow-sm border border-slate-100 min-h-[850px] flex flex-col items-center relative overflow-hidden">
              {isProcessing && (
                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-12">
                  <div className="relative mb-12">
                    <div className="w-32 h-32 border-8 border-orange-50 border-t-orange-500 rounded-full animate-spin"></div>
                    <Bot className="absolute inset-0 m-auto w-12 h-12 text-orange-500 animate-pulse" />
                  </div>
                  <h3 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">{LOADING_MESSAGES[loadingTextIndex]}</h3>
                  <div className="flex gap-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className={`w-3 h-3 rounded-full bg-orange-500 animate-bounce`} style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}

              {resultImage && (
                <div className="w-full space-y-16 animate-in zoom-in-95 duration-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-100">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-4xl font-black tracking-tight">商业交付已就绪</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">极致 8K 分辨率商业光影重构</p>
                      </div>
                    </div>
                    <button onClick={() => setStep('upload')} className="px-10 py-4 bg-slate-900 text-white hover:bg-slate-800 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95">← 返回修改指令</button>
                  </div>

                  <div className="relative group max-w-5xl mx-auto rounded-[60px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] ring-1 ring-slate-100">
                    <img src={resultImage} className="w-full h-auto object-cover" alt="Generated visual asset" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none"></div>
                    <button 
                      onClick={() => {const l=document.createElement('a'); l.href=resultImage; l.download='dianshangbao_output.png'; l.click();}} 
                      className="absolute top-12 right-12 p-8 bg-white/95 backdrop-blur rounded-[40px] shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 flex items-center gap-3"
                    >
                      <Download className="w-8 h-8 text-slate-900" />
                      <span className="font-black uppercase tracking-widest text-xs">导出高清图</span>
                    </button>
                  </div>

                  {/* 绿灯指标动画部分 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="bg-slate-50/50 p-10 rounded-[48px] border border-slate-100 hover:bg-white transition-colors">
                      <div className="flex justify-between items-center mb-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">多角度立体拟合</p>
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse"></div>
                      </div>
                      <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full animate-fill shadow-lg"></div>
                      </div>
                      <div className="flex justify-between mt-4">
                        <p className="text-xs font-black text-emerald-600">3D 数据对齐</p>
                        <span className="text-[10px] font-black text-slate-400">100% SUCCESS</span>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-10 rounded-[48px] border border-slate-100 hover:bg-white transition-colors">
                      <div className="flex justify-between items-center mb-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">场景本土化重构</p>
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse"></div>
                      </div>
                      <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full animate-fill shadow-lg" style={{animationDelay: '0.4s'}}></div>
                      </div>
                      <div className="flex justify-between mt-4">
                        <p className="text-xs font-black text-emerald-600">光影氛围合成</p>
                        <span className="text-[10px] font-black text-slate-400">RENDERED</span>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-10 rounded-[48px] border border-slate-100 hover:bg-white transition-colors">
                      <div className="flex justify-between items-center mb-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">智能文案美化</p>
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse"></div>
                      </div>
                      <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full animate-fill shadow-lg" style={{animationDelay: '0.8s'}}></div>
                      </div>
                      <div className="flex justify-between mt-4">
                        <p className="text-xs font-black text-emerald-600">自动排版布局</p>
                        <span className="text-[10px] font-black text-slate-400">OPTIMIZED</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-white px-12 py-8 rounded-[48px] shadow-[0_30px_70px_-15px_rgba(239,68,68,0.25)] border-2 border-red-50 flex items-center gap-8 z-[200] animate-in slide-in-from-bottom-10">
          <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center text-red-500">
            <ShieldAlert size={32} />
          </div>
          <div>
            <p className="text-[11px] font-black text-red-400 uppercase tracking-[0.4em] mb-1">{error.title}</p>
            <p className="text-lg font-black text-slate-800 tracking-tight">{error.msg}</p>
          </div>
          <button onClick={() => setError(null)} className="p-4 hover:bg-slate-50 rounded-2xl transition-colors"><X size={24} className="text-slate-300 hover:text-slate-900" /></button>
        </div>
      )}
    </div>
  );
};

export default App;
