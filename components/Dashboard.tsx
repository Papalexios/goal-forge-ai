
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Plan } from '../types';
import * as storage from '../services/storageService';
import * as gemini from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { TrashIcon, LoaderIcon, TtsIcon, StopIcon, SearchIcon, PlusIcon, ClipboardCheckIcon, SparklesIcon } from './icons';
import GoogleCalendarSync from './GoogleCalendarSync';
import GamificationWidget from './GamificationWidget';
import { STATS_UPDATED_EVENT } from '../services/storageService';
import { UserStats } from '../types';

interface ProjectCardProps {
    project: Project;
    onSelect: (id: string) => void;
    onDelete: (id:string) => void;
    progress: number;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect, onDelete, progress }) => {
    return (
        <div 
            onClick={() => onSelect(project.id)}
            className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer overflow-hidden active:scale-[0.98] transform shadow-lg"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-colors"></div>
            
            <div className="flex justify-between items-start relative z-10">
                <div className="flex-1 pr-2">
                    <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors truncate">{project.goal}</h3>
                    <p className="text-xs text-gray-400 mt-1">Created {new Date(project.createdAt).toLocaleDateString()}</p>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) onDelete(project.id); }} 
                    className="text-gray-600 hover:text-red-400 p-2 rounded-full hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                >
                    <TrashIcon className="w-4 h-4"/>
                </button>
            </div>

            <div className="mt-6 relative z-10">
                <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">Completion</span>
                    <span className="text-indigo-300 font-mono">{progress}%</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>
    );
};

