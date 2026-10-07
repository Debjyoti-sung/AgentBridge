import { OptimizationCandidate, RiskLevel } from '../shared/protocol';

export class OptimizationSafety {
  public static isSafeToOptimize(candidate: OptimizationCandidate): boolean {
    // If the candidate contains any destructive or high-risk actions, do not optimize automatically
    const dangerousActions = ['delete', 'pay', 'purchase', 'send', 'transfer', 'confirm_payment', 'change_password'];
    for (const act of candidate.pattern) {
      if (dangerousActions.includes(act.toLowerCase())) {
        return false;
      }
    }

    if (candidate.risk === 'high' || candidate.risk === 'critical') {
      return false;
    }

    // Read-only operations (bulk_extract, caching, state reuse) are safe
    if (['bulk_extract', 'state_reuse', 'semantic_caching', 'navigation_elimination'].includes(candidate.type)) {
      return true;
    }

    return candidate.confidence >= 0.8;
  }
}
