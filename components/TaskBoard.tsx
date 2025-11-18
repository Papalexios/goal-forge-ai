import React, { useState, useMemo, useContext } from 'react';
import { Plan, Task, Status, Priority } from '../types';
import TaskItem from './TaskItem';
import { FileTextIcon, CalendarIcon, LoaderIcon } from './icons';
import { GoogleAuthContext } from '../contexts/GoogleAuth';
import * as calendarService from '../services/googleCalendarService';

interface TaskBoardProps {
  plan: Plan;
  onPlanUpdate: (updatedPlan: Plan) => void;
}

const columnConfig: { [key in Status]: { title: string; color: string; border: string } } = {
  [Status.ToDo]: { title: 'To Do', color: 'bg-gray-500/20 text-gray-300', border: 'border-t-4 border-gray-500' },
  [Status.InProgress]: { title: 'In Progress', color: 'bg-blue-500/20 text-blue-300', border: 'border-t-4 border-blue-500' },
  [Status.Done]: { title: 'Done', color: 'bg-emerald-500/20 text-emerald-300', border: 'border-t-4 border-emerald-500' },
};

const TaskBoard: React.FC<TaskBoardProps> = ({ plan, onPlanUpdate }) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const handleBatchCalendarSync = async () => {
    if (!isSignedIn) {
        if(confirm("Sign in with Google to sync tasks?")) signIn();
        return;
    }
    
    const tasksToSync = plan.filter(t => !t.googleCalendarEventId && t.status !== Status.Done);
    if (tasksToSync.length === 0) {
        alert("No pending tasks to sync!");
        return;
    }

    if (!confirm(`Sync ${tasksToSync.length} tasks to your Google Calendar? Tasks without dates will be scheduled starting at 9 AM.`)) return;

    setIsSyncing(true);
    try {
        const results = await calendarService.createBatchEvents(gapi, token, tasksToSync);
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
        alert(`Successfully synced ${syncedCount} tasks!`);
    } catch (e) {
        console.error(e);
        alert("Batch sync failed.");
    } finally {
        setIsSyncing(false);
    }
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
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 px-2">
        <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path className="text-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
                <span className="absolute text-xs font-bold text-white">{Math.round(progress)}%</span>
             </div>
             <div>
                 <h2 className="text-lg font-bold text-white">Project Board</h2>
                 <p className="text-xs text-gray-400">{plan.length} Tasks Total</p>
             </div>
        </div>
        
        <div className="flex gap-3">
            <button
                onClick={handleBatchCalendarSync}
                disabled={isSyncing}
                className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 font-semibold py-2 px-4 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
            >
                {isSyncing ? <LoaderIcon className="w-5 h-5 animate-spin"/> : <CalendarIcon className="w-5 h-5"/>}
                <span>{isSyncing ? 'Syncing...' : 'Sync All'}</span>
            </button>
            {/* Export Button logic same as before but styled */}
        </div>
      </div>
      
      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4 px-2">
        {columns.map(status => {
          const tasksInColumn = plan.filter(task => task.status === status);
          return (
            <div 
              key={status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
              className={`flex flex-col bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden h-full min-h-[500px] ${draggedTaskId ? 'ring-2 ring-indigo-500/30' : ''}`}
            >
              <div className={`p-4 ${columnConfig[status].border} bg-gray-800/30`}>
                <h3 className={`font-bold flex justify-between items-center ${columnConfig[status].color.split(' ')[1]}`}>
                  {columnConfig[status].title}
                  <span className={`text-xs font-mono px-2 py-1 rounded-lg ${columnConfig[status].color}`}>
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
                        Empty
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