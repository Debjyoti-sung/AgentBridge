# AgentBridge Security & Privacy Model

## 1. Action Risk Classification

AgentBridge enforces a strict 4-tier risk classification model for all actions:

| Risk Tier | Examples | Execution Policy |
| :--- | :--- | :--- |
| **Low** | `page.inspect`, `extract`, `bulk_extract`, `scroll`, `navigate`, `search`, `filter` | **Allowed automatically** |
| **Medium** | `type` (non-sensitive inputs), `submit_form` | **Allowed with logging & state checkpoint** |
| **High** | `send`, `delete`, `purchase`, `buy`, `archive` | **User Confirmation Required in Side Panel** |
| **Critical** | Financial transactions, credential changes, security settings | **Blocked by default** |

---

## 2. Human-in-the-Loop Confirmation Gating

Before any High-Risk action executes, the Safe Action Executor checks the active policy. If confirmation is required, execution pauses and prompts the user in the Side Panel. The user can review the exact parameters before deciding to approve or reject the action.

---

## 3. Emergency Stop Agent

An emergency **Stop Agent** button is permanently displayed in the Side Panel header. Clicking Stop Agent immediately:
- Aborts active DOM actions and pending promises
- Transitions task status to `cancelled`
- Notifies the AI agent and server to cease further commands

---

## 4. Privacy & Local-First Processing

AgentBridge is architected around privacy:
- **Local-First**: Webpage DOM is observed and parsed locally inside the Chrome Extension content script and service worker.
- **Zero Cloud Transmission**: Webpage DOM content is not transmitted to external cloud services.
- **Deterministic Filtering**: Raw HTML is never sent over external networks; only compact, structured task-relevant entities are processed.
