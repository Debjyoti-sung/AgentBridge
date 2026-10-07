import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional
from shared.protocol import Task, TaskStep, OptimizationMetrics, TaskStatus, PatternMatch, OptimizationCandidate

logger = logging.getLogger("agentbridge.optimizer")

class OptimizationEngine:
    @staticmethod
    def plan_universal_task(goal: str, website: str = "Active Tab") -> Task:
        """
        Creates an optimized universal task plan for any website and natural language goal.
        """
        task_id = f"task_{int(time.time() * 1000)}"
        clean_goal = goal.lower()

        # Check specific domains first
        if "email" in clean_goal or "gmail" in clean_goal or "inbox" in clean_goal:
            return OptimizationEngine.plan_gmail_task(goal)
        elif "laptop" in clean_goal or "product" in clean_goal or "price" in clean_goal or "cheap" in clean_goal or "buy" in clean_goal:
            return OptimizationEngine.plan_shopping_task(goal, website)
        elif "form" in clean_goal or "register" in clean_goal or "signup" in clean_goal or "fill" in clean_goal:
            return OptimizationEngine.plan_form_task(goal, website)
        elif "article" in clean_goal or "news" in clean_goal or "story" in clean_goal or "post" in clean_goal:
            return OptimizationEngine.plan_article_task(goal, website)

        # Generic Universal Web Task Plan
        steps = [
            TaskStep(
                id="step_1",
                name="Universal Web Observation",
                description="Inspect DOM, accessibility tree, and interactive elements",
                status="pending",
                action_type="inspect_page"
            ),
            TaskStep(
                id="step_2",
                name="Semantic AI DOM Construction",
                description="Construct machine-readable representation of entities and actions",
                status="pending",
                action_type="parse_ai_dom"
            ),
            TaskStep(
                id="step_3",
                name="Optimized Semantic Execution",
                description="Execute high-level semantic operations natively",
                status="pending",
                action_type="action_execute",
                is_optimized=True,
                optimization_note="High-level operation execution"
            ),
            TaskStep(
                id="step_4",
                name="State Verification & Synthesis",
                description="Verify state changes and synthesize result with local AI model",
                status="pending",
                action_type="verify"
            )
        ]

        return Task(
            task_id=task_id,
            goal=goal,
            user_goal=goal,
            status=TaskStatus.RUNNING,
            current_website=website,
            current_page="webpage",
            current_action="Initializing universal task...",
            progress_completed=0,
            progress_total=len(steps),
            planned_steps=steps,
            executed_steps=[],
            optimization=OptimizationMetrics(
                browser_actions_avoided=0,
                raw_actions_would_take=0,
                actual_actions_taken=1,
                model_calls_saved=0,
                latency_saved_ms=0.0,
                strategy="Semantic Execution"
            ),
            created_at=time.time(),
            updated_at=time.time()
        )

    @staticmethod
    def plan_shopping_task(goal: str, website: str = "E-Commerce Website") -> Task:
        task_id = f"task_{int(time.time() * 1000)}"
        steps = [
            TaskStep(
                id="step_1",
                name="Universal Web Observation",
                description="Inspect page and detect laptop products, search bar, and price filters",
                status="pending",
                action_type="inspect_page"
            ),
            TaskStep(
                id="step_2",
                name="Deterministic Semantic Parsing",
                description="Construct AI DOM representation of product entities",
                status="pending",
                action_type="parse_ai_dom"
            ),
            TaskStep(
                id="step_3",
                name="Bulk Semantic Extraction",
                description="Extract all product entities in a single bulk DOM operation (avoiding 20+ navigations)",
                status="pending",
                action_type="bulk_extract",
                is_optimized=True,
                optimization_note="Bulk product extraction"
            ),
            TaskStep(
                id="step_4",
                name="Local AI Reasoning & Prioritization",
                description="Filter price <= ₹50,000, sort ascending, and select top 3",
                status="pending",
                action_type="ai_reasoning"
            ),
            TaskStep(
                id="step_5",
                name="Verification & Final Commit",
                description="Verify extracted results against live DOM state",
                status="pending",
                action_type="verify"
            )
        ]

        return Task(
            task_id=task_id,
            goal=goal,
            user_goal=goal,
            status=TaskStatus.RUNNING,
            current_website=website,
            current_page="product_listing",
            current_action="Initializing shopping task...",
            progress_completed=0,
            progress_total=len(steps),
            planned_steps=steps,
            executed_steps=[],
            optimization=OptimizationMetrics(
                browser_actions_avoided=0,
                raw_actions_would_take=0,
                actual_actions_taken=1,
                model_calls_saved=0,
                latency_saved_ms=0.0,
                strategy="Bulk Semantic Extraction"
            ),
            created_at=time.time(),
            updated_at=time.time()
        )

    @staticmethod
    def plan_article_task(goal: str, website: str = "Content Portal") -> Task:
        task_id = f"task_{int(time.time() * 1000)}"
        steps = [
            TaskStep(id="step_1", name="Detect Article Structure", description="Scan article headlines, snippets, and cards", status="pending", action_type="inspect_page"),
            TaskStep(id="step_2", name="Single-Pass Structured Extraction", description="Extract all visible story contents without opening individual tabs", status="pending", action_type="bulk_extract", is_optimized=True),
            TaskStep(id="step_3", name="Local AI Summarization", description="Synthesize executive highlights using local open-weight model", status="pending", action_type="ai_reasoning"),
            TaskStep(id="step_4", name="State Verification", description="Verify all visible story entities were extracted", status="pending", action_type="verify")
        ]
        return Task(
            task_id=task_id,
            goal=goal,
            user_goal=goal,
            status=TaskStatus.RUNNING,
            current_website=website,
            current_page="article_listing",
            current_action="Initializing article summarizer...",
            progress_completed=0,
            progress_total=len(steps),
            planned_steps=steps,
            executed_steps=[],
            optimization=OptimizationMetrics(strategy="Single-Pass Structured Extraction"),
            created_at=time.time(),
            updated_at=time.time()
        )

    @staticmethod
    def plan_form_task(goal: str, website: str = "Web Form") -> Task:
        task_id = f"task_{int(time.time() * 1000)}"
        steps = [
            TaskStep(id="step_1", name="Form & Field Discovery", description="Analyze input fields, labels, and required flags", status="pending", action_type="inspect_page"),
            TaskStep(id="step_2", name="Semantic Field Mapping", description="Map user profile attributes to discovered inputs", status="pending", action_type="ai_reasoning"),
            TaskStep(id="step_3", name="Action Batching", description="Populate all fields in one optimized turn (avoiding individual click/type calls)", status="pending", action_type="submit_form", is_optimized=True),
            TaskStep(id="step_4", name="Validation Verification", description="Verify inputs against form validation rules", status="pending", action_type="verify")
        ]
        return Task(
            task_id=task_id,
            goal=goal,
            user_goal=goal,
            status=TaskStatus.RUNNING,
            current_website=website,
            current_page="form",
            current_action="Initializing form filler...",
            progress_completed=0,
            progress_total=len(steps),
            planned_steps=steps,
            executed_steps=[],
            optimization=OptimizationMetrics(strategy="Action Batching"),
            created_at=time.time(),
            updated_at=time.time()
        )

    @staticmethod
    def plan_gmail_task(goal: str) -> Task:
        task_id = f"task_{int(time.time() * 1000)}"
        steps = [
            TaskStep(id="step_1", name="Detect & Validate Environment", description="Check if Gmail inbox is loaded and active", status="pending", action_type="inspect_page"),
            TaskStep(id="step_2", name="Semantic AI DOM Parsing", description="Extract structured elements and locate email rows", status="pending", action_type="inspect_page"),
            TaskStep(id="step_3", name="Bulk Semantic Extraction", description="Extract unread emails via single-shot DOM connector (replaces 30+ browser navigations)", status="pending", action_type="bulk_extract_emails", is_optimized=True),
            TaskStep(id="step_4", name="AI Model Summarization", description="Summarize prioritized items using open-weight model", status="pending", action_type="ai_reasoning"),
            TaskStep(id="step_5", name="Verification & Final State Commit", description="Verify extraction completeness and finalize task state", status="pending", action_type="verify")
        ]
        return Task(
            task_id=task_id,
            goal=goal,
            user_goal=goal,
            status=TaskStatus.RUNNING,
            current_website="Gmail (mail.google.com)",
            current_page="inbox",
            current_action="Initializing task...",
            progress_completed=0,
            progress_total=len(steps),
            planned_steps=steps,
            executed_steps=[],
            optimization=OptimizationMetrics(strategy="Semantic Bulk Execution"),
            created_at=time.time(),
            updated_at=time.time()
        )

    @staticmethod
    def calculate_optimization(total_unread: int) -> OptimizationMetrics:
        raw_actions = max(total_unread * 3, 3)
        actual_actions = 1
        actions_avoided = raw_actions - actual_actions
        model_calls_saved = max(total_unread - 1, 0)
        latency_saved_ms = max((total_unread * 2800.0) - 200.0, 0.0)

        return OptimizationMetrics(
            browser_actions_avoided=actions_avoided,
            raw_actions_would_take=raw_actions,
            actual_actions_taken=actual_actions,
            model_calls_saved=model_calls_saved,
            latency_saved_ms=latency_saved_ms,
            strategy="Semantic Bulk Execution"
        )
