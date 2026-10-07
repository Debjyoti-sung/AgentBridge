# AgentBridge

> **Make the existing web understandable, executable, and optimizable for AI agents without requiring websites to be redesigned for AI.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-success.svg)](extension/manifest.json)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)](tests/)
[![Architecture](https://img.shields.io/badge/Design-Deterministic--First-orange.svg)](docs/architecture.md)

AgentBridge is an open-source, universal AI-agent browser execution and optimization infrastructure. It acts as a semantic execution middleware between AI agents and arbitrary websites, eliminating unnecessary low-level browser interactions (click-wait-screenshot-click loops) and replacing them with high-level semantic execution.

---

## ⚡ The Core Problem & Differentiator

### Current AI Browser Agents
```text
Observe webpage
→ Understand UI visually
→ Find element
→ Click
→ Wait for page load
→ Observe again
→ Interpret result
→ Click again
→ Repeat 15 times...
```
*Result: Extreme latency (~45s), high token consumption, fragility, and frequent failure opportunities.*

### With AgentBridge
```text
Existing Webpage
       ↓
AgentBridge Universal Observer
       ↓
Machine-Readable AI DOM (Entities, Forms, Actions, State)
       ↓
AI Agent chooses semantic intent (e.g., bulk_extract, search, submit_form)
       ↓
AgentBridge executes high-level operation natively
       ↓
Action verified in live DOM
```
*Result: 1 browser action instead of 45, 20x–30x faster execution, and 90%+ token savings.*

---

## 🏗️ Architecture

```text
                    USER
                      │
                      ▼
                 AI AGENT
          Planning / Reasoning / Goal
                      │
                MCP / WebSocket
                      │
                      ▼
             ┌─────────────────┐
             │   AGENTBRIDGE   │
             │ Chrome Extension│
             └────────┬────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Website A   Website B   Website C
   (E-Commerce)     (News)      (Forms)
          │           │           │
          └───────────┼───────────┘
                      ▼
                 ANY WEBSITE
```

### Deterministic-First Philosophy
AgentBridge does **not** make the language model responsible for every browser click.
- **Obvious elements & structure**: Parsed deterministically via rule-first code (0 tokens, ~5ms).
- **Ambiguous elements & summarization**: Handled by the local in-browser AI engine (Qwen3-0.6B).

---

## 🚀 Key Features

- **Universal Mode (Default)**: Operates out-of-the-box on arbitrary websites using DOM heuristics, accessibility trees, ARIA roles, currency patterns, and form structures without website-specific scrapers.
- **AI DOM (Semantic Page Model)**: Transforms noisy HTML into compact structured representations with stable internal element IDs (`el_001`), entities (products, articles, emails, cards), forms, tables, and actions.
- **Optimization Engine**: Automatically analyzes action history, detects repetitive patterns (e.g. `[open, read, back]`), and executes bulk semantic replacements.
- **Zero-Setup Local Runtime**: Runs directly in the Chrome Extension with in-browser local AI inference. No Python, no Ollama, no server, and no API keys required for end users.
- **Developer Side Panel**: Real-time interactive UI displaying active task goal, progress bar, step checklist with `[Optimized]` tags, live metrics (actions avoided, latency saved), and live **AI DOM Inspector**.
- **Security & Safety Gate**: 4-tier risk classification (Low, Medium, High, Critical) with automatic confirmation modals for sensitive operations and an emergency **Stop Agent** button.
- **Pluggable Connectors**: Optional specialized adapters (e.g. `GmailConnector`) can be added under `connectors/` without modifying core modules.

---

## 📊 Empirical Benchmarks

Measured on standard browser workflows comparing a traditional step-by-step agent vs AgentBridge:

| Category | Workflow | Actions (Base vs AB) | LLM Calls | Latency | Speedup |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Communication (Gmail)** | Summarize 15 unread emails | 45 → 1 (**-44**) | 16 → 1 (**-15**) | 42.0s → 1.42s | **29.6x** |
| **Shopping (E-Commerce)** | Find 3 cheapest laptops < ₹50k | 24 → 1 (**-23**) | 9 → 1 (**-8**) | 28.5s → 1.15s | **24.8x** |
| **Content (Articles)** | Read and summarize 6 stories | 18 → 1 (**-17**) | 7 → 1 (**-6**) | 22.0s → 0.98s | **22.4x** |
| **Productivity (Forms)** | Batch fill 5-field registration form | 12 → 1 (**-11**) | 5 → 1 (**-4**) | 9.2s → 0.42s | **21.9x** |

---

## 💻 Quickstart

### 1. Build the Chrome Extension
```bash
npm run build
```
This produces bundled artifacts in `extension/`:
- `extension/background.bundle.js`
- `extension/content.bundle.js`
- `extension/sidepanel.bundle.js`

### 2. Install in Chrome
1. Navigate to `chrome://extensions/` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `extension/` folder.
4. Click the AgentBridge icon in your toolbar to open the Side Panel.

### 3. Run Demonstrations
In the Side Panel, enter any task or click one of the quick demo buttons:
- 🛒 **Laptops < ₹50k**: Discovers products, extracts prices, and filters top 3 on any store.
- 📰 **News Articles**: Digests visible story headlines and generates an AI summary.
- 📝 **Signup Form**: Discovers input fields, maps user data, and executes batched submission.
- ✉️ **Gmail**: Extracts unread emails and synthesizes priority action items.

### 4. Run Tests & Benchmarks
```bash
# Run test suite
pytest

# Run empirical benchmark comparisons
python -m benchmarks.benchmark_runner
```

---

## 📁 Repository Structure

```text
agentbridge/
├── extension/                     # Chrome Manifest V3 Extension
│   ├── manifest.json              # Extension configuration
│   ├── sidepanel.html             # Developer Side Panel UI
│   ├── sidepanel.css              # Dark-mode responsive theme
│   ├── background.bundle.js       # Bundled service worker
│   ├── content.bundle.js          # Bundled content script
│   └── sidepanel.bundle.js        # Bundled UI controller
├── src/                           # TypeScript Core Subsystems
│   ├── semantic/                  # Universal Observer, AI DOM Builder, Entity Extractor
│   ├── executor/                  # Action Executor, Target Resolver, Verification Engine
│   ├── optimizer/                 # Pattern Detector, Optimization Engine, Safety
│   ├── state/                     # Browser State Engine, Event Engine
│   ├── tasks/                     # Task Engine & Lifecycle Coordinator
│   ├── safety/                    # Risk Engine & Confirmation Gating
│   ├── model/                     # Local AI Provider (Qwen in-browser) & Registry
│   ├── connectors/                # Connector Registry, Generic & Gmail Connectors
│   ├── communication/             # WebSocket & Protocol Handlers
│   ├── background/                # Service Worker Entry
│   ├── content/                   # Content Script Entry
│   ├── sidepanel/                 # Side Panel UI Controller
│   └── shared/                    # TypeScript Protocol & Data Types
├── agent/                         # Python Agent Runtime (Optional)
│   ├── tools/                     # Browser tool suite (Section 15)
│   ├── planner/                   # Universal Planner
│   ├── runner.py                  # Agent task coordinator
│   ├── optimizer.py               # Pattern detection & metric calculation
│   └── model_adapter.py           # Model adapter & deterministic fallback
├── server/                        # Backend Server (FastAPI + WebSocket)
│   └── main.py                    # Static mock server and WS endpoint
├── benchmarks/                    # Performance Benchmarking
│   └── benchmark_runner.py        # Baseline vs AgentBridge benchmark harness
├── tests/                         # Test Suite & Mock Pages
│   ├── mock_pages/                # Interactive mock pages (Store, News, Form, Gmail)
│   └── test_agentbridge.py        # Pytest test suite
├── docs/                          # Comprehensive Architecture Docs
│   ├── architecture.md
│   ├── protocol.md
│   ├── semantic-model.md
│   ├── optimization.md
│   ├── security.md
│   └── development.md
├── LICENSE                        # MIT License
└── README.md
```

---

## 🔒 Security & Privacy

AgentBridge prioritizes **local-first execution**. Webpage DOM data is processed locally inside the browser. High-risk operations (such as payments, account deletions, or sending emails) are strictly gated with human confirmation dialogs, and an emergency **Stop Agent** button is permanently available in the Side Panel.

See [docs/security.md](docs/security.md) for details.

---

## 📄 License

AgentBridge is open source under the [MIT License](LICENSE).
