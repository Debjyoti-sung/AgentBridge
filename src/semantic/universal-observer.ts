import { SemanticElement, ElementSource } from '../shared/protocol';

export class UniversalWebObserver {
  private static elementRegistry = new Map<string, HTMLElement>();
  private static idCounter = 1;

  public static resetRegistry(): void {
    this.elementRegistry.clear();
    this.idCounter = 1;
  }

  public static getElementById(id: string): HTMLElement | null {
    const el = this.elementRegistry.get(id);
    if (el && document.contains(el)) {
      return el;
    }
    // Try data attribute fallback
    const fallback = document.querySelector(`[data-ab-id="${id}"]`) as HTMLElement | null;
    if (fallback) {
      this.elementRegistry.set(id, fallback);
      return fallback;
    }
    return null;
  }

  public static registerElement(el: HTMLElement, prefix: string = 'el'): string {
    const existing = el.getAttribute('data-ab-id');
    if (existing && this.elementRegistry.get(existing) === el) {
      return existing;
    }
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 15) || 'el';
    const id = `${cleanPrefix}_${String(this.idCounter++).padStart(3, '0')}`;
    el.setAttribute('data-ab-id', id);
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

  public static getAccessibleLabel(el: HTMLElement): string {
    // 1. ARIA attributes
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      if (labelEl && labelEl.textContent) return labelEl.textContent.trim();
    }

    // 2. Form labels
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      if (el.id) {
        const label = document.querySelector(`label[for="${el.id}"]`);
        if (label && label.textContent) return label.textContent.trim();
      }
      const parentLabel = el.closest('label');
      if (parentLabel && parentLabel.textContent) {
        return parentLabel.textContent.replace(el.value || '', '').trim();
      }
      if (el.placeholder) return el.placeholder.trim();
    }

    // 3. Title / Alt
    const title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();

    const alt = el.getAttribute('alt');
    if (alt && alt.trim()) return alt.trim();

    // 4. Visible text content
    const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
    if (text) return text.slice(0, 150);

    // 5. Name attribute fallback
    const name = el.getAttribute('name');
    if (name) return name;

    return '';
  }

  public static scanElements(): SemanticElement[] {
    const results: SemanticElement[] = [];

    // Universal interactive selector
    const interactiveSelector = [
      'button',
      'a[href]',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="combobox"]',
      '[role="switch"]',
      '[contenteditable="true"]',
      'dialog',
      '[role="dialog"]',
      'h1', 'h2', 'h3'
    ].join(',');

    const candidates = Array.from(document.querySelectorAll<HTMLElement>(interactiveSelector));

    for (const el of candidates) {
      if (!this.isVisible(el)) continue;

      const tagName = el.tagName.toLowerCase();
      const role = el.getAttribute('role') || tagName;
      const label = this.getAccessibleLabel(el);
      const isHeading = tagName.startsWith('h') && tagName.length === 2;

      // Skip empty non-inputs unless they have icons or roles
      if (!label && tagName !== 'input' && tagName !== 'select' && !isHeading) {
        continue;
      }

      let type = 'element';
      if (tagName === 'button' || role === 'button') type = 'button';
      else if (tagName === 'a' || role === 'link') type = 'link';
      else if (tagName === 'input') {
        const inputType = (el as HTMLInputElement).type || 'text';
        type = ['checkbox', 'radio'].includes(inputType) ? inputType : 'input';
      }
      else if (tagName === 'textarea') type = 'textarea';
      else if (tagName === 'select') type = 'select';
      else if (role === 'checkbox') type = 'checkbox';
      else if (role === 'tab') type = 'tab';
      else if (isHeading) type = 'heading';

      const id = this.registerElement(el, type);
      const rect = el.getBoundingClientRect();

      const semanticEl: SemanticElement = {
        id,
        type,
        role,
        label,
        value: (el as HTMLInputElement).value || undefined,
        placeholder: (el as HTMLInputElement).placeholder || undefined,
        visible: true,
        enabled: !(el as HTMLButtonElement | HTMLInputElement).disabled,
        confidence: 1.0,
        source: 'deterministic' as ElementSource,
        rect: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      };

      results.push(semanticEl);
    }

    return results;
  }
}
