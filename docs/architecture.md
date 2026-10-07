# AgentBridge Architecture Specification

> **Make the existing web understandable, executable, and optimizable for AI agents without requiring websites to be redesigned for AI.**

---

## 1. High-Level System Architecture

AgentBridge is a semantic execution layer and middleware positioned between AI agents and arbitrary websites.

```text
┌────────────────────────────────────────────────────────┐
│                        AI AGENT                        │
│             Planning / Reasoning / Goal                │
└───────────────────────────┬────────────────────────────┘
                            │
                      WebSocket / MCP
                            │
┌───────────────────────────▼────────────────────────────┐
│                      AGENTBRIDGE                       │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Universal Web Observer                           │  │
│  │ (Inspects interactive elements, DOM, ARIA)       │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Deterministic Semantic Parser                    │  │
│  │ (Rule-first extraction: 0 latency, 0 tokens)     │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Local AI Semantic Engine                         │  │
│  │ (Qwen3-0.6B in-browser inference for ambiguity)  │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Universal Agent Web Representation (AI DOM)      │  │
│  │ (Compact entities, forms, tables, actions, state)│  │
│  └────────────────────────┬─────────────────────────┘  │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Task & State Engine                              │  │
│  │ (Lifecycle, progress, steps, event engine)       │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Optimization Engine                              │  │
│  │ (Pattern detection, bulk execution, state reuse) │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Safe Action Executor                             │  │
│  │ (Target resolution ladder, risk gating)          │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Verification & Recovery Engine                   │  │
│  │ (Post-state assertion, DOM re-scan, safe retry)  │  │
│  └────────────────────────┬─────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            ▼
                    EXISTING WEBPAGE
```

---

## 2. Deterministic-First Engineering Philosophy

A core rule of AgentBridge:

> **Do NOT use the LLM for things that deterministic browser code can reliably perform.**

```text
Webpage
   │
   ▼
Deterministic Extraction
   │
   ├── Meaning Obvious? (Buttons, links, inputs, tables, forms, pricing)
   │     └── YES ──> Direct Semantic Mapping (0 Tokens, ~5ms)
   │
   └── Ambiguous or Requires Natural Language Synthesis?
         └── NO  ──> Local AI Model (Qwen3-0.6B in-browser, ~150ms)
```

This ensures extreme speed, 0 API costs, privacy, and maximum determinism.

---

## 3. Universal Mode vs Specialized Connectors

AgentBridge operates in two modes:

1. **Universal Mode (Default)**:
   - Works on arbitrary, unknown websites without custom code.
   - Extracts products, articles, tables, forms, and interactive buttons using accessibility trees, ARIA roles, currency regex, headings, and DOM topology.
2. **Optional Specialized Connectors (`connectors/`)**:
   - Optional accelerators for high-traffic destinations (e.g., `GmailConnector`, `GitHubConnector`).
   - A connector is an optimization, **never a dependency**.
   - If no specialized connector matches, `GenericWebConnector` executes universal semantics.

---

## 4. Subsystems Breakdown

### Universal Web Observer (`src/semantic/universal-observer.ts`)
Inspects active pages, registers stable internal IDs (`el_001`, `el_002`), evaluates bounding rects and visibility, and extracts accessible labels.

### AI DOM Builder (`src/semantic/ai-dom-builder.ts`)
Constructs a compact representation consisting of:
- `page`: URL, title, application, page_type
- `elements`: Active interactive elements
- `entities`: Products, articles, emails, cards
- `forms`: Fields, types, required flags
- `tables`: Headers and row records
- `actions`: Discovered high-level operations (`search`, `filter`, `bulk_extract`, `submit_form`)
- `state`: Versioned browser state

### Target Resolution Ladder (`src/executor/target-resolver.ts`)
Resolves semantic references to live DOM nodes with a multi-strategy fallback:
1. Stable internal element ID
2. CSS selector
3. Accessible name / text anchor
4. ARIA role match
5. Structural re-scan

### Optimization Engine (`src/optimizer/optimization-engine.ts`)
Detects repetitive agent interaction loops (e.g. `[open, read, back]`) and replaces them with single bulk operations (e.g. `bulk_extract`). Tracks empirical metrics:
- Actions avoided
- LLM calls saved
- Latency reduction
