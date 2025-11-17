import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Settings } from '../types';
import * as settingsService from '../services/settingsService';
import { DEFAULT_SETTINGS } from '../services/settingsService';

interface SettingsContextType {
  settings: Settings;
  saveSettings: (newSettings: Settings) => void;
  isLoading: boolean;
}

export const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  saveSettings: () => {},
  isLoading: true,
});

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect ensures we have the latest settings from storage on mount
    const loadedSettings = settingsService.getSettings();
    setSettings(loadedSettings);
    setIsLoading(false);
  }, []);

  const handleSaveSettings = useCallback((newSettings: Settings) => {
    settingsService.saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  const value = {
    settings,
    saveSettings: handleSaveSettings,
    isLoading,
  };

  return (
    <SettingsContext.Provider value={value}>
      {!isLoading && children}
    </SettingsContext.Provider>
  );
};