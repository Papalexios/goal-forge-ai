import React, { useState, useCallback } from 'react';
import HeroScreen from './components/HeroScreen';
import AIAssistant from './components/AIAssistant';
import Dashboard from './components/Dashboard';
import SettingsScreen from './components/SettingsScreen';
import DailyPlannerScreen from './components/DailyPlannerScreen';
import { GoogleAuthProvider } from './contexts/GoogleAuth';
import { SettingsProvider } from './contexts/SettingsContext';

type Screen = 'hero' | 'dashboard' | 'assistant' | 'settings' | 'daily_planner';
type View = {
  screen: Screen;
  projectId?: string | null;
};

const App: React.FC = () => {
  const [view, setView] = useState<View>({ screen: 'hero', projectId: null });

  const showDashboard = useCallback(() => {
    setView({ screen: 'dashboard' });
  }, []);
  
  const showAssistant = useCallback((projectId?: string) => {
    setView({ screen: 'assistant', projectId: projectId || null });
  }, []);

  const showSettings = useCallback(() => {
    setView({ screen: 'settings' });
  }, []);

  const showDailyPlanner = useCallback(() => {
    setView({ screen: 'daily_planner' });
  }, []);


  const renderScreen = () => {
    switch (view.screen) {
      case 'hero':
        return <HeroScreen onGetStarted={showDashboard} />;
      case 'dashboard':
        return <Dashboard onSelectProject={showAssistant} onCreateNew={() => showAssistant()} onShowSettings={showSettings} onShowDailyPlanner={showDailyPlanner} />;
      case 'assistant':
        return <AIAssistant projectId={view.projectId} onBack={showDashboard} />;
      case 'settings':
        return <SettingsScreen onBack={showDashboard} />;
      case 'daily_planner':
        return <DailyPlannerScreen onBack={showDashboard} />;
      default:
        return <HeroScreen onGetStarted={showDashboard} />;
    }
  };

  return (
    <SettingsProvider>
      <GoogleAuthProvider>
          <div className="bg-gray-900 text-white min-h-screen font-sans">
          {renderScreen()}
          </div>
      </GoogleAuthProvider>
    </SettingsProvider>
  );
};

export default App;