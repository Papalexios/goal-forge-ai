import React, { useState, useCallback } from 'react';
import HeroScreen from './components/HeroScreen';
import AIAssistant from './components/AIAssistant';
import Dashboard from './components/Dashboard';
import SettingsScreen from './components/SettingsScreen';
import DailyPlannerScreen from './components/DailyPlannerScreen';
import { GoogleAuthProvider } from './contexts/GoogleAuth';
import { SettingsProvider } from './contexts/SettingsContext';
import { GoalForgeAILogo, KanbanIcon, BrainCircuitIcon, CogIcon, ClipboardCheckIcon } from './components/icons';

type Screen = 'hero' | 'dashboard' | 'assistant' | 'settings' | 'daily_planner';
type View = { screen: Screen; projectId?: string | null };

const App: React.FC = () => {
  const [view, setView] = useState<View>({ screen: 'hero', projectId: null });

  const nav = (screen: Screen, projectId: string | null = null) => setView({ screen, projectId });

  // Persistent Sidebar Component
  const Sidebar = () => (
    <div className="hidden lg:flex flex-col w-20 hover:w-64 transition-all duration-300 bg-gray-900 border-r border-white/5 h-screen fixed left-0 top-0 z-50 group overflow-hidden">
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
        </nav>
        <div className="p-3 mb-4">
            <button onClick={() => nav('settings')} className={`flex items-center gap-4 p-3 rounded-xl w-full transition-all ${view.screen === 'settings' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
                <CogIcon className="w-6 h-6 flex-shrink-0"/>
                <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Settings</span>
            </button>
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
             <div className={`min-h-screen transition-all duration-300 ${view.screen !== 'hero' ? 'lg:ml-20' : ''}`}>
                 {renderScreen()}
             </div>
          </div>
      </GoogleAuthProvider>
    </SettingsProvider>
  );
};

export default App;