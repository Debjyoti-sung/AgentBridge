import { SemanticForm, SemanticFormField } from '../shared/protocol';
import { UniversalWebObserver } from './universal-observer';

export class UniversalFormAnalyzer {
  public static analyzeForms(): SemanticForm[] {
    const forms: SemanticForm[] = [];
    const formElements = Array.from(document.querySelectorAll<HTMLFormElement>('form'));

    // 1. Explicit HTML forms
    for (let i = 0; i < formElements.length; i++) {
      const formEl = formElements[i];
      if (!UniversalWebObserver.isVisible(formEl)) continue;

      const formId = `form_${i + 1}`;
      const formName = formEl.getAttribute('name') || formEl.id || `Form ${i + 1}`;
      const fields = this.extractFieldsFromContainer(formEl);

      // Find submit element
      const submitEl = formEl.querySelector<HTMLElement>(
        'button[type="submit"], input[type="submit"], button:not([type="button"]), [role="button"]'
      );
      const submitElementId = submitEl ? UniversalWebObserver.registerElement(submitEl, 'submit') : undefined;

      forms.push({
        id: formId,
        name: formName,
        action_url: formEl.action || undefined,
        submit_element_id: submitElementId,
        fields
      });
    }

    // 2. Implicit forms (groups of inputs with a submit button not inside a <form>)
    if (forms.length === 0) {
      const allInputs = Array.from(document.querySelectorAll<HTMLElement>('input, textarea, select'))
        .filter(el => UniversalWebObserver.isVisible(el) && !el.closest('form'));

      if (allInputs.length > 0) {
        const fields: SemanticFormField[] = [];
        for (const input of allInputs) {
          const field = this.createFormField(input as HTMLInputElement);
          if (field) fields.push(field);
        }

        const submitBtn = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'))
          .find(b => {
            const text = (b.innerText || '').toLowerCase();
            return text.includes('submit') || text.includes('register') || text.includes('sign up') || text.includes('save');
          });

        const submitId = submitBtn ? UniversalWebObserver.registerElement(submitBtn, 'submit') : undefined;

        forms.push({
          id: 'implicit_form_1',
          name: 'Page Form',
          submit_element_id: submitId,
          fields
        });
      }
    }

    return forms;
  }

  private static extractFieldsFromContainer(container: HTMLElement): SemanticFormField[] {
    const fields: SemanticFormField[] = [];
    const inputs = Array.from(container.querySelectorAll<HTMLElement>('input, textarea, select'))
      .filter(el => UniversalWebObserver.isVisible(el));

    for (const input of inputs) {
      const field = this.createFormField(input as HTMLInputElement);
      if (field) fields.push(field);
    }
    return fields;
  }

  private static createFormField(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): SemanticFormField | null {
    const type = el instanceof HTMLSelectElement
      ? 'select'
      : el instanceof HTMLTextAreaElement
        ? 'textarea'
        : (el.type || 'text');

    if (type === 'hidden') return null;

    const label = UniversalWebObserver.getAccessibleLabel(el);
    const name = el.name || el.id || label.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'field';
    const elementId = UniversalWebObserver.registerElement(el, 'field');

    const options: string[] = [];
    if (el instanceof HTMLSelectElement) {
      for (const opt of Array.from(el.options)) {
        options.push(opt.text || opt.value);
      }
    }

    return {
      id: `field_${name}`,
      element_id: elementId,
      name,
      label: label || name,
      type,
      required: el.required || el.getAttribute('aria-required') === 'true',
      value: el.value || undefined,
      placeholder: (el as HTMLInputElement).placeholder || undefined,
      options: options.length > 0 ? options : undefined
    };
  }
}
