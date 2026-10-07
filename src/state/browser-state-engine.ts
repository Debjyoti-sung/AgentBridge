import { BrowserState } from '../shared/protocol';
import { AIDOMBuilder } from '../semantic/ai-dom-builder';

export class BrowserStateEngine {
  private static currentState: BrowserState = {
    url: '',
    title: '',
    page_type: 'webpage',
    entity_count: 0,
    action_count: 0,
    state_version: 1
  };

  public static getState(): BrowserState {
    const page = AIDOMBuilder.buildSemanticPage();
    this.currentState = {
      ...page.state,
      state_version: AIDOMBuilder.getStateVersion()
    };
    return this.currentState;
  }

  public static updateTaskId(taskId: string): void {
    this.currentState.task_id = taskId;
  }
}
