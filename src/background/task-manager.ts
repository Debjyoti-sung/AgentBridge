import { Task, TaskStep, OptimizationMetrics } from '../shared/protocol';
import { TaskEngine } from '../tasks/task-engine';

export class TaskManager {
  public static getTask(): Task | null {
    return TaskEngine.getTask();
  }

  public static onTaskUpdate(listener: (task: Task) => void): void {
    TaskEngine.onTaskUpdate((task) => {
      listener(task);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ agentbridge_current_task: task });
      }
    });
  }

  public static createTask(goal: string, steps: Partial<TaskStep>[] = []): Task {
    const plannedSteps: TaskStep[] = steps.map((s, index) => ({
      id: s.id || `step_${index + 1}`,
      name: s.name || `Step ${index + 1}`,
      description: s.description || '',
      status: (s.status as any) || 'pending',
      action_type: s.action_type,
      target: s.target,
      is_optimized: Boolean(s.is_optimized),
      optimization_note: s.optimization_note
    }));

    return TaskEngine.createTask(goal, plannedSteps);
  }

  public static updateStep(stepId: string, updates: Partial<TaskStep>): void {
    TaskEngine.updateStep(stepId, updates);
  }

  public static setCurrentAction(actionName: string): void {
    TaskEngine.setCurrentAction(actionName);
  }

  public static setOptimization(metrics: Partial<OptimizationMetrics>): void {
    TaskEngine.setOptimization(metrics);
  }

  public static completeTask(result?: any): void {
    TaskEngine.completeTask(result);
  }

  public static failTask(error: string): void {
    TaskEngine.failTask(error);
  }

  public static pauseTask(): void {
    TaskEngine.pauseTask();
  }

  public static resumeTask(): void {
    TaskEngine.resumeTask();
  }

  public static stopTask(): void {
    TaskEngine.stopTask();
  }
}
