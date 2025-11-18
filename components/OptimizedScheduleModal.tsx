import React from 'react';
import { OptimizedSchedule, Plan, Task } from '../types';

interface OptimizedScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: OptimizedSchedule | null;
  plan: Plan;
}

const OptimizedScheduleModal: React.FC<OptimizedScheduleModalProps> = ({ isOpen, onClose, schedule, plan }) => {
  if (!isOpen || !schedule) return null;

  const getTaskById = (id: string): Task | undefined => plan.find(t => t.id === id);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-in-up opacity-0"
        onClick={(e) => e.stopPropagation()}
        style={{ animationFillMode: 'forwards' }}
      >
        <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Your Optimized Daily Schedule</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </header>

        <div className="p-6 flex-grow overflow-y-auto">
          <p className="text-indigo-300 bg-indigo-500/10 p-3 rounded-lg mb-6 text-center">{schedule.summary}</p>
          
          <div className="relative pl-8">
             <div className="absolute top-0 bottom-0 left-3 w-0.5 bg-gray-700"></div>
             {schedule.schedule.map((block, index) => (
                <div key={index} className="mb-8 relative">
                    <div className="absolute -left-[38px] top-1 w-6 h-6 bg-gray-700 rounded-full border-4 border-gray-800 flex items-center justify-center">
                        <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                    </div>
                    <p className="font-bold text-indigo-400">{block.time}</p>
                    <h3 className="text-xl font-semibold text-white mt-1">{block.title}</h3>
                    {block.taskIds.length > 0 && (
                        <ul className="mt-2 space-y-1 list-disc list-inside text-gray-300">
                            {block.taskIds.map(taskId => {
                                const task = getTaskById(taskId);
                                return task ? <li key={taskId} className="text-sm">{task.title}</li> : null;
                            })}
                        </ul>
                    )}
                    {block.taskIds.length === 0 && block.title.toLowerCase().includes('break') && (
                        <p className="text-sm text-gray-400 mt-1 italic">Time to recharge!</p>
                    )}
                </div>
             ))}
          </div>
        </div>

        <footer className="p-4 border-t border-gray-700 flex-shrink-0 flex justify-end">
          <button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default OptimizedScheduleModal;