import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Project, Plan, Task } from '../types';
import * as storage from '../services/storageService';
import * as gemini from '../services/geminiService';
import { useGeminiLive, ConnectionState } from '../hooks/useGeminiLive';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import TaskBoard from './TaskBoard';
import { ChevronLeftIcon, LoaderIcon, GeminiIcon, MicrophoneIcon, StopIcon, SendIcon, EditIcon } from './icons';

interface AIAssistantProps {
  projectId?: string | null;
  onBack: () => void;
}

type Message = {
    sender: 'user' | 'ai' | 'system';
    text: string;
    isFinal?: boolean;
};

const sampleGoals = [
    "Plan a 2-week trip to Japan",
    "Launch a personal blog",
    "Learn to cook Italian food",
];

const AIAssistant: React.FC<AIAssistantProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [goal, setGoal] = useState('');
  const [isPlanGenerating, setIsPlanGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('AI is forging your plan...');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [mobileView, setMobileView] = useState<'chat' | 'board'>('chat');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const loadingMessages = useRef([
    "Analyzing your high-level goal...",
    "Brainstorming key tasks and milestones...",
    "Structuring the project phases for you...",
    "Defining actionable sub-tasks...",
    "Estimating timelines and setting priorities...",
    "Finalizing your strategic project plan..."
  ]).current;

    const {
    isListening: isDictating,
    transcript: dictatedText,
    start: startDictation,
    stop: stopDictation,
    hasSupport: hasDictationSupport
  } = useSpeechRecognition();

  useEffect(() => {
    if (dictatedText) {
      setTextInput(dictatedText);
    }
  }, [dictatedText]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isPlanGenerating) {
        let messageIndex = 0;
        setLoadingMessage(loadingMessages[messageIndex]);
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            setLoadingMessage(loadingMessages[messageIndex]);
        }, 2500);
        return () => clearInterval(interval);
    }
  }, [isPlanGenerating, loadingMessages]);

  const handlePlanGenerated = useCallback((plan: Plan, newGoal: string) => {
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      goal: newGoal,
      plan,
      createdAt: new Date().toISOString(),
    };
    storage.saveProject(newProject);
    setProject(newProject);
    setGoal(newGoal);
    setIsPlanGenerating(false);
    setMessages(prev => [...prev, { sender: 'ai', text: `Excellent! I've drafted a complete project plan for "${newGoal}". You can see it on the right. How can I help you refine it?`, isFinal: true }]);
  }, []);

  const handleTaskAdded = useCallback((task: Task) => {
    if (!project) return;
    const updatedPlan = [...project.plan, task];
    const updatedProject = { ...project, plan: updatedPlan };
    storage.saveProject(updatedProject);
    setProject(updatedProject);
    setMessages(prev => [...prev, { sender: 'system', text: `Task "${task.title}" has been added to the plan.`, isFinal: true }]);
  }, [project]);

  const handleTaskEdited = useCallback((taskId: string, updates: Partial<Task>) => {
    if (!project) return;
    let taskTitle = '';
    const updatedPlan = project.plan.map(task => {
        if (task.id === taskId) {
            taskTitle = task.title;
            return { ...task, ...updates };
        }
        return task;
    });
    const updatedProject = { ...project, plan: updatedPlan };
    setProject(updatedProject);
    storage.saveProject(updatedProject);
    setMessages(prev => [...prev, { sender: 'system', text: `Task "${taskTitle}" has been updated.`, isFinal: true }]);
  }, [project]);
  
  const handleSubtaskCompleted = useCallback((taskId: string, subtaskId: string) => {
    if (!project) return;
    let taskTitle = '';
    let subtaskText = '';
    const updatedPlan = project.plan.map(task => {
        if (task.id === taskId) {
            taskTitle = task.title;
            const updatedSubtasks = task.subtasks.map(st => {
                if (st.id === subtaskId) {
                    subtaskText = st.text;
                    return { ...st, completed: true };
                }
                return st;
            });
            return { ...task, subtasks: updatedSubtasks };
        }
        return task;
    });
    const updatedProject = { ...project, plan: updatedPlan };
    setProject(updatedProject);
    storage.saveProject(updatedProject);
    setMessages(prev => [...prev, { sender: 'system', text: `Subtask "${subtaskText}" in "${taskTitle}" marked as complete.`, isFinal: true }]);
  }, [project]);
  
  const handleError = useCallback((e: string) => {
    setIsPlanGenerating(false);
    setError(e);
  }, []);

  const {
    connectionState,
    isListening,
    startListening,
    stopListening,
    sendTextMessage,
    userTranscript,
    aiTranscript,
  } = useGeminiLive({
    project,
    onTaskAdded: handleTaskAdded,
    onTaskEdited: handleTaskEdited,
    onSubtaskCompleted: handleSubtaskCompleted,
    onError: handleError
  });

  const generateInitialPlan = useCallback(async (goalToPlan: string) => {
      setIsPlanGenerating(true);
      setError(null);
      try {
          const plan = await gemini.generatePlan(goalToPlan);
          handlePlanGenerated(plan, goalToPlan);
      } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
          setError(errorMessage);
          setMessages(prev => [...prev, { sender: 'system', text: `Error: ${errorMessage}`, isFinal: true }]);
          setIsPlanGenerating(false);
      }
  }, [handlePlanGenerated]);

  useEffect(() => {
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      if (lastMessage && lastMessage.sender === 'user' && lastMessage.isFinal && !project && !isPlanGenerating) {
          generateInitialPlan(lastMessage.text);
      }
  }, [messages, project, isPlanGenerating, generateInitialPlan]);


  useEffect(() => {
    setMessages(currentMessages => {
        const last = currentMessages.length > 0 ? currentMessages[currentMessages.length - 1] : null;
        if (userTranscript) {
            if (last?.sender === 'user' && !last.isFinal) {
                const newMessages = [...currentMessages];
                newMessages[newMessages.length - 1] = { ...last, text: userTranscript };
                return newMessages;
            }
            return [...currentMessages, { sender: 'user', text: userTranscript, isFinal: false }];
        }
        if (aiTranscript) {
            if (last?.sender === 'ai' && !last.isFinal) {
                const newMessages = [...currentMessages];
                newMessages[newMessages.length - 1] = { ...last, text: aiTranscript };
                return newMessages;
            }
            if (last?.sender === 'user' && !last.isFinal) {
                const finalizedUserMessage = { ...last, isFinal: true };
                return [ ...currentMessages.slice(0, -1), finalizedUserMessage, { sender: 'ai', text: aiTranscript, isFinal: false }];
            }
            return [...currentMessages, { sender: 'ai', text: aiTranscript, isFinal: false }];
        }
        if (last && !last.isFinal) {
            const newMessages = [...currentMessages];
            newMessages[newMessages.length - 1] = { ...last, isFinal: true };
            return newMessages;
        }
        return currentMessages;
    });
  }, [userTranscript, aiTranscript]);


  useEffect(() => {
    if (projectId) {
      const existingProject = storage.getProject(projectId);
      if (existingProject) {
        setProject(existingProject);
        setGoal(existingProject.goal);
        setMessages([{sender: 'ai', text: `Welcome back to your project: "${existingProject.goal}". How can I help you today?`, isFinal: true}]);
      }
    } else {
        setProject(null);
        setGoal('');
        setMessages([{sender: 'ai', text: `Welcome to GoalForge! To start, simply tell me your goal. For example, "renovate the kitchen" or "write a sci-fi novel". I'll break it down into a complete project plan for you.`, isFinal: true}]);
    }
  }, [projectId]);

  const handlePlanUpdate = useCallback((updatedPlan: Plan) => {
    if (project) {
        const updatedProject = { ...project, plan: updatedPlan };
        setProject(updatedProject);
        storage.saveProject(updatedProject);
    }
  }, [project]);
  
  const handleSendText = () => {
    if (isDictating) {
        stopDictation();
    }
    if (textInput.trim()) {
        // FIX: Used functional update for setMessages to prevent stale state and fix typing issue.
        setMessages(prev => [...prev, { sender: 'user', text: textInput, isFinal: true }]);
        if (project) {
          sendTextMessage(textInput);
        }
        setTextInput('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 md:p-8 animate-slide-in-up opacity-0">
      <header className="flex items-center justify-between mb-6 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ChevronLeftIcon className="w-6 h-6" />
          <span className="hidden sm:inline">Back to Dashboard</span>
        </button>
        <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{project?.goal || "New Project"}</h1>
            <p className="text-sm text-gray-400">AI-Powered Project Assistant</p>
        </div>
        <div className="w-24 sm:w-48"></div>{/* Spacer */}
      </header>

      {error && <p className="text-red-400 mb-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
      
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden pb-16 lg:pb-0">
        <div className={`bg-gray-800/50 border border-gray-700 rounded-lg shadow-2xl flex-col h-full max-h-[calc(100vh-12rem)] ${mobileView === 'chat' ? 'flex' : 'hidden'} lg:flex`}>
          <div className="p-4 border-b border-gray-700 flex items-center gap-2">
            <GeminiIcon className="w-6 h-6 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Conversation</h2>
          </div>
          <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0"><GeminiIcon className="w-5 h-5 text-white"/></div>}
                    <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                        msg.sender === 'user' ? 'bg-blue-600 text-white' : 
                        msg.sender === 'ai' ? 'bg-gray-700 text-gray-200' :
                        'bg-transparent text-gray-400 text-sm w-full text-center italic'
                    }`}>
                       <p>{msg.text}{!msg.isFinal && <span className="w-2 h-4 bg-white/50 animate-pulse ml-1 inline-block"></span>}</p>
                    </div>
                </div>
            ))}
             {connectionState === 'connecting' && <div className="text-center text-gray-400 text-sm">Connecting to AI Assistant...</div>}
          </div>
          {!project && !isPlanGenerating && messages.length <= 1 && (
            <div className="p-4 pt-0 text-center">
                <p className="text-gray-400 mb-3 text-sm">Need inspiration? Start with an example goal.</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {sampleGoals.map((goal, i) => (
                        <button
                            key={i}
                            onClick={() => setTextInput(goal)}
                            className="bg-gray-700/80 backdrop-blur-sm border border-gray-600 hover:bg-gray-600 text-gray-200 text-xs sm:text-sm font-medium py-2 px-4 rounded-full transition-all duration-200"
                        >
                            {goal}
                        </button>
                    ))}
                </div>
            </div>
          )}
          <div className="p-4 border-t border-gray-700">
             <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                    placeholder={project ? "Ask to add a task or clarify..." : "Enter your goal to start..."}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-white"
                    disabled={isListening || connectionState !== 'idle' || isPlanGenerating}
                />
                 {!project && hasDictationSupport && (
                  <button 
                    onClick={isDictating ? stopDictation : startDictation}
                    className={`p-2 rounded-lg text-white transition-colors ${isDictating ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'}`}
                    aria-label={isDictating ? 'Stop dictation' : 'Start dictation'}
                  >
                    {isDictating ? <StopIcon className="w-6 h-6"/> : <MicrophoneIcon className="w-6 h-6"/>}
                  </button>
                )}
                <button 
                    onClick={handleSendText} 
                    disabled={!textInput.trim() || isListening || connectionState !== 'idle' || isPlanGenerating}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send message"
                >
                    <SendIcon className="w-6 h-6" />
                </button>
                {project && (
                    <button 
                        onClick={isListening ? stopListening : startListening}
                        disabled={connectionState !== 'idle' || isPlanGenerating}
                        className={`p-3 rounded-full text-white transition-all duration-300 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-600 hover:bg-green-500'} disabled:bg-gray-600 disabled:cursor-not-allowed`}
                        aria-label={isListening ? 'Stop listening' : 'Start listening'}
                    >
                        {isListening ? <StopIcon className="w-6 h-6"/> : <MicrophoneIcon className="w-6 h-6"/>}
                    </button>
                )}
             </div>
          </div>
        </div>

        <div className={`bg-gray-800/50 border border-gray-700 rounded-lg shadow-2xl flex-col h-full max-h-[calc(100vh-12rem)] overflow-hidden ${mobileView === 'board' ? 'flex' : 'hidden'} lg:flex`}>
        {isPlanGenerating ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <LoaderIcon className="w-12 h-12 animate-spin text-indigo-400" />
                <p className="mt-6 text-gray-200 font-semibold text-lg transition-all duration-500">{loadingMessage}</p>
                <p className="mt-2 text-sm text-gray-400 max-w-sm">
                    This can take a few moments as our AI architect builds a comprehensive, tailored plan just for you.
                </p>
            </div>
            ) : project ? (
                <div className="overflow-y-auto h-full">
                    <TaskBoard plan={project.plan} onPlanUpdate={handlePlanUpdate} />
                </div>
            ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <GeminiIcon className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h2 className="text-2xl font-bold text-white">Your Plan Awaits</h2>
                <p className="text-gray-400 mt-2">
                    Use the conversation panel to state your goal. Your detailed project plan will appear here.
                </p>
            </div>
        )}
        </div>
      </main>
      
      {project && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700 flex justify-around p-1">
            <button 
                onClick={() => setMobileView('chat')} 
                className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full transition-colors ${mobileView === 'chat' ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-400'}`}
            >
                <GeminiIcon className="w-6 h-6"/>
                <span className="text-xs font-bold">Chat</span>
            </button>
            <button 
                onClick={() => setMobileView('board')} 
                className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full transition-colors ${mobileView === 'board' ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-400'}`}
            >
                <EditIcon className="w-6 h-6"/>
                <span className="text-xs font-bold">Board</span>
            </button>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;