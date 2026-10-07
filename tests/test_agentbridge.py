import pytest
import time
from shared.protocol import (
    SemanticElement,
    SemanticEntity,
    SemanticForm,
    SemanticFormField,
    SemanticTable,
    BrowserState,
    SemanticAction,
    SemanticPage,
    BrowserAction,
    ActionResult,
    Task,
    TaskStatus,
    TaskStep,
    OptimizationMetrics,
    PatternMatch,
    OptimizationCandidate
)
from agent.optimizer import OptimizationEngine
from agent.model_adapter import OpenWeightOllamaAdapter
from agent.planner.universal_planner import UniversalPlanner
from benchmarks.benchmark_runner import BenchmarkRunner

def test_protocol_models():
    el = SemanticElement(
        id="el_001",
        type="button",
        role="button",
        label="Submit",
        confidence=1.0,
        source="deterministic"
    )
    assert el.id == "el_001"
    assert el.confidence == 1.0

    entity = SemanticEntity(
        id="entity_001",
        type="product",
        name="Lenovo IdeaPad Slim 3",
        attributes={"price": "₹38,990", "price_numeric": 38990},
        element_refs=["el_001"]
    )
    assert entity.type == "product"
    assert entity.attributes["price_numeric"] == 38990

    action = BrowserAction(
        name="bulk_extract",
        parameters={"entity_type": "product"}
    )
    assert action.name == "bulk_extract"
    assert action.parameters["entity_type"] == "product"

def test_optimization_metrics_calculation():
    metrics = OptimizationEngine.calculate_optimization(3)
    assert metrics.browser_actions_avoided == 8
    assert metrics.raw_actions_would_take == 9
    assert metrics.actual_actions_taken == 1
    assert metrics.model_calls_saved == 2
    assert metrics.latency_saved_ms > 0

def test_universal_task_planning():
    # 1. Shopping task
    task_shop = UniversalPlanner.plan("Find 3 cheapest laptops under ₹50,000")
    assert task_shop.status == TaskStatus.RUNNING
    assert len(task_shop.planned_steps) == 5
    assert any(s.is_optimized for s in task_shop.planned_steps)

    # 2. Article task
    task_art = UniversalPlanner.plan("Read all visible articles and summarize them")
    assert task_art.status == TaskStatus.RUNNING
    assert len(task_art.planned_steps) == 4

    # 3. Form task
    task_form = UniversalPlanner.plan("Fill registration form with user data")
    assert task_form.status == TaskStatus.RUNNING
    assert len(task_form.planned_steps) == 4

    # 4. Gmail task
    task_gmail = UniversalPlanner.plan("Summarize unread emails in Gmail")
    assert task_gmail.status == TaskStatus.RUNNING
    assert len(task_gmail.planned_steps) == 5

@pytest.mark.asyncio
async def test_fallback_semantic_summarizers():
    adapter = OpenWeightOllamaAdapter()

    # Test emails summarizer
    emails = [
        {"sender": "boss@corp.com", "subject": "URGENT: Quarterly meeting", "snippet": "Need slide deck by 2pm", "date": "10:00 AM"},
        {"sender": "friend@corp.com", "subject": "Lunch today?", "snippet": "Are you free?", "date": "10:30 AM"}
    ]
    summary_email = await adapter.generate_summary(emails)
    assert "Priority Action Items" in summary_email or "Quarterly meeting" in summary_email or "slide deck" in summary_email.lower()

    # Test products summarizer
    products = [
        {"name": "Acer Aspire Lite", "attributes": {"price": "₹32,990", "rating": 4.1}},
        {"name": "Lenovo IdeaPad Slim 3", "attributes": {"price": "₹38,990", "rating": 4.2}}
    ]
    summary_prod = await adapter.generate_summary(products)
    assert "Acer Aspire Lite" in summary_prod
    assert "₹32,990" in summary_prod

    # Test articles summarizer
    articles = [
        {"name": "WebGPU Standards", "attributes": {"snippet": "Hardware acceleration brings local SLMs to browser."}}
    ]
    summary_art = await adapter.generate_summary(articles)
    assert "WebGPU Standards" in summary_art

def test_benchmark_runner_metrics():
    results = BenchmarkRunner.run_all_benchmarks()
    assert len(results) == 4
    for r in results:
        assert r["speedup_factor"] >= 20.0
        assert r["actions_saved"] > 0
        assert r["latency_reduction_pct"] > 90.0
