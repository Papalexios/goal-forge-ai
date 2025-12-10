
import React from 'react';
import { UserStats } from '../types';
import { TrophyIcon, FlameIcon, SparklesIcon } from './icons';

interface GamificationWidgetProps {
    stats: UserStats;
}

const GamificationWidget: React.FC<GamificationWidgetProps> = ({ stats }) => {
    const progressPercent = Math.min((stats.currentXP / stats.nextLevelXP) * 100, 100);

    return (
        <div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-yellow-500/20 transition-colors"></div>

            <div className="flex items-center gap-4 relative z-10">
                <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <TrophyIcon className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-gray-800 border border-gray-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        Lvl {stats.level}
                    </div>
                </div>
                
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-bold text-sm">Builder Rank</h3>
                        <span className="text-xs text-gray-400">({stats.currentXP}/{stats.nextLevelXP} XP)</span>
                    </div>
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 relative z-10 border-l border-white/10 pl-4">
                <div className="text-center">
                    <div className={`flex items-center justify-center gap-1 font-bold text-lg ${stats.streakDays > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                        <FlameIcon className={`w-5 h-5 ${stats.streakDays > 0 ? 'animate-pulse' : ''}`} />
                        <span>{stats.streakDays}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Day Streak</p>
                </div>
            </div>
            
            {progressPercent >= 100 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 backdrop-blur-sm animate-fade-in">
                    <div className="text-center animate-bounce">
                        <SparklesIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                        <span className="text-white font-bold">LEVEL UP!</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GamificationWidget;
