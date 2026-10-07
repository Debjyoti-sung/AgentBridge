# AgentBridge Protocol Specification

This document defines the JSON-RPC message schemas and communication protocols between AI agents and the AgentBridge browser extension.

---

## 1. Transports

- **In-Browser Autonomous Mode**: Content script ↔ Background service worker ↔ Side Panel via Chrome Runtime messaging. (Zero install, 100% offline).
- **Agent Server Mode**: External AI Agent ↔ Extension via WebSocket (`ws://127.0.0.1:8765/ws/extension`) or MCP (Model Context Protocol).

---

## 2. Standard Message Envelope

```typescript
interface ProtocolMessage<T = any> {
  type: string;
  request_id: string;
  task_id?: string;
  payload: T;
  timestamp: number;
  state_version?: number;
}
```

---

## 3. Core RPC Methods

### `page.inspect`
Returns the compact **AI DOM** representing the active page.
```json
{
  "type": "page.inspect",
  "request_id": "req_101",
  "task_id": "task_001",
  "payload": { "forceFresh": true },
  "timestamp": 1728250000000
}
```

### `page.get_state`
Returns the versioned semantic browser state:
```json
{
  "type": "page.get_state",
  "request_id": "req_102",
  "task_id": "task_001",
  "payload": {},
  "timestamp": 1728250000100
}
```

### `action.execute`
Executes low-level or high-level semantic actions:
```json
{
  "type": "action.execute",
  "request_id": "req_103",
  "task_id": "task_001",
  "payload": {
    "action": {
      "name": "bulk_extract",
      "parameters": { "entity_type": "product" }
    }
  },
  "timestamp": 1728250000200
}
```

### `task.create` / `task.set_optimization`
Initializes a new autonomous workflow and syncs optimization savings:
```json
{
  "type": "task.set_optimization",
  "request_id": "opt_001",
  "task_id": "task_001",
  "payload": {
    "browser_actions_avoided": 23,
    "raw_actions_would_take": 24,
    "actual_actions_taken": 1,
    "model_calls_saved": 8,
    "latency_saved_ms": 27350.0,
    "strategy": "Bulk Semantic Extraction"
  },
  "timestamp": 1728250000300
}
```
