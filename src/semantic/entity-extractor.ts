import { SemanticEntity } from '../shared/protocol';
import { UniversalWebObserver } from './universal-observer';

export class UniversalEntityExtractor {
  private static entityCounter = 1;

  public static reset(): void {
    this.entityCounter = 1;
  }

  public static extractEntities(): SemanticEntity[] {
    const entities: SemanticEntity[] = [];

    // 1. Extract Products (Universal e-commerce heuristics)
    const products = this.extractProducts();
    entities.push(...products);

    // 2. Extract Articles (Universal content heuristics)
    const articles = this.extractArticles();
    entities.push(...articles);

    // 3. Extract Message/Email items (Universal messaging/table heuristics)
    const messages = this.extractMessages();
    entities.push(...messages);

    // 4. Extract Generic Repeated Cards (if not already extracted)
    if (entities.length === 0) {
      const genericCards = this.extractGenericCards();
      entities.push(...genericCards);
    }

    return entities;
  }

  /**
   * Universal Product Extraction: Detects items with titles and price currency symbols
   */
  public static extractProducts(): SemanticEntity[] {
    const products: SemanticEntity[] = [];
    const priceRegex = /(?:₹|Rs\.?|\$|€|£|¥)\s*[\d,]+(?:\.\d{2})?|[\d,]+(?:\.\d{2})?\s*(?:INR|USD|EUR|GBP)/i;

    // Potential product containers
    const containers = Array.from(document.querySelectorAll<HTMLElement>(
      '[data-entity="product"], .product-card, .product-item, .product, article, [role="listitem"], .card, div[class*="item"], li[class*="product"]'
    ));

    for (const container of containers) {
      if (!UniversalWebObserver.isVisible(container)) continue;

      const text = container.innerText || '';
      const priceMatch = text.match(priceRegex);

      if (priceMatch) {
        // Find title / name
        const titleEl = container.querySelector<HTMLElement>('h1, h2, h3, h4, .title, .product-title, .name, [data-field="title"], a[title]');
        const name = (titleEl?.innerText || titleEl?.textContent || container.querySelector('a')?.innerText || '').trim();

        if (name && name.length > 2 && name.length < 150) {
          const rawPrice = priceMatch[0].trim();
          const numericPrice = parseFloat(rawPrice.replace(/[^\d.]/g, '')) || 0;

          // Find rating if any
          const ratingMatch = text.match(/(?:★|rating:?|\bstar[s]?:?)\s*(\d(?:\.\d)?)/i);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

          // Find action button (e.g., Buy, Add to cart)
          const actionBtn = container.querySelector<HTMLElement>('button, a.btn, [role="button"]');
          const elementRefs: string[] = [];
          if (actionBtn) {
            const btnId = UniversalWebObserver.registerElement(actionBtn, 'buy_btn');
            elementRefs.push(btnId);
          }
          const containerId = UniversalWebObserver.registerElement(container, 'product');
          elementRefs.push(containerId);

          products.push({
            id: `entity_prod_${this.entityCounter++}`,
            type: 'product',
            name,
            attributes: {
              price: rawPrice,
              price_numeric: numericPrice,
              rating,
              snippet: text.slice(0, 200).replace(/\s+/g, ' ')
            },
            elementRefs,
            confidence: 0.95
          });
        }
      }
    }

    return products;
  }

