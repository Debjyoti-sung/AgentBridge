import asyncio
import logging
import time
from typing import Any, Dict, List, Optional
from shared.protocol import BrowserAction, ProtocolMessage

logger = logging.getLogger("agentbridge.tools")

class AgentBridgeTools:
    def __init__(self, send_func):
        self._send = send_func

    # 1. Browser Low-Level Tools
    async def browser_navigate(self, url: str) -> Dict[str, Any]:
        return await self._send("action.execute", {"action": {"name": "navigate", "parameters": {"url": url}}})

    async def browser_click(self, target: Optional[str] = None, selector: Optional[str] = None) -> Dict[str, Any]:
        return await self._send("action.execute", {"action": {"name": "click", "target": target, "selector": selector}})

    async def browser_type(self, value: str, target: Optional[str] = None, selector: Optional[str] = None) -> Dict[str, Any]:
        return await self._send("action.execute", {"action": {"name": "type", "value": value, "target": target, "selector": selector}})

    async def browser_scroll(self, distance: int = 500, direction: str = "down") -> Dict[str, Any]:
        return await self._send("action.execute", {"action": {"name": "scroll", "parameters": {"distance": distance, "direction": direction}}})

    async def browser_keypress(self, key: str = "Enter") -> Dict[str, Any]:
        return await self._send("action.execute", {"action": {"name": "keypress", "parameters": {"key": key}}})

    async def browser_verify(self) -> Dict[str, Any]:
        return await self._send("page.get_state", {})

    # 2. Page Semantic Tools
    async def page_inspect(self, force_fresh: bool = True) -> Dict[str, Any]:
        return await self._send("page.inspect", {"forceFresh": force_fresh})

    async def page_get_state(self) -> Dict[str, Any]:
        return await self._send("page.get_state", {})

    async def page_extract(self) -> Dict[str, Any]:
        return await self._send("action.execute", {"action": {"name": "extract"}})

    async def page_get_elements(self) -> List[Dict[str, Any]]:
        page = await self.page_inspect()
        return page.get("elements", [])

    async def page_get_actions(self) -> List[Dict[str, Any]]:
        page = await self.page_inspect()
        return page.get("actions", [])

    # 3. High-Level Semantic & Bulk Actions
    async def bulk_extract(self, entity_type: str = "all") -> Dict[str, Any]:
        return await self._send("action.execute", {"action": {"name": "bulk_extract", "parameters": {"entity_type": entity_type}}})

    # 4. Optimizer Tools
    async def optimizer_analyze(self) -> Dict[str, Any]:
        return await self._send("optimizer.analyze", {})

    async def optimizer_calculate_metrics(self, item_count: int, actions_per_item: int = 3) -> Dict[str, Any]:
        return await self._send("optimizer.calculate_metrics", {"item_count": item_count, "actions_per_item": actions_per_item})
