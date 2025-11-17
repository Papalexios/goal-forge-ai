import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { decode, decodeAudioData, createBlob } from '../utils/audioUtils';
import { Project, Task, Status, Priority } from '../types';
import { getSettings } from '../services/settingsService';

export type ConnectionState = 'idle' | 'connecting' | 'error';

interface UseGeminiLiveProps {
    project: Project | null;
    onTaskAdded: (task: Task) => void;
    onTaskEdited: (taskId: string, updates: Partial<Task>) => void;
    onSubtaskCompleted: (taskId: string, subtaskId: string) => void;
    onError: (error: string) => void;
}

const addTaskFunc: FunctionDeclaration = {
    name: 'add_task_to_plan',
    description: 'Adds a new task to the existing project plan.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            task: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: 'An optional unique UUID for the task. If not provided, one will be generated.' },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                    timeEstimate: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['To Do', 'In Progress', 'Done'], description: 'The status of the task, defaults to "To Do".' },
                    subtasks: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING, description: 'An optional unique UUID for the subtask. If not provided, one will be generated.' },
                                text: { type: Type.STRING },
                                completed: { type: Type.BOOLEAN, description: 'Default to false.' },
                            },
                            required: ['text', 'completed'],
                        },
                    },
                },
                required: ['title', 'description', 'priority', 'timeEstimate', 'subtasks'],
            },
        },
        required: ['task'],
    },
};

const editTaskFunc: FunctionDeclaration = {
    name: 'edit_task_in_plan',
    description: 'Edits an existing task in the project plan. Only provide the fields that need to be changed.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            taskId: { type: Type.STRING, description: 'The ID of the task to edit.' },
            title: { type: Type.STRING, description: 'The new title for the task.' },
            description: { type: Type.STRING, description: 'The new description for the task.' },
            priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: 'The new priority for the task.' },
            timeEstimate: { type: Type.STRING, description: 'The new time estimate for the task.' },
            status: { type: Type.STRING, enum: ['To Do', 'In Progress', 'Done'], description: 'The new status for the task.' },
        },
        required: ['taskId'],
    },
};

const completeSubtaskFunc: FunctionDeclaration = {
    name: 'complete_subtask',
    description: 'Marks a specific subtask as complete based on its text content.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            taskId: { type: Type.STRING, description: 'The ID of the parent task.' },
            subtaskId: { type: Type.STRING, description: 'The ID of the subtask to mark as complete.' },
        },
        required: ['taskId', 'subtaskId'],
    },
};

