
import React, { useState, useEffect } from 'react';
import ParticleBackground from './ParticleBackground';
import { useTypewriter } from '../hooks/useTypewriter';
import { GeminiIcon, TtsIcon, LoaderIcon } from './icons';

interface HeroScreenProps {
  onGetStarted: () => void;
}

const DEMO_GOAL = "Launch a new weekly tech podcast";
const DEMO_PLAN_ITEM = "Step 1: Define Podcast Niche & Format";
const SUBTASKS = [
    "Research competing tech podcasts.",
    "Identify target audience (e.g., developers).",
    "Decide on format (interviews, solo, co-hosted)."
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

  const getDemoButtonText = () => {
    if (demoState === 'idle') return 'Run Interactive Demo';
    if (demoState === 'output' && planDone) return 'Run Again';
    return 'Processing...';
  }

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden z-0">
      <div className="aurora-background"></div>
      <ParticleBackground />
      <div className="absolute inset-0 bg-gray-900/50"></div>
      
      <main className="z-10 container mx-auto px-6 w-full h-full flex items-center">
        <div className="grid lg:grid-cols-5 gap-16 items-center w-full">
          <div className="lg:col-span-3 flex flex-col items-start text-left">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400 mb-6 animate-slide-in-up stagger-1 opacity-0">
              Your Vision, <br />Architected by AI.
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-xl mb-8 animate-slide-in-up stagger-2 opacity-0">
              Instantly transform abstract ideas into detailed, actionable project plans with the power of Gemini 2.5 Pro. Stop planning, start building.
            </p>
            <button 
              onClick={onGetStarted}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-10 rounded-lg text-lg shadow-lg transform hover:scale-105 transition-all duration-300 cta-glow animate-slide-in-up stagger-3 opacity-0"
            >
              Forge Your First Plan
            </button>
          </div>

          <div className="lg:col-span-2 relative h-[28rem] animate-slide-in-up stagger-4 opacity-0">
            <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col justify-center items-center text-center overflow-hidden transition-all duration-500">
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full blur-3xl transition-opacity duration-1000 ${demoState === 'processing' ? 'opacity-30 animate-pulse' : 'opacity-10'}`}></div>
              
              <div className="relative w-full h-full flex flex-col items-center justify-center" aria-live="polite">
                {demoState === 'idle' && (
                  <div className="text-center animate-fade-in-up">
                    <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-gray-500 rounded-full"></div>
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
                  <div className="text-center animate-fade-in-up">
                    <LoaderIcon className="w-10 h-10 text-white animate-spin mx-auto" />
                    <p className="mt-4 font-mono text-gray-300 text-sm">Analyzing & Structuring...</p>
                  </div>
                )}
                {demoState === 'output' && (
                    <div className="w-full text-left animate-fade-in-up">
                        <p className="font-bold text-white text-lg">{planText}{!planDone && <span className="w-2.5 h-5 bg-white animate-pulse ml-1 inline-block"></span>}</p>
                        {planDone && (
                            <ul className="text-sm text-gray-300 list-disc list-inside mt-4 space-y-1 animate-fade-in-up">
                                {SUBTASKS.map((subtask, i) => <li key={i}>{subtask}</li>)}
                            </ul>
                        )}
                    </div>
                )}
              </div>

              <button 
                onClick={runDemo} 
                disabled={demoState === 'input' || demoState === 'processing'}
                className="w-full absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[calc(100%-3rem)] bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 backdrop-blur-sm"
              >
                {getDemoButtonText()}
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-x-8 md:justify-end">
             <p className="text-gray-500 text-sm hidden md:block">Powered by</p>
            <div className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                <GeminiIcon className="w-6 h-6" />
                <span className="font-semibold text-sm">Gemini 2.5 Pro</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                <TtsIcon className="w-5 h-5" />
                <span className="font-semibold text-sm">Gemini TTS</span>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default HeroScreen;