import React, { useState, useEffect } from 'react';
import { StyleSelector, STYLES } from './components/StyleSelector';
import { GenerationConfig, AspectRatio, GeneratedImage, AppState, BrandTone } from './types';
import { generateImage, enhancePrompt, suggestCreativePrompt } from './services/geminiService';
import { 
  Wand2, 
  Image as ImageIcon, 
  Download, 
  History, 
  Maximize2, 
  Sparkles,
  Loader2,
  XCircle,
  Upload,
  Dice5,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Menu,
  Palette,
  Lightbulb,
  Smartphone,
  Monitor,
  Layout,
  Check
} from 'lucide-react';

const App: React.FC = () => {
  // State
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [selectedStyleId, setSelectedStyleId] = useState('none');
  const [brandTone, setBrandTone] = useState<BrandTone>('default');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  // Separate loading states for better UX
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justRefined, setJustRefined] = useState(false);

  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  
  // Responsive sidebar state
  // On desktop default open, on mobile default closed
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  // Handle window resize for responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        // Don't auto-close if already interacting, but setting good defaults
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut for generation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (prompt || referenceImage) {
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, referenceImage, selectedStyleId, aspectRatio, negativePrompt, brandTone]);

  // Handlers
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsTextLoading(true);
    setErrorMessage(null);
    setJustRefined(false);
    try {
      // Pass brandTone and aspectRatio for scenario-aware optimization
      const enhanced = await enhancePrompt(prompt, brandTone, aspectRatio);
      setPrompt(enhanced);
      setJustRefined(true);
      setTimeout(() => setJustRefined(false), 3000);
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to enhance prompt. Please try again.");
    } finally {
      setIsTextLoading(false);
    }
  };

  const handleSurpriseMe = async () => {
    setIsTextLoading(true);
    setErrorMessage(null);
    setJustRefined(false);
    try {
      // Pass the current Brand Tone and Aspect Ratio to get relevant inspiration
      const creative = await suggestCreativePrompt(brandTone, aspectRatio);
      setPrompt(creative);
      
      // If default tone, pick random style, otherwise stick to tone-appropriate defaults
      if (brandTone === 'default') {
         const randomStyle = STYLES[Math.floor(Math.random() * STYLES.length)];
         setSelectedStyleId(randomStyle.id);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Could not generate a suggestion.");
    } finally {
      setIsTextLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !referenceImage) return;

    setAppState(AppState.GENERATING);
    setErrorMessage(null);
    
    // On mobile, close sidebar when generating to show results
    if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
    }

    // 1. Get Visual Style Modifier (e.g., "Cinematic", "3D Render")
    const style = STYLES.find(s => s.id === selectedStyleId);
    const styleMod = style && style.id !== 'none' ? style.promptModifier : '';

    // 2. Get Brand Tone Modifier (Implicit visual cues)
    // Even if enhancePrompt handled this, adding visual keywords helps the image model directly
    const toneModifiers: Record<BrandTone, string> = {
      default: '',
      minimalist: 'minimalist aesthetic, clean lines, uncluttered, negative space, neutral color palette, refined',
      luxury: 'luxury aesthetic, premium textures, gold and marble accents, dramatic rim lighting, sophisticated, high-end',
      energetic: 'high energy, dynamic motion, vibrant saturated colors, bold contrast, motion blur, impactful',
      corporate: 'professional corporate style, trustworthy blue and grey tones, structured composition, bright even lighting',
      playful: 'playful aesthetic, soft rounded shapes, pastel colors, warm lighting, whimsical, inviting'
    };
    const toneMod = toneModifiers[brandTone];

    // 3. Construct Final Prompt
    // Order: Style Medium -> Tone/Vibe -> Subject
    const parts = [styleMod, toneMod, prompt].filter(p => p.trim() !== '');
    const finalPrompt = parts.join('. ');

    const config: GenerationConfig = {
      prompt: finalPrompt,
      negativePrompt,
      aspectRatio,
      styleId: selectedStyleId,
      referenceImage: referenceImage || undefined
    };

    try {
      const base64Image = await generateImage(config);
      
      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        data: base64Image,
        prompt: prompt, // Store user visible prompt for history
        timestamp: Date.now(),
        aspectRatio
      };

      setHistory(prev => [newImage, ...prev]);
      setCurrentImage(newImage);
      setAppState(AppState.SUCCESS);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      setErrorMessage("Image generation failed. Please check your prompt or try again.");
    } finally {
      // Keep error state if failed, otherwise idle
      if (errorMessage) {
         setAppState(AppState.ERROR);
      } else {
         setAppState(AppState.IDLE);
      }
    }
  };

  const handleDownload = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.data;
    link.download = `gemini-vision-${img.id.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const setInspiration = (p: string, styleId: string, tone: BrandTone) => {
    setPrompt(p);
    setSelectedStyleId(styleId);
    setBrandTone(tone);
    setIsSidebarOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden selection:bg-purple-500/30 relative">
      
      {/* Toast Notification */}
      {justRefined && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-slide-up pointer-events-none">
          <div className="bg-gray-900 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <div className="bg-green-500/20 p-1 rounded-full">
              <Check size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-100">Prompt Optimized</p>
              <p className="text-xs text-green-400/80">Applied {brandTone} tone & {aspectRatio} composition rules.</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Controls */}
      <aside 
        className={`fixed md:relative top-0 left-0 h-full z-40 bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out shadow-2xl flex-shrink-0
          ${isSidebarOpen ? 'w-[85vw] md:w-[420px] translate-x-0' : 'w-[85vw] md:w-0 -translate-x-full md:translate-x-0 md:w-0 opacity-0 md:opacity-100'}
        `}
      >
        <div className={`flex flex-col h-full overflow-y-auto custom-scrollbar ${!isSidebarOpen && 'md:hidden'}`}>
          
          {/* Header */}
          <div className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
                  <Sparkles className="text-white w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                  AIGC Vision
                </h1>
              </div>
              <p className="text-xs text-gray-500 font-medium tracking-wide">POWERED BY GEMINI 2.5</p>
            </div>
            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <XCircle size={24} />
            </button>
          </div>

          {/* Controls Container */}
          <div className="p-6 space-y-8 pb-32">
            
            {/* Error Banner */}
            {errorMessage && (
              <div className="bg-red-900/20 border border-red-500/30 text-red-200 text-sm p-3 rounded-lg flex items-start gap-2 animate-slide-up">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                <div className="flex-1">{errorMessage}</div>
                <button onClick={() => setErrorMessage(null)} className="hover:text-white"><XCircle size={14}/></button>
              </div>
            )}

            {/* Prompt Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <label className="text-sm font-semibold text-gray-300">Prompt</label>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSurpriseMe}
                    disabled={isTextLoading || appState === AppState.GENERATING}
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-purple-300 transition-colors disabled:opacity-50 border border-gray-700 hover:border-purple-500/50"
                    title={`Generate a random ${brandTone} idea`}
                  >
                    {isTextLoading ? <Loader2 size={12} className="animate-spin"/> : <Dice5 size={12} />}
                    Surprise Me
                  </button>
                  <button 
                    onClick={handleEnhancePrompt}
                    disabled={isTextLoading || appState === AppState.GENERATING || !prompt}
                    className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-300 disabled:opacity-50 border ${
                      justRefined 
                        ? 'bg-green-900/30 text-green-300 border-green-500/50' 
                        : 'bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 border-indigo-800/50 hover:border-indigo-500/50'
                    }`}
                    title="Analyze scenario and optimize prompt"
                  >
                    {isTextLoading ? <Loader2 size={12} className="animate-spin"/> : justRefined ? <Check size={12} /> : <Sparkles size={12} />}
                    {justRefined ? 'Refined' : 'Refine'}
                  </button>
                </div>
              </div>
              <div className="relative group">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your vision... (e.g. A futuristic eco-friendly building)"
                  className={`w-full bg-gray-950 border rounded-xl p-4 text-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none resize-none h-32 transition-all placeholder-gray-600 leading-relaxed shadow-inner ${
                    justRefined ? 'border-green-500/50 ring-2 ring-green-500/20' : 'border-gray-800'
                  }`}
                />
                <div className="absolute bottom-2 right-2 text-[10px] text-gray-600 pointer-events-none bg-gray-950/80 px-1 rounded">
                   {prompt.length} chars
                </div>
              </div>
            </div>
            
            {/* Tone & Style Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {/* Brand Tone Selector */}
               <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Palette size={14} className="text-gray-400"/> Brand Tone
                  </label>
                  <div className="relative">
                    <select
                      value={brandTone}
                      onChange={(e) => setBrandTone(e.target.value as BrandTone)}
                      className="w-full appearance-none bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-gray-300 cursor-pointer hover:bg-gray-900 transition-colors"
                    >
                      <option value="default">Default / Neutral</option>
                      <option value="minimalist">Minimalist (Clean)</option>
                      <option value="luxury">Luxury (Elegant)</option>
                      <option value="corporate">Professional (Trust)</option>
                      <option value="energetic">Energetic (Vibrant)</option>
                      <option value="playful">Playful (Friendly)</option>
                    </select>
                    <div className="absolute right-3 top-3 pointer-events-none text-gray-500">
                      <ChevronLeft className="w-3 h-3 -rotate-90" />
                    </div>
                  </div>
               </div>
               
               {/* Aspect Ratio */}
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    {aspectRatio === '9:16' ? <Smartphone size={14} className="text-gray-400"/> : 
                     aspectRatio === '16:9' ? <Monitor size={14} className="text-gray-400"/> : 
                     <Layout size={14} className="text-gray-400"/>}
                    Format
                 </label>
                 <div className="relative">
                   <select 
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                      className="w-full appearance-none bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-gray-300 cursor-pointer hover:bg-gray-900 transition-colors"
                   >
                     <option value="1:1">Square (1:1)</option>
                     <option value="16:9">Landscape (16:9)</option>
                     <option value="9:16">Portrait (9:16)</option>
                     <option value="4:3">Tablet (4:3)</option>
                     <option value="3:4">Print (3:4)</option>
                   </select>
                   <div className="absolute right-3 top-3 pointer-events-none text-gray-500">
                     <ChevronLeft className="w-3 h-3 -rotate-90" />
                   </div>
                 </div>
               </div>
            </div>

            {/* Reference Image */}
            <div className="space-y-3">
               <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                 <Upload size={14} className="text-gray-400"/> Reference Image
               </label>
               <div className="relative">
                 <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleReferenceUpload}
                    className="hidden"
                    id="ref-upload"
                    // Reset value to allow re-uploading same file if cleared
                    onClick={(e) => (e.currentTarget.value = '')}
                 />
                 <label 
                    htmlFor="ref-upload"
                    className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${referenceImage ? 'border-purple-500 bg-gray-900' : 'border-gray-800 hover:border-gray-600 bg-gray-950/50 hover:bg-gray-900'}`}
                 >
                   {referenceImage ? (
                     <div className="relative w-full h-full group/img animate-fade-in">
                        <img src={referenceImage} alt="Ref" className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                            <span className="text-xs text-white font-medium">Change Image</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation(); // Stop bubbling to label click
                            setReferenceImage(null);
                          }}
                          className="absolute top-1 right-1 bg-gray-900/80 text-white rounded-full p-1 hover:bg-red-500/90 hover:text-white transition-colors z-10"
                        >
                          <XCircle size={14} />
                        </button>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center gap-2 text-gray-500">
                       <Upload size={16} />
                       <span className="text-xs">Click to upload</span>
                     </div>
                   )}
                 </label>
               </div>
            </div>

            {/* Styles */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-300">Visual Style</label>
              <StyleSelector selectedStyleId={selectedStyleId} onSelect={setSelectedStyleId} />
            </div>

            {/* Negative Prompt */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Negative Prompt</label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Blurry, low quality, bad anatomy..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none placeholder-gray-700 transition-all focus:bg-gray-900"
                />
            </div>
            
            <div className="flex gap-2 items-start p-3 bg-indigo-900/10 border border-indigo-900/30 rounded-lg">
              <Lightbulb size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-indigo-200/80 leading-relaxed">
                Tip: Click <strong>Refine</strong> to automatically analyze your prompt and optimize camera angles, lighting, and composition for the selected <strong>{brandTone !== 'default' ? brandTone : 'visual'}</strong> tone.
              </p>
            </div>
          </div>
        </div>
        
        {/* Generate Button (Sticky Footer) */}
        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-gray-950 via-gray-900/95 to-transparent z-20 md:via-gray-900">
              <button
                onClick={handleGenerate}
                disabled={appState === AppState.GENERATING || (!prompt && !referenceImage)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 rounded-xl font-bold text-white shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] border border-white/10 group"
              >
                {appState === AppState.GENERATING ? (
                  <>
                    <Loader2 className="animate-spin" />
                    <span className="animate-pulse">Generating...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Generate Visual
                  </>
                )}
              </button>
        </div>
        
        {/* Desktop Collapse Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden md:flex absolute -right-8 top-1/2 -translate-y-1/2 bg-gray-800 hover:bg-gray-700 p-1.5 rounded-r-lg border border-l-0 border-gray-700 text-gray-400 hover:text-white transition-colors shadow-lg z-30"
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isSidebarOpen ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
        </button>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-gray-950">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
             style={{ 
               backgroundImage: 'radial-gradient(#4a5568 1px, transparent 1px)', 
               backgroundSize: '24px 24px' 
             }} 
        />

        {/* Top Bar */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-950/80 backdrop-blur-md z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
             {/* Mobile Menu Trigger */}
             <button 
               className="md:hidden text-gray-400 hover:text-white"
               onClick={() => setIsSidebarOpen(true)}
             >
               <Menu size={24} />
             </button>

             {(!isSidebarOpen || window.innerWidth <= 768) && (
               <div className="flex items-center gap-2 animate-fade-in duration-300">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <Sparkles className="text-white w-3 h-3" />
                  </div>
                  <span className="font-bold text-lg text-gray-200 hidden sm:inline">AIGC Vision</span>
               </div>
             )}
          </div>
          <div className="flex items-center gap-3">
             {currentImage && (
               <button 
                onClick={() => handleDownload(currentImage)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-700 text-gray-200 shadow-sm"
               >
                 <Download size={16} /> <span className="hidden sm:inline">Download</span>
               </button>
             )}
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
           {currentImage ? (
             <div className="relative max-w-full max-h-full shadow-2xl rounded-lg border border-gray-800 group animate-zoom-in">
                <img 
                  src={currentImage.data} 
                  alt={currentImage.prompt} 
                  className="max-w-full max-h-[calc(100vh-14rem)] object-contain mx-auto rounded-lg"
                  style={{
                    boxShadow: '0 0 50px -12px rgba(0, 0, 0, 0.5)'
                  }}
                />
                
                {/* Image Overlay Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-lg flex flex-col gap-1">
                  <p className="text-white text-sm font-medium line-clamp-2 drop-shadow-md">{currentImage.prompt}</p>
                  <div className="flex gap-2">
                     <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded backdrop-blur-md">
                        {currentImage.aspectRatio}
                     </span>
                  </div>
                </div>
             </div>
           ) : (
             <div className="text-center flex flex-col items-center justify-center max-w-3xl px-4 z-10 animate-fade-in pb-16 md:pb-0">
               <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-900/50 rounded-3xl flex items-center justify-center mb-6 border border-gray-800 shadow-2xl rotate-3 transition-transform hover:rotate-0 duration-500">
                 <ImageIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-600" />
               </div>
               <h3 className="text-xl md:text-2xl font-bold text-gray-200 mb-2">Create On-Brand Visuals</h3>
               <p className="text-sm md:text-base text-gray-500 mb-8 max-w-md">
                 Select a brand tone, define your scenario, and let Gemini generate professional visuals tailored to your devices.
               </p>
               
               {/* Inspiration Chips */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full text-left">
                 <button 
                   onClick={() => setInspiration("High-end minimalist chair in a sunlit concrete room, soft shadows, architectural digest style", "3d-render", "minimalist")}
                   className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-purple-500/50 hover:bg-gray-800/80 transition-all group backdrop-blur-sm hover:translate-y-[-2px]"
                 >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <div className="text-xs font-bold text-gray-300 uppercase tracking-wide">Minimalist Product</div>
                    </div>
                    <div className="text-sm text-gray-400 line-clamp-2">Concrete room, soft shadows...</div>
                 </button>
                 <button 
                   onClick={() => setInspiration("Cyberpunk street food vendor in Tokyo, rainy night, neon signs reflection, steam rising, cinematic", "cyberpunk", "energetic")}
                   className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-800/80 transition-all group backdrop-blur-sm hover:translate-y-[-2px]"
                 >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <div className="text-xs font-bold text-gray-300 uppercase tracking-wide">High Energy</div>
                    </div>
                    <div className="text-sm text-gray-400 line-clamp-2">Neon street food vendor...</div>
                 </button>
                 <button 
                   onClick={() => setInspiration("Elegant perfume bottle on black marble, gold accents, dramatic rim lighting, luxury advertising", "cinematic", "luxury")}
                   className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-yellow-500/50 hover:bg-gray-800/80 transition-all group backdrop-blur-sm hover:translate-y-[-2px]"
                 >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      <div className="text-xs font-bold text-gray-300 uppercase tracking-wide">Luxury Brand</div>
                    </div>
                    <div className="text-sm text-gray-400 line-clamp-2">Perfume on black marble...</div>
                 </button>
               </div>
             </div>
           )}

           {/* Loading Overlay (Only for main generation) */}
           {appState === AppState.GENERATING && (
             <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
               <div className="relative">
                 <div className="w-20 h-20 border-4 border-gray-800 rounded-full"></div>
                 <div className="w-20 h-20 border-4 border-transparent border-t-purple-500 rounded-full animate-spin absolute top-0 left-0"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                   <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                 </div>
               </div>
               <p className="mt-6 text-xl font-light text-gray-300 animate-pulse">
                 Crafting your visual...
               </p>
               <p className="mt-2 text-sm text-gray-500">
                 Tone: <span className="capitalize text-gray-300">{brandTone}</span> • Format: <span className="text-gray-300">{aspectRatio}</span>
               </p>
             </div>
           )}
        </div>

        {/* History Footer - Mobile optimized */}
        {history.length > 0 && (
          <div className="h-28 md:h-36 bg-gray-900/90 border-t border-gray-800 flex flex-col flex-shrink-0 z-10 backdrop-blur-md">
             <div className="px-6 py-2 md:py-3 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
               <History size={12}/> Recent
             </div>
             <div className="flex-1 overflow-x-auto flex items-center px-6 gap-4 custom-scrollbar pb-3">
                {history.map((img) => (
                  <div 
                    key={img.id} 
                    onClick={() => setCurrentImage(img)}
                    className={`group relative h-16 w-16 md:h-20 md:w-20 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 ${currentImage?.id === img.id ? 'border-purple-500 ring-2 ring-purple-500/20 scale-105' : 'border-gray-800 hover:border-gray-600 hover:scale-105'}`}
                  >
                    <img src={img.data} alt="thumb" className="w-full h-full object-cover" />
                    {/* Hover Info */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Maximize2 size={16} className="text-white drop-shadow-md" />
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;