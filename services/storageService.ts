
import { Project, Plan, Task, Status } from '../types';

const PROJECTS_KEY = 'goalforge_projects';
const DAILY_PLAN_PREFIX = 'goalforge_daily_plan_';
const RECURRING_TASKS_KEY = 'goalforge_recurring_tasks';

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
    // Use title as a unique key for templates to avoid dupes if ID changes during generation
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
    // Scan for the most recent previous plan (up to 7 days back for efficiency)
    for (let i = 1; i <= 7; i++) {
        const prevDate = new Date(date);
        prevDate.setDate(date.getDate() - i);
        const prevKey = getDailyPlanKey(prevDate);
        const prevPlanJson = localStorage.getItem(prevKey);
        
        if (prevPlanJson) {
            const prevPlan: Plan = JSON.parse(prevPlanJson);
            // Found the last active day. Grab incomplete tasks.
            rolloverTasks = prevPlan.filter(t => t.status !== Status.Done).map(t => ({
                ...t,
                // Optional: Tag them visually or conceptually? 
                // keeping them as is for seamless rollover.
            }));
            break; // Stop after finding the most recent day
        }
    }

    // 2. Check for Recurring Tasks
    const recurringTasks = getRecurringTasks();
    const todaysRecurringTasks: Task[] = [];
    
    recurringTasks.forEach(template => {
        let matches = false;
        const startDate = template.startDate ? new Date(template.startDate) : new Date();
        
        switch (template.recurrence) {
            case 'daily':
                matches = true;
                break;
            case 'weekly':
                matches = date.getDay() === startDate.getDay();
                break;
            case 'monthly':
                matches = date.getDate() === startDate.getDate();
                break;
            case 'yearly':
                matches = date.getMonth() === startDate.getMonth() && date.getDate() === startDate.getDate();
                break;
        }

        if (matches) {
            // Create a FRESH instance for today based on the template
            // Check if this task is already in rollover to avoid duplicates?
            // If I have a daily task "Gym", and I missed yesterday's "Gym" (rollover),
            // I now have 2 "Gym" tasks. This is technically correct (debt + today's).
            todaysRecurringTasks.push({
                ...template,
                id: `recurring_${Date.now()}_${Math.floor(Math.random()*1000)}`, // New ID
                status: Status.ToDo, // Always fresh
                startDate: new Date().toISOString()
            });
        }
    });

    // 3. Combine
    const combinedPlan = [...rolloverTasks, ...todaysRecurringTasks];
    
    // Save initialized plan
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
            // No plan for today? Initialize it with Rollover and Recurrence logic!
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
