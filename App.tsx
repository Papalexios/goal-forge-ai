
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
import { getUserStats } from './services/storageService';
import { UserStats } from './types';

type Screen = 'hero' | 'dashboard' | 'assistant' | 'settings' | 'daily_planner';
type View = { screen: Screen; projectId?: string | null };

const App: React.FC = () => {
  const [view, setView] = useState<View>({ screen: 'hero', projectId: null });
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>(getUserStats());

  const nav = (screen: Screen, projectId: string | null = null) => setView({ screen, projectId });

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd+K or Ctrl+K for Quick Action (Here just focusing/navigating for now)
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            nav('assistant'); // Quick jump to AI
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Poll for stats updates (Simple event bus simulation)
  useEffect(() => {
      const interval = setInterval(() => {
          const current = getUserStats();
          // Only update if changed to avoid renders
          if (JSON.stringify(current) !== JSON.stringify(userStats)) {
              setUserStats(current);
          }
      }, 1000);
      return () => clearInterval(interval);
  }, [userStats]);

  // Persistent Sidebar Component (Desktop)
  const Sidebar = () => (
    <div className="hidden lg:flex flex-col w-20 hover:w-64 transition-all duration-300 bg-gray-900 border-r border-white/5 h-screen fixed left-0 top-0 z-40 group overflow-hidden">
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

  // Bottom Navigation Component (Mobile)
  const MobileNav = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-lg border-t border-white/10 z-50 pb-safe">
        <div className="flex justify-around items-center p-2">
            {[
                { id: 'dashboard', icon: KanbanIcon, label: 'Home' },
                { id: 'daily_planner', icon: ClipboardCheckIcon, label: 'Planner' },
                { id: 'assistant', icon: BrainCircuitIcon, label: 'AI' },
                { id: 'settings', icon: CogIcon, label: 'Config' },
            ].map((item) => (
                <button
                    key={item.id}
                    onClick={() => nav(item.id as Screen)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ${view.screen === item.id ? 'text-indigo-400' : 'text-gray-500'}`}
                >
                    <div className={`p-1 rounded-full ${view.screen === item.id ? 'bg-indigo-500/20' : 'bg-transparent'}`}>
                        <item.icon className="w-6 h-6"/>
                    </div>
                    <span className="text-[10px] font-medium">{item.label}</span>
                </button>
            ))}
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
          <div className="bg-[#0a0a0a] text-white min-h-screen font-sans selection:bg-indigo-500/30">
             {view.screen !== 'hero' && <Sidebar />}
             
             {isFocusMode && <FocusModeOverlay onExit={() => setIsFocusMode(false)} />}

             <div className={`min-h-screen transition-all duration-300 ${view.screen !== 'hero' ? 'lg:ml-20 pb-24 lg:pb-0' : ''}`}>
                 {renderScreen()}
             </div>
             {view.screen !== 'hero' && <MobileNav />}
          </div>
      </GoogleAuthProvider>
    </SettingsProvider>
  );
};

export default App;
