import { Project, Plan } from '../types';

const PROJECTS_KEY = 'goalforge_projects';

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
