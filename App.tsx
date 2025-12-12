
import React, { useState, useCallback, useEffect } from 'react';
import HeroScreen from './components/HeroScreen';
import AIAssistant from './components/AIAssistant';
import Dashboard from './components/Dashboard';
import SettingsScreen from './components/SettingsScreen';
import DailyPlannerScreen from './components/DailyPlannerScreen';
import FocusModeOverlay from './components/FocusModeOverlay';
import { GoogleAuthProvider } from './contexts/GoogleAuth';
import { SettingsProvider } from './contexts/SettingsContext';
import { GoalForgeAILogo, KanbanIcon, BrainCircuitIcon, CogIcon, ClipboardCheckIcon, FocusIcon } from './components/icons';
import { getUserStats, STATS_UPDATED_EVENT } from './services/storageService';
import { UserStats } from './types';

type Screen = 'hero' | 'dashboard' | 'assistant' | 'settings' | 'daily_planner';
type View = { screen: Screen; projectId?: string | null };

const App: React.FC = () => {
  const [view, setView] = useState<View>({ screen: 'hero', projectId: null });
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>(getUserStats());

  const vibrate = () => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(10);
      }
  };

  const nav = (screen: Screen, projectId: string | null = null) => {
      vibrate();
      setView({ screen, projectId });
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            nav('assistant'); 
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Event Listener for Stats (Replaces Polling)
  useEffect(() => {
      const handleStatsUpdate = (event: Event) => {
          const customEvent = event as CustomEvent<UserStats>;
          setUserStats(customEvent.detail);
      };
      
      window.addEventListener(STATS_UPDATED_EVENT, handleStatsUpdate);
      // Initial fetch
      setUserStats(getUserStats());

      return () => window.removeEventListener(STATS_UPDATED_EVENT, handleStatsUpdate);
  }, []);

  // Persistent Sidebar Component (Desktop)
  const Sidebar = () => (
    <div className="hidden lg:flex flex-col w-20 hover:w-64 transition-all duration-300 bg-gray-900/90 backdrop-blur-xl border-r border-white/5 h-screen fixed left-0 top-0 z-40 group overflow-hidden shadow-2xl">
        <div className="p-6 flex items-center gap-4 mb-8">
            <GoalForgeAILogo className="w-8 h-8 flex-shrink-0"/>
            <span className="font-bold text-xl text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">GoalForge</span>
        </div>
        <nav className="flex-grow flex flex-col gap-2 px-3">
            {[
                { id: 'dashboard', icon: KanbanIcon, label: 'Dashboard' },
                { id: 'daily_planner', icon: ClipboardCheckIcon, label: 'Planner' },
                { id: 'assistant', icon: BrainCircuitIcon, label: 'AI Architect' },
            ].map((item) => (
                <button
                    key={item.id}
                    onClick={() => nav(item.id as Screen)}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all ${view.screen === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                    <item.icon className="w-6 h-6 flex-shrink-0"/>
                    <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">{item.label}</span>
                </button>
            ))}
             <button
                onClick={() => setIsFocusMode(true)}
                className="flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
            >
                <FocusIcon className="w-6 h-6 flex-shrink-0 text-indigo-400"/>
                <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Focus Mode</span>
            </button>
        </nav>
        <div className="p-3 mb-4">
            <button onClick={() => nav('settings')} className={`flex items-center gap-4 p-3 rounded-xl w-full transition-all ${view.screen === 'settings' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
                <CogIcon className="w-6 h-6 flex-shrink-0"/>
                <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Settings</span>
            </button>
        </div>
    </div>
  );

  // Floating Dock Navigation Component (Mobile SOTA)
  const MobileNav = () => (
    <div className="lg:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] flex justify-between items-center p-1.5 pb-safe pointer-events-auto max-w-sm w-full ring-1 ring-white/5">
            {[
                { id: 'dashboard', icon: KanbanIcon, label: 'Home' },
                { id: 'daily_planner', icon: ClipboardCheckIcon, label: 'Planner' },
                { id: 'assistant', icon: BrainCircuitIcon, label: 'AI' },
                { id: 'settings', icon: CogIcon, label: 'Config' },
            ].map((item) => {
                const isActive = view.screen === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => nav(item.id as Screen)}
                        className={`relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300 active:scale-90 ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {isActive && (
                            <div className="absolute inset-0 bg-white/10 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] animate-pulse-slow"></div>
                        )}
                        <item.icon className={`w-6 h-6 z-10 transition-all duration-300 ${isActive ? 'scale-110 text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.5)]' : ''}`}/>
                        {isActive && <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1 shadow-[0_0_5px_currentColor]"></div>}
                    </button>
                );
            })}
        </div>
    </div>
  );

  const renderScreen = () => {
    switch (view.screen) {
      case 'hero': return <HeroScreen onGetStarted={() => nav('dashboard')} />;
      case 'dashboard': return <Dashboard onSelectProject={(id) => nav('assistant', id)} onCreateNew={() => nav('assistant')} onShowSettings={() => nav('settings')} onShowDailyPlanner={() => nav('daily_planner')} />;
      case 'assistant': return <AIAssistant projectId={view.projectId} onBack={() => nav('dashboard')} />;
      case 'settings': return <SettingsScreen onBack={() => nav('dashboard')} />;
      case 'daily_planner': return <DailyPlannerScreen onBack={() => nav('dashboard')} />;
      default: return <HeroScreen onGetStarted={() => nav('dashboard')} />;
    }
  };

  return (
    <SettingsProvider>
      <GoogleAuthProvider>
          <div className="bg-[#050505] text-white min-h-screen font-sans selection:bg-indigo-500/30 overflow-hidden relative">
             {/* Noise Texture Overlay */}
             <div className="bg-noise"></div>

             {/* Background Effects */}
             <div className="fixed inset-0 z-0 pointer-events-none">
                 <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/10 rounded-full blur-[120px]"></div>
                 <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[120px]"></div>
             </div>

             {view.screen !== 'hero' && <Sidebar />}
             
             {isFocusMode && <FocusModeOverlay onExit={() => setIsFocusMode(false)} />}

             <div className={`relative z-10 min-h-screen transition-all duration-300 ${view.screen !== 'hero' ? 'lg:ml-20 pb-32 lg:pb-0' : ''}`}>
                 {renderScreen()}
             </div>
             
             {view.screen !== 'hero' && <MobileNav />}
          </div>
      </GoogleAuthProvider>
    </SettingsProvider>
  );
};

export default App;