export const useGeminiLive = ({ project, onTaskAdded, onTaskEdited, onSubtaskCompleted, onError }: UseGeminiLiveProps) => {
    const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
    const [isListening, setIsListening] = useState(false);
    const [userTranscript, setUserTranscript] = useState('');
    const [aiTranscript, setAiTranscript] = useState('');
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextAudioTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    const resetTranscripts = () => {
        setUserTranscript('');
        setAiTranscript('');
    };

    const cleanupAudio = useCallback(() => {
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
        }
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextAudioTimeRef.current = 0;
        if(outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close().catch(console.error);
        }
    }, []);

    const processMessage = async (message: LiveServerMessage) => {
        if (message.serverContent) {
            if (message.serverContent.inputTranscription) {
                setUserTranscript(message.serverContent.inputTranscription.text);
            }
            if (message.serverContent.outputTranscription) {
                setAiTranscript(message.serverContent.outputTranscription.text);
            }
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (audioData && outputAudioContextRef.current) {
                const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContextRef.current.destination);
                const currentTime = outputAudioContextRef.current.currentTime;
                const startTime = Math.max(currentTime, nextAudioTimeRef.current);
                source.start(startTime);
                nextAudioTimeRef.current = startTime + audioBuffer.duration;
                audioSourcesRef.current.add(source);
                source.onended = () => audioSourcesRef.current.delete(source);
            }
            if (message.serverContent.interrupted) {
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                nextAudioTimeRef.current = 0;
            }
            if (message.serverContent.turnComplete) {
                resetTranscripts();
            }
        } else if (message.toolCall) {
            for (const func of message.toolCall.functionCalls) {
                let result = 'Function executed successfully.';
                try {
                    if (func.name === 'add_task_to_plan' && func.args) {
                        const taskData = func.args.task;
                        if (taskData) {
                            const newTask: Task = {
                                id: taskData.id || crypto.randomUUID(),
                                title: taskData.title || 'Untitled Task',
                                description: taskData.description || '',
                                priority: taskData.priority || Priority.Medium,
                                timeEstimate: taskData.timeEstimate || 'N/A',
                                status: taskData.status || Status.ToDo,
                                subtasks: (taskData.subtasks || []).map((st: any) => ({
                                    id: st.id || crypto.randomUUID(),
                                    text: st.text || 'Unnamed subtask',
                                    completed: !!st.completed,
                                })),
                            };
                            onTaskAdded(newTask);
                        }
                    } else if (func.name === 'edit_task_in_plan' && func.args) {
                        const { taskId, ...updates } = func.args;
                        if (taskId) {
                            onTaskEdited(taskId as string, updates as Partial<Task>);
                        }
                    } else if (func.name === 'complete_subtask' && func.args) {
                        onSubtaskCompleted(func.args.taskId as string, func.args.subtaskId as string);
                    } else {
                        result = `Unknown function call: ${func.name}`;
                    }
                } catch(e) {
                    result = `Error executing function ${func.name}: ${e instanceof Error ? e.message : String(e)}`;
                    onError(result);
                }

                sessionPromiseRef.current?.then(session => {
                    session.sendToolResponse({ functionResponses: { id: func.id, name: func.name, response: { result } } });
                });
            }
        }
    };

    const connect = useCallback(async () => {
        if (!project) {
            setConnectionState('idle');
            return;
        }
        setConnectionState('connecting');
        resetTranscripts();
        cleanupAudio();
        try {
            const settings = getSettings();
            const geminiConfig = settings.providers.gemini;
            if (!geminiConfig?.apiKey) {
                onError("Gemini API key is not configured. Please add it in the Settings page.");
                setConnectionState('error');
                cleanupAudio();
                return;
            }
            const ai = new GoogleGenAI({ apiKey: geminiConfig.apiKey });
            
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const systemInstruction = `You are GoalForge AI, an expert project manager. The user's project plan is already created. Your role is to assist them in modifying it. Use 'add_task_to_plan' to add new tasks, 'edit_task_in_plan' to modify existing tasks (e.g., change priority, description, or status), and 'complete_subtask' to mark subtasks as complete. Use the provided task and subtask IDs for editing and completion. Keep your spoken responses concise, helpful, and encouraging. The current project context is: ${JSON.stringify(project)}`;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction,
                    tools: [{ functionDeclarations: [addTaskFunc, editTaskFunc, completeSubtaskFunc] }],
                },
                callbacks: {
                    onopen: () => { /* Connection established */ },
                    onmessage: processMessage,
                    onclose: () => setConnectionState('idle'),
                    onerror: (e) => {
                        console.error('Live session error:', e);
                        onError('Connection error. Please try again.');
                        setConnectionState('error');
                        cleanupAudio();
                    },
                },
            });
            await sessionPromiseRef.current;
            setConnectionState('idle');
        } catch (e) {
            console.error('Failed to connect:', e);
            onError('Failed to connect to AI assistant.');
            setConnectionState('error');
            cleanupAudio();
        }
    }, [cleanupAudio, onError, project]);

    useEffect(() => {
        if (project) {
            connect();
        } else {
            sessionPromiseRef.current?.then(session => session.close());
            cleanupAudio();
        }
        return () => {
            sessionPromiseRef.current?.then(session => session.close());
            cleanupAudio();
        };
    }, [project, connect, cleanupAudio]);

    const startListening = async () => {
        if (!project) return;
        if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'suspended') {
            await outputAudioContextRef.current?.resume();
        }

        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        scriptProcessorRef.current.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        };

        source.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(audioContextRef.current.destination);
        setIsListening(true);
    };

    const stopListening = () => {
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
        }
        setIsListening(false);
    };

    const sendTextMessage = (text: string) => {
        if (text && project) {
            resetTranscripts();
            sessionPromiseRef.current?.then(session => {
                session.sendText(text);
            });
        }
    };

    return { connectionState, isListening, startListening, stopListening, sendTextMessage, userTranscript, aiTranscript };
};
