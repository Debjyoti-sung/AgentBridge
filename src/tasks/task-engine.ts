import {
  Task,
  TaskStep,
  TaskStatus,
  OptimizationMetrics
} from '../shared/protocol';

export type TaskUpdateListener = (task: Task) => void;

export class TaskEngine {
  private static currentTask: Task | null = null;
  private static listeners: TaskUpdateListener[] = [];

  public static onTaskUpdate(callback: TaskUpdateListener): void {
    this.listeners.push(callback);
  }

  private static notify(): void {
    if (this.currentTask) {
      for (const cb of this.listeners) {
        try {
          cb(this.currentTask);
        } catch (e) {
          console.error('[AgentBridge TaskEngine] Listener error:', e);
        }
      }
    }
  }

  public static getTask(): Task | null {
    return this.currentTask;
  }

  public static createTask(goal: string, steps: TaskStep[] = []): Task {
    const taskId = `task_${Date.now()}`;
    this.currentTask = {
      task_id: taskId,
      goal,
      status: 'running',
      current_website: window.location.hostname || 'Active Tab',
      current_action: 'Initializing task...',
      progress: {
        completed: 0,
        known_total: steps.length > 0 ? steps.length : null
      },
      planned_steps: steps,
      executed_steps: [],
      dynamic_steps: [],
      failed_steps: [],
      optimized_steps: [],
      optimization: {
        browser_actions_avoided: 0,
        raw_actions_would_take: 0,
        actual_actions_taken: 1,
        model_calls_saved: 0,
        latency_saved_ms: 0,
        strategy: 'Semantic Execution'
      },
      created_at: Date.now(),
      updated_at: Date.now()
    };
    this.notify();
    return this.currentTask;
  }

  public static updateStep(stepId: string, updates: Partial<TaskStep>): void {
    if (!this.currentTask) return;

    let targetStep = this.currentTask.planned_steps.find(s => s.id === stepId);
    if (!targetStep) {
      targetStep = this.currentTask.dynamic_steps.find(s => s.id === stepId);
    }

    if (targetStep) {
      Object.assign(targetStep, updates);

      if (updates.status === 'completed' && !this.currentTask.executed_steps.some(s => s.id === stepId)) {
        this.currentTask.executed_steps.push(targetStep);
        this.currentTask.progress.completed++;
        if (targetStep.is_optimized) {
          this.currentTask.optimized_steps.push(targetStep);
        }
      } else if (updates.status === 'failed') {
        this.currentTask.failed_steps.push(targetStep);
      }

      this.currentTask.updated_at = Date.now();
      this.notify();
    }
  }

  public static addDynamicStep(step: TaskStep): void {
    if (!this.currentTask) return;
    this.currentTask.dynamic_steps.push(step);
    if (this.currentTask.progress.known_total !== null) {
      this.currentTask.progress.known_total++;
    }
    this.notify();
  }

  public static setCurrentAction(actionName: string): void {
    if (!this.currentTask) return;
    this.currentTask.current_action = actionName;
    this.currentTask.updated_at = Date.now();
    this.notify();
  }

  public static setOptimization(metrics: Partial<OptimizationMetrics>): void {
    if (!this.currentTask) return;
    this.currentTask.optimization = {
      ...this.currentTask.optimization,
      ...metrics
    };
    this.currentTask.updated_at = Date.now();
    this.notify();
  }

  public static pauseTask(): void {
    if (this.currentTask && this.currentTask.status === 'running') {
      this.currentTask.status = 'paused';
      this.currentTask.current_action = 'Task paused by user';
      this.currentTask.updated_at = Date.now();
      this.notify();
    }
  }

  public static resumeTask(): void {
    if (this.currentTask && this.currentTask.status === 'paused') {
      this.currentTask.status = 'running';
      this.currentTask.current_action = 'Resuming execution...';
      this.currentTask.updated_at = Date.now();
      this.notify();
    }
  }

  public static stopTask(): void {
    if (this.currentTask) {
      this.currentTask.status = 'cancelled';
      this.currentTask.current_action = 'Stopped by user';
      this.currentTask.updated_at = Date.now();
      this.notify();
    }
  }

  public static completeTask(result?: any): void {
    if (this.currentTask) {
      this.currentTask.status = 'completed';
      this.currentTask.current_action = 'Completed successfully';
      this.currentTask.final_result = result;
      if (this.currentTask.progress.known_total) {
        this.currentTask.progress.completed = this.currentTask.progress.known_total;
      }
      this.currentTask.updated_at = Date.now();
      this.notify();
    }
  }

  public static failTask(error: string): void {
    if (this.currentTask) {
      this.currentTask.status = 'failed';
      this.currentTask.current_action = `Failed: ${error}`;
      this.currentTask.error = error;
      this.currentTask.updated_at = Date.now();
      this.notify();
    }
  }
}
