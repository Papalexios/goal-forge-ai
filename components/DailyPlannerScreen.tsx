import React, { useState, useEffect, useCallback } from 'react';
import { Plan, Task, Status, Priority, OptimizedSchedule } from '../types';
import * as storage from '../services/storageService';
import * as gemini from '../services/geminiService';
import TaskBoard from './TaskBoard';
import ImportTasksModal from './ImportTasksModal';
import OptimizedScheduleModal from './OptimizedScheduleModal';
import { ChevronLeftIcon, SparklesIcon, FileTextIcon, PlusIcon, LoaderIcon } from './icons';

interface DailyPlannerScreenProps {
  onBack: () => void;
}

const DailyPlannerScreen: React.FC<DailyPlannerScreenProps> = ({ onBack }) => {
  const [dailyPlan, setDailyPlan] = useState<Plan>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [optimizedSchedule, setOptimizedSchedule] = useState<OptimizedSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const today = new Date();

  useEffect(() => {
    setDailyPlan(storage.getDailyPlan(today));
  }, []);

  const handlePlanUpdate = useCallback((updatedPlan: Plan) => {
    setDailyPlan(updatedPlan);
    storage.saveDailyPlan(today, updatedPlan);
  }, [today]);

  const handleImportTasks = (tasksToImport: Task[]) => {
    const newPlan = [...dailyPlan];
    tasksToImport.forEach(task => {
        if (!dailyPlan.some(p => p.id === task.id)) {
            newPlan.push({ ...task, status: Status.ToDo }); // Ensure imported tasks start as To Do
        }
    });
    handlePlanUpdate(newPlan);
    setIsImportModalOpen(false);
  };
  
  const handleOptimizeDay = async () => {
    if (dailyPlan.length === 0) {
        alert("Add some tasks to your day before optimizing!");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const schedule = await gemini.generateDailySchedule(dailyPlan);
        setOptimizedSchedule(schedule);
        setIsScheduleModalOpen(true);
    } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleAddTask = () => {
    if (newTaskTitle.trim() === '') return;
    const newTask: Task = {
        id: `daily_${Date.now()}`,
        title: newTaskTitle.trim(),
        description: '',
        priority: Priority.Medium,
        status: Status.ToDo,
        subtasks: [],
        timeEstimate: '30 min',
    };
    handlePlanUpdate([...dailyPlan, newTask]);
    setNewTaskTitle('');
  };

  return (
    <>
      <ImportTasksModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportTasks}
        existingTaskIds={dailyPlan.map(t => t.id)}
      />
      <OptimizedScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        schedule={optimizedSchedule}
        plan={dailyPlan}
      />
      <div className="min-h-screen flex flex-col p-4 sm:p-6 md:p-8 animate-slide-in-up opacity-0">
        <header className="flex items-center justify-between mb-6 flex-shrink-0">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ChevronLeftIcon className="w-6 h-6" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Today's Plan</h1>
            <p className="text-sm text-gray-400">{today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="w-24 sm:w-48"></div>{/* Spacer */}
        </header>

        {error && <p className="text-red-400 mb-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button onClick={() => setIsImportModalOpen(true)} className="w-full flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                <FileTextIcon className="w-5 h-5"/>
                Import from Projects
            </button>
            <button onClick={handleOptimizeDay} disabled={isLoading} className="w-full flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all cta-glow disabled:bg-gray-600 disabled:cursor-wait">
                {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin"/> : <SparklesIcon className="w-5 h-5"/>}
                {isLoading ? 'Optimizing...' : 'Optimize My Day with AI'}
            </button>
        </div>

        <div className="mb-6 flex items-center gap-2">
            <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a new quick task for today..."
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-white"
            />
            <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                aria-label="Add quick task"
            >
                <PlusIcon className="w-6 h-6"/>
            </button>
        </div>
        
        <main className="flex-grow overflow-hidden">
          {dailyPlan.length > 0 ? (
            <div className="overflow-y-auto h-full max-h-[calc(100vh-22rem)]">
              <TaskBoard plan={dailyPlan} onPlanUpdate={handlePlanUpdate} />
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700">
              <h2 className="text-2xl font-semibold text-white">Your Day is a Blank Canvas</h2>
              <p className="text-gray-400 mt-2">Add your first task or import from a project to get started.</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default DailyPlannerScreen;