import React, { useState, useContext } from 'react';
import { Task, Subtask, Priority, Status } from '../types';
import { CalendarIcon, EditIcon, SparklesIcon, PlusIcon, LoaderIcon } from './icons';
import AIAssistModal from './AIAssistModal';
import * as gemini from '../services/geminiService';
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

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [assistingSubtask, setAssistingSubtask] = useState<Subtask | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);

  const { gapi, token, isSignedIn, signIn } = useContext(GoogleAuthContext);

  const handleSubtaskToggle = (subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    let newStatus = task.status;
    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);

    if (allCompleted && task.status !== Status.Done) {
      newStatus = Status.Done;
    } else if (!allCompleted && task.status === Status.Done) {
      newStatus = Status.InProgress;
    }

    onUpdate({ ...task, subtasks: updatedSubtasks, status: newStatus });
  };
  
  const handlePriorityCycle = () => {
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
    if (!isEditing) {
        setEditedTask(task);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
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
  };

  if (isEditing) {
    return (
        <div className="bg-gray-800/80 p-4 rounded-lg border border-indigo-500 shadow-lg space-y-3">
            <div>
                <label className="text-sm font-semibold text-gray-300 mb-1 block">Title</label>
                <input type="text" name="title" value={editedTask.title} onChange={handleInputChange} className={inputStyles} />
            </div>
            <div>
                <label className="text-sm font-semibold text-gray-300 mb-1 block">Description</label>
                <textarea name="description" value={editedTask.description} onChange={handleInputChange} className={inputStyles} rows={3}></textarea>
            </div>
            <div>
                <label className="text-sm font-semibold text-gray-300 mb-1 block">Start Date & Time</label>
                <input type="datetime-local" name="startDate" value={editedTask.startDate || ''} onChange={handleInputChange} className={inputStyles} />
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
      <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 hover:border-indigo-500 transition-all duration-200 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
          <div>
            <h3 className="text-lg font-bold text-white">{task.title}</h3>
            <p className="text-gray-400 text-sm mt-1">{task.description}</p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 mt-2 sm:mt-0">
            <button onClick={handlePriorityCycle} title="Cycle priority" className={`text-xs font-bold px-2 py-1 rounded-full text-white border transition-transform hover:scale-110 ${priorityColors[task.priority]}`}>
              {task.priority}
            </button>
            <span className="text-sm text-gray-300 font-mono bg-gray-700 px-2 py-1 rounded">{task.timeEstimate}</span>
            <button 
                onClick={isSignedIn ? handleAddToCalendar : fallbackAddToCalendar} 
                title={task.googleCalendarEventId ? "View on Google Calendar" : "Add to Google Calendar"} 
                className={`transition-colors ${task.googleCalendarEventId ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-white'}`}
                disabled={isAddingToCalendar}
            >
              {isAddingToCalendar ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <CalendarIcon className="w-5 h-5" />}
            </button>
            <button onClick={handleEditToggle} title="Edit Task" className="text-gray-400 hover:text-white transition-colors">
              <EditIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-700 pt-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-gray-300">Subtasks</h4>
             <button 
                onClick={handleGenerateSubtasks}
                disabled={isGeneratingSubtasks}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:text-gray-500 disabled:cursor-wait"
                title="Generate subtasks with AI"
            >
                {isGeneratingSubtasks ? <LoaderIcon className="w-4 h-4 animate-spin"/> : <SparklesIcon className="w-4 h-4"/>}
                <span>AI Generate</span>
            </button>
          </div>
          <div className="space-y-2">
            {task.subtasks.map(subtask => (
              <div key={subtask.id} className="flex items-center justify-between group">
                <label className="flex items-center gap-3 cursor-pointer flex-grow">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => handleSubtaskToggle(subtask.id)}
                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-indigo-500 focus:ring-indigo-600 focus:ring-2"
                  />
                  <span className={`text-sm ${subtask.completed ? 'text-gray-500 line-through' : 'text-gray-200'} group-hover:text-white transition-colors`}>
                    {subtask.text}
                  </span>
                </label>
                <button 
                  onClick={() => setAssistingSubtask(subtask)}
                  className="text-gray-500 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="AI Assist"
                >
                  <SparklesIcon className="w-4 h-4"/>
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                placeholder="Add a new subtask..."
                className="w-full text-sm p-1.5 bg-gray-900/50 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-white placeholder-gray-500"
            />
            <button 
                onClick={handleAddSubtask}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-md p-1.5 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
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
};

export default TaskItem;