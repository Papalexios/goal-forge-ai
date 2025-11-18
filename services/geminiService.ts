import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Plan, Project, Task, OptimizedSchedule, AIProvider } from '../types';
import { getSettings } from './settingsService';
import { DEFAULT_SETTINGS } from './settingsService';

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
      required: ['id', 'title', 'description', 'priority', 'timeEstimate', 'status', 'subtasks'],
    },
};

const getApiEndpoint = (provider: AIProvider): string => {
    switch (provider) {
        case 'openai':
            return 'https://api.openai.com/v1/chat/completions';
        case 'groq':
            return 'https://api.groq.com/openai/v1/chat/completions';
        case 'anthropic': // Note: Anthropic might have a different API structure
        case 'openrouter':
        default:
            return 'https://openrouter.ai/api/v1/chat/completions';
    }
}

const generatePlanWithOpenAICompat = async (goal: string): Promise<Plan> => {
    const settings = getSettings();
    const provider = settings.activeProvider;
    const config = settings.providers[provider];

    if (!config || !config.apiKey) {
        throw new Error(`API key for ${provider} is not configured.`);
    }

    const endpoint = getApiEndpoint(provider);
    const systemPrompt = `You are an expert project manager and productivity assistant. Your task is to break down a user's goal into a detailed, actionable plan. For complex projects, group tasks into logical phases (e.g., "Phase 1: Research", "Phase 2: Development"). For simpler goals or daily to-do lists, a flat list of tasks is fine. The entire output must be a valid JSON array of tasks. Each task object must have these keys: "id" (string UUID), "title" (string), "description" (string), "priority" (enum 'High', 'Medium', 'Low'), "timeEstimate" (string, e.g., '90 min'), "status" (enum 'To Do', 'In Progress', 'Done', default to 'To Do'), and "subtasks" (an array of objects with "id", "text", "completed" keys). Do not include any other text, comments, or markdown formatting.`;

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
        console.error("API Error Response:", errorBody);
        throw new Error(`Request to ${provider} failed with status ${response.status}. Details: ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
        throw new Error("Received an empty response from the AI provider.");
    }
    
    try {
        return JSON.parse(content) as Plan;
    } catch (e) {
        console.error("Failed to parse AI response as JSON:", content);
        throw new Error("The AI provider returned an invalid format. Please try again.");
    }
}


export const generatePlan = async (goal: string): Promise<Plan> => {
    const settings = getSettings();
    const provider = settings.activeProvider;

    if (provider === 'gemini') {
        const geminiConfig = settings.providers.gemini;
        try {
            if (!geminiConfig || !geminiConfig.apiKey) {
                throw new Error("Gemini API key is not configured. Please add it in the Settings page.");
            }
            if (!geminiConfig.model) {
                throw new Error("Gemini model is not configured. Please set it in the Settings page.");
            }
            const ai = new GoogleGenAI({ apiKey: geminiConfig.apiKey });
            const response = await ai.models.generateContent({
                model: geminiConfig.model,
                contents: `My goal is: "${goal}".`,
                config: {
                    systemInstruction: `You are an expert project manager and productivity assistant. Your task is to break down a user's goal into a detailed, actionable plan. For complex projects, group tasks into logical phases (e.g., "Phase 1: Research", "Phase 2: Development"). For simpler goals or daily to-do lists, a flat list of tasks is fine. For each main task, provide a clear title, a detailed description, a priority level (High, Medium, or Low), an estimated completion time, a status (which should be 'To Do' for all new tasks), and a checklist of specific, actionable subtasks. Ensure all IDs are unique UUIDs. The entire output must be a valid JSON array matching the provided schema.`,
                    responseMimeType: "application/json",
                    responseSchema: planGenerationSchema,
                    thinkingConfig: { thinkingBudget: 32768 },
                },
            });

            const jsonString = response.text.trim();
            const plan = JSON.parse(jsonString);
            return plan as Plan;
        } catch (error) {
            console.error("Error generating plan with Gemini:", error);
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            
            if (message.includes('API key not valid')) {
                throw new Error("Your Gemini API key is not valid. Please correct it in Settings.");
            }
            if (message.includes('permission')) {
                 throw new Error("Gemini API call failed. The API key may lack permissions or billing may not be enabled. Please check your Google Cloud project.");
            }
            if (message.includes('404')) {
                throw new Error(`The Gemini model "${geminiConfig.model}" was not found. Please check the model name in Settings.`);
            }
            throw new Error(`Gemini Error: ${message}. Please check your API key and settings.`);
        }
    } else {
         try {
            return await generatePlanWithOpenAICompat(goal);
        } catch (error) {
            console.error(`Error generating plan with ${provider}:`, error);
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            throw new Error(`Error with ${provider}: ${message}`);
        }
    }
};

// All functions below are currently hard-coded to use Gemini.

