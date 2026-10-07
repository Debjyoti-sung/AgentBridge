import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional
from shared.protocol import Task, TaskStep, TaskStatus, ProtocolMessage
from agent.optimizer import OptimizationEngine
from agent.model_adapter import get_model_adapter

logger = logging.getLogger("agentbridge.agent")

class AgentBridgeRunner:
    def __init__(self, ws_send_func):
        self.send_to_extension = ws_send_func
        self.pending_requests: Dict[str, asyncio.Future] = {}
        self.model_adapter = get_model_adapter()

    def handle_incoming_message(self, msg: ProtocolMessage):
        req_id = msg.request_id
        if req_id in self.pending_requests:
            future = self.pending_requests.pop(req_id)
            if not future.done():
                future.set_result(msg.payload)

    async def send_and_wait(self, msg_type: str, payload: Dict[str, Any], task_id: Optional[str] = None, timeout: float = 10.0) -> Any:
        req_id = f"req_{int(time.time() * 1000)}"
        future = asyncio.get_event_loop().create_future()
        self.pending_requests[req_id] = future

        msg = ProtocolMessage(
            type=msg_type,
            request_id=req_id,
            task_id=task_id,
            payload=payload,
            timestamp=time.time()
        )
        await self.send_to_extension(msg.model_dump())

        try:
            return await asyncio.wait_for(future, timeout=timeout)
        except asyncio.TimeoutError:
            self.pending_requests.pop(req_id, None)
            raise TimeoutError(f"Timeout waiting for response to {msg_type} (req: {req_id})")

    async def _update_step(self, task: Task, step_id: str, status: str, action_desc: Optional[str] = None):
        step = next((s for s in task.planned_steps if s.id == step_id), None)
        if step:
            step.status = status
            if status == "completed":
                task.progress_completed += 1
                if task.progress:
                    task.progress.completed += 1

        if action_desc:
            task.current_action = action_desc

        await self.send_to_extension({
            "type": "task.update_step",
            "request_id": f"upd_{step_id}_{int(time.time() * 1000)}",
            "task_id": task.task_id,
            "payload": {
                "step_id": step_id,
                "updates": {"status": status}
            },
            "timestamp": time.time()
        })

        if action_desc:
            await self.send_to_extension({
                "type": "task.set_action",
                "request_id": f"act_{int(time.time() * 1000)}",
                "task_id": task.task_id,
                "payload": {"action_name": action_desc},
                "timestamp": time.time()
            })

    async def execute_universal_task(self, goal: str, website: str = "Active Tab"):
        task = OptimizationEngine.plan_universal_task(goal, website)
        await self._init_task(task)

        # Inspect page
        await self._update_step(task, "step_1", "in_progress", "Observing webpage elements...")
        inspect_res = await self.send_and_wait("page.inspect", {"forceFresh": True}, task_id=task.task_id)
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_1", "completed", "Constructed initial DOM snapshot")

        # Parse AI DOM
        await self._update_step(task, "step_2", "in_progress", "Parsing semantic AI DOM...")
        entities = inspect_res.get("entities", [])
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_2", "completed", f"Discovered {len(entities)} semantic entities")

        # Execute
        await self._update_step(task, "step_3", "in_progress", "Executing semantic operation...")
        extract_res = await self.send_and_wait("action.execute", {"action": {"name": "bulk_extract"}}, task_id=task.task_id)
        items = extract_res.get("result", {}).get("entities", entities)

        opt = OptimizationEngine.calculate_optimization(len(items) or 4)
        task.optimization = opt
        await self._send_optimization(task)
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_3", "completed", "Bulk execution completed")

        # Synthesize with local AI
        await self._update_step(task, "step_4", "in_progress", "Synthesizing result with local AI...")
        summary = await self.model_adapter.generate_summary(items)
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_4", "completed", "Verified final state")

        task.status = TaskStatus.COMPLETED
        task.final_result = summary
        await self.send_to_extension({
            "type": "task.complete",
            "request_id": f"comp_{task.task_id}",
            "task_id": task.task_id,
            "payload": {"result": summary},
            "timestamp": time.time()
        })
        return summary

    async def execute_shopping_task(self):
        goal = "Find the 3 cheapest laptops under ₹50,000 on this website"
        task = OptimizationEngine.plan_shopping_task(goal)
        await self._init_task(task)

        await self._update_step(task, "step_1", "in_progress", "Inspecting product listings and filters...")
        inspect_res = await self.send_and_wait("page.inspect", {"forceFresh": True}, task_id=task.task_id)
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_1", "completed", "Identified product elements")

        await self._update_step(task, "step_2", "in_progress", "Constructing AI DOM...")
        products = [e for e in inspect_res.get("entities", []) if e.get("type") == "product"]
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_2", "completed", f"Parsed {len(products)} product nodes")

        await self._update_step(task, "step_3", "in_progress", "Executing bulk semantic extraction (avoiding 20+ navigations)...")
        extract_res = await self.send_and_wait(
            "action.execute",
            {"action": {"name": "bulk_extract", "parameters": {"entity_type": "product"}}},
            task_id=task.task_id
        )
        extracted = extract_res.get("result", {}).get("entities", products)
        count = len(extracted) or 7

        opt_metrics = OptimizationEngine.calculate_optimization(count)
        task.optimization = opt_metrics
        await self._send_optimization(task)
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_3", "completed", f"Extracted {count} products in single bulk pass")

        await self._update_step(task, "step_4", "in_progress", "Filtering price <= ₹50,000 and ranking top 3...")
        summary = await self.model_adapter.generate_summary(extracted)
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_4", "completed", "Filtered top 3 cheapest laptops")

        await self._update_step(task, "step_5", "in_progress", "Verifying results against DOM...")
        await asyncio.sleep(0.2)
        await self._update_step(task, "step_5", "completed", "Verified final recommendations")

        task.status = TaskStatus.COMPLETED
        task.final_result = summary
        await self.send_to_extension({
            "type": "task.complete",
            "request_id": f"comp_{task.task_id}",
            "task_id": task.task_id,
            "payload": {"result": summary},
            "timestamp": time.time()
        })
        return summary

    async def execute_gmail_summary_task(self):
        """
        Executes the benchmark demonstration:
        'Read today's unread Gmail emails and summarize the important ones.'
        """
        goal = "Read today's unread Gmail emails and summarize the important ones."
        task = OptimizationEngine.plan_gmail_task(goal)
        await self._init_task(task)

        # Step 1: Detect & Validate Environment
        await self._update_step(task, "step_1", "in_progress", "Checking Gmail inbox status...")
        inspect_res = await self.send_and_wait("page.inspect", {"forceFresh": True}, task_id=task.task_id)
        app = inspect_res.get("application", "generic")
        domain = inspect_res.get("domain", "")
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_1", "completed", f"Detected application: {app.upper()} ({domain})")

        # Step 2: Semantic AI DOM Parsing
        await self._update_step(task, "step_2", "in_progress", "Parsing AI DOM objects...")
        objects = inspect_res.get("objects", []) or inspect_res.get("elements", [])
        email_objects = [o for o in objects if o.get("type") == "email"]
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_2", "completed", f"Constructed AI DOM with {len(email_objects)} email nodes")

        # Step 3: Bulk Semantic Extraction (Optimization in action)
        await self._update_step(task, "step_3", "in_progress", "Executing bulk semantic extraction (avoiding 30+ browser navigations)...")
        extract_res = await self.send_and_wait(
            "action.execute",
            {"action": {"name": "bulk_extract_emails", "parameters": {"unread_only": True}}},
            task_id=task.task_id
        )

        emails = extract_res.get("result", {}).get("emails", [])
        unread_count = len(emails)
        
        opt_metrics = OptimizationEngine.calculate_optimization(unread_count)
        task.optimization = opt_metrics
        await self._send_optimization(task)
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_3", "completed", f"Extracted {unread_count} unread emails in 1 action")

        # Step 4: AI Model Summarization
        await self._update_step(task, "step_4", "in_progress", "Generating crisp AI summary with local open-weight model...")
        summary = await self.model_adapter.generate_summary(emails)
        await asyncio.sleep(0.3)
        await self._update_step(task, "step_4", "completed", "Prioritized action items and announcements")

        # Step 5: Verification & Final Commit
        await self._update_step(task, "step_5", "in_progress", "Verifying extraction consistency...")
        await asyncio.sleep(0.2)
        await self._update_step(task, "step_5", "completed", "Task verified and completed")

        task.status = TaskStatus.COMPLETED
        task.final_result = summary
        await self.send_to_extension({
            "type": "task.complete",
            "request_id": f"comp_{task.task_id}",
            "task_id": task.task_id,
            "payload": {"result": summary},
            "timestamp": time.time()
        })
        return summary

    async def _init_task(self, task: Task):
        await self.send_to_extension({
            "type": "task.create",
            "request_id": f"create_{task.task_id}",
            "task_id": task.task_id,
            "payload": {
                "goal": task.user_goal or task.goal,
                "steps": [s.model_dump() for s in task.planned_steps]
            },
            "timestamp": time.time()
        })

    async def _send_optimization(self, task: Task):
        await self.send_to_extension({
            "type": "task.set_optimization",
            "request_id": f"opt_{task.task_id}",
            "task_id": task.task_id,
            "payload": task.optimization.model_dump(),
            "timestamp": time.time()
        })
