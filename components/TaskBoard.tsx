
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

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
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

  return (
    <div className="h-full flex flex-col relative">
      <BatchSyncModal 
        isOpen={showBatchSyncModal} 
        onClose={() => setShowBatchSyncModal(false)} 
        onConfirm={handleConfirmBatchSync}
        taskCount={pendingSyncTasks.filter(t => !t.startDate).length}
      />

      {/* Overhead Command Bar */}
      <div className="mb-6 p-4 bg-gray-800/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-5 w-full md:w-auto">
             <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path className="text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                </svg>
                <span className="absolute text-[10px] font-bold text-white">{Math.round(progress)}%</span>
             </div>
             <div className="flex flex-col">
                 <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    Project Board
                    {progress === 100 && <SparklesIcon className="w-4 h-4 text-yellow-400 animate-pulse"/>}
                 </h2>
                 <p className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">{plan.length} Tasks</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                    <span>{unsyncedCount} Unsynced</span>
                 </p>
             </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            <button
                onClick={handleBatchCalendarSync}
                disabled={isSyncing || unsyncedCount === 0}
                className={`
                    group relative overflow-hidden flex items-center justify-center gap-2 
                    py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg
                    w-full md:w-auto
                    ${unsyncedCount > 0 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105 shadow-indigo-500/30' 
                        : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'}
                `}
            >
                {isSyncing ? <LoaderIcon className="w-5 h-5 animate-spin"/> : <CalendarIcon className="w-5 h-5"/>}
                <span>
                    {isSyncing 
                        ? `Syncing ${syncProgress.current}/${syncProgress.total}...` 
                        : unsyncedCount > 0 
                            ? `Add Board to Calendar (${unsyncedCount})` 
                            : 'Calendar Synced'}
                </span>
                {unsyncedCount > 0 && !isSyncing && (
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"></div>
                )}
            </button>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden flex bg-gray-800/50 p-1 rounded-xl mb-4 mx-2 relative">
          <div className="absolute inset-y-1 bg-indigo-600/20 rounded-lg transition-all duration-300 ease-out" 
               style={{ 
                   left: `${columns.indexOf(mobileActiveTab) * 33.33}%`, 
                   width: '33.33%' 
               }}
          ></div>
          {columns.map(status => (
              <button
                  key={status}
                  onClick={() => setMobileActiveTab(status)}
                  className={`flex-1 py-2 text-xs font-bold z-10 transition-colors duration-200 ${mobileActiveTab === status ? 'text-white' : 'text-gray-400'}`}
              >
                  {columnConfig[status].title}
              </button>
          ))}
      </div>
      
      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4 px-2">
        {columns.map(status => {
          const tasksInColumn = plan.filter(task => task.status === status);
          // Logic to hide columns on mobile if not active
          const isHiddenOnMobile = mobileActiveTab !== status;

          return (
            <div 
              key={status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
              className={`${isHiddenOnMobile ? 'hidden md:flex' : 'flex'} flex-col bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden h-full min-h-[500px] ${draggedTaskId ? 'ring-2 ring-indigo-500/30' : ''} transition-all duration-300`}
            >
              <div className={`p-4 border-b border-white/5 ${columnConfig[status].bg}`}>
                <h3 className={`font-bold flex justify-between items-center ${columnConfig[status].color}`}>
                  {columnConfig[status].title}
                  <span className="text-xs font-mono px-2 py-1 rounded-lg bg-black/20 border border-white/5 text-white/70">
                    {tasksInColumn.length}
                  </span>
                </h3>
              </div>
              
              <div className="flex-grow p-3 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {tasksInColumn.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="cursor-grab active:cursor-grabbing transform transition-all hover:-translate-y-1"
                  >
                    <TaskItem task={task} onUpdate={updateTask} />
                  </div>
                ))}
                {tasksInColumn.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-gray-700/50 rounded-xl flex items-center justify-center text-gray-600 text-sm italic">
                        No Tasks
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
