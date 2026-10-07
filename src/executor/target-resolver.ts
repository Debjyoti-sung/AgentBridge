import { UniversalWebObserver } from '../semantic/universal-observer';
import { BrowserAction } from '../shared/protocol';

export interface ResolvedTarget {
  element: HTMLElement;
  strategy: 'id' | 'selector' | 'text_anchor' | 'aria' | 'fallback';
  confidence: number;
}

export class TargetResolver {
  public static resolve(action: BrowserAction): ResolvedTarget | null {
    // Strategy 1: Resolve by internal registered element ID
    if (action.target) {
      const el = UniversalWebObserver.getElementById(action.target);
      if (el && UniversalWebObserver.isVisible(el)) {
        return { element: el, strategy: 'id', confidence: 1.0 };
      }
    }

    // Strategy 2: Resolve by selector if provided
    if (action.selector) {
      const el = document.querySelector<HTMLElement>(action.selector);
      if (el && UniversalWebObserver.isVisible(el)) {
        return { element: el, strategy: 'selector', confidence: 0.95 };
      }
    }

    // Strategy 3: Resolve by accessible name or text anchor in parameters
    const textAnchor = action.parameters?.text || action.parameters?.label;
    if (textAnchor && typeof textAnchor === 'string') {
      const el = this.findByTextAnchor(textAnchor, action.name);
      if (el) {
        return { element: el, strategy: 'text_anchor', confidence: 0.9 };
      }
    }

    // Strategy 4: Role/type fallback in parameters
    const role = action.parameters?.role;
    if (role && typeof role === 'string') {
      const el = document.querySelector<HTMLElement>(`[role="${role}"]`);
      if (el && UniversalWebObserver.isVisible(el)) {
        return { element: el, strategy: 'aria', confidence: 0.85 };
      }
    }

    return null;
  }

  private static findByTextAnchor(text: string, actionName: string): HTMLElement | null {
    const cleanText = text.toLowerCase().trim();
    // Prioritize clickable/interactive tags
    const interactive = Array.from(document.querySelectorAll<HTMLElement>('button, a, [role="button"], input[type="submit"]'));
    for (const el of interactive) {
      if (!UniversalWebObserver.isVisible(el)) continue;
      const label = UniversalWebObserver.getAccessibleLabel(el).toLowerCase();
      if (label === cleanText || label.includes(cleanText)) {
        return el;
      }
    }

    // Generic visible text match
    const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
    for (const el of elements) {
      if (el.children.length === 0 && UniversalWebObserver.isVisible(el)) {
        const t = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (t === cleanText || t.includes(cleanText)) {
          return el;
        }
      }
    }

    return null;
  }
}
