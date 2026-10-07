export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ActionSafetyPolicy = 'auto' | 'confirm' | 'block';
export type ActionSafetyStatus = 'allowed' | 'confirmation_required' | 'blocked';

export type TaskStatus =
  | 'created'
  | 'planning'
  | 'running'
  | 'paused'
  | 'waiting_confirmation'
  | 'recovering'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ElementSource = 'deterministic' | 'llm' | 'hybrid';

export interface SemanticElement {
  id: string; // stable identifier: el_001, etc.
  type: string; // 'button' | 'link' | 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'tab' | 'menuitem' | 'card' | 'row' | 'heading' | 'element'
  role: string; // ARIA role or semantic tag
  label: string; // accessible name or visible text
  value?: string;
  placeholder?: string;
  visible: boolean;
  enabled: boolean;
  confidence: number; // 0.0 to 1.0 (1.0 for deterministic)
  source: ElementSource;
  semantic_role?: string;
  selector?: string;
  attributes?: Record<string, string>;
  rect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface SemanticEntity {
  id: string; // entity_001
  type: string; // 'product' | 'article' | 'email' | 'form' | 'table_row' | 'job' | 'generic_item'
  name: string;
  attributes: Record<string, any>;
  element_refs: string[]; // IDs of associated SemanticElements
  confidence: number;
}

export interface SemanticAction {
  name: string; // 'click' | 'search' | 'filter' | 'sort' | 'extract' | 'submit' | 'bulk_extract' | etc.
  target?: string;
  parameters?: Record<string, any>;
  risk_level: RiskLevel;
  description?: string;
}

export interface SemanticFormField {
  id: string;
  element_id: string;
  name: string;
  label: string;
  type: string; // 'text' | 'email' | 'password' | 'select' | 'checkbox' | 'radio' | 'textarea'
  required: boolean;
  value?: string;
  placeholder?: string;
  options?: string[]; // for select / radio
}

export interface SemanticForm {
  id: string;
  name: string;
  action_url?: string;
  submit_element_id?: string;
  fields: SemanticFormField[];
}

export interface SemanticTable {
  id: string;
  headers: string[];
  rows: Record<string, string>[];
  row_count: number;
}

export interface SemanticNavigation {
  type: 'link' | 'breadcrumb' | 'pagination' | 'menu';
  label: string;
  url?: string;
  target_id?: string;
}

export interface SemanticPage {
  url: string;
  domain: string;
  application: string; // 'generic' | 'gmail' | 'github' | 'store' | etc.
  page_type: string; // 'webpage' | 'search_results' | 'product_detail' | 'form' | 'article' | 'inbox'
  title: string;
  elements: SemanticElement[];
  entities: SemanticEntity[];
  actions: SemanticAction[];
  forms: SemanticForm[];
  tables: SemanticTable[];
  navigation: SemanticNavigation[];
  state: BrowserState;
  timestamp: number;
}

export interface BrowserState {
  url: string;
  title: string;
  page_type: string;
  active_element?: string;
  entity_count: number;
  action_count: number;
  task_id?: string;
  state_version: number;
  scroll_y?: number;
  dialog_open?: boolean;
}

export interface BrowserAction {
  name: string; // low-level or semantic action name
  target?: string; // semantic element id
  selector?: string; // fallback CSS selector
  value?: string; // for type action
  parameters?: Record<string, any>;
  timeout_ms?: number;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  details?: string;
  changed_state?: Record<string, any>;
}

export interface ActionResult {
  request_id: string;
  success: boolean;
  action: string;
  target?: string;
  duration_ms: number;
  result?: any;
  verification?: VerificationResult;
  error?: string;
  recovered?: boolean;
}

export interface TaskStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  action_type?: string;
  target?: string;
  is_optimized?: boolean;
  optimization_note?: string;
  duration_ms?: number;
  result?: any;
  error?: string;
}

export interface OptimizationMetrics {
  browser_actions_avoided: number;
  raw_actions_would_take: number;
  actual_actions_taken: number;
  model_calls_saved: number;
  latency_saved_ms: number;
  strategy?: string;
}

export interface Task {
  task_id: string;
  goal: string;
  status: TaskStatus;
  current_website?: string;
  current_page?: string;
  current_action?: string;
  progress: {
    completed: number;
    known_total: number | null;
  };
  planned_steps: TaskStep[];
  executed_steps: TaskStep[];
  dynamic_steps: TaskStep[];
  failed_steps: TaskStep[];
  optimized_steps: TaskStep[];
  optimization: OptimizationMetrics;
  final_result?: any;
  error?: string;
  created_at: number;
  updated_at: number;
}

export interface PatternMatch {
  pattern: string[];
  frequency: number;
  possible_replacement: string;
  confidence: number;
  risk: RiskLevel;
}

export interface OptimizationCandidate {
  type: 'bulk_extract' | 'state_reuse' | 'semantic_caching' | 'action_batching' | 'navigation_elimination';
  pattern: string[];
  suggested_action: BrowserAction;
  estimated_actions_saved: number;
  confidence: number;
  risk: RiskLevel;
}

export interface SecurityPolicy {
  default_policy: ActionSafetyPolicy;
  overrides: Record<string, ActionSafetyPolicy>;
}

export interface ProtocolMessage<T = any> {
  type: string;
  request_id: string;
  task_id?: string;
  payload: T;
  timestamp: number;
  state_version?: number;
}
