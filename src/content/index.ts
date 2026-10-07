import { AIDOMBuilder } from '../semantic/ai-dom-builder';
import { ActionExecutor } from '../executor/action-executor';
import { BrowserStateEngine } from '../state/browser-state-engine';
import { EventEngine } from '../state/event-engine';
import { OptimizationEngine } from '../optimizer/optimization-engine';

console.log('[AgentBridge] Universal Content Runtime initialized on', window.location.href);

// Initialize event observation (DOM mutations, navigation)
EventEngine.initialize();
EventEngine.on((eventType, data) => {
  chrome.runtime.sendMessage({
    type: 'content.event',
    payload: {
      eventType,
      data,
      url: window.location.href,
      state_version: AIDOMBuilder.getStateVersion()
    }
  }).catch(() => {
    // Ignore if background is not listening
  });
});

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return false;

  const { type, request_id, payload } = message;

  switch (type) {
    case 'page.inspect': {
      try {
        const page = AIDOMBuilder.buildSemanticPage(payload?.forceFresh);
        sendResponse({ success: true, request_id, result: page });
      } catch (err: any) {
        sendResponse({ success: false, request_id, error: err.message || String(err) });
      }
      return true;
    }

    case 'page.get_state': {
      try {
        const state = BrowserStateEngine.getState();
        sendResponse({ success: true, request_id, result: state });
      } catch (err: any) {
        sendResponse({ success: false, request_id, error: err.message || String(err) });
      }
      return true;
    }

    case 'action.execute': {
      const action = payload?.action;
      if (action) {
        OptimizationEngine.recordAction(action.name, action.target);
      }
      ActionExecutor.execute(action, request_id).then(res => {
        sendResponse(res);
      }).catch(err => {
        sendResponse({
          request_id,
          success: false,
          error: err.message || String(err),
          duration_ms: 0
        });
      });
      return true; // Keep message channel open for async response
    }

    case 'optimizer.analyze': {
      const candidates = OptimizationEngine.analyze();
      sendResponse({ success: true, request_id, result: candidates });
      return true;
    }

    case 'optimizer.calculate_metrics': {
      const metrics = OptimizationEngine.calculateMetrics(payload?.item_count || 1, payload?.actions_per_item || 3);
      sendResponse({ success: true, request_id, result: metrics });
      return true;
    }

    case 'ping': {
      sendResponse({ success: true, pong: true, url: window.location.href });
      return true;
    }

    default:
      sendResponse({ success: false, error: `Unknown content message type: ${type}` });
      return true;
  }
});
