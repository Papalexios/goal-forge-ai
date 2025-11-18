import React, { useState, useContext, useEffect, FormEvent } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';
import { Settings, AIProvider } from '../types';
import { CopyIcon, GeminiIcon } from './icons';
import { DEFAULT_SETTINGS } from '../services/settingsService';

interface SettingsScreenProps {
  onBack: () => void;
}

const inputStyles = "w-full p-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-white placeholder-gray-600";
const labelStyles = "block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2";

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { settings: initialSettings, saveSettings } = useContext(SettingsContext);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [origin, setOrigin] = useState('');

  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => { setSettings(initialSettings); }, [initialSettings]);

  const handleProviderChange = (provider: AIProvider, key: keyof Settings['providers'][AIProvider], value: string) => {
    setSettings(prev => ({
      ...prev,
      providers: { ...prev.providers, [provider]: { ...prev.providers[provider], [key]: value } },
    }));
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    saveSettings(settings);
    setTimeout(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); }, 500);
  };

  const providerDetails: Record<string, { name: string; hasModel: boolean }> = {
    // gemini: Removed from UI to enforce environment variable usage
    openai: { name: 'OpenAI', hasModel: true },
    anthropic: { name: 'Anthropic', hasModel: true },
    openrouter: { name: 'OpenRouter', hasModel: true },
    groq: { name: 'Groq', hasModel: true },
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-2">Configuration</h1>
      <p className="text-gray-400 mb-8">Manage integrations and fallback AI providers.</p>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Google Calendar Integration */}
        <section className="bg-gray-800/40 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                Google Calendar Integration
            </h2>
            <div className="mb-6">
                <label className={labelStyles}>Google Client ID</label>
                <input
                    type="text"
                    value={settings.googleClientId}
                    onChange={(e) => setSettings({...settings, googleClientId: e.target.value})}
                    placeholder="apps.googleusercontent.com..."
                    className={inputStyles}
                />
            </div>
            <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl text-sm text-indigo-200">
                <p className="font-bold mb-2">Setup Helper</p>
                <p className="mb-2">Authorized Origin & Redirect URI:</p>
                <code className="block bg-black/30 p-2 rounded select-all mb-2">{origin}</code>
                <p className="text-xs opacity-70">Copy this URL to your Google Cloud Console credentials configuration.</p>
            </div>
        </section>

        {/* AI Providers */}
        <section className="bg-gray-800/40 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-bold text-white">AI Providers</h2>
                 <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-bold border border-green-500/20">
                    <GeminiIcon className="w-3 h-3"/> Gemini Active (Env)
                 </div>
            </div>
            <p className="text-sm text-gray-400 mb-6">Gemini is configured via the environment. Configure optional fallbacks below.</p>
            
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className={labelStyles}>Active Provider</label>
                        <select
                            value={settings.activeProvider}
                            onChange={(e) => setSettings({...settings, activeProvider: e.target.value as AIProvider})}
                            className={inputStyles}
                        >
                            <option value="gemini">Google Gemini (Recommended)</option>
                            {Object.keys(providerDetails).map(p => <option key={p} value={p}>{providerDetails[p].name}</option>)}
                        </select>
                     </div>
                </div>

                {Object.keys(providerDetails).map(pStr => {
                    const p = pStr as AIProvider;
                    const isHidden = settings.activeProvider !== p && settings.activeProvider === 'gemini'; // Only show if selected or avoiding clutter
                    if (isHidden && p !== settings.activeProvider) return null;

                    return (
                        <div key={p} className="pt-4 border-t border-white/5 animate-slide-in-up">
                            <h3 className="font-bold text-white mb-4">{providerDetails[p].name}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelStyles}>API Key</label>
                                    <input
                                        type="password"
                                        value={settings.providers[p].apiKey}
                                        onChange={(e) => handleProviderChange(p, 'apiKey', e.target.value)}
                                        className={inputStyles}
                                    />
                                </div>
                                {providerDetails[p].hasModel && (
                                    <div>
                                        <label className={labelStyles}>Model</label>
                                        <input
                                            type="text"
                                            value={settings.providers[p].model}
                                            onChange={(e) => handleProviderChange(p, 'model', e.target.value)}
                                            className={inputStyles}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>

        <div className="flex justify-end pt-4">
            <button
                type="submit"
                disabled={saveStatus === 'saving'}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-10 rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
            >
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved Changes' : 'Save Configuration'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsScreen;