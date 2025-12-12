import React, { useState, useEffect, useContext } from 'react';
import { Plan, Task, Status, Priority, OptimizedSchedule } from '../types';
import * as storage from '../services/storageService';
import * as gemini from '../services/geminiService';
import * as calendarService from '../services/googleCalendarService';
import { GoogleAuthContext } from '../contexts/GoogleAuth';
import TaskBoard from './TaskBoard'; 
import ImportTasksModal from './ImportTasksModal';
import OptimizedScheduleModal from './OptimizedScheduleModal';
import { SparklesIcon, FileTextIcon, PlusIcon, LoaderIcon, CalendarIcon, MicrophoneIcon, StopIcon } from './icons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface DailyPlannerScreenProps {
  onBack: () => void;
}

const DailyPlannerScreen: React.FC<DailyPlannerScreenProps> = ({ onBack }) => {
  const [dailyPlan, setDailyPlan] = useState<Plan>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [optimizedSchedule, setOptimizedSchedule] = useState<OptimizedSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const { gapi, token, isSignedIn, signIn } = useContext(GoogleAuthContext);
  const today = new Date();

  const vibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };

  const {
    isListening,
    transcript,
    start: startListening,
    stop: stopListening,
    hasSupport
  } = useSpeechRecognition();

  useEffect(() => {
    setDailyPlan(storage.getDailyPlan(today));
  }, []);

  useEffect(() => {
    if (isListening) {
        setNewTaskTitle(transcript);
    }
  }, [transcript, isListening]);

  const handlePlanUpdate = (updatedPlan: Plan) => {
    setDailyPlan(updatedPlan);
    storage.saveDailyPlan(today, updatedPlan);
  };

  const handleImportTasks = (tasksToImport: Task[]) => {
    const newPlan = [...dailyPlan];
    tasksToImport.forEach(task => {
        if (!dailyPlan.some(p => p.id === task.id)) {
            newPlan.push({ ...task, status: Status.ToDo }); 
        }
    });
    handlePlanUpdate(newPlan);
    setIsImportModalOpen(false);
    vibrate();
  };
  
  const handleOptimizeDay = async () => {
    if (dailyPlan.length === 0) return alert("Add tasks first!");
    vibrate();
    setIsLoading(true);
    try {
        const schedule = await gemini.generateDailySchedule(dailyPlan);
        setOptimizedSchedule(schedule);
        setIsScheduleModalOpen(true);
    } catch (e) {
        alert("Optimization failed.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleAddTask = () => {
    vibrate();
    if (isListening) stopListening();
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
        id: `daily_${Date.now()}`,
        title: newTaskTitle.trim(),
        description: 'Daily quick task',
        priority: Priority.Medium,
        status: Status.ToDo,
        subtasks: [],
        timeEstimate: '30 min',
        startDate: new Date().toISOString()
    };
    handlePlanUpdate([...dailyPlan, newTask]);
    setNewTaskTitle('');
  };

  const toggleListening = () => {
      vibrate();
      if (isListening) {
          stopListening();
      } else {
          setNewTaskTitle('');
          startListening();
      }
  };

  const handleSyncDayToCalendar = async () => {
    vibrate();
     if (!isSignedIn) {
        if(confirm("Sign in to sync?")) signIn();
        return;
    }
    if (dailyPlan.length === 0) return alert("Nothing to sync.");
    
    setIsSyncing(true);
    try {
        // Sync all tasks in the daily plan
        const results = await calendarService.createBatchEvents(gapi, token, dailyPlan);
        const newPlan = [...dailyPlan];
        results.forEach(res => {
            if (res.status === 'success') {
                const idx = newPlan.findIndex(t => t.id === res.taskId);
                if(idx > -1) newPlan[idx] = { ...newPlan[idx], googleCalendarEventId: res.eventId };
            }
        });
        handlePlanUpdate(newPlan);
        alert("Daily plan synced to calendar!");
    } catch (e) {
        console.error(e);
        alert("Sync failed.");
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-6 animate-slide-in-up pt-safe">
      <ImportTasksModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportTasks} existingTaskIds={dailyPlan.map(t => t.id)} />
      <OptimizedScheduleModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} schedule={optimizedSchedule} plan={dailyPlan} />

      <header className="flex flex-col gap-4">
         <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Today's Focus</h1>
            <p className="text-gray-400 font-medium">{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
         </div>
         {/* Scrollable Action Chips for Mobile SOTA */}
         <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0 mask-image-scroll">
             <button onClick={() => setIsImportModalOpen(true)} className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors whitespace-nowrap text-sm font-bold active:scale-95 shadow-lg">
                <FileTextIcon className="w-4 h-4"/> Import Tasks
             </button>
             <button onClick={handleOptimizeDay} disabled={isLoading} className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 transition-all whitespace-nowrap text-sm font-bold disabled:opacity-50 active:scale-95 shadow-lg shadow-indigo-900/20">
                {isLoading ? <LoaderIcon className="w-4 h-4 animate-spin"/> : <SparklesIcon className="w-4 h-4"/>} Optimize Day
             </button>
             <button onClick={handleSyncDayToCalendar} disabled={isSyncing} className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 transition-all whitespace-nowrap text-sm font-bold disabled:opacity-50 active:scale-95 shadow-lg shadow-blue-900/20">
                {isSyncing ? <LoaderIcon className="w-4 h-4 animate-spin"/> : <CalendarIcon className="w-4 h-4"/>} Sync to Cal
             </button>
         </div>
      </header>
      
      {/* Modern Floating Input */}
      <div className="flex gap-2 bg-gray-900/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl items-center ring-1 ring-white/5">
          <input 
            value={newTaskTitle} 
            onChange={e => setNewTaskTitle(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
            placeholder={isListening ? "Listening..." : "Add a quick task..."} 
            className={`bg-transparent flex-grow px-4 py-2 text-white placeholder-gray-500 focus:outline-none transition-all font-medium ${isListening ? 'text-indigo-300 placeholder-indigo-400/50' : ''}`}
          />
          {hasSupport && (
            <button 
                onClick={toggleListening}
                className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
                    isListening 
                    ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse text-white' 
                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white hover:scale-105'
                }`}
            >
                {isListening ? <StopIcon className="w-5 h-5"/> : <MicrophoneIcon className="w-5 h-5"/>}
            </button>
          )}
          <button onClick={handleAddTask} className="bg-white text-black p-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10">
            <PlusIcon className="w-5 h-5"/>
          </button>
      </div>

      <div className="flex-grow overflow-hidden">
         <TaskBoard plan={dailyPlan} onPlanUpdate={handlePlanUpdate} />
      </div>
    </div>
  );
};

export default DailyPlannerScreen;