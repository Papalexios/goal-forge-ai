import React, { useState, useContext, useEffect, FormEvent } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';
import { Settings, AIProvider } from '../types';
import { ChevronLeftIcon, CopyIcon } from './icons';

interface SettingsScreenProps {
  onBack: () => void;
}

const inputStyles = "w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-white placeholder-gray-400";
const labelStyles = "block text-sm font-semibold text-gray-300 mb-1";

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { settings: initialSettings, saveSettings } = useContext(SettingsContext);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [origin, setOrigin] = useState('');
  const [isOriginCopied, setIsOriginCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    // If the context updates (e.g., from another tab), reflect the changes here.
    setSettings(initialSettings);
  }, [initialSettings]);

  const handleProviderChange = (provider: AIProvider, key: keyof Settings['providers'][AIProvider], value: string) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: {
          ...prev.providers[provider],
          [key]: value,
        },
      },
    }));
  };
  
  const handleGenericChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({...prev, [name]: value as AIProvider}));
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    saveSettings(settings);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };
  
  const handleCopyOrigin = () => {
    if (!origin) return;
    navigator.clipboard.writeText(origin);
    setIsOriginCopied(true);
    setTimeout(() => setIsOriginCopied(false), 2000);
  };

  const providerDetails: Record<AIProvider, { name: string; hasModel: boolean }> = {
    gemini: { name: 'Google Gemini', hasModel: false },
    openai: { name: 'OpenAI', hasModel: false },
    anthropic: { name: 'Anthropic', hasModel: false },
    openrouter: { name: 'OpenRouter', hasModel: true },
    groq: { name: 'Groq', hasModel: true },
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 animate-slide-in-up opacity-0">
      <header className="flex items-center mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ChevronLeftIcon className="w-6 h-6" />
          <span>Back to Dashboard</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Configure your AI providers and application integrations here.</p>
        
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Integrations Section */}
           <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-1">Integrations</h2>
                <p className="text-gray-400 mb-6">Connect GoalForge to other services.</p>
                <div className="border-t border-gray-700 pt-4">
                    <h3 className="font-semibold text-lg text-white mb-2">Google Calendar</h3>
                     <div>
                        <label htmlFor="googleClientId" className={labelStyles}>Google Client ID</label>
                        <input
                            type="text"
                            id="googleClientId"
                            name="googleClientId"
                            value={settings.googleClientId}
                            onChange={handleGenericChange}
                            placeholder="Paste your Google Client ID here"
                            className={inputStyles}
                        />
                         <div className="mt-4 text-sm text-gray-400 bg-gray-900/50 p-4 rounded-lg space-y-4">
                            <p className="font-bold text-base text-gray-200">Setup Instructions</p>
                            <p>To enable Google Calendar sync, you must create an OAuth 2.0 Client ID. Follow these steps carefully to avoid authorization errors.</p>
                             <div>
                                <p className="font-semibold text-gray-300">1. Your application's unique origin URL:</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="flex-grow bg-gray-800 border border-gray-600 text-indigo-300 p-2 rounded-md break-all">{origin || 'Loading...'}</code>
                                    <button type="button" onClick={handleCopyOrigin} className="p-2 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors flex-shrink-0" title="Copy URL">
                                        <CopyIcon className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                                {isOriginCopied && <p className="text-green-400 text-xs mt-1 animate-pulse">Copied!</p>}
                            </div>
                            <ol className="list-decimal list-inside space-y-2 pl-1 text-gray-300">
                                <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google Cloud Console</a>.</li>
                                <li>Click <strong className="text-gray-200">"+ CREATE CREDENTIALS"</strong> &rarr; <strong className="text-gray-200">"OAuth client ID"</strong>.</li>
                                <li>Select <strong className="text-gray-200">"Web application"</strong> as the Application type.</li>
                                <li>Under <strong className="text-gray-200">"Authorized JavaScript origins"</strong>, click <strong className="text-gray-200">"+ ADD URI"</strong> and paste your origin URL from above.</li>
                                <li className="bg-yellow-900/50 p-2 rounded-md border-l-4 border-yellow-500"><strong className="text-yellow-300">Crucial Step:</strong> Under <strong className="text-yellow-200">"Authorized redirect URIs"</strong>, click <strong className="text-yellow-200">"+ ADD URI"</strong> and paste your origin URL <strong className="text-yellow-200">again</strong>. Not doing this is the most common cause of an <code className="text-xs">invalid_request</code> error.</li>
                                <li>Click <strong className="text-gray-200">"CREATE"</strong> and copy the <strong className="text-gray-200">"Client ID"</strong> into the field above.</li>
                            </ol>
                        </div>
                    </div>
                </div>
           </div>


          {/* AI Provider Section */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-1">AI Provider Configuration</h2>
            <p className="text-gray-400 mb-6">Select your active AI provider and enter the necessary credentials.</p>
            
            <div className="mb-6">
              <label htmlFor="activeProvider" className={labelStyles}>Active AI Provider</label>
              <select
                id="activeProvider"
                name="activeProvider"
                value={settings.activeProvider}
                onChange={handleGenericChange}
                className={inputStyles}
              >
                {Object.keys(providerDetails).map(p => (
                  <option key={p} value={p}>{providerDetails[p as AIProvider].name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-4">
                {Object.keys(providerDetails).map(pStr => {
                    const p = pStr as AIProvider;
                    return (
                        <div key={p} className="border-t border-gray-700 pt-4">
                            <h3 className="font-semibold text-lg text-white mb-2">{providerDetails[p].name}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor={`${p}-apiKey`} className={labelStyles}>API Key</label>
                                    <input
                                        type="password"
                                        id={`${p}-apiKey`}
                                        value={settings.providers[p].apiKey}
                                        onChange={(e) => handleProviderChange(p, 'apiKey', e.target.value)}
                                        placeholder={`Enter ${providerDetails[p].name} API Key`}
                                        className={inputStyles}
                                    />
                                </div>
                                {providerDetails[p].hasModel && (
                                    <div>
                                        <label htmlFor={`${p}-model`} className={labelStyles}>Model Name</label>
                                        <input
                                            type="text"
                                            id={`${p}-model`}
                                            value={settings.providers[p].model}
                                            onChange={(e) => handleProviderChange(p, 'model', e.target.value)}
                                            placeholder="e.g., llama3-8b-8192"
                                            className={inputStyles}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
             <div className="mt-4 text-sm text-yellow-400 bg-yellow-900/50 p-3 rounded-lg">
                <strong>Note:</strong> While you can store keys for multiple providers, the application's current logic is integrated with the Gemini API. Selecting other providers is for future compatibility.
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-lg text-md shadow-lg transform hover:scale-105 transition-all duration-300 cta-glow disabled:bg-gray-600 disabled:scale-100"
                disabled={saveStatus === 'saving'}
            >
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default SettingsScreen;
