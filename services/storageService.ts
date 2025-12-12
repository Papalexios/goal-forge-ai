
import { Project, Plan, Task, Status, UserStats } from '../types';

const PROJECTS_KEY = 'goalforge_projects';
const DAILY_PLAN_PREFIX = 'goalforge_daily_plan_';
const RECURRING_TASKS_KEY = 'goalforge_recurring_tasks';
const USER_STATS_KEY = 'goalforge_user_stats_v1';

// --- Event Driven Architecture Support ---
export const STATS_UPDATED_EVENT = 'goalforge_stats_updated';

const dispatchStatsUpdate = (stats: UserStats) => {
    if (typeof window !== 'undefined') {
        const event = new CustomEvent(STATS_UPDATED_EVENT, { detail: stats });
        window.dispatchEvent(event);
    }
};

// Helper to get the storage key for a specific date
const getDailyPlanKey = (date: Date): string => {
    const isoDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return `${DAILY_PLAN_PREFIX}${isoDate}`;
};

// Helper: Format date to YYYY-MM-DD
const formatDate = (date: Date): string => date.toISOString().split('T')[0];

export const getProjects = (): Project[] => {
  try {
    const projectsJson = localStorage.getItem(PROJECTS_KEY);
    return projectsJson ? JSON.parse(projectsJson) : [];
  } catch (error) {
    console.error("Failed to parse projects from localStorage", error);
    return [];
  }
};

export const getProject = (id: string): Project | null => {
  const projects = getProjects();
  return projects.find(p => p.id === id) || null;
};

export const saveProject = (project: Project): void => {
  const projects = getProjects();
  const existingIndex = projects.findIndex(p => p.id === project.id);
  if (existingIndex > -1) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

export const deleteProject = (id: string): void => {
  let projects = getProjects();
  projects = projects.filter(p => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

export const updatePlanInProject = (projectId: string, updatedPlan: Plan): void => {
    const project = getProject(projectId);
    if (project) {
        project.plan = updatedPlan;
        saveProject(project);
    }
};

// --- Recurring Tasks Management ---

export const getRecurringTasks = (): Task[] => {
    try {
        const tasksJson = localStorage.getItem(RECURRING_TASKS_KEY);
        return tasksJson ? JSON.parse(tasksJson) : [];
    } catch (e) {
        console.error("Failed to load recurring tasks", e);
        return [];
    }
};

export const saveRecurringTask = (task: Task): void => {
    const tasks = getRecurringTasks();
    const existingIndex = tasks.findIndex(t => t.id === task.id || (t.title === task.title && t.recurrence === task.recurrence));
    
    if (existingIndex > -1) {
        tasks[existingIndex] = task;
    } else {
        tasks.push(task);
    }
    localStorage.setItem(RECURRING_TASKS_KEY, JSON.stringify(tasks));
};

export const removeRecurringTask = (taskId: string): void => {
    let tasks = getRecurringTasks();
    tasks = tasks.filter(t => t.id !== taskId);
    localStorage.setItem(RECURRING_TASKS_KEY, JSON.stringify(tasks));
};

// --- Daily Planner Logic with Rollover & Recurrence ---

export const initializeDailyPlan = (date: Date): Plan => {
    const todayStr = formatDate(date);
    
    // 1. Check for Rollover (Incomplete tasks from previous active days)
    let rolloverTasks: Task[] = [];
    for (let i = 1; i <= 7; i++) {
        const prevDate = new Date(date);
        prevDate.setDate(date.getDate() - i);
        const prevKey = getDailyPlanKey(prevDate);
        const prevPlanJson = localStorage.getItem(prevKey);
        
        if (prevPlanJson) {
            const prevPlan: Plan = JSON.parse(prevPlanJson);
            rolloverTasks = prevPlan.filter(t => t.status !== Status.Done).map(t => ({
                ...t,
            }));
            break; 
        }
    }

    // 2. Check for Recurring Tasks
    const recurringTasks = getRecurringTasks();
    const todaysRecurringTasks: Task[] = [];
    
    recurringTasks.forEach(template => {
        let matches = false;
        const startDate = template.startDate ? new Date(template.startDate) : new Date();
        
        switch (template.recurrence) {
            case 'daily': matches = true; break;
            case 'weekly': matches = date.getDay() === startDate.getDay(); break;
            case 'monthly': matches = date.getDate() === startDate.getDate(); break;
            case 'yearly': matches = date.getMonth() === startDate.getMonth() && date.getDate() === startDate.getDate(); break;
        }

        if (matches) {
            todaysRecurringTasks.push({
                ...template,
                id: `recurring_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                status: Status.ToDo,
                startDate: new Date().toISOString()
            });
        }
    });

    const combinedPlan = [...rolloverTasks, ...todaysRecurringTasks];
    saveDailyPlan(date, combinedPlan);
    return combinedPlan;
};

export const getDailyPlan = (date: Date): Plan => {
    const key = getDailyPlanKey(date);
    try {
        const planJson = localStorage.getItem(key);
        if (planJson) {
            return JSON.parse(planJson);
        } else {
            return initializeDailyPlan(date);
        }
    } catch (error) {
        console.error(`Failed to parse daily plan for ${key}`, error);
        return [];
    }
};

export const saveDailyPlan = (date: Date, plan: Plan): void => {
    const key = getDailyPlanKey(date);
    try {
        localStorage.setItem(key, JSON.stringify(plan));
    } catch (error) {
        console.error(`Failed to save daily plan for ${key}`, error);
    }
};

// --- Gamification Storage ---

const INITIAL_STATS: UserStats = {
    level: 1,
    currentXP: 0,
    nextLevelXP: 100,
    streakDays: 0,
    lastActiveDate: new Date().toISOString(),
    totalTasksCompleted: 0
};

export const getUserStats = (): UserStats => {
    try {
        const stats = localStorage.getItem(USER_STATS_KEY);
        if (!stats) return INITIAL_STATS;
        return JSON.parse(stats);
    } catch (e) {
        return INITIAL_STATS;
    }
};

export const addXP = (amount: number): { stats: UserStats, leveledUp: boolean } => {
    const stats = getUserStats();
    let newXP = stats.currentXP + amount;
    let newLevel = stats.level;
    let nextLevelXP = stats.nextLevelXP;
    let leveledUp = false;

    // Check Streak
    const today = new Date().toDateString();
    const lastActive = new Date(stats.lastActiveDate).toDateString();
    
    if (today !== lastActive) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastActive === yesterday.toDateString()) {
            stats.streakDays += 1;
        } else {
            stats.streakDays = 1; // Reset if missed a day
        }
        stats.lastActiveDate = new Date().toISOString();
    }

    // Level Up Logic (Simple exponential curve)
    while (newXP >= nextLevelXP) {
        newXP -= nextLevelXP;
        newLevel += 1;
        nextLevelXP = Math.floor(nextLevelXP * 1.2); // 20% harder each level
        leveledUp = true;
    }

    const newStats: UserStats = {
        ...stats,
        level: newLevel,
        currentXP: newXP,
        nextLevelXP,
        totalTasksCompleted: stats.totalTasksCompleted + 1
    };

    localStorage.setItem(USER_STATS_KEY, JSON.stringify(newStats));
    dispatchStatsUpdate(newStats); // Dispatch event!
    return { stats: newStats, leveledUp };
};
