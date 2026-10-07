import {
  SemanticPage,
  SemanticElement,
  SemanticEntity,
  SemanticAction,
  SemanticTable,
  SemanticNavigation,
  BrowserState
} from '../shared/protocol';
import { UniversalWebObserver } from './universal-observer';
import { UniversalEntityExtractor } from './entity-extractor';
import { UniversalFormAnalyzer } from './form-analyzer';

export class AIDOMBuilder {
  private static cachedPage: SemanticPage | null = null;
  private static cachedTimestamp = 0;
  private static stateVersion = 1;

  public static bumpStateVersion(): number {
    return ++this.stateVersion;
  }

  public static getStateVersion(): number {
    return this.stateVersion;
  }

  public static buildSemanticPage(forceFresh: boolean = false): SemanticPage {
    const now = Date.now();
    if (!forceFresh && this.cachedPage && now - this.cachedTimestamp < 1000) {
      return this.cachedPage;
    }

    const url = window.location.href;
    const domain = window.location.hostname;
    const title = document.title;

    // 1. Scan Elements
    const elements = UniversalWebObserver.scanElements();

    // 2. Extract Entities
    const entities = UniversalEntityExtractor.extractEntities();

    // 3. Extract Forms
    const forms = UniversalFormAnalyzer.analyzeForms();

    // 4. Extract Tables
    const tables = this.extractTables();

    // 5. Extract Navigation
    const navigation = this.extractNavigation(elements);

    // 6. Infer page_type and application
    const { application, pageType } = this.inferPageClassification(entities, forms, tables, elements, domain);

    // 7. Infer Available High-Level Semantic Actions
    const actions = this.inferSemanticActions(elements, entities, forms, tables);

    // 8. Build BrowserState
    const state: BrowserState = {
      url,
      title,
      page_type: pageType,
      active_element: document.activeElement ? (document.activeElement.getAttribute('data-ab-id') || undefined) : undefined,
      entity_count: entities.length,
      action_count: actions.length,
      state_version: this.stateVersion,
      scroll_y: Math.round(window.scrollY),
      dialog_open: document.querySelector('dialog[open], [role="dialog"]:not([aria-hidden="true"])') !== null
    };

    const page: SemanticPage = {
      url,
      domain,
      application,
      page_type: pageType,
      title,
      elements: elements.slice(0, 100), // compact intermediate representation capped to prevent token bloating
      entities,
      actions,
      forms,
      tables,
      navigation,
      state,
      objects: elements.slice(0, 100), // backwards compatibility
      timestamp: now
    };

    this.cachedPage = page;
    this.cachedTimestamp = now;
    return page;
  }

  private static extractTables(): SemanticTable[] {
    const tables: SemanticTable[] = [];
    const tableEls = Array.from(document.querySelectorAll<HTMLTableElement>('table'));

    for (let i = 0; i < tableEls.length; i++) {
      const tableEl = tableEls[i];
      if (!UniversalWebObserver.isVisible(tableEl)) continue;

      const headers: string[] = [];
      const ths = Array.from(tableEl.querySelectorAll<HTMLTableCellElement>('th'));
      for (const th of ths) {
        headers.push(th.innerText.trim());
      }

      const rows: Record<string, string>[] = [];
      const trs = Array.from(tableEl.querySelectorAll<HTMLTableRowElement>('tbody tr, tr:not(:first-child)'));
      for (const tr of trs.slice(0, 50)) {
        const tds = Array.from(tr.querySelectorAll<HTMLTableCellElement>('td'));
        if (tds.length === 0) continue;
        const rowObj: Record<string, string> = {};
        for (let c = 0; c < tds.length; c++) {
          const colName = headers[c] || `col_${c + 1}`;
          rowObj[colName] = tds[c].innerText.trim();
        }
        rows.push(rowObj);
      }

      tables.push({
        id: `table_${i + 1}`,
        headers,
        rows,
        row_count: rows.length
      });
    }

    return tables;
  }

