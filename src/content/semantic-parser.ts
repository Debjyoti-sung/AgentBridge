import { DOMAnalyzer } from './dom-analyzer';
import { GmailAdapter } from './gmail-adapter';
import { SemanticPage, SemanticAction, RiskLevel } from '../shared/protocol';

export class SemanticParser {
  private static cachedPage: SemanticPage | null = null;
  private static cachedTimestamp = 0;

  public static buildSemanticPage(forceFresh: boolean = false): SemanticPage {
    const now = Date.now();
    // Cache for 1.5 seconds if unchanged
    if (!forceFresh && this.cachedPage && now - this.cachedTimestamp < 1500) {
      return this.cachedPage;
    }

    const isGmail = GmailAdapter.isGmail();
    const domain = window.location.hostname;
    const url = window.location.href;
    const title = document.title;
    const application = isGmail ? 'gmail' : 'generic';
    const pageType = isGmail ? GmailAdapter.getPageType() : 'webpage';

    let objects = isGmail ? GmailAdapter.toSemanticObjects() : [];
    
    // Also include interactive controls (buttons, search, inputs)
    const interactive = DOMAnalyzer.analyzeInteractiveElements();
    objects = [...objects, ...interactive.slice(0, 50)]; // Cap to avoid huge payloads

    // Generate high-level semantic actions available
    const actions: SemanticAction[] = [];

    if (isGmail) {
      actions.push({
        name: 'bulk_extract_emails',
        parameters: { unread_only: false },
        risk_level: 'low',
        description: 'Bulk extract all emails currently in view'
      });
      actions.push({
        name: 'get_unread_emails',
        parameters: {},
        risk_level: 'low',
        description: 'Extract only unread emails from the inbox'
      });
    }

    actions.push({
      name: 'inspect_page',
      parameters: {},
      risk_level: 'low',
      description: 'Get current AI DOM semantic model'
    });

    const page: SemanticPage = {
      url,
      domain,
      application,
      page_type: pageType,
      title,
      objects,
      actions,
      timestamp: now
    };

    this.cachedPage = page;
    this.cachedTimestamp = now;
    return page;
  }
}
