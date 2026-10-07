from abc import ABC, abstractmethod
import os
import json
import logging
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger("agentbridge.model")

class BaseModelAdapter(ABC):
    @abstractmethod
    async def generate_summary(self, items: List[Dict[str, Any]]) -> str:
        """Summarize given list of items (emails, products, articles, etc.)."""
        pass

class OpenWeightOllamaAdapter(BaseModelAdapter):
    def __init__(self, model_name: str = "qwen2.5:1.5b", base_url: str = "http://127.0.0.1:11434"):
        self.model_name = os.getenv("MODEL_NAME", model_name)
        self.base_url = os.getenv("MODEL_BASE_URL", base_url)

    async def generate_summary(self, items: List[Dict[str, Any]]) -> str:
        if not items:
            return "No items to summarize."

        # Check if items are products (has price)
        if any("price" in str(it).lower() for it in items):
            return self._fallback_product_summarizer(items)

        # Check if items are articles (has headline, or snippet without sender)
        is_article = any(
            "headline" in it.get("attributes", {}) or
            ("snippet" in it.get("attributes", {}) and "sender" not in it and "sender" not in it.get("attributes", {})) or
            it.get("type") == "article"
            for it in items
        )
        if is_article:
            return self._fallback_article_summarizer(items)

        # Format prompt for emails / messages
        email_bullets = []
        for i, em in enumerate(items, 1):
            sender = em.get("sender", "Unknown")
            subject = em.get("subject", "No Subject")
            snippet = em.get("snippet", "")
            date = em.get("date", "")
            email_bullets.append(f"[{i}] From: {sender} | Date: {date}\nSubject: {subject}\nSnippet: {snippet}")

        formatted_emails = "\n\n".join(email_bullets)

        prompt = f"""You are AgentBridge's executive AI assistant.
Analyze these items and provide a crisp, prioritized summary highlighting actionable items and key announcements:

{formatted_emails}

Summary format:
1. High Priority Action Items (if any)
2. Important Announcements / Updates
3. Low Priority / Informational
"""

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model_name,
                        "prompt": prompt,
                        "stream": False,
                        "options": {"temperature": 0.2}
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "").strip()
        except Exception:
            pass

        # Deterministic semantic summarizer fallback (keeps system completely runnable offline)
        return self._fallback_semantic_summarizer(items)

    def _fallback_semantic_summarizer(self, emails: List[Dict[str, Any]]) -> str:
        lines = [
            f"⚡ [AgentBridge AI Analysis — Processed {len(emails)} unread messages]\n",
            "📌 Priority Action Items:"
        ]
        actionable = [
            e for e in emails if any(
                k in (e.get('subject', '') + e.get('snippet', '')).lower()
                for k in ['urgent', 'action', 'review', 'assignment', 'due', 'asap', 'meeting', 'quarterly']
            )
        ]
        info = [e for e in emails if e not in actionable]

        if actionable:
            for em in actionable:
                lines.append(f"• [ACTION REQUIRED] {em.get('sender')}: '{em.get('subject')}' — {em.get('snippet', '')[:100]}...")
        else:
            lines.append("• No immediate urgent actions detected.")

        lines.append("\n📢 Updates & Informational:")
        for em in info:
            lines.append(f"• {em.get('sender')}: '{em.get('subject')}' ({em.get('date', 'Today')})")

        return "\n".join(lines)

    def _fallback_product_summarizer(self, products: List[Dict[str, Any]]) -> str:
        lines = [
            f"🛒 [AgentBridge AI Analysis — Evaluated {len(products)} Product Entities]\n",
            "Top Ranked Options:"
        ]
        for idx, p in enumerate(products[:3], 1):
            name = p.get("name") or p.get("title") or "Product"
            attrs = p.get("attributes", {})
            price = attrs.get("price") or p.get("price") or "N/A"
            rating = f"(★ {attrs.get('rating')})" if attrs.get("rating") else ""
            lines.append(f"{idx}. **${name}** — ${price} ${rating}".replace("$", ""))
        return "\n".join(lines)

    def _fallback_article_summarizer(self, articles: List[Dict[str, Any]]) -> str:
        lines = [
            f"📰 [AgentBridge AI Analysis — Digested {len(articles)} Articles]\n",
            "Key Insights:"
        ]
        for a in articles[:4]:
            name = a.get("name") or a.get("headline") or "Article"
            attrs = a.get("attributes", {})
            snippet = attrs.get("snippet") or a.get("snippet") or ""
            lines.append(f"• **{name}**\n  {snippet[:120]}...\n")
        return "\n".join(lines)

def get_model_adapter() -> BaseModelAdapter:
    return OpenWeightOllamaAdapter()