interface DashboardProps {
  onSelectProject: (id: string) => void;
  onCreateNew: () => void;
  onShowSettings: () => void;
  onShowDailyPlanner: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectProject, onCreateNew, onShowSettings, onShowDailyPlanner }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [dailyPlan, setDailyPlan] = useState<Plan>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isSummaryPlaying, setIsSummaryPlaying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userStats, setUserStats] = useState(storage.getUserStats());
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    setProjects(storage.getProjects());
    setDailyPlan(storage.getDailyPlan(new Date()));
    
    // Listen for Stats Updates (No Polling)
    const handleStatsUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<UserStats>;
        setUserStats(customEvent.detail);
    };
    window.addEventListener(STATS_UPDATED_EVENT, handleStatsUpdate);

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    return () => window.removeEventListener(STATS_UPDATED_EVENT, handleStatsUpdate);
  }, []);
  
  const handleDeleteProject = (id: string) => {
      storage.deleteProject(id);
      setProjects(storage.getProjects());
  }

  const handleAiSummary = async () => {
    if (!audioContextRef.current) return;
    if (isSummaryPlaying && audioSourceRef.current) {
        audioSourceRef.current.stop();
        setIsSummaryPlaying(false);
        return;
    }
    setIsSummaryLoading(true);
    setSummaryText('');
    try {
        const summary = await gemini.getAiSummary(projects);
        setSummaryText(summary);
        const audio = await gemini.generateTtsAudio(summary);
        const buffer = await decodeAudioData(decode(audio), audioContextRef.current, 24000, 1);
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsSummaryPlaying(false);
        source.start(0);
        audioSourceRef.current = source;
        setIsSummaryPlaying(true);
    } catch (e) {
        console.error(e);
        setSummaryText("AI Summary unavailable.");
    } finally {
        setIsSummaryLoading(false);
    }
  };

  const processedProjects = useMemo(() => {
    return projects.map(p => {
      let total = p.plan.length || 1;
      let completed = p.plan.filter(t => t.status === 'Done').length;
      return { ...p, progress: Math.round((completed / total) * 100) };
    }).filter(p => p.goal.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [projects, searchTerm]);

  const greeting = useMemo(() => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good Morning";
      if (hour < 18) return "Good Afternoon";
      return "Good Evening";
  }, []);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 md:space-y-8 p-4 md:p-6 animate-slide-in-up pt-safe">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-white/5">
        <div className="w-full md:w-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-1">{greeting}.</h1>
            <p className="text-gray-400 text-sm md:text-base">You have {projects.length} active projects and {dailyPlan.length} tasks for today.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <button 
                onClick={onCreateNew} 
                className="w-full md:w-auto group flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 font-bold py-3 px-6 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95 active:shadow-none"
            >
                <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300"/>
                <span>New Project</span>
            </button>
        </div>
      </header>

      {/* Gamification Bar */}
      <div className="w-full">
         <GamificationWidget stats={userStats} />
      </div>

      {/* Bento Grid Layout - Mobile Optimized */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        {/* AI Summary Widget - Large */}
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl transition-transform hover:scale-[1.01]">
             <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none">
                <SparklesIcon className="w-32 h-32 text-white"/>
             </div>
             <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-yellow-300"/> AI Insight
             </h2>
             <div className="min-h-[80px] mb-4">
                {isSummaryLoading ? (
                    <div className="flex items-center gap-2 text-indigo-300 animate-pulse">
                        <LoaderIcon className="w-5 h-5 animate-spin"/> Analyzing your trajectory...
                    </div>
                ) : (
                    <p className="text-base md:text-lg text-indigo-100 leading-relaxed font-light">
                        {summaryText || "Ready to analyze your progress. Click to generate a strategic briefing."}
                    </p>
                )}
             </div>
             <button 
                onClick={handleAiSummary} 
                disabled={isSummaryLoading}
                className="w-full md:w-auto bg-white/10 hover:bg-white/20 border border-white/10 text-white py-3 px-6 rounded-xl text-sm font-semibold backdrop-blur-md transition-all flex items-center justify-center gap-2 active:bg-white/25 active:scale-95"
             >
                {isSummaryPlaying ? <StopIcon className="w-4 h-4"/> : <TtsIcon className="w-4 h-4"/>}
                {isSummaryPlaying ? 'Stop Briefing' : 'Generate Briefing'}
             </button>
        </div>

        {/* Daily Planner Widget - Medium */}
        <div onClick={onShowDailyPlanner} className="cursor-pointer md:col-span-1 bg-gray-800/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:border-indigo-500/50 transition-all group relative overflow-hidden active:scale-[0.98] shadow-lg">
             <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
             <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform shadow-inner">
                    <ClipboardCheckIcon className="w-6 h-6"/>
                </div>
                <div>
                    <h3 className="text-4xl font-black text-white">{dailyPlan.length}</h3>
                    <p className="text-gray-400 text-sm font-medium">Tasks Today</p>
                </div>
             </div>
             <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white bg-white/10 px-3 py-1.5 rounded-full font-bold backdrop-blur-md border border-white/10">Open &rarr;</div>
        </div>

        {/* Calendar Widget - Medium */}
        <div className="md:col-span-1">
             <GoogleCalendarSync />
        </div>
      </div>

      <div className="space-y-6">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <h2 className="text-2xl font-bold text-white">Active Projects</h2>
             <div className="relative w-full md:w-auto group">
                 <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors"/>
                 <input 
                    type="text" 
                    placeholder="Search projects..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-64 bg-gray-900/50 border border-white/10 rounded-full py-3 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:outline-none transition-all placeholder-gray-500 hover:bg-gray-800/80"
                 />
             </div>
         </div>
         
         {processedProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20 md:pb-0">
                {processedProjects.map(p => (
                    <ProjectCard key={p.id} project={p} onSelect={onSelectProject} onDelete={handleDeleteProject} progress={p.progress} />
                ))}
            </div>
         ) : (
            <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-3xl bg-white/5 backdrop-blur-sm">
                <p className="text-gray-400 mb-4 font-medium">No projects found.</p>
                <button onClick={onCreateNew} className="text-indigo-400 hover:text-indigo-300 font-bold underline decoration-2 underline-offset-4">Create your first project</button>
            </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
