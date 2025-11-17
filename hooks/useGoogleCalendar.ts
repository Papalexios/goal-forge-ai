import { useState, useEffect, useContext, useCallback } from 'react';
import { GoogleAuthContext } from '../contexts/GoogleAuth';
import * as calendarService from '../services/googleCalendarService';

export const useGoogleCalendar = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isSignedIn, gapi, token } = useContext(GoogleAuthContext);

    const fetchEvents = useCallback(async () => {
        if (!isSignedIn || !gapi || !token) {
            setEvents([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const todaysEvents = await calendarService.listTodaysEvents(gapi, token);
            setEvents(todaysEvents);
        } catch (err) {
            console.error("Error fetching calendar events:", err);
            setError("Failed to fetch calendar events. Please try signing in again.");
            setEvents([]);
        } finally {
            setIsLoading(false);
        }
    }, [isSignedIn, gapi, token]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return { events, isLoading, error, refreshEvents: fetchEvents };
};
