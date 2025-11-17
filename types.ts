export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export enum Status {
  ToDo = 'To Do',
  InProgress = 'In Progress',
  Done = 'Done',
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  subtasks: Subtask[];
  timeEstimate: string;
  status: Status;
  startDate?: string | null;
  googleCalendarEventId?: string | null;
}

export type Plan = Task[];

export interface Project {
  id: string;
  goal: string;
  plan: Plan;
  createdAt: string;
}

// New Settings Types
export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'groq';

export interface AiProviderConfig {
  apiKey: string;
  model?: string;
}

export interface Settings {
  activeProvider: AIProvider;
  providers: {
    gemini: AiProviderConfig;
    openai: AiProviderConfig;
    anthropic: AiProviderConfig;
    openrouter: AiProviderConfig;
    groq: AiProviderConfig;
  };
  googleClientId: string;
}
