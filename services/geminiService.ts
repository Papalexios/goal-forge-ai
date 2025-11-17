import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Plan, Project, Task } from '../types';
import { getSettings } from './settingsService';

const getAiClient = () => {
    const settings = getSettings();
    const activeProvider = settings.activeProvider;
    const providerConfig = settings.providers[activeProvider];

    if (activeProvider !== 'gemini') {
        // This is a placeholder for future integrations.
        // For now, we alert the user and fall back to Gemini if a key is present.
        console.warn(`Provider "${activeProvider}" is not yet fully implemented. Falling back to Gemini if available.`);
        if (settings.providers.gemini.apiKey) {
            return new GoogleGenAI({ apiKey: settings.providers.gemini.apiKey });
        }
        throw new Error(`The active AI provider "${activeProvider}" is not implemented, and no Gemini API key is configured as a fallback.`);
    }

    if (!providerConfig || !providerConfig.apiKey) {
        throw new Error("Gemini API key is not configured. Please add it in the Settings page.");
    }
    return new GoogleGenAI({ apiKey: providerConfig.apiKey });
}

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


export const generatePlan = async (goal: string): Promise<Plan> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
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
        console.error("Error generating plan:", error);
        throw new Error("Failed to generate a plan. Please check your goal and API key in Settings, then try again.");
    }
};

export const generateTtsAudio = async (text: string): Promise<string> => {
    try {
        const ai = getAiClient();
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
    const projectSummaries = projects.map(p => {
        const total = p.plan.reduce((acc, task) => acc + task.subtasks.length, 0);
        const completed = p.plan.reduce((acc, task) => acc + task.subtasks.filter(st => st.completed).length, 0);
        return `- Project "${p.goal}": ${completed} out of ${total} subtasks completed.`;
    }).join('\n');

    if (projects.length === 0) {
        return "You don't have any projects yet. Let's create one!";
    }

    try {
        const ai = getAiClient();
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
    try {
        const ai = getAiClient();
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
    try {
        const ai = getAiClient();
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
