import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Plan } from '../types';
import * as storage from '../services/storageService';
import * as gemini from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { TrashIcon, LoaderIcon, TtsIcon, StopIcon, SearchIcon, PlusIcon, ClipboardCheckIcon, SparklesIcon } from './icons';
import GoogleCalendarSync from './GoogleCalendarSync';

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
            className="group relative bg-gray-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 hover:bg-gray-800/60 hover:border-indigo-500/50 transition-all duration-300 cursor-pointer overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-colors"></div>
            
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors truncate max-w-[200px]">{project.goal}</h3>
                    <p className="text-xs text-gray-400 mt-1">Created {new Date(project.createdAt).toLocaleDateString()}</p>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) onDelete(project.id); }} 
                    className="text-gray-600 hover:text-red-400 p-2 rounded-full hover:bg-white/5 transition-colors"
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
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    setProjects(storage.getProjects());
    setDailyPlan(storage.getDailyPlan(new Date()));
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
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
    <div className="max-w-7xl mx-auto w-full space-y-8 p-2">
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 pb-4 border-b border-white/5">
        <div>
            <h1 className="text-5xl font-bold text-white tracking-tight mb-1">{greeting}, Builder.</h1>
            <p className="text-gray-400">You have {projects.length} active projects and {dailyPlan.length} tasks for today.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={onCreateNew} className="group flex items-center gap-2 bg-white text-black hover:bg-gray-200 font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300"/>
                <span>New Project</span>
            </button>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* AI Summary Widget - Large */}
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden">
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
                    <p className="text-lg text-indigo-100 leading-relaxed">
                        {summaryText || "Ready to analyze your progress. Click the button to generate a strategic briefing."}
                    </p>
                )}
             </div>
             <button 
                onClick={handleAiSummary} 
                disabled={isSummaryLoading}
                className="bg-white/10 hover:bg-white/20 border border-white/10 text-white py-2 px-4 rounded-lg text-sm font-semibold backdrop-blur-md transition-all flex items-center gap-2"
             >
                {isSummaryPlaying ? <StopIcon className="w-4 h-4"/> : <TtsIcon className="w-4 h-4"/>}
                {isSummaryPlaying ? 'Stop Briefing' : 'Generate Briefing'}
             </button>
        </div>

        {/* Daily Planner Widget - Medium */}
        <div onClick={onShowDailyPlanner} className="cursor-pointer md:col-span-1 bg-gray-800/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:border-indigo-500/50 transition-all group relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
             <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400 mb-4 group-hover:scale-110 transition-transform">
                    <ClipboardCheckIcon className="w-6 h-6"/>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-white">{dailyPlan.length}</h3>
                    <p className="text-gray-400 text-sm">Tasks Today</p>
                </div>
             </div>
             <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white bg-white/10 px-2 py-1 rounded">Open Planner &rarr;</div>
        </div>

        {/* Calendar Widget - Medium */}
        <div className="md:col-span-1">
             <GoogleCalendarSync />
        </div>
      </div>

      <div className="space-y-6">
         <div className="flex items-center justify-between">
             <h2 className="text-2xl font-bold text-white">Active Projects</h2>
             <div className="relative">
                 <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
                 <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-800/50 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all w-48 focus:w-64"
                 />
             </div>
         </div>
         
         {processedProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedProjects.map(p => (
                    <ProjectCard key={p.id} project={p} onSelect={onSelectProject} onDelete={handleDeleteProject} progress={p.progress} />
                ))}
            </div>
         ) : (
            <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-3xl bg-white/5">
                <p className="text-gray-400 mb-4">No projects found.</p>
                <button onClick={onCreateNew} className="text-indigo-400 hover:text-indigo-300 font-semibold">Create your first project</button>
            </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;