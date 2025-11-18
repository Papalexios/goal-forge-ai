import { Project, Plan } from '../types';

const PROJECTS_KEY = 'goalforge_projects';
const DAILY_PLAN_PREFIX = 'goalforge_daily_plan_';

// Helper to get the storage key for a specific date
const getDailyPlanKey = (date: Date): string => {
    const isoDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return `${DAILY_PLAN_PREFIX}${isoDate}`;
};

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

// New functions for Daily Planner
export const getDailyPlan = (date: Date): Plan => {
    const key = getDailyPlanKey(date);
    try {
        const planJson = localStorage.getItem(key);
        return planJson ? JSON.parse(planJson) : [];
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