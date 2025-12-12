
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Plan, Project, Task, OptimizedSchedule, AIProvider } from '../types';
import { getSettings } from './settingsService';

const planGenerationSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'A unique identifier for the task, e.g., UUID.' },
        title: { type: Type.STRING, description: 'A short, clear title for the task.' },
        description: { type: Type.STRING, description: 'A detailed description of what the task involves. For simple to-do items, this can be brief.' },
        priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: 'The priority level of the task.' },
        timeEstimate: { type: Type.STRING, description: 'An estimated time to complete the task, e.g., "90 min", "4 hours". For small to-do items, can be "5 min".' },
        startDate: { type: Type.STRING, description: 'ISO 8601 date string (YYYY-MM-DDTHH:mm:ss) indicating when this task should start. You MUST schedule these tasks realistically starting from the Current Date, spreading them out over days or weeks as appropriate for the project scope. Do not schedule everything on the first day.' },
        status: { type: Type.STRING, enum: ['To Do', 'In Progress', 'Done'], description: 'The current status of the task. Should default to "To Do" for all new tasks.' },
        subtasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'A unique identifier for the subtask.' },
              text: { type: Type.STRING, description: 'The specific action item for the subtask.' },
              completed: { type: Type.BOOLEAN, description: 'Whether the subtask is completed. Default to false.' },
            },
            required: ['id', 'text', 'completed'],
          },
        },
      },
      required: ['id', 'title', 'description', 'priority', 'timeEstimate', 'status', 'subtasks', 'startDate'],
    },
};

const getApiEndpoint = (provider: AIProvider): string => {
    switch (provider) {
        case 'openai': return 'https://api.openai.com/v1/chat/completions';
        case 'groq': return 'https://api.groq.com/openai/v1/chat/completions';
        case 'anthropic': 
        case 'openrouter':
        default: return 'https://openrouter.ai/api/v1/chat/completions';
    }
}

// --- UTILITY: Retry with Exponential Backoff and Error Mapping ---
async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        // Map error to user-friendly message immediately if terminal
        const msg = error.message || '';
        if (msg.includes('401') || msg.includes('INVALID_ARGUMENT')) {
             throw new Error("Authentication Failed: The API key provided is invalid or expired. Please check your Settings.");
        }
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
            // Only retry 429 if we have retries left
            if (retries > 0) {
                 console.warn(`Rate limited, retrying in ${delay}ms...`, error);
                 await new Promise(resolve => setTimeout(resolve, delay));
                 return retryOperation(operation, retries - 1, delay * 2);
            }
            throw new Error("High Traffic: The AI model is currently overloaded. Please try again in a minute.");
        }
        
        if (retries <= 0) throw error;
        
        // General network retry
        if (error.status >= 500 || msg.includes('FetchError') || msg.includes('Failed to fetch')) {
             console.warn(`Network error, retrying in ${delay}ms...`, error);
             await new Promise(resolve => setTimeout(resolve, delay));
             return retryOperation(operation, retries - 1, delay * 2);
        }

        throw error;
    }
}

const generatePlanWithOpenAICompat = async (goal: string): Promise<Plan> => {
    return retryOperation(async () => {
        const settings = getSettings();
        const provider = settings.activeProvider;
        const config = settings.providers[provider];

        if (!config || !config.apiKey) {
            throw new Error(`API key for ${provider} is not configured.`);
        }

        const endpoint = getApiEndpoint(provider);
        const systemPrompt = `You are an expert project manager. Break down the goal into a detailed plan. Output JSON only. Keys: id (uuid), title, description, priority (High/Medium/Low), timeEstimate, status (To Do), subtasks (array of {id, text, completed}).`;

        const body = {
            model: config.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `My goal is: "${goal}"` }
            ],
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Request to ${provider} failed (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) throw new Error("Empty response.");
        
        try {
            return JSON.parse(content) as Plan;
        } catch (e) {
            throw new Error("Invalid JSON format from provider.");
        }
    });
}


