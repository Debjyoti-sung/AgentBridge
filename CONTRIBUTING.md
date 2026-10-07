# Contributing to AgentBridge

Thank you for your interest in contributing to **AgentBridge**!

AgentBridge is an open-source, universal AI-agent browser execution and optimization infrastructure designed to make the existing web understandable, executable, and optimizable for AI agents.

---

## Core Engineering Principles

1. **Deterministic-First**: Use deterministic browser code wherever possible. Use AI models only for semantic ambiguity, complex classification, or natural-language synthesis.
2. **Universal-First**: The core system must work on arbitrary websites without specialized connectors. Connectors are optional optimizations, never dependencies.
3. **Privacy & Local Execution**: Prefer local, in-browser execution with zero user setup. Never transmit sensitive webpage DOM unnecessarily.
4. **Safety & Verification**: Every action must be verified against live DOM state. High-risk actions must always be gated with user confirmation.

---

## Development Workflow

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Run tests:
   ```bash
   pytest
   ```
5. Follow strict TypeScript typing and PEP 8 guidelines.
6. Open a Pull Request with a clear description of the enhancement or bug fix.
