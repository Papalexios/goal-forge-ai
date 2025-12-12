
import React, { useState, useContext, memo } from 'react';
import { Task, Subtask, Priority, Status } from '../types';
import { CalendarIcon, EditIcon, SparklesIcon, PlusIcon, LoaderIcon, RepeatIcon, ClockIcon } from './icons';
import AIAssistModal from './AIAssistModal';
import * as gemini from '../services/geminiService';
import * as storage from '../services/storageService';
import { GoogleAuthContext } from '../contexts/GoogleAuth';
import * as calendarService from '../services/googleCalendarService';

interface TaskItemProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

const priorityColors: Record<Priority, string> = {
  [Priority.High]: 'bg-red-500 border-red-400',
  [Priority.Medium]: 'bg-yellow-500 border-yellow-400',
  [Priority.Low]: 'bg-green-500 border-green-400',
};

const inputStyles = "w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-white";

// Memoize TaskItem to prevent re-renders of the entire board on single item updates
const TaskItem: React.FC<TaskItemProps> = memo(({ task, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [assistingSubtask, setAssistingSubtask] = useState<Subtask | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [showXPPopup, setShowXPPopup] = useState(false);

  const { gapi, token, isSignedIn, signIn } = useContext(GoogleAuthContext);

  const vibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    vibrate();
    const updatedSubtasks = task.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    let newStatus = task.status;
    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);

    if (allCompleted && task.status !== Status.Done) {
      newStatus = Status.Done;
      triggerXP(15); // Bonus for all subtasks
    } else if (!allCompleted && task.status === Status.Done) {
      newStatus = Status.InProgress;
    }

    onUpdate({ ...task, subtasks: updatedSubtasks, status: newStatus });
  };

  const triggerXP = (amount: number) => {
      storage.addXP(amount);
      setShowXPPopup(true);
      setTimeout(() => setShowXPPopup(false), 2000);
  };

  const handleStatusToggle = () => {
    vibrate();
    const newStatus = task.status === Status.Done ? Status.ToDo : Status.Done;
    if (newStatus === Status.Done) {
        triggerXP(25); // Main Task XP
    }
    onUpdate({ ...task, status: newStatus });
  };
  
  const handlePriorityCycle = () => {
    vibrate();
    const priorities = [Priority.Low, Priority.Medium, Priority.High];
    const currentIndex = priorities.indexOf(task.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    onUpdate({ ...task, priority: priorities[nextIndex] });
  };

  const handleGenerateSubtasks = async () => {
      if (task.subtasks.length > 0 && !window.confirm("This will replace existing subtasks. Continue?")) {
          return;
      }
      setIsGeneratingSubtasks(true);
      try {
          const generated = await gemini.generateSubtasksForTask(task.title, task.description);
          const newSubtasks: Subtask[] = generated.map(st => ({
              id: crypto.randomUUID(),
              text: st.text,
              completed: false,
          }));
          onUpdate({ ...task, subtasks: newSubtasks });
      } catch (error) {
          console.error("Failed to generate subtasks", error);
      } finally {
          setIsGeneratingSubtasks(false);
      }
  };

  const handleAddToCalendar = async () => {
    vibrate();
    if (task.googleCalendarEventId) {
        window.open('https://calendar.google.com', '_blank');
        return;
    }

    if (!task.startDate) {
        alert("Please set a start date for this task first by clicking the edit icon.");
        handleEditToggle();
        return;
    }

    if (!isSignedIn || !gapi || !token) {
        const confirmSignIn = window.confirm("Please sign in with your Google account to add events to your calendar. Sign in now?");
        if (confirmSignIn) {
            await signIn();
        }
        return;
    }

    setIsAddingToCalendar(true);
    try {
        const event = await calendarService.createEvent(gapi, token, task);
        if (event && event.id) {
            onUpdate({ ...task, googleCalendarEventId: event.id });
            triggerXP(10); // Reward for organizing
            alert('Task successfully added to your Google Calendar!');
        } else {
             throw new Error("Failed to get event ID from Google Calendar response.");
        }
    } catch (error) {
        console.error("Error adding to calendar:", error);
        alert('Failed to add task to calendar. Please check console for details.');
    } finally {
        setIsAddingToCalendar(false);
    }
  };

  const fallbackAddToCalendar = () => {
    const title = encodeURIComponent(task.title);
    const details = encodeURIComponent(
      `${task.description}\n\nSubtasks:\n${task.subtasks.map(st => `- ${st.text}`).join('\n')}`
    );
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEditToggle = () => {
    vibrate();
    if (!isEditing) {
        setEditedTask(task);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    vibrate();
    // Handle Recurrence Logic
    if (editedTask.recurrence !== task.recurrence) {
        if (editedTask.recurrence) {
            // Save as a recurring template
            storage.saveRecurringTask(editedTask);
        } else {
            // Remove if set to null (Note: This removes the template, stopping FUTURE recurrence)
            storage.removeRecurringTask(task.id);
        }
    }

    onUpdate(editedTask);
    setIsEditing(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedTask(prev => ({...prev, [name]: value}));
  };
  
  const handleAddSubtask = () => {
    if (newSubtaskText.trim() === '') return;
    const newSubtask: Subtask = {
        id: crypto.randomUUID(),
        text: newSubtaskText.trim(),
        completed: false,
    };
    onUpdate({ ...task, subtasks: [...task.subtasks, newSubtask] });
    setNewSubtaskText('');
    vibrate();
  };

  if (isEditing) {
    return (
        <div className="bg-gray-800/80 p-4 rounded-lg border border-indigo-500 shadow-lg space-y-3 animate-slide-in-up">
            <div>
                <label className="text-sm font-semibold text-gray-300 mb-1 block">Title</label>
                <input type="text" name="title" value={editedTask.title} onChange={handleInputChange} className={inputStyles} />
            </div>
            <div>
                <label className="text-sm font-semibold text-gray-300 mb-1 block">Description</label>
                <textarea name="description" value={editedTask.description} onChange={handleInputChange} className={inputStyles} rows={3}></textarea>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2"><ClockIcon className="w-4 h-4"/> Start Date & Time</label>
                    <input type="datetime-local" name="startDate" value={editedTask.startDate || ''} onChange={handleInputChange} className={inputStyles} />
                </div>
                <div>
                    <label className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2"><RepeatIcon className="w-4 h-4"/> Repeats</label>
                    <select name="recurrence" value={editedTask.recurrence || ''} onChange={handleInputChange} className={inputStyles}>
                        <option value="">Never</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-300 mb-1 block">Priority</label>
                    <select name="priority" value={editedTask.priority} onChange={handleInputChange} className={inputStyles}>
                        <option value={Priority.High}>High</option>
                        <option value={Priority.Medium}>Medium</option>
                        <option value={Priority.Low}>Low</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-300 mb-1 block">Time Estimate</label>
                    <input type="text" name="timeEstimate" value={editedTask.timeEstimate} onChange={handleInputChange} className={inputStyles} />
                </div>
                <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-300 mb-1 block">Status</label>
                    <select name="status" value={editedTask.status} onChange={handleInputChange} className={inputStyles}>
                        <option value={Status.ToDo}>To Do</option>
                        <option value={Status.InProgress}>In Progress</option>
                        <option value={Status.Done}>Done</option>
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button onClick={handleEditToggle} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors">Cancel</button>
                <button onClick={handleSave} className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors">Save Changes</button>
            </div>
        </div>
    );
  }

  return (
    <>
      <AIAssistModal
        isOpen={assistingSubtask !== null}
        onClose={() => setAssistingSubtask(null)}
        taskTitle={task.title}
        subtaskText={assistingSubtask?.text || ''}
      />
      <div className="bg-gray-900/40 backdrop-blur-sm p-4 rounded-xl border border-white/5 hover:border-indigo-500/50 transition-all duration-300 shadow-md relative overflow-hidden group">
        {showXPPopup && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none animate-bounce">
                <span className="text-yellow-400 font-black text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">+XP</span>
            </div>
        )}
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
          <div className="flex items-start gap-3 flex-grow">
            <button
                onClick={handleStatusToggle}
                className={`flex-shrink-0 mt-1 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 active:scale-90 ${
                    task.status === Status.Done
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'border-gray-500 hover:border-indigo-400 bg-transparent'
                }`}
                aria-label={task.status === Status.Done ? "Mark as not done" : "Mark as done"}
            >
                {task.status === Status.Done && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </button>
            <div>
                <div className="flex items-center gap-2">
                    <h3 className={`text-lg font-bold transition-all ${task.status === Status.Done ? 'text-gray-500 line-through decoration-2 decoration-gray-600' : 'text-white'}`}>{task.title}</h3>
                    {task.recurrence && (
                        <span title={`Repeats ${task.recurrence}`} className="text-indigo-400 bg-indigo-900/30 rounded p-0.5">
                            <RepeatIcon className="w-3.5 h-3.5" />
                        </span>
                    )}
                </div>
                <p className={`text-sm mt-1 transition-colors leading-relaxed ${task.status === Status.Done ? 'text-gray-600' : 'text-gray-400'}`}>{task.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0 mt-2 sm:mt-0 pl-9 sm:pl-0">
            <button onClick={handlePriorityCycle} title="Cycle priority" className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full text-white border transition-transform hover:scale-110 active:scale-95 shadow-sm min-w-[44px] min-h-[24px] flex items-center justify-center ${priorityColors[task.priority]}`}>
              {task.priority}
            </button>
            <span className="text-xs text-gray-300 font-mono bg-white/5 px-2 py-1 rounded border border-white/5">{task.timeEstimate}</span>
            <button 
                onClick={isSignedIn ? handleAddToCalendar : fallbackAddToCalendar} 
                title={task.googleCalendarEventId ? "View on Google Calendar" : "Add to Google Calendar"} 
                className={`transition-all active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/5 ${task.googleCalendarEventId ? 'text-green-400 hover:text-green-300 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'text-gray-400 hover:text-white'}`}
                disabled={isAddingToCalendar}
            >
              {isAddingToCalendar ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <CalendarIcon className="w-6 h-6" />}
            </button>
            <button onClick={handleEditToggle} title="Edit Task" className="text-gray-400 hover:text-white transition-colors active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/5">
              <EditIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="mt-4 border-t border-white/5 pt-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Subtasks</h4>
             <button 
                onClick={handleGenerateSubtasks}
                disabled={isGeneratingSubtasks}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:text-gray-500 disabled:cursor-wait transition-colors min-h-[44px] px-2"
                title="Generate subtasks with AI"
            >
                {isGeneratingSubtasks ? <LoaderIcon className="w-3 h-3 animate-spin"/> : <SparklesIcon className="w-3 h-3"/>}
                <span>Auto-Generate</span>
            </button>
          </div>
          <div className="space-y-2 mb-3">
            {task.subtasks.map(subtask => (
              <div key={subtask.id} className="flex items-center justify-between group/sub">
                <label className="flex items-center gap-3 cursor-pointer flex-grow select-none min-h-[44px]">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${subtask.completed ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-800 border-gray-600 group-hover/sub:border-indigo-500'}`}>
                    <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() => handleSubtaskToggle(subtask.id)}
                        className="hidden"
                    />
                    {subtask.completed && <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span className={`text-sm ${subtask.completed ? 'text-gray-500 line-through decoration-gray-600' : 'text-gray-300'} group-hover/sub:text-white transition-colors`}>
                    {subtask.text}
                  </span>
                </label>
                <button 
                  onClick={() => setAssistingSubtask(subtask)}
                  className="text-gray-600 hover:text-indigo-400 transition-colors opacity-0 group-hover/sub:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="AI Assist"
                >
                  <SparklesIcon className="w-4 h-4"/>
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                placeholder="Add subtask..."
                className="w-full text-sm p-3 bg-black/20 border border-white/5 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-white placeholder-gray-600"
            />
            <button 
                onClick={handleAddSubtask}
                className="bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg p-3 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all active:scale-95 min-w-[44px]"
                disabled={!newSubtaskText.trim()}
                aria-label="Add new subtask"
            >
                <PlusIcon className="w-5 h-5"/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

export default TaskItem;
