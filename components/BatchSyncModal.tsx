
import React, { useState } from 'react';
import { CalendarIcon, ClockIcon } from './icons';

interface BatchSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (startDate: string) => void;
    taskCount: number;
}

const BatchSyncModal: React.FC<BatchSyncModalProps> = ({ isOpen, onClose, onConfirm, taskCount }) => {
    // Default to tomorrow 9 AM
    const getDefaultTime = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        // Adjust to local ISO string for input
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };

    const [startDate, setStartDate] = useState(getDefaultTime());

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
             <div 
                className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-slide-in-up"
                onClick={e => e.stopPropagation()}
             >
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Schedule Unplanned Tasks</h2>
                            <p className="text-xs text-gray-400">Syncing {taskCount} tasks without dates</p>
                        </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-6">
                        These tasks don't have a specific time set yet. Please select a <strong>starting date and time</strong>. We will automatically schedule them sequentially from this point during working hours.
                    </p>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Batch Start Date
                        </label>
                        <div className="relative">
                            <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                                type="datetime-local" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-10 p-3"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => onConfirm(startDate)}
                            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-indigo-600/20"
                        >
                            Sync Now
                        </button>
                    </div>
                </div>
             </div>
        </div>
    );
};

export default BatchSyncModal;
