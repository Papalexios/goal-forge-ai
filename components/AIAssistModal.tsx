
import React, { useState, useEffect } from 'react';
import * as gemini from '../services/geminiService';
import { LoaderIcon, CopyIcon, SparklesIcon } from './icons';

interface AIAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  subtaskText: string;
}

const AIAssistModal: React.FC<AIAssistModalProps> = ({ isOpen, onClose, taskTitle, subtaskText }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchAssistance = async () => {
        setIsLoading(true);
        setError(null);
        setContent('');
        try {
          const result = await gemini.generateSubtaskAssistance(taskTitle, subtaskText);
          setContent(result);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchAssistance();
    }
  }, [isOpen, taskTitle, subtaskText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-in-up opacity-0"
        onClick={(e) => e.stopPropagation()}
        style={{ animationFillMode: 'forwards' }}
      >
        <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-6 h-6 text-indigo-400"/>
            <div>
              <h2 className="text-lg font-bold text-white">AI Assist</h2>
              <p className="text-sm text-gray-400 truncate" title={subtaskText}>For: {subtaskText}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </header>

        <div className="p-6 flex-grow overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <LoaderIcon className="w-10 h-10 animate-spin text-indigo-400"/>
              <p className="mt-4 text-gray-300">Generating assistance...</p>
            </div>
          )}
          {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}
          {content && (
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-gray-200" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }}></div>
          )}
        </div>
        
        {content && (
            <footer className="p-4 border-t border-gray-700 flex-shrink-0 flex justify-end">
                <button onClick={handleCopy} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
                    <CopyIcon className="w-5 h-5" />
                    <span>{isCopied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
            </footer>
        )}
      </div>
    </div>
  );
};

export default AIAssistModal;
