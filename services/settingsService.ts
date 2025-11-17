import { Settings } from '../types';

const SETTINGS_KEY = 'goalforge_settings_v1';

export const DEFAULT_SETTINGS: Settings = {
  activeProvider: 'gemini',
  providers: {
    gemini: { apiKey: '', model: 'gemini-2.5-pro' },
    openai: { apiKey: '', model: 'gpt-4o' },
    anthropic: { apiKey: '', model: 'claude-3-opus-20240229' },
    openrouter: { apiKey: '', model: 'anthropic/claude-3-haiku' },
    groq: { apiKey: '', model: 'llama3-8b-8192' },
  },
  googleClientId: '',
};

export const getSettings = (): Settings => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      // Merge stored settings with defaults to ensure all keys are present
      const parsed = JSON.parse(storedSettings);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        providers: {
            ...DEFAULT_SETTINGS.providers,
            ...(parsed.providers || {}),
        }
      };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to parse settings from localStorage', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: Settings): void => {
  try {
    const settingsJson = JSON.stringify(settings);
    localStorage.setItem(SETTINGS_KEY, settingsJson);
  } catch (error) {
    console.error('Failed to save settings to localStorage', error);
  }
};
