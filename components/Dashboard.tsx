import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Plan } from '../types';
import * as storage from '../services/storageService';
import * as gemini from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { TrashIcon, LoaderIcon, TtsIcon, StopIcon, SearchIcon, CogIcon, ClipboardCheckIcon } from './icons';
import GoogleCalendarSync from './GoogleCalendarSync';

interface ProjectCardProps {
    project: Project;
    onSelect: (id: string) => void;
    onDelete: (id:string) => void;
    progress: number;
    completedSubtasks: number;
    totalSubtasks: number;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect, onDelete, progress, completedSubtasks, totalSubtasks }) => {
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete the project "${project.goal}"?`)) {
            onDelete(project.id);
        }
    };

    return (
        <div 
            className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg hover:shadow-indigo-500/20 hover:border-indigo-500 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            onClick={() => onSelect(project.id)}
        >
            <div>
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-white mb-2 pr-2">{project.goal}</h3>
                    <button onClick={handleDelete} className="text-gray-500 hover:text-red-500 transition-colors flex-shrink-0">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                    Created: {new Date(project.createdAt).toLocaleDateString()}
                </p>
            </div>
            <div>
                <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="text-gray-300">Progress</span>
                    <span className="font-semibold text-indigo-300">{progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-right">{completedSubtasks} / {totalSubtasks} subtasks</p>
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

type SortOption = 'date_desc' | 'date_asc' | 'progress_desc' | 'progress_asc';

const Dashboard: React.FC<DashboardProps> = ({ onSelectProject, onCreateNew, onShowSettings, onShowDailyPlanner }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [dailyPlan, setDailyPlan] = useState<Plan>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isSummaryPlaying, setIsSummaryPlaying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
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
        audioSourceRef.current = null;
        return;
    }

    setIsSummaryLoading(true);
    setSummaryText('');
    try {
        const summaryResult = await gemini.getAiSummary(projects);
        setSummaryText(summaryResult);
        const base64Audio = await gemini.generateTtsAudio(`Here is your weekly summary: ${summaryResult}`);
        
        const audioData = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
        
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => {
            setIsSummaryPlaying(false);
            audioSourceRef.current = null;
        };
        source.start(0);

        audioSourceRef.current = source;
        setIsSummaryPlaying(true);
    } catch (error) {
        console.error("Failed to get AI summary:", error);
        setSummaryText(error instanceof Error ? error.message : "Could not generate AI summary. Please try again.");
    } finally {
        setIsSummaryLoading(false);
    }
  };

  const processedProjects = useMemo(() => {
    const projectsWithProgress = projects.map(project => {
      let total = 0;
      let completed = 0;
      project.plan.forEach(task => {
        total += task.subtasks.length;
        completed += task.subtasks.filter(st => st.completed).length;
      });
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...project, progress, completedSubtasks: completed, totalSubtasks: total };
    });

    const filtered = projectsWithProgress.filter(p => p.goal.toLowerCase().includes(searchTerm.toLowerCase()));

    return filtered.sort((a, b) => {
        switch(sortOption) {
            case 'date_asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'progress_desc': return b.progress - a.progress;
            case 'progress_asc': return a.progress - b.progress;
            case 'date_desc':
            default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });
  }, [projects, searchTerm, sortOption]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8 animate-slide-in-up opacity-0">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
                Project Dashboard
            </h1>
            <button onClick={onShowSettings} title="Settings" className="text-gray-400 hover:text-white transition-colors">
                <CogIcon className="w-6 h-6"/>
            </button>
          </div>
          <button
            onClick={onCreateNew}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg text-md shadow-lg transform hover:scale-105 transition-all duration-300 cta-glow"
            >
            + Create New Plan
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="md:col-span-2 bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h2 className="text-xl font-bold text-white">Weekly AI Briefing</h2>
                    <button
                        onClick={handleAiSummary}
                        disabled={isSummaryLoading || projects.length === 0}
                        className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg text-sm shadow-lg transition-all duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                        {isSummaryLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : (isSummaryPlaying ? <StopIcon className="w-5 h-5" /> : <TtsIcon className="w-5 h-5" />)}
                        <span>{isSummaryLoading ? 'Generating...' : isSummaryPlaying ? 'Stop Audio' : 'Generate & Play'}</span>
                    </button>
                </div>
                <div className="mt-4 min-h-[60px]">
                    {isSummaryLoading && !summaryText && <p className="text-gray-400 italic">AI is analyzing your progress...</p>}
                    {summaryText ? (
                        <p className="text-gray-300">{summaryText}</p>
                    ) : (
                        !isSummaryLoading && <p className="text-gray-400">Click the button to generate a summary of your week's progress and get suggestions for what's next.</p>
                    )}
                </div>
            </div>
             <div onClick={onShowDailyPlanner} className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg flex flex-col justify-center items-center text-center hover:border-indigo-500 hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer">
                <ClipboardCheckIcon className="w-8 h-8 text-indigo-400 mb-2"/>
                <h2 className="text-xl font-bold text-white">Daily Planner</h2>
                <p className="text-sm text-gray-400 mt-1">
                    {dailyPlan.length > 0 ? `${dailyPlan.length} tasks for today` : "Plan your day"}
                </p>
            </div>
        </div>
        
        <GoogleCalendarSync />

        <div className="my-8 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:max-w-md">
                <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="sort-select" className="text-gray-300">Sort by:</label>
                <select
                    id="sort-select"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                    <option value="date_desc">Date (Newest)</option>
                    <option value="date_asc">Date (Oldest)</option>
                    <option value="progress_desc">Progress (High-Low)</option>
                    <option value="progress_asc">Progress (Low-High)</option>
                </select>
            </div>
        </div>

        {processedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedProjects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project}
                onSelect={onSelectProject}
                onDelete={handleDeleteProject}
                progress={project.progress}
                completedSubtasks={project.completedSubtasks}
                totalSubtasks={project.totalSubtasks}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700">
            <h2 className="text-2xl font-semibold text-white">{searchTerm ? 'No Matching Projects' : 'No Projects Yet!'}</h2>
            <p className="text-gray-400 mt-2 mb-6">{searchTerm ? 'Try a different search term.' : 'Click "Create New Plan" to forge your first masterpiece.'}</p>
            {!searchTerm && (
                <button
                    onClick={onCreateNew}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg text-md shadow-lg transform hover:scale-105 transition-all duration-300 cta-glow"
                >
                    Get Started
                </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;