export const generateTtsAudio = async (text: string): Promise<string> => {
    const settings = getSettings();
    const geminiConfig = settings.providers.gemini;
     if (!geminiConfig || !geminiConfig.apiKey) {
        throw new Error("A Gemini API key is required for Text-to-Speech. Please configure it in Settings.");
    }
    try {
        const ai = new GoogleGenAI({ apiKey: geminiConfig.apiKey });
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
        if (!base64Audio) {
            throw new Error("No audio data received from TTS API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error with TTS service:", error);
        throw new Error("Failed to generate audio for the plan.");
    }
};

export const getAiSummary = async (projects: Project[]): Promise<string> => {
    const settings = getSettings();
    const geminiConfig = settings.providers.gemini;
    if (!geminiConfig || !geminiConfig.apiKey) {
        throw new Error("A Gemini API key is required for the AI Summary. Please configure it in Settings.");
    }

    const projectSummaries = projects.map(p => {
        const total = p.plan.reduce((acc, task) => acc + task.subtasks.length, 0);
        const completed = p.plan.reduce((acc, task) => acc + task.subtasks.filter(st => st.completed).length, 0);
        return `- Project "${p.goal}": ${completed} out of ${total} subtasks completed.`;
    }).join('\n');

    if (projects.length === 0) {
        return "You don't have any projects yet. Let's create one!";
    }

    try {
        const ai = new GoogleGenAI({ apiKey: geminiConfig.apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Here is a summary of my projects:\n${projectSummaries}\n\nBased on this, give me a short, encouraging, and forward-looking weekly summary. Mention a key achievement if there is one (e.g., a project is nearly complete) and suggest what might be a good focus for the upcoming week. Keep it under 75 words.`,
            config: {
                systemInstruction: 'You are a positive and motivational productivity coach.'
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating summary:", error);
        throw new Error("Failed to generate AI summary.");
    }
};

export const generateSubtaskAssistance = async (taskTitle: string, subtaskText: string): Promise<string> => {
    const settings = getSettings();
    const geminiConfig = settings.providers.gemini;
     if (!geminiConfig || !geminiConfig.apiKey) {
        throw new Error("A Gemini API key is required for AI Assistance. Please configure it in Settings.");
    }
    try {
        const ai = new GoogleGenAI({ apiKey: geminiConfig.apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `I'm working on a larger task: "${taskTitle}". Can you help me with this specific subtask: "${subtaskText}"? Please provide a concrete, actionable output that directly helps me complete it. For example, if it's "draft an email", write the email. If it's "brainstorm ideas", list the ideas.`,
            config: {
                systemInstruction: "You are a helpful assistant designed to accelerate tasks. Your goal is to provide a direct, actionable response to help the user complete their subtask. Be concise and to the point."
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating subtask assistance:", error);
        throw new Error("Failed to get AI assistance for this subtask.");
    }
};

export const generateSubtasksForTask = async (taskTitle: string, taskDescription: string): Promise<{ text: string }[] > => {
    const settings = getSettings();
    const geminiConfig = settings.providers.gemini;
     if (!geminiConfig || !geminiConfig.apiKey) {
        throw new Error("A Gemini API key is required for Subtask Generation. Please configure it in Settings.");
    }
    try {
        const ai = new GoogleGenAI({ apiKey: geminiConfig.apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Given the main task title: "${taskTitle}" and its description: "${taskDescription}", generate a list of 2 to 5 actionable subtasks that need to be completed.`,
            config: {
                systemInstruction: `You are a productivity assistant. Your response must be a valid JSON array of objects, where each object has a single key "text" with the subtask description. For example: [{"text": "First subtask"}, {"text": "Second subtask"}]. Do not add any extra commentary.`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                        },
                        required: ['text'],
                    },
                },
            },
        });
        const jsonString = response.text.trim();
        const subtasks = JSON.parse(jsonString);
        return subtasks;
    } catch (error) {
        console.error("Error generating subtasks:", error);
        throw new Error("Failed to generate AI subtasks.");
    }
};

export const generateDailySchedule = async (tasks: Task[]): Promise<OptimizedSchedule> => {
    const settings = getSettings();
    const geminiConfig = settings.providers.gemini;
     if (!geminiConfig || !geminiConfig.apiKey) {
        throw new Error("A Gemini API key is required for Daily Schedule Optimization. Please configure it in Settings.");
    }
    const taskDescriptions = tasks.map(t => `- (ID: ${t.id}) ${t.title} (Priority: ${t.priority}, Est: ${t.timeEstimate})`).join('\n');
    const prompt = `You are a world-class productivity coach. Here is a list of tasks I need to complete today:\n${taskDescriptions}\n\nYour task is to organize these into an optimal, productive schedule. Follow these rules:\n1. Create time blocks for focused work.\n2. Group similar or related tasks into the same block if it makes sense.\n3. Schedule short breaks (10-15 mins) between long focus blocks.\n4. Prioritize high-priority tasks earlier in the day if possible.\n5. Provide a brief, encouraging summary of the day's plan.\n\nReturn the schedule as a valid JSON object matching the provided schema.`;

    const scheduleSchema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: 'A brief, motivational summary of the daily plan.' },
            schedule: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        time: { type: Type.STRING, description: 'Time range for the block, e.g., "9:00 AM - 11:00 AM".' },
                        title: { type: Type.STRING, description: 'A title for the block, e.g., "Deep Work on Marketing" or "Break".' },
                        taskIds: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'An array of task IDs from the input that should be worked on during this block.'
                        }
                    },
                    required: ['time', 'title', 'taskIds']
                }
            }
        },
        required: ['summary', 'schedule']
    };

    try {
        const ai = new GoogleGenAI({ apiKey: geminiConfig.apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                systemInstruction: `You are a productivity assistant. Your response must be a valid JSON object matching the provided schema.`,
                responseMimeType: "application/json",
                responseSchema: scheduleSchema,
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as OptimizedSchedule;
    } catch (error) {
        console.error("Error generating daily schedule:", error);
        throw new Error("Failed to generate a daily schedule. Please check your tasks and API key, then try again.");
    }
};