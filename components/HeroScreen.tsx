
import React, { useState, useEffect } from 'react';
import ParticleBackground from './ParticleBackground';
import { useTypewriter } from '../hooks/useTypewriter';
import { GoalForgeAILogo, LoaderIcon, BrainCircuitIcon, VoiceRecIcon, KanbanIcon, ExportIcon, SparklesIcon } from './icons';

interface HeroScreenProps {
  onGetStarted: () => void;
}

const DEMO_GOAL = "Launch a new weekly tech podcast";
const DEMO_PLAN_ITEM = "Phase 1: Niche & Format Definition";
const SUBTASKS = [
    "Research competing tech podcasts.",
    "Identify target audience (e.g., developers).",
    "Decide on format (interviews, solo, co-hosted)."
];

const features = [
    {
        icon: BrainCircuitIcon,
        title: "Intelligent Planning",
        description: "Our AI architect analyzes your high-level goals and constructs detailed, multi-phase project plans in seconds.",
    },
    {
        icon: VoiceRecIcon,
        title: "Voice-Powered Assistant",
        description: "Modify your plan, add tasks, or mark subtasks complete with natural voice commands. It's like having a project manager on call.",
    },
    {
        icon: KanbanIcon,
        title: "Visual Task Board",
        description: "Effortlessly manage your workflow with a drag-and-drop Kanban board, giving you a clear view of your project's progress.",
    },
    {
        icon: ExportIcon,
        title: "Seamless Exports",
        description: "Take your plan anywhere. Export your entire project to Markdown, perfect for documentation, reports, or other tools.",
    },
];

