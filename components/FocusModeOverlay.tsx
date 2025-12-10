
import React, { useState, useEffect, useRef } from 'react';
import { FocusIcon, StopIcon, PlayIcon } from './icons';

interface FocusModeOverlayProps {
    onExit: () => void;
}

const FocusModeOverlay: React.FC<FocusModeOverlayProps> = ({ onExit }) => {
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
    const [isActive, setIsActive] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const intervalRef = useRef<number | null>(null);

    const toggleTimer = () => setIsActive(!isActive);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            intervalRef.current = window.setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsActive(false);
            // Play sound?
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Compact Mode (Dynamic Island Style)
    if (!isExpanded) {
        return (
            <div 
                className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-in-down cursor-pointer group"
                onClick={() => setIsExpanded(true)}
            >
                <div className="bg-black border border-gray-800 rounded-full py-2 px-4 shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform duration-300 w-auto min-w-[140px] justify-center">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span className="text-white font-mono font-bold">{formatTime(timeLeft)}</span>
                    <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">Focus</span>
                </div>
            </div>
        );
    }

    // Expanded Mode
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 w-full max-w-md text-center shadow-[0_0_50px_rgba(99,102,241,0.3)] relative overflow-hidden">
                <button 
                    onClick={() => setIsExpanded(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                    Minimize
                </button>

                <div className="mb-8">
                    <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <FocusIcon className={`w-12 h-12 text-indigo-400 ${isActive ? 'animate-pulse' : ''}`} />
                        {isActive && (
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-20"></div>
                        )}
                    </div>
                    <h2 className="text-6xl font-bold text-white font-mono tracking-tighter mb-2">
                        {formatTime(timeLeft)}
                    </h2>
                    <p className="text-gray-400 uppercase tracking-widest text-sm font-bold">Deep Work Session</p>
                </div>

                <div className="flex justify-center gap-4">
                    <button 
                        onClick={toggleTimer}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                    >
                        {isActive ? <StopIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                    </button>
                    
                    <button 
                        onClick={() => {
                            setIsActive(false);
                            setIsExpanded(false);
                            onExit();
                        }}
                        className="w-16 h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-all"
                    >
                        <span className="text-xs font-bold">EXIT</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FocusModeOverlay;
