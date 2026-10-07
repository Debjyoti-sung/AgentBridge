import { BrowserAction, ActionResult, VerificationResult } from '../shared/protocol';
import { TargetResolver } from './target-resolver';
import { VerificationEngine } from './verification-engine';
import { FailureRecoveryEngine } from './failure-recovery';
import { ConnectorRegistry } from '../connectors/connector-registry';
import { UniversalWebObserver } from '../semantic/universal-observer';
import { AIDOMBuilder } from '../semantic/ai-dom-builder';

export class ActionExecutor {
  public static async execute(action: BrowserAction, requestId: string, isRetry: boolean = false): Promise<ActionResult> {
    const startTime = performance.now();
    const preState = {
      url: window.location.href,
      title: document.title,
      activeId: document.activeElement ? (document.activeElement.getAttribute('data-ab-id') || undefined) : undefined
    };

    try {
      // 1. Check active connector first (specialized or generic)
      const connector = ConnectorRegistry.getActiveConnector();
      if (connector && connector.execute) {
        const connectorResult = await connector.execute(action);
        if (connectorResult) {
          connectorResult.request_id = requestId;
          AIDOMBuilder.bumpStateVersion();
          return connectorResult;
        }
      }

      // 2. Execute universal core browser actions
      let resultPayload: any = null;
      let targetEl: HTMLElement | null = null;

      switch (action.name) {
        case 'click': {
          const resolved = TargetResolver.resolve(action);
          if (!resolved) {
            throw new Error(`Target element not found: ${action.target || action.selector}`);
          }
          targetEl = resolved.element;
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.focus?.();
          targetEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          targetEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          targetEl.click();
          resultPayload = { clicked: true, target_strategy: resolved.strategy };
          break;
        }

        case 'type': {
          const resolved = TargetResolver.resolve(action);
          if (!resolved) {
            throw new Error(`Target input not found: ${action.target || action.selector}`);
          }
          targetEl = resolved.element;
          if (!(targetEl instanceof HTMLInputElement || targetEl instanceof HTMLTextAreaElement)) {
            throw new Error(`Target element is not an input or textarea: ${targetEl.tagName}`);
          }
          targetEl.focus();
          targetEl.value = action.value || '';
          targetEl.dispatchEvent(new Event('input', { bubbles: true }));
          targetEl.dispatchEvent(new Event('change', { bubbles: true }));
          resultPayload = { typed: action.value, target_id: action.target };
          break;
        }

        case 'select': {
          const resolved = TargetResolver.resolve(action);
          if (!resolved || !(resolved.element instanceof HTMLSelectElement)) {
            throw new Error(`Target select element not found: ${action.target || action.selector}`);
          }
          targetEl = resolved.element;
          const val = action.value || action.parameters?.value;
          if (val) {
            targetEl.value = val;
            targetEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
          resultPayload = { selected: targetEl.value };
          break;
        }

        case 'scroll': {
          const distance = action.parameters?.distance || 500;
          const direction = action.parameters?.direction || 'down';
          const dy = direction === 'up' ? -distance : distance;
          window.scrollBy({ top: dy, behavior: 'smooth' });
          resultPayload = { scrolled: dy, new_y: Math.round(window.scrollY) };
          break;
        }

        case 'keypress': {
          const key = action.parameters?.key || 'Enter';
          const active = (document.activeElement as HTMLElement) || document.body;
          active.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
          active.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
          resultPayload = { keypress: key };
          break;
        }

        case 'navigate': {
          const url = action.parameters?.url;
          if (!url) throw new Error('Navigate action missing "url" parameter');
          window.location.href = url;
          resultPayload = { navigating_to: url };
          break;
        }

        case 'wait': {
          const ms = action.parameters?.ms || 500;
          await new Promise(r => setTimeout(r, ms));
          resultPayload = { waited_ms: ms };
          break;
        }

        case 'extract': {
          resultPayload = {
            title: document.title,
            url: window.location.href,
            text: document.body.innerText.slice(0, 5000)
          };
          break;
        }

        case 'submit_form': {
          const fields = action.parameters?.fields || {};
          // Fill each provided field
          for (const [key, value] of Object.entries(fields)) {
            const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
              `[name="${key}"], #${key}, [data-ab-id="field_${key}"]`
            );
            if (input) {
              if (input instanceof HTMLInputElement && (input.type === 'checkbox' || input.type === 'radio')) {
                input.checked = Boolean(value);
              } else {
                input.value = String(value);
              }
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          // Click submit
          const submitBtn = document.querySelector<HTMLElement>(
            'button[type="submit"], input[type="submit"], button:not([type="button"]), [data-ab-id*="submit"]'
          );
          if (submitBtn) {
            submitBtn.click();
          }
          resultPayload = { submitted: true, fields_filled: Object.keys(fields).length };
          break;
        }

        default:
          throw new Error(`Unknown action: ${action.name}`);
      }

      // Verification
      const verification = await VerificationEngine.verifyAction(action, targetEl, preState);
      const durationMs = Math.round(performance.now() - startTime);

      AIDOMBuilder.bumpStateVersion();

      return {
        request_id: requestId,
        success: true,
        action: action.name,
        target: action.target || action.selector,
        duration_ms: durationMs,
        result: resultPayload,
        verification
      };
    } catch (err: any) {
      if (!isRetry) {
        return await FailureRecoveryEngine.attemptRecovery(action, err.message || String(err), (retryAction) =>
          ActionExecutor.execute(retryAction, requestId, true)
        );
      }

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
          confidence: 0.0,
          details: err.message || String(err)
        }
      };
    }
  }
}
