import React, { useState, useEffect, useMemo } from 'react';
import { Project, Task, Status } from '../types';
import * as storage from '../services/storageService';
import { ChevronLeftIcon } from './icons';

interface ImportTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (tasks: Task[]) => void;
  existingTaskIds: string[];
}

const ImportTasksModal: React.FC<ImportTasksModalProps> = ({ isOpen, onClose, onImport, existingTaskIds }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setProjects(storage.getProjects());
    }
  }, [isOpen]);

  const handleToggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleToggleTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleImport = () => {
    const allTasks = projects.flatMap(p => p.plan);
    const selectedTasks = allTasks.filter(t => selectedTaskIds.has(t.id));
    onImport(selectedTasks);
    onClose();
    setSelectedTaskIds(new Set());
  };
  
  const tasksToImport = useMemo(() => {
    return projects.flatMap(p => p.plan)
        .filter(t => t.status === Status.ToDo || t.status === Status.InProgress);
  }, [projects]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-in-up opacity-0"
        onClick={(e) => e.stopPropagation()}
        style={{ animationFillMode: 'forwards' }}
      >
        <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Import Tasks to Today's Plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </header>

        <div className="p-6 flex-grow overflow-y-auto">
          <p className="text-sm text-gray-400 mb-4">Select tasks from your projects to add to your daily schedule. Only tasks that are 'To Do' or 'In Progress' are shown.</p>
          <div className="space-y-2">
            {projects.map(project => {
              const projectTasks = tasksToImport.filter(t => project.plan.some(pt => pt.id === t.id));
              if (projectTasks.length === 0) return null;

              return (
                <div key={project.id} className="bg-gray-900/50 rounded-lg">
                  <button onClick={() => handleToggleProject(project.id)} className="w-full flex justify-between items-center p-3 text-left">
                    <span className="font-semibold text-white">{project.goal}</span>
                    <ChevronLeftIcon className={`w-5 h-5 text-gray-400 transition-transform ${expandedProjects.has(project.id) ? '-rotate-90' : ''}`} />
                  </button>
                  {expandedProjects.has(project.id) && (
                    <div className="px-3 pb-3 border-t border-gray-700">
                      {projectTasks.map(task => {
                        const isAlreadyAdded = existingTaskIds.includes(task.id);
                        return (
                           <div key={task.id} className="py-2">
                             <label className={`flex items-center gap-3 ${isAlreadyAdded ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input
                                    type="checkbox"
                                    checked={selectedTaskIds.has(task.id) || isAlreadyAdded}
                                    onChange={() => handleToggleTask(task.id)}
                                    disabled={isAlreadyAdded}
                                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-indigo-500 focus:ring-indigo-600 focus:ring-2 disabled:opacity-50"
                                />
                                <span className={`text-sm ${isAlreadyAdded ? 'text-gray-500' : 'text-gray-200'}`}>{task.title}</span>
                                {isAlreadyAdded && <span className="text-xs text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded-full">Added</span>}
                            </label>
                           </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <footer className="p-4 border-t border-gray-700 flex-shrink-0 flex justify-end">
          <button onClick={handleImport} disabled={selectedTaskIds.size === 0} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
            Import {selectedTaskIds.size > 0 ? `${selectedTaskIds.size} Task(s)` : ''}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ImportTasksModal;