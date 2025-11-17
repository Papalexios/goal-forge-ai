import React, { useContext } from 'react';
import { GoogleAuthContext } from '../contexts/GoogleAuth';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { CalendarIcon, LoaderIcon } from './icons';

const GoogleCalendarSync: React.FC = () => {
    const { isSignedIn, signIn, signOut, profile, isGsiClientReady, isConfigured } = useContext(GoogleAuthContext);
    const { events, isLoading, error } = useGoogleCalendar();

    const formatEventTime = (dateTimeString: string) => {
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    if (!isConfigured) {
        return (
            <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-5 shadow-lg flex flex-col items-center text-center">
                <div className="flex items-center gap-3 mb-3">
                     <CalendarIcon className="w-6 h-6 text-yellow-400" />
                    <h2 className="text-xl font-bold text-white">Enable Calendar Sync</h2>
                </div>
                <p className="text-yellow-300 mb-4 text-sm">
                    To connect your Google Calendar, please go to the Settings page and enter your Google Client ID.
                </p>
                 <p className="text-yellow-200 text-xs">
                    You can access Settings by clicking the gear icon in the page header.
                </p>
            </div>
        );
    }

    const renderAuthButton = () => {
        if (!isGsiClientReady) {
            return (
                <button
                    disabled
                    className="bg-blue-800 text-white font-bold py-2 px-4 rounded-lg text-sm shadow-lg w-full sm:w-auto flex items-center justify-center gap-2"
                >
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    Initializing...
                </button>
            );
        }

        return (
            <button onClick={signIn} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg text-sm shadow-lg transition-all duration-300 w-full sm:w-auto">
                Sign in with Google
            </button>
        );
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <CalendarIcon className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">Google Calendar Sync</h2>
                </div>
                {!isSignedIn ? renderAuthButton() : (
                     <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-300 hidden md:inline">{profile?.email}</span>
                        <button onClick={signOut} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg text-sm shadow-lg transition-all duration-300">
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
            <div className="mt-4 flex-grow min-h-[60px]">
                {!isSignedIn ? (
                    <p className="text-gray-400">Sign in to view today's events from your calendar and sync tasks.</p>
                ) : isLoading ? (
                    <div className="flex items-center gap-2 text-gray-400">
                        <LoaderIcon className="w-5 h-5 animate-spin"/>
                        <span>Loading today's events...</span>
                    </div>
                ) : error ? (
                    <p className="text-red-400">{error}</p>
                ) : events.length > 0 ? (
                    <ul className="space-y-2">
                        {events.map((event) => (
                            <li key={event.id} className="text-sm text-gray-300 flex items-center gap-3">
                                <span className="font-semibold bg-gray-700 text-indigo-300 px-2 py-0.5 rounded">
                                    {event.start.dateTime ? formatEventTime(event.start.dateTime) : 'All Day'}
                                </span>
                                <span>{event.summary}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-400">No events scheduled for today in your primary calendar.</p>
                )}
            </div>
        </div>
    );
};

export default GoogleCalendarSync;
