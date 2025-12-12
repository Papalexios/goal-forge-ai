import React, { useState, useMemo, useContext } from 'react';
import { Plan, Task, Status, Priority } from '../types';
import TaskItem from './TaskItem';
import { FileTextIcon, CalendarIcon, LoaderIcon, SparklesIcon } from './icons';
import { GoogleAuthContext } from '../contexts/GoogleAuth';
import * as calendarService from '../services/googleCalendarService';
import BatchSyncModal from './BatchSyncModal';

interface TaskBoardProps {
  plan: Plan;
  onPlanUpdate: (updatedPlan: Plan) => void;
}

const columnConfig: { [key in Status]: { title: string; color: string; border: string; bg: string } } = {
  [Status.ToDo]: { title: 'To Do', color: 'text-gray-300', border: 'border-gray-500', bg: 'bg-gray-500/10' },
  [Status.InProgress]: { title: 'In Progress', color: 'text-blue-300', border: 'border-blue-500', bg: 'bg-blue-500/10' },
  [Status.Done]: { title: 'Done', color: 'text-emerald-300', border: 'border-emerald-500', bg: 'bg-emerald-500/10' },
};

const TaskBoard: React.FC<TaskBoardProps> = ({ plan, onPlanUpdate }) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [mobileActiveTab, setMobileActiveTab] = useState<Status>(Status.ToDo);
  
  // Batch Sync State
  const [showBatchSyncModal, setShowBatchSyncModal] = useState(false);
  const [pendingSyncTasks, setPendingSyncTasks] = useState<Task[]>([]);

  const { gapi, token, isSignedIn, signIn } = useContext(GoogleAuthContext);

  const vibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
    vibrate();
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const updatedPlan = plan.map(task => 
        task.id === draggedTaskId ? { ...task, status } : task
    );
    onPlanUpdate(updatedPlan);
    setDraggedTaskId(null);
    vibrate();
  };

  const updateTask = (updatedTask: Task) => {
    const updatedPlan = plan.map(task => task.id === updatedTask.id ? updatedTask : task);
    onPlanUpdate(updatedPlan);
  };

  // Calculate unsynced tasks for the overhead button
  const unsyncedCount = useMemo(() => {
      return plan.filter(t => !t.googleCalendarEventId && t.status !== Status.Done).length;
  }, [plan]);

  const executeSync = async (tasks: Task[], startDate?: Date) => {
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: tasks.length });

    try {
        if (!gapi) throw new Error("Google API not initialized");

        const results = await calendarService.createBatchEvents(
            gapi, 
            token, 
            tasks,
            (current, total) => setSyncProgress({ current, total }),
            startDate
        );

        const newPlan = [...plan];
        let syncedCount = 0;
        
        results.forEach(res => {
            if (res.status === 'success') {
                const idx = newPlan.findIndex(t => t.id === res.taskId);
                if (idx > -1) {
                    newPlan[idx] = { ...newPlan[idx], googleCalendarEventId: res.eventId };
                    syncedCount++;
                }
            }
        });
        
        onPlanUpdate(newPlan);
        
        const errors = results.filter(r => r.status === 'error');
        if (errors.length > 0) {
             alert(`Synced ${syncedCount} tasks. ${errors.length} failed. Check console for details.`);
        }
    } catch (e) {
        console.error("Batch sync failed:", e);
        alert(`Sync failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
        setIsSyncing(false);
        setSyncProgress({ current: 0, total: 0 });
    }
  };

  const handleBatchCalendarSync = async () => {
    vibrate();
    if (!isSignedIn) {
        signIn();
        return;
    }
    
    const tasksToSync = plan.filter(t => !t.googleCalendarEventId && t.status !== Status.Done);
    if (tasksToSync.length === 0) {
        alert("All active tasks are already synced to your calendar!");
        return;
    }

    // Check for unscheduled tasks
    const unscheduledTasks = tasksToSync.filter(t => !t.startDate);

    if (unscheduledTasks.length > 0) {
        // "Ask immediately" - trigger modal
        setPendingSyncTasks(tasksToSync);
        setShowBatchSyncModal(true);
    } else {
        // All tasks have dates, proceed immediately
        executeSync(tasksToSync);
    }
  };

  const handleConfirmBatchSync = (startDate: string) => {
      setShowBatchSyncModal(false);
      executeSync(pendingSyncTasks, new Date(startDate));
  };

  const { progress } = useMemo(() => {
    let total = 0;
    let completed = 0;
    plan.forEach(task => {
      total += task.subtasks.length || 1; // Count task itself if no subtasks
      completed += task.subtasks.filter(st => st.completed).length + (task.status === Status.Done && task.subtasks.length === 0 ? 1 : 0);
    });
    return { progress: total > 0 ? (completed / total) * 100 : 0 };
  }, [plan]);

  const columns = [Status.ToDo, Status.InProgress, Status.Done];

  const handleTabChange = (status: Status) => {
      vibrate();
      setMobileActiveTab(status);
  };

  return (
    <div className="h-full flex flex-col relative">
      <BatchSyncModal 
        isOpen={showBatchSyncModal} 
        onClose={() => setShowBatchSyncModal(false)} 
        onConfirm={handleConfirmBatchSync}
        taskCount={pendingSyncTasks.filter(t => !t.startDate).length}
      />

      {/* Overhead Command Bar - Mobile Optimized */}
      <div className="mb-6 p-4 bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:bg-gray-900/60">
        <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path className="text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)] transition-all duration-1000 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                </svg>
                <span className="absolute text-[10px] font-bold text-white">{Math.round(progress)}%</span>
             </div>
             <div className="flex flex-col">
                 <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    Project Board
                    {progress === 100 && <SparklesIcon className="w-4 h-4 text-yellow-400 animate-pulse"/>}
                 </h2>
                 <p className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="bg-gray-700 px-2 py-0.5 rounded text-gray-300 font-medium">{plan.length} Tasks</span>
                 </p>
             </div>
        </div>
        
        <div className="w-full md:w-auto">
            <button
                onClick={handleBatchCalendarSync}
                disabled={isSyncing || unsyncedCount === 0}
                className={`
                    group relative overflow-hidden flex items-center justify-center gap-2 
                    py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg
                    w-full md:w-auto active:scale-95
                    ${unsyncedCount > 0 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105 shadow-indigo-500/30' 
                        : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'}
                `}
            >
                {isSyncing ? <LoaderIcon className="w-5 h-5 animate-spin"/> : <CalendarIcon className="w-5 h-5"/>}
                <span>
                    {isSyncing 
                        ? `Syncing...` 
                        : unsyncedCount > 0 
                            ? `Sync to Calendar (${unsyncedCount})` 
                            : 'All Synced'}
                </span>
                {unsyncedCount > 0 && !isSyncing && (
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"></div>
                )}
            </button>
        </div>
      </div>

      {/* Mobile Tabs - Refined Segmented Control */}
      <div className="md:hidden bg-black/40 backdrop-blur-md p-1.5 rounded-2xl mb-4 relative grid grid-cols-3 gap-0 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] border border-white/5">
          <div className="absolute inset-y-1.5 bg-indigo-600 rounded-xl shadow-lg transition-all duration-300 ease-spring z-0" 
               style={{ 
                   left: `${columns.indexOf(mobileActiveTab) * 33.33 + 1}%`, 
                   width: '31.33%' 
               }}
          ></div>
          {columns.map(status => (
              <button
                  key={status}
                  onClick={() => handleTabChange(status)}
                  className={`relative z-10 py-3 text-xs font-bold transition-colors duration-200 uppercase tracking-wide active:scale-95 ${mobileActiveTab === status ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                  {columnConfig[status].title}
              </button>
          ))}
      </div>
      
      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-hidden md:overflow-x-auto pb-4">
        {columns.map(status => {
          const tasksInColumn = plan.filter(task => task.status === status);
          const isHiddenOnMobile = mobileActiveTab !== status;

          return (
            <div 
              key={status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
              className={`${isHiddenOnMobile ? 'hidden md:flex' : 'flex'} flex-col bg-gray-800/20 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden h-full min-h-[400px] ${draggedTaskId ? 'ring-2 ring-indigo-500/30' : ''} transition-all duration-300`}
            >
              <div className={`p-4 border-b border-white/5 ${columnConfig[status].bg} backdrop-blur-sm`}>
                <h3 className={`font-bold flex justify-between items-center ${columnConfig[status].color}`}>
                  {columnConfig[status].title}
                  <span className="text-xs font-mono px-2 py-1 rounded-lg bg-black/20 border border-white/5 text-white/70">
                    {tasksInColumn.length}
                  </span>
                </h3>
              </div>
              
              <div className="flex-grow p-3 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pb-32 md:pb-3">
                {tasksInColumn.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="cursor-grab active:cursor-grabbing transform transition-all hover:-translate-y-1 active:scale-[0.98]"
                  >
                    <TaskItem task={task} onUpdate={updateTask} />
                  </div>
                ))}
                {tasksInColumn.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-gray-700/50 rounded-xl flex items-center justify-center text-gray-600 text-sm italic mx-2 mt-4">
                        No tasks here
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskBoard;