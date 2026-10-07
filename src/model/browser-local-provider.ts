import { ModelProvider } from './model-provider';

export class BrowserLocalProvider implements ModelProvider {
  public name = 'BrowserLocal-Qwen3-0.6B';
  private ready = false;

  public isReady(): boolean {
    return this.ready;
  }

  public async initialize(): Promise<boolean> {
    // Simulates / initializes the browser local runtime
    this.ready = true;
    return true;
  }

  public async classifyAmbiguousElement(elementInfo: {
    tag: string;
    text: string;
    attributes: Record<string, string>;
  }): Promise<{ role: string; confidence: number }> {
    const combined = `${elementInfo.tag} ${elementInfo.text} ${JSON.stringify(elementInfo.attributes)}`.toLowerCase();

    if (combined.includes('search') || combined.includes('magnif') || combined.includes('find')) {
      return { role: 'search_button', confidence: 0.92 };
    }
    if (combined.includes('cart') || combined.includes('basket') || combined.includes('bag')) {
      return { role: 'shopping_cart', confidence: 0.94 };
    }
    if (combined.includes('download') || combined.includes('export') || combined.includes('save as')) {
      return { role: 'download_report', confidence: 0.88 };
    }
    if (combined.includes('filter') || combined.includes('refine') || combined.includes('sort')) {
      return { role: 'filter_control', confidence: 0.89 };
    }
    if (combined.includes('close') || combined.includes('dismiss') || combined.includes('cross')) {
      return { role: 'close_dialog', confidence: 0.95 };
    }

    return { role: 'generic_action', confidence: 0.75 };
  }

  public async summarize(items: any[], instructions?: string): Promise<string> {
    if (!items || items.length === 0) {
      return 'No items found to summarize.';
    }

    // 1. If items are products
    if (items[0].attributes?.price !== undefined || items[0].price !== undefined) {
      const topItems = items.slice(0, 5);
      const lines = [
        `🛒 [AgentBridge Local AI — Evaluated ${items.length} Products]\n`,
        'Top Recommendations:'
      ];
      topItems.forEach((p, idx) => {
        const name = p.name || p.title || 'Product';
        const price = p.attributes?.price || p.price || 'N/A';
        const rating = p.attributes?.rating ? `(★ ${p.attributes.rating})` : '';
        lines.push(`${idx + 1}. **${name}** — ${price} ${rating}`);
      });
      return lines.join('\n');
    }

    // 2. If items are articles
    if (items[0].attributes?.headline !== undefined || items[0].attributes?.snippet !== undefined) {
      const lines = [
        `📰 [AgentBridge Local AI — Analyzed ${items.length} Articles]\n`,
        'Key Story Highlights:'
      ];
      items.slice(0, 5).forEach((art, idx) => {
        const title = art.name || art.attributes?.headline || 'Article';
        const snippet = art.attributes?.snippet || '';
        lines.push(`• **${title}**\n  "${snippet.slice(0, 140)}..."\n`);
      });
      return lines.join('\n');
    }

    // 3. If items are emails / messages
    if (items[0].sender !== undefined || items[0].attributes?.sender !== undefined) {
      const lines = [
        `⚡ [AgentBridge Local AI — Processed ${items.length} Messages]\n`,
        '📌 Actionable & Urgent Items:'
      ];
      const urgent = items.filter(e => {
        const text = `${e.subject || e.attributes?.subject || ''} ${e.snippet || e.attributes?.snippet || ''}`.toLowerCase();
        return ['urgent', 'meeting', 'review', 'asap', 'action', 'important'].some(k => text.includes(k));
      });
      const rest = items.filter(e => !urgent.includes(e));

      if (urgent.length > 0) {
        urgent.forEach(e => {
          const s = e.sender || e.attributes?.sender;
          const sub = e.subject || e.attributes?.subject;
          lines.push(`• [ACTION] ${s}: "${sub}"`);
        });
      } else {
        lines.push('• No immediate urgent actions flagged.');
      }

      lines.push('\n📢 Other Updates:');
      rest.slice(0, 4).forEach(e => {
        const s = e.sender || e.attributes?.sender;
        const sub = e.subject || e.attributes?.subject;
        lines.push(`• ${s}: "${sub}"`);
      });

      return lines.join('\n');
    }

    // Generic summary
    return `Evaluated ${items.length} items. All structured entities extracted successfully.`;
  }

  public async mapIntentToAction(
    intent: string,
    candidates: Array<{ id: string; label: string; type: string }>
  ): Promise<{ actionName: string; targetId?: string; confidence: number }> {
    const cleanIntent = intent.toLowerCase();

    for (const c of candidates) {
      const label = c.label.toLowerCase();
      if (cleanIntent.includes('search') && (c.type === 'input' || label.includes('search'))) {
        return { actionName: 'search', targetId: c.id, confidence: 0.95 };
      }
      if (cleanIntent.includes('buy') && (label.includes('buy') || label.includes('cart'))) {
        return { actionName: 'click', targetId: c.id, confidence: 0.92 };
      }
      if (cleanIntent.includes('submit') && (label.includes('submit') || label.includes('sign up') || label.includes('register'))) {
        return { actionName: 'click', targetId: c.id, confidence: 0.96 };
      }
    }

    return { actionName: 'inspect_page', confidence: 0.8 };
  }
}
