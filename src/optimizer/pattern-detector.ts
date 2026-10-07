import { PatternMatch, RiskLevel } from '../shared/protocol';

export interface RecordedAction {
  name: string;
  target?: string;
  timestamp: number;
}

export class PatternDetector {
  private history: RecordedAction[] = [];
  private maxHistory = 100;

  public recordAction(name: string, target?: string): void {
    this.history.push({ name, target, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  public getHistory(): RecordedAction[] {
    return [...this.history];
  }

  public clear(): void {
    this.history = [];
  }

  /**
   * Detects repetitive action patterns in recent history
   * e.g., ['click', 'read', 'back', 'click', 'read', 'back'] -> pattern ['click', 'read', 'back'] with frequency 2+
   */
  public detectRepetitivePatterns(): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const actionNames = this.history.map(h => h.name);
    const n = actionNames.length;

    if (n < 4) return matches;

    // Test pattern lengths from 1 to 4
    for (let len = 1; len <= 4; len++) {
      if (n < len * 2) continue;

      // Check if last (len * k) actions repeat the pattern of length `len`
      const candidatePattern = actionNames.slice(n - len);
      let count = 0;

      for (let i = n - len; i >= 0; i -= len) {
        const slice = actionNames.slice(i, i + len);
        const isMatch = slice.length === len && slice.every((val, idx) => val === candidatePattern[idx]);
        if (isMatch) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 2) {
        const replacement = this.inferReplacement(candidatePattern);
        const risk: RiskLevel = candidatePattern.some(a => ['delete', 'pay', 'submit'].includes(a))
          ? 'high'
          : 'low';

        matches.push({
          pattern: candidatePattern,
          frequency: count,
          possible_replacement: replacement,
          confidence: Math.min(0.7 + count * 0.1, 0.98),
          risk
        });
      }
    }

    return matches;
  }

  private inferReplacement(pattern: string[]): string {
    const joined = pattern.join('->');
    if (joined.includes('read') || joined.includes('extract') || joined.includes('click')) {
      return 'bulk_extract';
    }
    if (joined.includes('type')) {
      return 'action_batching';
    }
    return 'bulk_process';
  }
}