  /**
   * Universal Article Extraction: Detects headings with paragraphs/previews
   */
  public static extractArticles(): SemanticEntity[] {
    const articles: SemanticEntity[] = [];

    const articleContainers = Array.from(document.querySelectorAll<HTMLElement>(
      'article, [data-entity="article"], .article-card, .post-item, .news-item, .blog-post'
    ));

    for (const container of articleContainers) {
      if (!UniversalWebObserver.isVisible(container)) continue;

      const titleEl = container.querySelector<HTMLElement>('h1, h2, h3, h4, .post-title, .article-title, a[rel="bookmark"]');
      const name = (titleEl?.innerText || titleEl?.textContent || '').trim();

      const bodyEl = container.querySelector<HTMLElement>('p, .summary, .snippet, [data-field="snippet"], .content');
      const snippet = (bodyEl?.innerText || bodyEl?.textContent || '').trim();

      if (name && name.length > 3) {
        const containerId = UniversalWebObserver.registerElement(container, 'article');
        const elementRefs = [containerId];

        const readMoreBtn = container.querySelector<HTMLElement>('a, button');
        if (readMoreBtn) {
          elementRefs.push(UniversalWebObserver.registerElement(readMoreBtn, 'read_more'));
        }

        articles.push({
          id: `entity_art_${this.entityCounter++}`,
          type: 'article',
          name,
          attributes: {
            headline: name,
            snippet: snippet.slice(0, 300),
            full_text: container.innerText.slice(0, 1000)
          },
          elementRefs,
          confidence: 0.92
        });
      }
    }

    return articles;
  }

  /**
   * Universal Message / Email Extraction: Detects rows with sender/subject/snippet
   */
  public static extractMessages(): SemanticEntity[] {
    const messages: SemanticEntity[] = [];

    const rows = Array.from(document.querySelectorAll<HTMLElement>(
      '[data-entity="email"], tr.zA, [role="row"][data-unread], [data-field="email-row"], .email-row, .message-item'
    ));

    for (const row of rows) {
      if (!UniversalWebObserver.isVisible(row)) continue;

      const senderEl = row.querySelector<HTMLElement>('[data-field="sender"], .sender, [email], .zF, td:nth-child(2)');
      const sender = (senderEl?.getAttribute('email') || senderEl?.innerText || 'Unknown').trim();

      const subjectEl = row.querySelector<HTMLElement>('[data-field="subject"], .subject, .y6 span, td:nth-child(3)');
      const subject = (subjectEl?.innerText || subjectEl?.textContent || 'No Subject').trim();

      const snippetEl = row.querySelector<HTMLElement>('[data-field="snippet"], .snippet, .y2');
      const snippet = (snippetEl?.innerText || snippetEl?.textContent || '').trim();

      const dateEl = row.querySelector<HTMLElement>('[data-field="date"], .date, .xW span, td:last-child');
      const date = (dateEl?.innerText || dateEl?.textContent || 'Today').trim();

      const unreadAttr = row.getAttribute('data-unread');
      const hasUnreadClass = row.className.includes('zE') || unreadAttr === 'true';
      const hasBold = row.querySelector('b, [style*="font-weight: 700"], [style*="font-weight: bold"]') !== null;
      const isUnread = hasUnreadClass || hasBold;

      const rowId = UniversalWebObserver.registerElement(row, 'msg_row');

      messages.push({
        id: `entity_msg_${this.entityCounter++}`,
        type: 'email',
        name: `${sender}: ${subject}`,
        attributes: {
          sender,
          subject,
          snippet,
          date,
          unread: isUnread
        },
        elementRefs: [rowId],
        confidence: 0.98
      });
    }

    return messages;
  }

  /**
   * Generic Repeated Card Detection: Fallback for arbitrary structured list/cards
   */
  public static extractGenericCards(): SemanticEntity[] {
    const cards: SemanticEntity[] = [];
    const cardCandidates = Array.from(document.querySelectorAll<HTMLElement>(
      '.card, .list-group-item, li[class*="item"], div[class*="card"]'
    ));

    if (cardCandidates.length >= 2) {
      for (const card of cardCandidates.slice(0, 30)) {
        if (!UniversalWebObserver.isVisible(card)) continue;
        const heading = card.querySelector('h1, h2, h3, h4, strong')?.textContent?.trim();
        const text = card.innerText.trim();
        if (heading || text) {
          const cardId = UniversalWebObserver.registerElement(card, 'card');
          cards.push({
            id: `entity_item_${this.entityCounter++}`,
            type: 'generic_item',
            name: heading || text.slice(0, 50),
            attributes: {
              content: text.slice(0, 300)
            },
            elementRefs: [cardId],
            confidence: 0.8
          });
        }
      }
    }
    return cards;
  }
}
