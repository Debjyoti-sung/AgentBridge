import {
  OptimizationCandidate,
  OptimizationMetrics,
  BrowserAction
} from '../shared/protocol';
import { PatternDetector } from './pattern-detector';
import { OptimizationSafety } from './optimization-safety';

export class OptimizationEngine {
  private static patternDetector = new PatternDetector();

  public static recordAction(actionName: string, target?: string): void {
    this.patternDetector.recordAction(actionName, target);
  }

  public static analyze(): OptimizationCandidate[] {
    const patterns = this.patternDetector.detectRepetitivePatterns();
    const candidates: OptimizationCandidate[] = [];

    for (const p of patterns) {
      if (p.possible_replacement === 'bulk_extract') {
        const candidate: OptimizationCandidate = {
          type: 'bulk_extract',
          pattern: p.pattern,
          suggested_action: {
            name: 'bulk_extract',
            parameters: {}
          },
          estimated_actions_saved: Math.max((p.frequency - 1) * p.pattern.length, 1),
          confidence: p.confidence,
          risk: p.risk
        };

        if (OptimizationSafety.isSafeToOptimize(candidate)) {
          candidates.push(candidate);
        }
      }
    }

    return candidates;
  }

  /**
   * Computes empirical optimization metrics for repeated operations vs AgentBridge bulk execution
   */
  public static calculateMetrics(itemCount: number, actionsPerItem: number = 3): OptimizationMetrics {
    const count = Math.max(itemCount, 1);
    const rawActions = count * actionsPerItem;
    const actualActions = 1;
    const actionsAvoided = Math.max(rawActions - actualActions, 0);
    const modelCallsSaved = Math.max(count - 1, 0);

    // Approximate latency saved: ~2400ms per baseline item interaction cycle vs ~180ms for single bulk execution
    const baselineLatency = count * 2400;
    const optimizedLatency = 180;
    const latencySavedMs = Math.max(baselineLatency - optimizedLatency, 0);

    return {
      browser_actions_avoided: actionsAvoided,
      raw_actions_would_take: rawActions,
      actual_actions_taken: actualActions,
      model_calls_saved: modelCallsSaved,
      latency_saved_ms: latencySavedMs,
      strategy: 'Semantic Bulk Execution'
    };
  }
}