  private static extractNavigation(elements: SemanticElement[]): SemanticNavigation[] {
    const navItems: SemanticNavigation[] = [];
    const navLinks = elements.filter(el => el.type === 'link' || el.role === 'tab');

    for (const link of navLinks.slice(0, 15)) {
      navItems.push({
        type: link.role === 'tab' ? 'pagination' : 'link',
        label: link.label,
        target_id: link.id
      });
    }
    return navItems;
  }

  private static inferPageClassification(
    entities: SemanticEntity[],
    forms: any[],
    tables: any[],
    elements: SemanticElement[],
    domain: string
  ): { application: string; pageType: string } {
    let application = 'generic';
    let pageType = 'webpage';

    // Application inference
    if (domain.includes('mail.google.com') || document.querySelector('[data-agentbridge-app="gmail"]')) {
      application = 'gmail';
      pageType = 'inbox';
      return { application, pageType };
    }

    if (entities.some(e => e.type === 'product')) {
      application = 'e-commerce';
      pageType = 'product_listing';
    } else if (entities.some(e => e.type === 'article')) {
      application = 'content';
      pageType = 'article_listing';
    } else if (forms.length > 0 && forms.some(f => f.fields.length >= 2)) {
      application = 'form_portal';
      pageType = 'form';
    } else if (tables.length > 0) {
      application = 'data_portal';
      pageType = 'table_view';
    }

    // Check search presence
    const hasSearch = elements.some(el =>
      el.type === 'input' &&
      (el.placeholder?.toLowerCase().includes('search') || el.label.toLowerCase().includes('search'))
    );
    if (hasSearch && pageType === 'product_listing') {
      pageType = 'search_results';
    }

    return { application, pageType };
  }

  private static inferSemanticActions(
    elements: SemanticElement[],
    entities: SemanticEntity[],
    forms: any[],
    tables: any[]
  ): SemanticAction[] {
    const actions: SemanticAction[] = [];

    // 1. Search action if search input exists
    const searchInput = elements.find(el =>
      el.type === 'input' &&
      (el.placeholder?.toLowerCase().includes('search') || el.label.toLowerCase().includes('search') || el.role === 'searchbox')
    );
    if (searchInput) {
      actions.push({
        name: 'search',
        target: searchInput.id,
        parameters: { query: 'string' },
        risk_level: 'low',
        description: 'Search using the page search input'
      });
    }

    // 2. Filter / Sort actions if selects exist
    const selects = elements.filter(el => el.type === 'select');
    if (selects.length > 0) {
      actions.push({
        name: 'filter',
        target: selects[0].id,
        parameters: { option: 'string' },
        risk_level: 'low',
        description: 'Filter or sort results'
      });
    }

    // 3. Bulk Extract actions for detected entities
    if (entities.length > 0) {
      const types = Array.from(new Set(entities.map(e => e.type)));
      for (const t of types) {
        actions.push({
          name: 'bulk_extract',
          parameters: { entity_type: t },
          risk_level: 'low',
          description: `Bulk extract all ${t} entities in current view`
        });
      }
    }

    // 4. Form Submit actions
    for (const form of forms) {
      actions.push({
        name: 'submit_form',
        target: form.id,
        parameters: { fields: 'Record<string, any>' },
        risk_level: 'medium',
        description: `Fill and submit form: ${form.name}`
      });
    }

    // 5. Table extraction
    if (tables.length > 0) {
      actions.push({
        name: 'extract_table',
        target: tables[0].id,
        parameters: {},
        risk_level: 'low',
        description: 'Extract tabular records'
      });
    }

    // 6. Generic inspect action
    actions.push({
      name: 'inspect_page',
      parameters: {},
      risk_level: 'low',
      description: 'Get latest semantic page representation (AI DOM)'
    });

    return actions;
  }
}
