import { DOMAnalyzer } from './dom-analyzer';
import { SemanticObject } from '../shared/protocol';

export interface ExtractedEmail {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  elementId: string;
}

export class GmailAdapter {
  public static isGmail(): boolean {
    const isDomain = window.location.hostname.includes('mail.google.com');
    const isMock = document.querySelector('[data-agentbridge-app="gmail"]') !== null ||
                   document.title.toLowerCase().includes('gmail');
    return isDomain || isMock;
  }

  public static getPageType(): string {
    const hash = window.location.hash || '';
    if (hash.includes('inbox') || hash === '' || hash === '#') return 'inbox';
    if (hash.includes('sent')) return 'sent';
    if (hash.includes('drafts')) return 'drafts';
    if (hash.includes('starred')) return 'starred';
    return 'inbox';
  }

  public static extractEmails(): ExtractedEmail[] {
    const emails: ExtractedEmail[] = [];

    // Standard Gmail table rows: tr.zA or elements with role="row" in Gmail table
    let emailRows = Array.from(document.querySelectorAll<HTMLElement>('tr.zA, [role="row"][data-agentbridge-email="true"], tr[jscontroller]'));
    
    // Fallback: check any tr in table with email-like structure if on Gmail
    if (emailRows.length === 0 && this.isGmail()) {
      emailRows = Array.from(document.querySelectorAll<HTMLElement>('table tbody tr'));
    }

    let index = 1;
    for (const row of emailRows) {
      if (!DOMAnalyzer.isVisible(row)) continue;

      // Unread detection: Gmail uses class 'zE' on tr for unread, 'yO' for read.
      // Also check font-weight or aria-label attributes or data-unread.
      const classList = row.className || '';
      const isUnreadClass = classList.includes('zE') || row.getAttribute('data-unread') === 'true';
      const isReadClass = classList.includes('yO');
      const hasBoldSubject = row.querySelector('b, [style*="font-weight: 700"], [style*="font-weight: bold"]') !== null;
      
      const unread = isUnreadClass || (!isReadClass && hasBoldSubject) || row.getAttribute('aria-label')?.toLowerCase().includes('unread') || false;

      // Extract sender
      const senderEl = row.querySelector('.yX .yW span, [email], .zF, [data-field="sender"], td:nth-child(2)');
      const sender = senderEl?.getAttribute('email') ||
                     senderEl?.getAttribute('name') ||
                     (senderEl?.textContent || '').trim() ||
                     'Unknown Sender';

      // Extract subject and snippet
      const subjectEl = row.querySelector('.y6 span, [data-field="subject"], td:nth-child(3)');
      const subject = (subjectEl?.textContent || '').trim() || 'No Subject';

      const snippetEl = row.querySelector('.y2, [data-field="snippet"]');
      const snippet = (snippetEl?.textContent || '').trim().replace(/^[\s\-–—]+/, '') || '';

      // Extract date/time
      const dateEl = row.querySelector('.xW span, [data-field="date"], td:last-child');
      const date = (dateEl?.getAttribute('title') || dateEl?.textContent || '').trim() || 'Today';

      const rowId = DOMAnalyzer.registerElement(row, 'gmail_row');

      emails.push({
        id: `email_${index++}`,
        sender,
        subject,
        snippet,
        date,
        unread: Boolean(unread),
        elementId: rowId
      });
    }

    return emails;
  }

  public static toSemanticObjects(): SemanticObject[] {
    const emails = this.extractEmails();
    return emails.map(e => ({
      id: e.id,
      type: 'email',
      role: 'email_thread',
      label: `${e.sender}: ${e.subject}`,
      sender: e.sender,
      subject: e.subject,
      snippet: e.snippet,
      date: e.date,
      unread: e.unread,
      metadata: {
        elementId: e.elementId
      }
    }));
  }
}
