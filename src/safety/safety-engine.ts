import { RiskLevel, ActionSafetyStatus, ActionSafetyPolicy } from '../shared/protocol';

export class SafetyEngine {
  private static highRiskDomains = [
    'bank', 'chase.com', 'wellsfargo.com', 'paypal.com', 'binance.com', 'coinbase.com'
  ];

  public static evaluateRisk(actionName: string, domain: string = ''): { risk: RiskLevel; status: ActionSafetyStatus } {
    const act = actionName.toLowerCase();
    const dom = domain.toLowerCase();

    // 1. Critical risk checks
    if (this.highRiskDomains.some(d => dom.includes(d)) && ['pay', 'transfer', 'buy', 'submit'].some(k => act.includes(k))) {
      return { risk: 'critical', status: 'blocked' };
    }

    if (['change_password', 'transfer_funds', 'delete_account', 'reveal_credentials'].includes(act)) {
      return { risk: 'critical', status: 'blocked' };
    }

    // 2. High risk checks
    if (['send', 'delete', 'purchase', 'buy', 'pay', 'confirm_order'].includes(act)) {
      return { risk: 'high', status: 'confirmation_required' };
    }

    // 3. Medium risk checks
    if (['type', 'fill_form', 'submit_form', 'select', 'upload'].includes(act)) {
      return { risk: 'medium', status: 'allowed' };
    }

    // 4. Low risk checks
    return { risk: 'low', status: 'allowed' };
  }
}
