import React, { useState, useMemo, useCallback } from 'react';
import { Plan, Task, Status } from '../types';
import TaskItem from './TaskItem';
import { FileTextIcon } from './icons';

interface TaskBoardProps {
  plan: Plan;
  onPlanUpdate: (updatedPlan: Plan) => void;
}

const columnStyles: { [key in Status]: { bg: string; text: string } } = {
  [Status.ToDo]: { bg: 'bg-gray-500/10', text: 'text-gray-300' },
  [Status.InProgress]: { bg: 'bg-blue-500/10', text: 'text-blue-300' },
  [Status.Done]: { bg: 'bg-green-500/10', text: 'text-green-300' },
};

const TaskBoard: React.FC<TaskBoardProps> = ({ plan, onPlanUpdate }) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const updatedPlan = plan.map(task => 
        task.id === draggedTaskId ? { ...task, status } : task
    );
    onPlanUpdate(updatedPlan);
    setDraggedTaskId(null);
  };

  const updateTask = useCallback((updatedTask: Task) => {
    const updatedPlan = plan.map(task => task.id === updatedTask.id ? updatedTask : task);
    onPlanUpdate(updatedPlan);
  }, [plan, onPlanUpdate]);
  
  const exportToMarkdown = () => {
    let markdown = `# Project Plan\n\n`;
    const columns = [Status.ToDo, Status.InProgress, Status.Done];

    columns.forEach(status => {
        markdown += `## ${status}\n\n`;
        const tasksInStatus = plan.filter(task => task.status === status);
        if (tasksInStatus.length === 0) {
            markdown += `_No tasks in this stage._\n\n`;
        } else {
            tasksInStatus.forEach(task => {
                markdown += `### ${task.title} (${task.priority} Priority, ~${task.timeEstimate})\n`;
                markdown += `> ${task.description}\n\n`;
                if (task.subtasks.length > 0) {
                    task.subtasks.forEach(subtask => {
                        markdown += `- [${subtask.completed ? 'x' : ' '}] ${subtask.text}\n`;
                    });
                }
                markdown += `\n`;
            });
        }
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-plan.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const { totalSubtasks, completedSubtasks, progress } = useMemo(() => {
    let total = 0;
    let completed = 0;
    plan.forEach(task => {
      total += task.subtasks.length;
      completed += task.subtasks.filter(st => st.completed).length;
    });
    const progressValue = total > 0 ? (completed / total) * 100 : 0;
    return { totalSubtasks: total, completedSubtasks: completed, progress: progressValue };
  }, [plan]);

  const columns = useMemo(() => [
    { status: Status.ToDo, title: 'To Do' },
    { status: Status.InProgress, title: 'In Progress' },
    { status: Status.Done, title: 'Done' },
  ], []);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <div className="w-full sm:w-auto flex-grow">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-white">Project Progress</h2>
            <span className="text-sm font-semibold text-indigo-300">
              {completedSubtasks} / {totalSubtasks} Subtasks Completed
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
         <button
            onClick={exportToMarkdown}
            className="flex-shrink-0 flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            title="Export plan to Markdown"
        >
            <FileTextIcon className="w-5 h-5"/>
            <span className="hidden sm:inline">Export</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(column => {
          const tasksInColumn = plan.filter(task => task.status === column.status);
          return (
            <div 
              key={column.status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
              className={`rounded-lg p-4 transition-colors duration-200 min-h-[200px] ${columnStyles[column.status].bg}`}
            >
              <h3 className={`font-bold mb-4 flex items-center gap-2 ${columnStyles[column.status].text}`}>
                {column.title}
                <span className="text-xs bg-gray-700 text-gray-300 rounded-full px-2 py-0.5">{tasksInColumn.length}</span>
              </h3>
              <div className="space-y-4">
                {tasksInColumn.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <TaskItem task={task} onUpdate={updateTask} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskBoard;