export const generatePlan = async (goal: string): Promise<Plan> => {
    const settings = getSettings();
    const provider = settings.activeProvider;

    if (provider === 'gemini') {
        const apiKey = process.env.API_KEY;
        
        return retryOperation(async () => {
            if (!apiKey) throw new Error("Gemini API Key is missing. Please ensure the application is configured correctly.");
            
            const ai = new GoogleGenAI({ apiKey: apiKey });
            const now = new Date().toISOString();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: `Current Date/Time: ${now}. My goal is: "${goal}".`,
                config: {
                    systemInstruction: `You are an elite Project Manager. 
                    1. Break down the goal into a comprehensive project plan.
                    2. Use productivity principles like "Deep Work".
                    3. CRITICAL: Assign a specific, realistic ISO 8601 "startDate" to EACH task. Start from Current Date.
                    4. Ensure "timeEstimate" is specific.
                    5. Group tasks logically.
                    6. Ensure output is valid JSON matching the schema.`,
                    responseMimeType: "application/json",
                    responseSchema: planGenerationSchema,
                    thinkingConfig: { thinkingBudget: 2048 },
                },
            });

            const jsonString = response.text.trim();
            return JSON.parse(jsonString) as Plan;
        });
    } else {
         return generatePlanWithOpenAICompat(goal);
    }
};

export const generateTtsAudio = async (text: string): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing.");
    
    return retryOperation(async () => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data.");
        return base64Audio;
    });
};

export const getAiSummary = async (projects: Project[]): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing.");

    const projectSummaries = projects.map(p => {
        const total = p.plan.length;
        const completed = p.plan.filter(t => t.status === 'Done').length;
        return `- Project "${p.goal}": ${completed}/${total} tasks done.`;
    }).join('\n');

    if (projects.length === 0) return "No projects yet. Create one to get started!";

    return retryOperation(async () => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize progress and give 1 motivational tip:\n${projectSummaries}`,
            config: { systemInstruction: 'You are a high-energy productivity coach. Keep it brief (under 50 words).' }
        });
        return response.text;
    });
};

export const generateSubtaskAssistance = async (taskTitle: string, subtaskText: string): Promise<string> => {
    const apiKey = process.env.API_KEY;
     if (!apiKey) throw new Error("API Key missing.");
    return retryOperation(async () => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Task: "${taskTitle}". Subtask: "${subtaskText}". Provide the actual content or steps to complete this subtask immediately.`,
            config: { systemInstruction: "Be extremely concise and actionable." }
        });
        return response.text;
    });
};

export const generateSubtasksForTask = async (taskTitle: string, taskDescription: string): Promise<{ text: string }[] > => {
    const apiKey = process.env.API_KEY;
     if (!apiKey) throw new Error("API Key missing.");
    return retryOperation(async () => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate 3-5 checklists items for task: "${taskTitle}" (${taskDescription})`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.OBJECT, properties: { text: { type: Type.STRING } }, required: ['text'] },
                },
            },
        });
        return JSON.parse(response.text.trim());
    });
};

export const generateDailySchedule = async (tasks: Task[]): Promise<OptimizedSchedule> => {
    const apiKey = process.env.API_KEY;
     if (!apiKey) throw new Error("API Key missing.");
    
    const taskData = tasks.map(t => `ID: ${t.id}, Task: ${t.title}, Est: ${t.timeEstimate}, Priority: ${t.priority}`).join('\n');
    
    return retryOperation(async () => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `Optimize this schedule for productivity. Group deep work. Add breaks.\nTasks:\n${taskData}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        schedule: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    time: { type: Type.STRING },
                                    title: { type: Type.STRING },
                                    taskIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ['time', 'title', 'taskIds']
                            }
                        }
                    },
                    required: ['summary', 'schedule']
                },
            },
        });

        return JSON.parse(response.text.trim()) as OptimizedSchedule;
    });
};
