export type AgentBridgeEventType =
  | 'navigation_changed'
  | 'page_loaded'
  | 'dom_changed'
  | 'dialog_opened'
  | 'dialog_closed'
  | 'form_changed'
  | 'state_changed';

export type EventCallback = (eventType: AgentBridgeEventType, data: any) => void;

export class EventEngine {
  private static listeners: EventCallback[] = [];
  private static observer: MutationObserver | null = null;
  private static lastUrl = '';

  public static initialize(): void {
    this.lastUrl = window.location.href;

    // 1. Observe URL/Navigation changes
    window.addEventListener('popstate', () => this.handleNavigation());
    window.addEventListener('hashchange', () => this.handleNavigation());

    // 2. Observe DOM mutations (debounced)
    if (!this.observer && typeof MutationObserver !== 'undefined') {
      let timeout: any = null;
      this.observer = new MutationObserver(() => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.emit('dom_changed', { timestamp: Date.now() });
        }, 300);
      });

      this.observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }
  }

  private static handleNavigation(): void {
    if (window.location.href !== this.lastUrl) {
      this.lastUrl = window.location.href;
      this.emit('navigation_changed', { url: this.lastUrl });
    }
  }

  public static on(callback: EventCallback): void {
    this.listeners.push(callback);
  }

  public static emit(eventType: AgentBridgeEventType, data: any): void {
    for (const listener of this.listeners) {
      try {
        listener(eventType, data);
      } catch (e) {
        console.error('[AgentBridge EventEngine] Listener error:', e);
      }
    }
  }
}
