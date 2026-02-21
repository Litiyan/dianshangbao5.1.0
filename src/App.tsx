
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Hand, Download, Eye, Sparkles, Activity, Settings, Type as TypeIcon, Palette, Sliders, MessageSquare, Zap, CreditCard, CheckCircle2, Loader2
} from 'lucide-react';
import { ScenarioType, MarketAnalysis, TextConfig, GenerationMode, FontStyle } from './types';
import { SCENARIO_CONFIGS } from './constants';
import { analyzeProduct, generateScenarioImage } from './services/geminiService';
import { processFinalImage } from './utils/imageComposite';

const App: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'result'>('upload');
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [userPrompt, setUserPrompt] = useState("");
  const [showLab, setShowLab] = useState(false);
  
  // 支付相关状态
  const [showCheckout, setShowCheckout] = useState(false);
  const [payStatus, setPayStatus] = useState<'idle' | 'pending' | 'success'>('idle');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [currentOrderNo, setCurrentOrderNo] = useState<string | null>(null);
  // Fix: Use 'number' instead of 'NodeJS.Timeout' for browser-side setInterval return value.
  const pollingRef = useRef<number | null>(null);

  const [textConfig, setTextConfig] = useState<TextConfig>({ 
    title: "", detail: "", isEnabled: true, fontStyle: 'modern',
    mainColor: '#FFFFFF', subColor: 'rgba(255,255,255,0.7)',
    fontSize: 8, shadowIntensity: 20, positionY: 82
  });
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>(ScenarioType.PLATFORM_MAIN_DETAIL);
  const [mode, setMode] = useState<GenerationMode>('precision');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  // 轮询订单状态逻辑
  useEffect(() => {
    if (showCheckout && currentOrderNo && payStatus === 'pending') {
      // Fix: Use window.setInterval to explicitly use the browser's implementation.
      pollingRef.current = window.setInterval(async () => {
        try {
          const res = await fetch(`/api/pay/query?out_trade_no=${currentOrderNo}`);
          const data = await res.json();
          if (data.trade_status === 'TRADE_SUCCESS') {
            setPayStatus('success');
            if (pollingRef.current) clearInterval(pollingRef.current);
            // 支付成功 2秒后自动关闭 Modal
            setTimeout(() => setShowCheckout(false), 2000);
          }
        } catch (e) { console.error("Polling error", e); }
      }, 3000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [showCheckout, currentOrderNo, payStatus]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const results = await Promise.all(files.map(file => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    })));
    setSourceImages(prev => [...prev, ...results].slice(0, 5));
    try {
      const res = await analyzeProduct(results.map((r: string) => r.split(',')[1]));
      setAnalysis(res);
    } catch (err) { console.error(err); }
  };

  const handleGenerate = async () => {
    if (sourceImages.length === 0) return;
    setIsProcessing(true); setStep('result');
    try {
      const currentAnalysis = analysis || await analyzeProduct([sourceImages[0].split(',')[1]]);
      const aiResult = await generateScenarioImage(sourceImages.map((img: string) => img.split(',')[1]), selectedScenario, currentAnalysis, userPrompt, textConfig, mode);
      const finalResult = await processFinalImage(aiResult, sourceImages[0], textConfig, currentAnalysis, mode);
      setResultImage(finalResult);
      setShowLab(false); 
    } catch (err: any) { setStep('upload'); } finally { setIsProcessing(false); }
  };

  const startPay = async () => {
    setPayStatus('pending');
    setQrUrl(null);
    setShowCheckout(true);
    try {
      const res = await fetch('/api/pay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: "19.90", subject: "电商宝 Pro 无限制算力包" })
      });
      const data = await res.json();
      if (data.qr_code) {
        setCurrentOrderNo(data.out_trade_no);
        setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.qr_code)}`);
      }
    } catch (e) { setPayStatus('idle'); setShowCheckout(false); }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#FDFCFB]">
      <header className="fixed top-0 w-full h-24 z-[70] px-12 flex items-center justify-between border-b border-stone-50 bg-white/40 backdrop-blur-md">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="relative p-2.5 bg-orange-50 rounded-2xl group-hover:scale-110 transition-all duration-500 animate-pulse shadow-sm">
            <Hand className="w-7 h-7 text-orange-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-black tracking-widest text-stone-800 leading-none">电商宝</span>
            <span className="text-[9px] font-sans font-black text-[#002FA7] tracking-[0.3em] mt-1.5 uppercase opacity-60">Neural Engine v2.5</span>
          </div>
        </div>
        <button onClick={startPay} className="flex items-center gap-3 px-6 py-3 bg-white border border-stone-100 rounded-full hover:shadow-xl transition-all active:scale-95 group">
          <CreditCard className={`w-4 h-4 ${payStatus === 'success' ? 'text-green-500' : 'text-[#002FA7]'}`} />
          <span className="text-[10px] font-black tracking-widest uppercase">
            {payStatus === 'success' ? 'PRO 会员已激活' : '升级 Pro 版'}
          </span>
        </button>
      </header>

      <main className="relative z-30 w-full max-w-6xl px-6 py-32 flex flex-col items-center">
        {step === 'upload' ? (
          <div className="w-full space-y-20 reveal-up">
            <div className="text-center space-y-8">
              <h3 className="text-7xl md:text-[100px] font-serif italic text-stone-900 tracking-tighter leading-none">视觉即资产<span className="text-[#002FA7]">.</span></h3>
              <p className="font-sans text-[13px] text-stone-500 tracking-[0.8em] font-black uppercase inline-block border-y border-stone-100 py-5 max-w-3xl leading-relaxed">
                搭载 Gemini 顶配神经元集群：亿万次计算，只为这一帧的惊艳。
              </p>
            </div>
            <div className="grid lg:grid-cols-12 gap-12">
               <div className="lg:col-span-7 glass-panel p-12 space-y-12 rounded-[60px]">
                <section>
                  <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">
                    <span className="w-2.5 h-2.5 bg-[#002FA7] rounded-full animate-pulse" />
                    [ 01 ] 核心锚点注入
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {sourceImages.map((img, i) => (
                      <div key={i} className="aspect-square relative group bg-white rounded-[24px] overflow-hidden border border-stone-50 shadow-sm">
                        <img src={img} className="w-full h-full object-cover" alt="" />
                      </div>
                    ))}
                    {sourceImages.length < 5 && (
                      <label className="aspect-square border-2 border-dashed border-stone-100 rounded-[24px] flex flex-col items-center justify-center cursor-pointer hover:border-[#002FA7] hover:bg-white transition-all group">
                        <input type="file" multiple className="hidden" onChange={handleUpload} />
                        <Plus className="text-stone-200 group-hover:text-[#002FA7]" size={32} />
                      </label>
                    )}
                  </div>
                </section>
                <section>
                  <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">
                    <span className="w-2.5 h-2.5 bg-[#002FA7] rounded-full animate-pulse" />
                    [ 02 ] 视觉语境构筑
                  </label>
                  <textarea 
                    value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)}
                    className="w-full min-h-[120px] resize-none rounded-sm bg-white/40 backdrop-blur-md border border-stone-200/60 px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:bg-white/80 transition-all outline-none"
                    placeholder={"// 导演指令：请描述您期望的画面细节与氛围...\n例如：清晨柔和的阳光透过百叶窗，商品放置在带有水滴的黑大理石台面上。"}
                  />
                </section>
                <section>
                  <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">
                    <span className="w-2.5 h-2.5 bg-[#002FA7] rounded-full animate-pulse" />
                    [ 03 ] 品牌文字预设
                  </label>
                  <input 
                    type="text" placeholder="主标题文案" value={textConfig.title} 
                    onChange={e => setTextConfig({...textConfig, title: e.target.value})} 
                    className="input-gallery w-full font-serif text-xl" 
                  />
                </section>
              </div>
              <div className="lg:col-span-5 flex flex-col gap-8">
                <div className="glass-panel p-10 space-y-12 rounded-[48px]">
                   <section>
                    <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">[ 04 ] 环境叙事</label>
                    <div className="grid grid-cols-2 gap-4">
                      {SCENARIO_CONFIGS.slice(0, 4).map(s => (
                        <button key={s.id} onClick={() => setSelectedScenario(s.id)} className={`p-4 border rounded-[24px] text-left transition-all ${selectedScenario === s.id ? 'border-[#002FA7] bg-[#002FA7]/5' : 'bg-white/50 border-transparent hover:border-stone-100'}`}>
                          <span className="text-xl">{s.icon}</span>
                          <div className="text-[12px] font-black">{s.name}</div>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section>
                    <label className="text-[11px] font-black text-[#002FA7] tracking-[0.3em] uppercase mb-8 flex items-center gap-4">[ 05 ] 渲染约束</label>
                    <div className="flex gap-2 p-1.5 bg-stone-50 rounded-[20px]">
                      <button onClick={() => setMode('precision')} className={`flex-1 py-4 text-[10px] font-black rounded-2xl transition-all ${mode === 'precision' ? 'bg-white text-[#002FA7] shadow-sm' : 'text-stone-300'}`}>物理保真</button>
                      <button onClick={() => setMode('creative')} className={`flex-1 py-4 text-[10px] font-black rounded-2xl transition-all ${mode === 'creative' ? 'bg-white text-[#002FA7] shadow-sm' : 'text-stone-300'}`}>艺术重构</button>
                    </div>
                  </section>
                </div>
                <button onClick={handleGenerate} className="w-full h-24 bg-orange-500 text-white rounded-[32px] font-black tracking-[1em] text-[13px] shadow-2xl transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50" disabled={isProcessing || sourceImages.length === 0}>启动渲染引擎</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-5xl reveal-up">
            {isProcessing ? (
              <div className="flex flex-col items-center py-40 space-y-8 animate-pulse text-stone-300">
                <Loader2 className="animate-spin w-12 h-12" />
                <span className="text-[10px] font-black tracking-[0.5em] uppercase">神经元集群同步中...</span>
              </div>
            ) : (
              <div className="space-y-16">
                 <div className="flex justify-between items-end border-b border-stone-100 pb-8">
                   <h2 className="text-5xl font-serif italic text-stone-900 tracking-tighter leading-none">The Masterpiece<span className="text-[#002FA7]">.</span></h2>
                   <button onClick={() => setStep('upload')} className="px-8 py-4 bg-white border border-stone-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-stone-900 transition-all active:scale-95">重新配置</button>
                 </div>
                 <div className="glass-panel p-8 rounded-[60px]">
                   <img src={resultImage!} className="w-full h-auto rounded-[40px] shadow-2xl" alt="生成结果" />
                 </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 收银台 Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-2xl transition-all" onClick={() => setShowCheckout(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[48px] p-12 text-center shadow-2xl reveal-up">
            <button onClick={() => setShowCheckout(false)} className="absolute top-8 right-8 p-3 bg-stone-50 rounded-full hover:bg-stone-100 transition-all"><X size={20}/></button>
            
            <div className="space-y-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center">
                  {payStatus === 'success' ? <CheckCircle2 className="text-green-500" size={32} /> : <Sparkles className="text-orange-500" size={32} />}
                </div>
                <h4 className="text-2xl font-serif italic font-black">
                  {payStatus === 'success' ? '支付成功！' : '解锁 Pro 无限算力'}
                </h4>
                <p className="text-[11px] text-stone-400 tracking-[0.2em] font-black uppercase">Gemini 2.5 Flash Ultra Powered</p>
              </div>

              <div className="bg-stone-50 rounded-[32px] p-10 flex flex-col items-center gap-6 border border-stone-100 shadow-inner relative overflow-hidden">
                {qrUrl ? (
                  <div className="relative p-4 bg-white rounded-2xl shadow-xl transition-all">
                    <img src={qrUrl} className={`w-56 h-56 transition-opacity ${payStatus === 'success' ? 'opacity-10' : 'opacity-100'}`} alt="支付二维码" />
                    {payStatus === 'success' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center animate-bounce shadow-2xl shadow-green-200">
                          <CheckCircle2 size={48} />
                        </div>
                        <span className="font-black text-green-600 text-lg uppercase tracking-widest">Success</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-orange-200 animate-spin" />
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="text-3xl font-black text-stone-900">¥ 19.90</div>
                  <div className="text-[10px] font-black text-[#002FA7] tracking-widest uppercase">
                    {payStatus === 'pending' ? '正在等待扫码支付...' : '支付已完成'}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-stone-300 leading-relaxed px-4">
                点击扫码即代表您同意《电商宝商业授权协议》，支付完成后系统将自动为您分配独立神经元计算节点。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
