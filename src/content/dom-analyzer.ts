import { SemanticObject } from '../shared/protocol';

export class DOMAnalyzer {
  private static elementRegistry = new Map<string, HTMLElement>();
  private static nextId = 1;

  public static getElementById(id: string): HTMLElement | null {
    const el = this.elementRegistry.get(id);
    if (el && document.contains(el)) {
      return el;
    }
    // Try finding by data attribute fallback
    const fallback = document.querySelector(`[data-agentbridge-id="${id}"]`) as HTMLElement | null;
    if (fallback) {
      this.elementRegistry.set(id, fallback);
      return fallback;
    }
    return null;
  }

  public static registerElement(el: HTMLElement, prefix: string = 'elem'): string {
    const existingId = el.getAttribute('data-agentbridge-id');
    if (existingId && this.elementRegistry.get(existingId) === el) {
      return existingId;
    }
    const id = `${prefix}_${this.nextId++}`;
    el.setAttribute('data-agentbridge-id', id);
    this.elementRegistry.set(id, el);
    return id;
  }

  public static isVisible(el: HTMLElement): boolean {
    if (!el || !document.contains(el)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  public static analyzeInteractiveElements(): SemanticObject[] {
    const results: SemanticObject[] = [];
    
    // Select interactive and structural elements
    const selector = [
      'button',
      'a[href]',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="row"]',
      'table',
      'form'
    ].join(',');

    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

    for (const el of elements) {
      if (!this.isVisible(el)) continue;

      const tagName = el.tagName.toLowerCase();
      const role = el.getAttribute('role') || tagName;
      const ariaLabel = el.getAttribute('aria-label') || '';
      const textContent = (el.innerText || el.textContent || '').trim().slice(0, 150);
      const label = ariaLabel || textContent || el.getAttribute('placeholder') || el.getAttribute('title') || '';

      const id = this.registerElement(el, role.replace(/[^a-zA-Z0-9]/g, '_'));

      let type = 'element';
      if (tagName === 'button' || role === 'button') type = 'button';
      else if (tagName === 'a' || role === 'link') type = 'link';
      else if (tagName === 'input' || tagName === 'textarea') type = 'input';
      else if (tagName === 'table' || role === 'grid') type = 'table';
      else if (tagName === 'form') type = 'form';

      results.push({
        id,
        type,
        role,
        label,
        value: (el as HTMLInputElement).value || undefined,
        metadata: {
          tagName,
          rect: {
            top: Math.round(el.getBoundingClientRect().top),
            left: Math.round(el.getBoundingClientRect().left),
            width: Math.round(el.getBoundingClientRect().width),
            height: Math.round(el.getBoundingClientRect().height)
          }
        }
      });
    }

    return results;
  }
}
