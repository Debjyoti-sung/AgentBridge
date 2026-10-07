# AgentBridge Development Guide

## Prerequisites
- Node.js 18+ (for extension build tooling)
- Python 3.10+ (for backend runner & pytest suite)
- Chrome / Chromium browser (Manifest V3)

---

## 1. Building the Chrome Extension

Build all extension bundles (background service worker, content script, and side panel UI):

```bash
# Using npm
npm run build

# Or using esbuild directly
npx esbuild src/background/service-worker.ts --bundle --outfile=extension/background.bundle.js --format=esm
npx esbuild src/content/index.ts --bundle --outfile=extension/content.bundle.js
npx esbuild src/sidepanel/index.ts --bundle --outfile=extension/sidepanel.bundle.js
```

---

## 2. Installing the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `extension/` directory from this repository.
5. Click the AgentBridge icon in your Chrome toolbar to open the Side Panel.

---

## 3. Running the Test Suite

Run unit and integration tests with pytest:

```bash
pytest
```

---

## 4. Running Benchmarks

Measure empirical savings across all 4 categories (Shopping, Articles, Forms, Gmail):

```bash
python -m benchmarks.benchmark_runner
```

---

## 5. Starting the Backend Server (Optional)

AgentBridge runs completely standalone in the browser without a backend. To run the optional Python agent coordinator and WebSocket server:

```bash
python -m uvicorn server.main:app --host 127.0.0.1 --port 8765
```

Access mock test pages at:
- `http://127.0.0.1:8765/mock/laptop_store_mock.html`
- `http://127.0.0.1:8765/mock/tech_news_mock.html`
- `http://127.0.0.1:8765/mock/signup_form_mock.html`
- `http://127.0.0.1:8765/mock/gmail_mock.html`
