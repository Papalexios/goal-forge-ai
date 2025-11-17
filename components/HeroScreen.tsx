import React, { useState, useEffect } from 'react';
import ParticleBackground from './ParticleBackground';
import { useTypewriter } from '../hooks/useTypewriter';
import { GoalForgeAILogo, LoaderIcon, BrainCircuitIcon, VoiceRecIcon, KanbanIcon, ExportIcon, AffiliateMarketingLogo } from './icons';

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

const testimonials = [
    {
        quote: "GoalForge AI took our chaotic brainstorming session and turned it into a crystal-clear roadmap overnight. The time saved is immeasurable.",
        name: "Elena Rodriguez",
        title: "Founder, Innovatech Solutions",
    },
    {
        quote: "As a freelance developer, I juggle multiple projects. This tool is my secret weapon for staying organized and delivering on time, every time.",
        name: "Ben Carter",
        title: "Senior Full-Stack Developer",
    },
    {
        quote: "The voice command feature is a game-changer. I can update project statuses while I'm whiteboarding ideas. It keeps me in the flow.",
        name: "Aisha Khan",
        title: "Product Manager, Quantum Leap",
    }
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
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-x-hidden z-0 text-gray-200">
      <div className="aurora-background"></div>
      <ParticleBackground />
      <div className="absolute inset-0 bg-gray-900/50"></div>
      
      <header className="absolute top-0 left-0 right-0 z-20 animate-slide-in-up stagger-1 opacity-0">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <GoalForgeAILogo className="w-10 h-10 text-white" />
                <div>
                    <h2 className="font-bold text-xl text-white">GoalForge AI</h2>
                    <p className="text-xs text-gray-400">An Unfair Advantage by AffiliateMarketingForSuccess.com</p>
                </div>
            </div>
        </div>
      </header>
      
      <main className="z-10 container mx-auto px-6 w-full flex flex-col items-center text-center mt-32 sm:mt-40">
        <div className="max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400 mb-6 animate-slide-in-up stagger-2 opacity-0">
              Your Vision, Architected by AI.
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8 animate-slide-in-up stagger-3 opacity-0">
              Instantly transform abstract ideas into detailed, actionable project plans with the power of Gemini 2.5 Pro. Stop planning, start building.
            </p>
            <button 
              onClick={onGetStarted}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-10 rounded-lg text-lg shadow-lg transform hover:scale-105 transition-all duration-300 cta-glow animate-slide-in-up stagger-4 opacity-0"
            >
              Forge Your First Plan
            </button>
        </div>

        <div className="w-full max-w-2xl mt-16 animate-slide-in-up stagger-5 opacity-0">
            <div className="relative h-[26rem] glass-pane rounded-2xl p-6 flex flex-col justify-center items-center text-center overflow-hidden">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full blur-3xl transition-opacity duration-1000 ${demoState === 'processing' ? 'opacity-30 animate-pulse' : 'opacity-10'}`}></div>
                
                <div className="relative w-full h-full flex flex-col items-center justify-center" aria-live="polite">
                {demoState === 'idle' && (
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-gray-500 rounded-full flex items-center justify-center">
                        <GoalForgeAILogo className="w-8 h-8"/>
                    </div>
                    <h3 className="text-lg font-semibold text-white">AI Forge</h3>
                    <p className="text-gray-400 text-sm">Click below to see the AI in action.</p>
                  </div>
                )}
                {demoState === 'input' && (
                  <div className="w-full font-mono text-left">
                     <p className="text-sm text-green-400 mb-2">&gt; Goal:</p>
                     <p className="text-lg text-white">{goalText}<span className="w-2.5 h-5 bg-white animate-pulse ml-1 inline-block"></span></p>
                  </div>
                )}
                 {demoState === 'processing' && (
                  <div className="text-center">
                    <LoaderIcon className="w-10 h-10 text-white animate-spin mx-auto" />
                    <p className="mt-4 font-mono text-gray-300 text-sm">Analyzing & Structuring...</p>
                  </div>
                )}
                {demoState === 'output' && (
                    <div className="w-full text-left">
                        <p className="font-bold text-white text-lg">{planText}{!planDone && <span className="w-2.5 h-5 bg-white animate-pulse ml-1 inline-block"></span>}</p>
                        {planDone && (
                            <ul className="text-sm text-gray-300 list-disc list-inside mt-4 space-y-1">
                                {SUBTASKS.map((subtask, i) => <li key={i}>{subtask}</li>)}
                            </ul>
                        )}
                    </div>
                )}
              </div>
              <button onClick={runDemo} disabled={demoState === 'input' || demoState === 'processing'} className="w-full absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[calc(100%-3rem)] bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300">
                {demoState === 'idle' || (demoState === 'output' && planDone) ? 'Run Interactive Demo' : 'Processing...'}
              </button>
            </div>
        </div>

        {/* Features Section */}
        <section className="w-full max-w-7xl mx-auto py-24 sm:py-32">
            <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl animate-slide-in-up stagger-1 opacity-0">From Idea to Execution, Instantly</h2>
                <p className="mt-6 text-lg leading-8 text-gray-300 animate-slide-in-up stagger-2 opacity-0">
                    GoalForge AI is more than a planner. It's an intelligent partner that structures your ambitions into achievable steps, empowering you to focus on what truly matters: building.
                </p>
            </div>
            <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, i) => (
                    <div key={feature.title} className={`glass-pane p-6 rounded-2xl text-left animate-slide-in-up stagger-${i + 3} opacity-0`}>
                        <div className="w-12 h-12 bg-indigo-600/20 text-indigo-300 rounded-lg flex items-center justify-center mb-4">
                            <feature.icon className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                        <p className="mt-2 text-gray-400 text-sm">{feature.description}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full max-w-7xl mx-auto py-24 sm:py-32">
            <div className="text-center max-w-2xl mx-auto">
                 <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl animate-slide-in-up stagger-1 opacity-0">Loved by Innovators & Builders</h2>
                 <p className="mt-6 text-lg leading-8 text-gray-300 animate-slide-in-up stagger-2 opacity-0">
                    Don't just take our word for it. Here's how professionals are leveraging GoalForge AI to achieve their goals faster.
                 </p>
            </div>
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
                {testimonials.map((testimonial, i) => (
                    <div key={testimonial.name} className={`glass-pane p-8 rounded-2xl flex flex-col animate-slide-in-up stagger-${i + 3} opacity-0`}>
                        <p className="text-gray-300 flex-grow">"{testimonial.quote}"</p>
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <p className="font-bold text-white">{testimonial.name}</p>
                            <p className="text-sm text-indigo-300">{testimonial.title}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      </main>

      <footer className="w-full z-10 border-t border-white/10 mt-20 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-center md:text-left">
            <div className="flex flex-col items-center md:items-start">
                <AffiliateMarketingLogo className="w-24 h-24 mb-4" />
                <p className="text-gray-400 text-sm max-w-xs">
                    GoalForge AI is an unfair advantage created by Alexios Papaioannou, owner of <a href="https://affiliatemarketingforsuccess.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">affiliatemarketingforsuccess.com</a>
                </p>
            </div>
            <div className="flex flex-col items-center md:items-start justify-center">
                <h4 className="font-bold text-white mb-4">Learn more from the playbook:</h4>
                <nav className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-gray-400">
                    <a href="https://affiliatemarketingforsuccess.com/category/affiliate-marketing/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Affiliate Marketing</a>
                    <a href="https://affiliatemarketingforsuccess.com/category/ai/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">AI</a>
                    <a href="https://affiliatemarketingforsuccess.com/category/seo/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">SEO</a>
                    <a href="https://affiliatemarketingforsuccess.com/category/blogging/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Blogging</a>
                    <a href="https://affiliatemarketingforsuccess.com/category/reviews/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Reviews</a>
                </nav>
            </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} GoalForge AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HeroScreen;