import { BrowserAction, ActionResult } from '../shared/protocol';
import { TargetResolver, ResolvedTarget } from './target-resolver';
import { AIDOMBuilder } from '../semantic/ai-dom-builder';

export class FailureRecoveryEngine {
  public static async attemptRecovery(
    action: BrowserAction,
    originalError: string,
    executeFunc: (act: BrowserAction, isRetry: boolean) => Promise<ActionResult>
  ): Promise<ActionResult> {
    console.warn(`[AgentBridge Recovery] Action ${action.name} failed (${originalError}). Attempting recovery...`);

    // Safety rule: Do not retry high-risk actions blindly
    if (['delete', 'submit_order', 'send', 'pay'].includes(action.name)) {
      return {
        request_id: 'rec_err',
        success: false,
        action: action.name,
        target: action.target,
        duration_ms: 0,
        error: `Cannot auto-recover destructive/sensitive action ${action.name}: ${originalError}`,
        recovered: false
      };
    }

    // 1. Re-build fresh semantic page model and re-scan DOM
    AIDOMBuilder.buildSemanticPage(true);
    await new Promise(r => setTimeout(r, 250));

    // 2. Try resolving target again with updated DOM
    const resolved = TargetResolver.resolve(action);
    if (resolved) {
      console.log(`[AgentBridge Recovery] Successfully re-resolved target via strategy: ${resolved.strategy}`);
      try {
        const retryResult = await executeFunc(action, true);
        retryResult.recovered = true;
        return retryResult;
      } catch (retryErr: any) {
        return {
          request_id: 'rec_err',
          success: false,
          action: action.name,
          target: action.target,
          duration_ms: 0,
          error: `Recovery attempt failed: ${retryErr.message || String(retryErr)}`,
          recovered: false
        };
      }
    }

    return {
      request_id: 'rec_err',
      success: false,
      action: action.name,
      target: action.target,
      duration_ms: 0,
      error: `Could not recover action ${action.name}: target node unresolvable after DOM re-scan (${originalError})`,
      recovered: false
    };
  }
}
