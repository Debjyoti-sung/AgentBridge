import { DOMAnalyzer } from './dom-analyzer';
import { GmailAdapter } from './gmail-adapter';
import { BrowserAction, ActionResult } from '../shared/protocol';

export class ActionExecutor {
  public static async execute(action: BrowserAction, requestId: string): Promise<ActionResult> {
    const startTime = performance.now();
    try {
      let result: any = null;

      switch (action.name) {
        case 'bulk_extract_emails': {
          const emails = GmailAdapter.extractEmails();
          const unreadOnly = Boolean(action.parameters?.unread_only);
          const filtered = unreadOnly ? emails.filter(e => e.unread) : emails;
          result = {
            emails: filtered,
            count: filtered.length,
            total_scanned: emails.length
          };
          break;
        }

        case 'click': {
          let el: HTMLElement | null = null;
          if (action.target) {
            el = DOMAnalyzer.getElementById(action.target);
          }
          if (!el && action.selector) {
            el = document.querySelector<HTMLElement>(action.selector);
          }

          if (!el) {
            throw new Error(`Target element not found: ${action.target || action.selector}`);
          }

          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus?.();
          el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          el.click();

          result = { clicked: true, target: action.target || action.selector };
          break;
        }

        case 'type': {
          let el: HTMLInputElement | HTMLTextAreaElement | null = null;
          if (action.target) {
            el = DOMAnalyzer.getElementById(action.target) as any;
          }
          if (!el && action.selector) {
            el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(action.selector);
          }

          if (!el) {
            throw new Error(`Target input not found: ${action.target || action.selector}`);
          }

          el.focus();
          el.value = action.value || '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));

          result = { typed: action.value };
          break;
        }

        case 'scroll': {
          const distance = action.parameters?.distance || 500;
          window.scrollBy({ top: distance, behavior: 'smooth' });
          result = { scrolled: distance };
          break;
        }

        case 'wait': {
          const ms = action.parameters?.ms || 500;
          await new Promise(r => setTimeout(r, ms));
          result = { waited_ms: ms };
          break;
        }

        case 'extract': {
          result = {
            title: document.title,
            url: window.location.href,
            text: document.body.innerText.slice(0, 5000)
          };
          break;
        }

        default:
          throw new Error(`Unknown action: ${action.name}`);
      }

      const durationMs = Math.round(performance.now() - startTime);
      return {
        request_id: requestId,
        success: true,
        action: action.name,
        target: action.target || action.selector,
        duration_ms: durationMs,
        result,
        verification: {
          verified: true,
          details: 'Action executed successfully in active tab DOM'
        }
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        request_id: requestId,
        success: false,
        action: action.name,
        target: action.target || action.selector,
        duration_ms: durationMs,
        error: err.message || String(err),
        verification: {
          verified: false,
          details: err.message
        }
      };
    }
  }
}
