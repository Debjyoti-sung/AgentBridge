# AgentBridge Semantic Page Model (AI DOM)

The **AI DOM** is a universal, machine-readable abstraction of a webpage designed specifically for AI browser agents. Instead of dumping raw, noisy HTML or thousands of DOM nodes into a language model, AgentBridge extracts structured semantic representations.

---

## 1. Top-Level Page Schema

```typescript
interface SemanticPage {
  url: string;
  domain: string;
  application: string;  // "generic" | "e-commerce" | "content" | "gmail" | "form_portal"
  page_type: string;    // "webpage" | "product_listing" | "article_listing" | "form" | "inbox"
  title: string;
  elements: SemanticElement[];
  entities: SemanticEntity[];
  actions: SemanticAction[];
  forms: SemanticForm[];
  tables: SemanticTable[];
  navigation: SemanticNavigation[];
  state: BrowserState;
  timestamp: number;
}
```

---

## 2. Semantic Elements (`SemanticElement`)

Every interactive control maintains a stable internal ID:

```json
{
  "id": "button_001",
  "type": "button",
  "role": "button",
  "label": "Add to Cart",
  "visible": true,
  "enabled": true,
  "confidence": 1.0,
  "source": "deterministic",
  "rect": { "top": 420, "left": 180, "width": 140, "height": 36 }
}
```

For AI-inferred elements:
```json
{
  "id": "icon_014",
  "type": "button",
  "role": "button",
  "label": "Download Report",
  "confidence": 0.88,
  "source": "llm",
  "semantic_role": "download_report"
}
```

---

## 3. Semantic Entities (`SemanticEntity`)

AgentBridge identifies repeating structured real-world objects across arbitrary websites:

### E-Commerce Products
```json
{
  "id": "entity_prod_001",
  "type": "product",
  "name": "Lenovo IdeaPad Slim 3",
  "attributes": {
    "price": "₹38,990",
    "price_numeric": 38990,
    "rating": 4.2,
    "snippet": "Intel Core i3 12th Gen • 8GB RAM • 512GB SSD"
  },
  "elementRefs": ["product_001", "buy_btn_001"],
  "confidence": 0.95
}
```

### News & Articles
```json
{
  "id": "entity_art_001",
  "type": "article",
  "name": "WebGPU Standards Bring Local SLMs to Browser",
  "attributes": {
    "headline": "WebGPU Standards Bring Local SLMs to Browser",
    "snippet": "Hardware acceleration enables zero-install inference...",
    "full_text": "..."
  },
  "elementRefs": ["article_001"],
  "confidence": 0.92
}
```

### Messages / Emails
```json
{
  "id": "entity_msg_001",
  "type": "email",
  "name": "DeepMind: Architecture Review",
  "attributes": {
    "sender": "DeepMind Research",
    "subject": "Architecture Review",
    "snippet": "Attached is the AgentBridge specification...",
    "date": "10:30 AM",
    "unread": true
  },
  "elementRefs": ["msg_row_001"],
  "confidence": 0.98
}
```

---

## 4. Forms & Tables

### Semantic Forms (`SemanticForm`)
```json
{
  "id": "form_1",
  "name": "Registration",
  "submit_element_id": "submit_001",
  "fields": [
    {
      "id": "field_name",
      "element_id": "field_001",
      "name": "name",
      "label": "Full Name",
      "type": "text",
      "required": true
    },
    {
      "id": "field_role",
      "element_id": "field_002",
      "name": "role",
      "label": "Engineering Role",
      "type": "select",
      "required": true,
      "options": ["engineer", "product", "researcher"]
    }
  ]
}
```
