// Fix: Add type definition for Google's OAuth2 TokenResponse.
// This must be at the top of the file, before any imports.
declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
        [key: string]: any;
      }
    }
  }
}

import { Task } from '../types';

/**
 * Parses a time estimate string (e.g., "90 min", "2 hours") into minutes.
 * @param timeEstimate The string to parse.
 * @returns The duration in minutes.
 */
const parseTimeEstimateToMinutes = (timeEstimate: string): number => {
    const durationRegex = /(\d+(\.\d+)?)\s*(min|hour|hours)/i;
    const match = timeEstimate.match(durationRegex);
    if (!match) return 60; // Default to 1 hour if parsing fails

    const value = parseFloat(match[1]);
    const unit = match[3].toLowerCase();

    if (unit.startsWith('hour')) {
        return value * 60;
    }
    return value; // minutes
};

/**
 * Lists events from the user's primary Google Calendar for today.
 * @param gapi The initialized Google API client.
 * @param token The user's authentication token.
 * @returns A promise that resolves with the list of events.
 */
export const listTodaysEvents = async (gapi: any, token: google.accounts.oauth2.TokenResponse) => {
    if (!gapi.client?.calendar) {
        throw new Error("GAPI calendar client not initialized.");
    }
    gapi.client.setToken(token);

    const today = new Date();
    const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const response = await gapi.client.calendar.events.list({
        'calendarId': 'primary',
        'timeMin': timeMin,
        'timeMax': timeMax,
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': 10,
        'orderBy': 'startTime'
    });
    
    return response.result.items;
};

/**
 * Creates a new event in the user's primary Google Calendar based on a task.
 * @param gapi The initialized Google API client.
 * @param token The user's authentication token.
 * @param task The task to create an event for.
 * @returns A promise that resolves with the created event object.
 */
export const createEvent = async (gapi: any, token: google.accounts.oauth2.TokenResponse, task: Task) => {
    if (!gapi.client?.calendar) {
        throw new Error("GAPI calendar client not initialized.");
    }
     if (!task.startDate) {
        throw new Error("Task must have a start date to be added to the calendar.");
    }

    gapi.client.setToken(token);

    const durationMinutes = parseTimeEstimateToMinutes(task.timeEstimate);
    const startDate = new Date(task.startDate);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    const event = {
        'summary': task.title,
        'description': `${task.description}\n\nSubtasks:\n${task.subtasks.map(st => `- ${st.text}`).join('\n')}`,
        'start': {
            'dateTime': startDate.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        'end': {
            'dateTime': endDate.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
    };

    const response = await gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': event,
    });

    return response.result;
};