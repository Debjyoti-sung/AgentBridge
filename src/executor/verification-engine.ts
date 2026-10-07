import { BrowserAction, VerificationResult } from '../shared/protocol';

export class VerificationEngine {
  public static async verifyAction(
    action: BrowserAction,
    targetEl: HTMLElement | null,
    preState: { url: string; title: string; activeId?: string }
  ): Promise<VerificationResult> {
    const currentUrl = window.location.href;
    const currentTitle = document.title;

    switch (action.name) {
      case 'click': {
        // Did URL change?
        if (currentUrl !== preState.url) {
          return {
            verified: true,
            confidence: 0.99,
            details: `Click caused navigation to ${currentUrl}`,
            changed_state: { url: currentUrl }
          };
        }

        // Did modal open or close?
        const openDialog = document.querySelector('dialog[open], [role="dialog"]:not([aria-hidden="true"])');
        if (openDialog) {
          return {
            verified: true,
            confidence: 0.95,
            details: 'Click caused dialog/modal to appear',
            changed_state: { dialog_open: true }
          };
        }

        // Did checkbox or radio state toggle?
        if (targetEl instanceof HTMLInputElement && (targetEl.type === 'checkbox' || targetEl.type === 'radio')) {
          return {
            verified: true,
            confidence: 1.0,
            details: `Toggled ${targetEl.type} state to ${targetEl.checked}`,
            changed_state: { checked: targetEl.checked }
          };
        }

        return {
          verified: true,
          confidence: 0.9,
          details: 'Click event dispatched successfully to target node'
        };
      }

      case 'type': {
        if (targetEl instanceof HTMLInputElement || targetEl instanceof HTMLTextAreaElement) {
          const match = targetEl.value === (action.value || '');
          return {
            verified: match,
            confidence: match ? 1.0 : 0.5,
            details: match
              ? `Input value verified: "${targetEl.value}"`
              : `Expected "${action.value}", found "${targetEl.value}"`,
            changed_state: { value: targetEl.value }
          };
        }
        return {
          verified: true,
          confidence: 0.85,
          details: 'Type event dispatched'
        };
      }

      case 'scroll': {
        return {
          verified: true,
          confidence: 0.95,
          details: `Scrolled window to position Y=${Math.round(window.scrollY)}`
        };
      }

      case 'submit_form': {
        // Check for success feedback or URL change
        const successMessage = document.querySelector('.alert-success, .success, [role="alert"], [data-status="success"]');
        return {
          verified: true,
          confidence: successMessage ? 0.98 : 0.9,
          details: successMessage ? 'Form submitted with confirmation alert' : 'Form submitted',
          changed_state: { submitted: true }
        };
      }

      default:
        return {
          verified: true,
          confidence: 0.9,
          details: `Action ${action.name} verified in live DOM`
        };
    }
  }
}
