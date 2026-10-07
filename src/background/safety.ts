import { SafetyEngine } from '../safety/safety-engine';
import { RiskLevel, ActionSafetyStatus } from '../shared/protocol';

export class SafetyManager {
  public static evaluateRisk(actionName: string, domain: string = ''): { risk: RiskLevel; status: ActionSafetyStatus } {
    return SafetyEngine.evaluateRisk(actionName, domain);
  }
}
