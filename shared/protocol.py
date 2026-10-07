import asyncio
import json
import logging
import os
import sys
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("agentbridge.protocol")

class RiskLevel:
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ActionStatus:
    ALLOWED = "allowed"
    CONFIRMATION_REQUIRED = "confirmation_required"
    BLOCKED = "blocked"

class TaskStatus:
    CREATED = "created"
    PLANNING = "planning"
    RUNNING = "running"
    PAUSED = "paused"
    WAITING_CONFIRMATION = "waiting_confirmation"
    RECOVERING = "recovering"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ElementSource:
    DETERMINISTIC = "deterministic"
    LLM = "llm"
    HYBRID = "hybrid"

class SemanticElement(BaseModel):
    id: str  # e.g., "el_001"
    type: str  # e.g., "button", "link", "input", "select", "checkbox", "row", "card"
    role: Optional[str] = "element"
    label: Optional[str] = ""
    value: Optional[str] = None
    placeholder: Optional[str] = None
    visible: bool = True
    enabled: bool = True
    confidence: float = 1.0
    source: str = ElementSource.DETERMINISTIC
    semantic_role: Optional[str] = None
    selector: Optional[str] = None
    attributes: Dict[str, str] = Field(default_factory=dict)
    # Extra fields for legacy/convenience
    unread: Optional[bool] = None
    sender: Optional[str] = None
    subject: Optional[str] = None
    date: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class SemanticEntity(BaseModel):
    id: str  # entity_001
    type: str  # "product", "article", "email", "form", "table_row", "job", "generic_item"
    name: str
    attributes: Dict[str, Any] = Field(default_factory=dict)
    element_refs: List[str] = Field(default_factory=list)
    confidence: float = 1.0

class SemanticFormField(BaseModel):
    id: str
    element_id: str
    name: str
    label: str
    type: str = "text"
    required: bool = False
    value: Optional[str] = None
    placeholder: Optional[str] = None
    options: List[str] = Field(default_factory=list)

class SemanticForm(BaseModel):
    id: str
    name: str
    action_url: Optional[str] = None
    submit_element_id: Optional[str] = None
    fields: List[SemanticFormField] = Field(default_factory=list)

class SemanticTable(BaseModel):
    id: str
    headers: List[str] = Field(default_factory=list)
    rows: List[Dict[str, str]] = Field(default_factory=list)
    row_count: int = 0

class SemanticNavigation(BaseModel):
    type: str = "link"
    label: str
    url: Optional[str] = None
    target_id: Optional[str] = None

class BrowserState(BaseModel):
    url: str = ""
    title: str = ""
    page_type: str = "webpage"
    active_element: Optional[str] = None
    entity_count: int = 0
    action_count: int = 0
    task_id: Optional[str] = None
    state_version: int = 1
    scroll_y: Optional[float] = 0.0
    dialog_open: bool = False

class SemanticAction(BaseModel):
    name: str  # e.g., "click", "search", "filter", "sort", "extract", "submit", "bulk_extract"
    target: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    risk_level: str = RiskLevel.LOW
    description: Optional[str] = None

class SemanticPage(BaseModel):
    url: str
    domain: str
    application: str = "generic"  # "generic", "gmail", "github", "store", etc.
    page_type: str = "webpage"    # "webpage", "search_results", "form", "inbox", etc.
    title: Optional[str] = ""
    elements: List[SemanticElement] = Field(default_factory=list)
    entities: List[SemanticEntity] = Field(default_factory=list)
    actions: List[SemanticAction] = Field(default_factory=list)
    forms: List[SemanticForm] = Field(default_factory=list)
    tables: List[SemanticTable] = Field(default_factory=list)
    navigation: List[SemanticNavigation] = Field(default_factory=list)
    state: BrowserState = Field(default_factory=BrowserState)
    # Legacy alias support for objects
    objects: List[SemanticElement] = Field(default_factory=list)
    timestamp: float = 0.0

class BrowserAction(BaseModel):
    name: str  # "click", "type", "scroll", "navigate", "select", "keypress", "wait", "extract", "bulk_extract"
    target: Optional[str] = None
    selector: Optional[str] = None
    value: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    timeout_ms: int = 8000

class VerificationResult(BaseModel):
    verified: bool
    confidence: float = 1.0
    details: Optional[str] = None
    changed_state: Optional[Dict[str, Any]] = None

class ActionResult(BaseModel):
    request_id: str
    success: bool
    action: str
    target: Optional[str] = None
    duration_ms: float = 0.0
    result: Any = None
    verification: Optional[VerificationResult] = None
    error: Optional[str] = None
    recovered: bool = False

class TaskStep(BaseModel):
    id: str
    name: str
    description: str
    status: str = "pending"  # pending, in_progress, completed, skipped, failed
    action_type: Optional[str] = None
    target: Optional[str] = None
    is_optimized: bool = False
    optimization_note: Optional[str] = None
    duration_ms: Optional[float] = None
    result: Optional[Any] = None
    error: Optional[str] = None

class OptimizationMetrics(BaseModel):
    browser_actions_avoided: int = 0
    raw_actions_would_take: int = 0
    actual_actions_taken: int = 0
    model_calls_saved: int = 0
    latency_saved_ms: float = 0.0
    strategy: Optional[str] = None

class TaskProgress(BaseModel):
    completed: int = 0
    known_total: Optional[int] = None

class Task(BaseModel):
    task_id: str
    goal: str = ""
    user_goal: str = ""  # backwards compatibility
    status: str = TaskStatus.CREATED
    current_website: Optional[str] = None
    current_page: Optional[str] = None
    current_action: Optional[str] = None
    progress: TaskProgress = Field(default_factory=TaskProgress)
    progress_completed: int = 0  # backwards compatibility
    progress_total: int = 0      # backwards compatibility
    planned_steps: List[TaskStep] = Field(default_factory=list)
    executed_steps: List[TaskStep] = Field(default_factory=list)
    dynamic_steps: List[TaskStep] = Field(default_factory=list)
    failed_steps: List[TaskStep] = Field(default_factory=list)
    optimized_steps: List[TaskStep] = Field(default_factory=list)
    optimization: OptimizationMetrics = Field(default_factory=OptimizationMetrics)
    final_result: Optional[Any] = None
    error: Optional[str] = None
    created_at: float = 0.0
    updated_at: float = 0.0

class PatternMatch(BaseModel):
    pattern: List[str]
    frequency: int
    possible_replacement: str
    confidence: float
    risk: str = RiskLevel.LOW

class OptimizationCandidate(BaseModel):
    type: str  # "bulk_extract", "state_reuse", "semantic_caching", "action_batching", "navigation_elimination"
    pattern: List[str]
    suggested_action: BrowserAction
    estimated_actions_saved: int
    confidence: float
    risk: str = RiskLevel.LOW

class ProtocolMessage(BaseModel):
    type: str
    request_id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:8]}")
    task_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = 0.0
    state_version: Optional[int] = 1