const HeroScreen: React.FC<HeroScreenProps> = ({ onGetStarted }) => {
  const [demoState, setDemoState] = useState<'idle' | 'input' | 'processing' | 'output'>('idle');

  const { displayText: goalText, isDone: goalDone } = useTypewriter(
    demoState === 'input' ? DEMO_GOAL : '', 40
  );
  const { displayText: planText, isDone: planDone } = useTypewriter(
    demoState === 'output' ? DEMO_PLAN_ITEM : '', 50
  );

  useEffect(() => {
    if (demoState === 'input' && goalDone) {
      setDemoState('processing');
    }
    if (demoState === 'processing') {
      const timer = setTimeout(() => {
        setDemoState('output');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [demoState, goalDone]);

  const runDemo = () => {
    if (demoState === 'idle' || (demoState === 'output' && planDone)) {
      setDemoState('input');
    }
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center overflow-x-hidden z-0 text-gray-200 bg-[#050505]">
      <div className="aurora-background"></div>
      <ParticleBackground />
      
      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-50 animate-slide-in-up stagger-1 opacity-0">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                    <GoalForgeAILogo className="relative w-12 h-12 text-white" />
                </div>
                <div>
                    <h2 className="font-bold text-2xl text-white tracking-tight">GoalForge AI</h2>
                    <a 
                        href="https://affiliatemarketingforsuccess.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 hover:text-indigo-300 transition-all flex items-center gap-1"
                    >
                        From the creators of AffiliateMarketingForSuccess.com &rarr;
                    </a>
                </div>
            </div>
            
            <a 
                href="https://seo-hub.affiliatemarketingforsuccess.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 transition-all hover:scale-105"
            >
                <SparklesIcon className="w-4 h-4 text-yellow-400" />
                <span>Visit SEO Hub</span>
            </a>
        </div>
      </header>
      
      {/* MAIN HERO CONTENT */}
      <main className="z-10 container mx-auto px-6 w-full flex flex-col items-center text-center mt-32 md:mt-48 mb-20">
        <div className="max-w-5xl relative">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -z-10"></div>
            
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-8 animate-slide-in-up stagger-2 opacity-0 leading-tight">
              Forging Vision into <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Reality.</span>
            </h1>
            
            <p className="text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 animate-slide-in-up stagger-3 opacity-0 font-light leading-relaxed">
              Instantly transform abstract ideas into detailed, actionable project plans with the power of <strong>Gemini 2.5 Pro</strong>. Stop planning, start building.
            </p>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 animate-slide-in-up stagger-4 opacity-0">
                <button 
                  onClick={onGetStarted}
                  className="group relative w-full md:w-auto bg-white text-black font-bold py-4 px-10 rounded-xl text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.7)] transform hover:scale-105 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Forge Your First Plan
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </span>
                </button>

                <a 
                  href="https://seo-hub.affiliatemarketingforsuccess.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative w-full md:w-auto overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] p-[1px] shadow-2xl hover:scale-105 transition-all duration-300 animate-[shimmer_3s_linear_infinite]"
                >
                   <div className="relative h-full bg-black/80 backdrop-blur-xl rounded-xl px-8 py-4 flex items-center justify-center gap-3 transition-colors group-hover:bg-black/60">
                        <SparklesIcon className="w-5 h-5 text-yellow-400 animate-pulse" />
                        <span className="font-bold text-white text-base md:text-lg text-center leading-tight">
                            Dominate Your Niche <br className="md:hidden"/>
                            <span className="text-sm font-normal text-indigo-200 block md:inline md:ml-2">Unlock Your AI SEO Arsenal</span>
                        </span>
                   </div>
                </a>
            </div>
        </div>

        {/* DEMO WIDGET */}
        <div className="w-full max-w-4xl mt-24 animate-slide-in-up stagger-5 opacity-0">
            <div className="relative h-[28rem] bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-1 shadow-2xl overflow-hidden ring-1 ring-white/10">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <div className="h-full w-full bg-black/40 rounded-[1.4rem] p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600 rounded-full blur-[100px] transition-opacity duration-1000 ${demoState === 'processing' ? 'opacity-40 animate-pulse' : 'opacity-10'}`}></div>
                    
                    <div className="relative w-full h-full flex flex-col items-center justify-center z-10">
                    {demoState === 'idle' && (
                      <div className="text-center transform transition-all duration-500 hover:scale-105 cursor-pointer" onClick={runDemo}>
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-800 to-black border border-gray-700 rounded-2xl flex items-center justify-center shadow-lg group">
                            <GoalForgeAILogo className="w-10 h-10 group-hover:animate-spin-slow transition-all"/>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Interactive AI Demo</h3>
                        <p className="text-gray-400">See the engine in action.</p>
                      </div>
                    )}
                    {demoState === 'input' && (
                      <div className="w-full max-w-lg text-left bg-gray-900/80 p-6 rounded-xl border border-white/5 shadow-2xl">
                         <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                         </div>
                         <p className="font-mono text-indigo-400 text-sm mb-2">$ input --goal</p>
                         <p className="font-mono text-xl text-white">{goalText}<span className="w-2.5 h-5 bg-white animate-pulse ml-1 inline-block"></span></p>
                      </div>
                    )}
                     {demoState === 'processing' && (
                      <div className="text-center">
                        <LoaderIcon className="w-16 h-16 text-indigo-400 animate-spin mx-auto mb-6" />
                        <p className="font-mono text-indigo-200 text-lg">Architecting Solution...</p>
                      </div>
                    )}
                    {demoState === 'output' && (
                        <div className="w-full max-w-lg text-left bg-gray-900/80 p-6 rounded-xl border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <p className="font-bold text-white text-xl mb-4">{planText}{!planDone && <span className="w-2.5 h-5 bg-white animate-pulse ml-1 inline-block"></span>}</p>
                            {planDone && (
                                <ul className="space-y-3">
                                    {SUBTASKS.map((subtask, i) => (
                                        <li key={i} className="flex items-center gap-3 text-gray-300 animate-slide-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                                            <div className="w-5 h-5 rounded-full border border-indigo-500/50 flex items-center justify-center text-indigo-500 text-xs">✓</div>
                                            {subtask}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                  </div>
                  
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                      <button 
                        onClick={runDemo} 
                        disabled={demoState === 'input' || demoState === 'processing'} 
                        className="text-sm text-gray-500 hover:text-white transition-colors disabled:opacity-0"
                      >
                        {demoState === 'output' && planDone ? 'Replay Simulation' : ''}
                      </button>
                  </div>
                </div>
            </div>
        </div>

        {/* Features Grid */}
        <section className="w-full max-w-7xl mx-auto py-32">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature, i) => (
                    <div key={feature.title} className={`group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 p-8 rounded-3xl transition-all duration-300 animate-slide-in-up stagger-${i + 3} opacity-0`}>
                        <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-black/50">
                            <feature.icon className="w-7 h-7 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                ))}
            </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full z-10 border-t border-white/10 bg-black/40 backdrop-blur-xl pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12">
            
            {/* Brand Column */}
            <div className="md:col-span-5 flex flex-col items-center md:items-start space-y-6">
                <a href="https://affiliatemarketingforsuccess.com" target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
                    <img 
                        src="https://affiliatemarketingforsuccess.com/wp-content/uploads/2023/03/cropped-Affiliate-Marketing-for-Success-Logo-Edited.png?lm=6666FEE0" 
                        alt="Affiliate Marketing for Success" 
                        className="h-24 w-auto object-contain"
                    />
                </a>
                <p className="text-gray-400 text-sm text-center md:text-left leading-relaxed">
                    This App is Created by <strong className="text-white">Alexios Papaioannou</strong>,<br/> 
                    Owner of <a href="https://affiliatemarketingforsuccess.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">affiliatemarketingforsuccess.com</a>
                </p>
                <div className="flex gap-4">
                     {/* Social icons could go here */}
                </div>
            </div>

            {/* Links Column */}
            <div className="md:col-span-7 flex flex-col justify-center">
                <h4 className="font-bold text-white text-lg mb-6 text-center md:text-left border-b border-white/10 pb-4 inline-block md:w-full">Explore the Ecosystem</h4>
                <nav className="flex flex-wrap justify-center md:justify-start gap-x-8 gap-y-4 text-sm font-medium">
                    <a href="https://affiliatemarketingforsuccess.com/affiliate-marketing" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-400 transition-colors flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Affiliate Marketing
                    </a>
                    <a href="https://affiliatemarketingforsuccess.com/ai" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> AI
                    </a>
                    <a href="https://affiliatemarketingforsuccess.com/seo" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-400 transition-colors flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> SEO
                    </a>
                    <a href="https://affiliatemarketingforsuccess.com/blogging" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-orange-400 transition-colors flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Blogging
                    </a>
                    <a href="https://affiliatemarketingforsuccess.com/review" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Reviews
                    </a>
                </nav>
                
                <div className="mt-8 bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-6 text-center md:text-left">
                    <p className="text-indigo-200 text-sm mb-3">Ready to scale your business?</p>
                    <a 
                        href="https://seo-hub.affiliatemarketingforsuccess.com/"
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-white font-bold hover:text-indigo-300 transition-colors inline-flex items-center gap-2"
                    >
                        Unlock Your Complete AI-Powered SEO Arsenal &rarr;
                    </a>
                </div>
            </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 text-center text-gray-600 text-xs px-6">
            <p>&copy; {new Date().getFullYear()} GoalForge AI. An Unfair Advantage.</p>
        </div>
      </footer>
    </div>
  );
};

export default HeroScreen;
