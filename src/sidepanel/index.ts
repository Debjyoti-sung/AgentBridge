import { Task } from '../shared/protocol';

// DOM Element References
const connBadge = document.getElementById('conn-badge')!;
const customTaskInput = document.getElementById('custom-task-input') as HTMLInputElement;
const btnRunCustom = document.getElementById('btn-run-custom')!;
const chipShopping = document.getElementById('chip-shopping')!;
const chipArticles = document.getElementById('chip-articles')!;
const chipForm = document.getElementById('chip-form')!;
const chipGmail = document.getElementById('chip-gmail')!;

const taskStatus = document.getElementById('task-status')!;
const taskStatusDot = document.getElementById('task-status-dot');
const taskGoal = document.getElementById('task-goal')!;
const siteName = document.getElementById('site-name')!;
const progressPct = document.getElementById('progress-percentage')!;
const progressBarFill = document.getElementById('progress-bar-fill')!;
const currentAction = document.getElementById('current-action')!;
const actionSpinner = document.getElementById('action-spinner');
const stepsCounter = document.getElementById('steps-counter')!;
const stepsList = document.getElementById('steps-list')!;

const actionsAvoided = document.getElementById('metric-actions-avoided')!;
const modelCallsSaved = document.getElementById('metric-model-calls')!;
const latencySaved = document.getElementById('metric-latency')!;
const optStrategy = document.getElementById('opt-strategy')!;

const btnToggleAIDOM = document.getElementById('btn-toggle-aidom')!;
const aidomPreview = document.getElementById('aidom-preview')!;
const aidomCode = document.getElementById('aidom-code')!;
const aidomChevron = document.getElementById('aidom-chevron');
const aidomBtnText = document.getElementById('aidom-btn-text');

const resultCard = document.getElementById('result-card')!;
const resultContent = document.getElementById('result-content')!;
const btnCopyResult = document.getElementById('btn-copy-result');
const btnCopyAIDOM = document.getElementById('btn-copy-aidom');

const btnPause = document.getElementById('btn-pause')!;
const btnResume = document.getElementById('btn-resume')!;
const btnStop = document.getElementById('btn-stop')!;

const btnDetach = document.getElementById('btn-detach');
const btnTheme = document.getElementById('btn-theme');
const appToast = document.getElementById('app-toast');
const toastMessage = document.getElementById('toast-message');

let isAIDOMVisible = false;
let toastTimeout: any = null;

// Safe wrapper for chrome.runtime.sendMessage
function sendRuntimeMessage(msg: any, callback?: (res: any) => void) {
  if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        // Suppress benign connection errors if extension reloaded
        const _ = chrome.runtime.lastError;
        if (callback) callback(res);
      });
    } catch (_) {}
  }
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(msg: string) {
  if (!appToast || !toastMessage) return;
  toastMessage.textContent = msg;
  appToast.style.display = 'block';
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    appToast.style.display = 'none';
  }, 2400);
}

// ==========================================================================
// CONNECTION STATUS
// ==========================================================================
function updateConnectionStatus(status: 'connected' | 'connecting' | 'disconnected') {
  const statusLabel = connBadge.querySelector('.status-label');
  if (status === 'connected') {
    connBadge.className = 'conn-indicator conn-connected';
    if (statusLabel) statusLabel.textContent = 'Agent Connected';
    connBadge.title = 'Connected to Python backend (ws://localhost:8765). Click to switch to Local AI mode.';
  } else if (status === 'connecting') {
    connBadge.className = 'conn-indicator conn-connecting';
    if (statusLabel) statusLabel.textContent = 'Connecting...';
    connBadge.title = 'Connecting to backend... Click to cancel.';
  } else {
    connBadge.className = 'conn-indicator conn-local';
    if (statusLabel) statusLabel.textContent = 'Local AI Ready';
    connBadge.title = 'Running standalone in-browser mode. Click if you want to connect to Python backend (ws://localhost:8765).';
  }
}

// ==========================================================================
// TASK RENDERING
// ==========================================================================
function formatLatency(ms: number): string {
  if (!ms || ms <= 0) return '0.0s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function renderTask(task: Task | null) {
  if (!task) {
    taskGoal.textContent = 'Ready for your next task';
    taskStatus.textContent = 'Idle';
    taskStatus.className = 'status-pill status-idle';
    if (taskStatusDot) taskStatusDot.className = 'status-pulse-dot dot-idle';
    siteName.textContent = 'Current Tab';
    progressPct.textContent = '0%';
    progressBarFill.style.width = '0%';
    currentAction.textContent = 'Waiting for task execution...';
    if (actionSpinner) actionSpinner.style.display = 'none';
    stepsCounter.textContent = '0 steps';
    stepsList.innerHTML = `
      <li class="step-empty">
        <div class="empty-icon-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <div class="empty-text">
          <strong>No activity yet</strong>
          <span>Select a quick workflow above or enter a prompt to begin.</span>
        </div>
      </li>
    `;
    resultCard.style.display = 'none';
    btnPause.style.display = 'none';
    btnResume.style.display = 'none';
    btnStop.style.display = 'none';
    return;
  }

  // Task Goal & Status
  taskGoal.textContent = task.goal || (task as any).user_goal || 'Browser Task';
  const statusStr = (task.status || 'idle').toLowerCase();
  taskStatus.textContent = task.status ? (task.status.charAt(0).toUpperCase() + task.status.slice(1)) : 'Idle';

  // Status Classes
  let statusClass = 'status-idle';
  let dotClass = 'dot-idle';
  if (statusStr === 'running' || statusStr === 'in_progress') {
    statusClass = 'status-running';
    dotClass = 'dot-running';
    if (actionSpinner) actionSpinner.style.display = 'inline-block';
  } else if (statusStr === 'completed') {
    statusClass = 'status-completed';
    dotClass = 'dot-completed';
    if (actionSpinner) actionSpinner.style.display = 'none';
  } else if (statusStr === 'failed') {
    statusClass = 'status-failed';
    dotClass = 'dot-failed';
    if (actionSpinner) actionSpinner.style.display = 'none';
  } else if (statusStr === 'paused') {
    statusClass = 'status-paused';
    dotClass = 'dot-idle';
    if (actionSpinner) actionSpinner.style.display = 'none';
  }
  taskStatus.className = `status-pill ${statusClass}`;
  if (taskStatusDot) taskStatusDot.className = `status-pulse-dot ${dotClass}`;

  if (task.current_website) {
    siteName.textContent = task.current_website;
  }

  // Progress Calculation
  const total = task.progress?.known_total || (task as any).progress_total || (task.planned_steps ? task.planned_steps.length : 0);
  const completed = task.progress?.completed !== undefined ? task.progress.completed : (task as any).progress_completed || 0;
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : (statusStr === 'completed' ? 100 : 0);
  progressPct.textContent = `${pct}%`;
  progressBarFill.style.width = `${pct}%`;

  currentAction.textContent = task.current_action || (statusStr === 'completed' ? 'Task completed successfully' : 'Executing...');

  // Render Activity Timeline
  const steps = task.planned_steps || [];
  stepsCounter.textContent = `${completed}/${steps.length} steps`;

  if (steps.length > 0) {
    stepsList.innerHTML = steps.map((s, idx) => {
      let nodeClass = 'node-pending';
      let nodeContent = '';
      if (s.status === 'completed') {
        nodeClass = 'node-completed';
        nodeContent = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      } else if (s.status === 'in_progress') {
        nodeClass = 'node-in_progress';
        nodeContent = '';
      } else if (s.status === 'failed') {
        nodeClass = 'node-failed';
        nodeContent = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      }

      const optBadge = s.is_optimized ? '<span class="step-optimized-badge">Optimized</span>' : '';
      return `
        <li class="timeline-step" data-step-id="${s.id || idx}">
          <div class="timeline-node ${nodeClass}">${nodeContent}</div>
          <div class="timeline-content">
            <div class="step-title-row">
              <span class="step-title">${s.name}</span>
              ${optBadge}
            </div>
            <span class="step-desc">${s.description || ''}</span>
          </div>
        </li>
      `;
    }).join('');
  }

  // Render Optimization Metrics
  if (task.optimization) {
    actionsAvoided.textContent = String(task.optimization.browser_actions_avoided || 0);
    modelCallsSaved.textContent = String(task.optimization.model_calls_saved || 0);
    latencySaved.textContent = formatLatency(task.optimization.latency_saved_ms || 0);
    if (task.optimization.strategy) {
      optStrategy.textContent = task.optimization.strategy;
    }
  }

  // Render Result
  if (task.final_result) {
    resultCard.style.display = 'block';
    if (typeof task.final_result === 'string') {
      resultContent.textContent = task.final_result;
    } else {
      resultContent.textContent = JSON.stringify(task.final_result, null, 2);
    }
  } else {
    resultCard.style.display = 'none';
  }

  // Task Controls Visibility
  if (statusStr === 'running' || statusStr === 'in_progress' || statusStr === 'paused') {
    btnStop.style.display = 'inline-flex';
    if (statusStr === 'paused') {
      btnPause.style.display = 'none';
      btnResume.style.display = 'inline-flex';
    } else {
      btnPause.style.display = 'inline-flex';
      btnResume.style.display = 'none';
    }
  } else {
    btnPause.style.display = 'none';
    btnResume.style.display = 'none';
    btnStop.style.display = 'none';
  }
}

// ==========================================================================
// DETACHED WINDOW & POPUP DETECTION
// ==========================================================================
const isDetachedWindow = window.location.search.includes('detached=true');
if (isDetachedWindow) {
  document.body.classList.add('mode-detached');
  if (btnDetach) {
    btnDetach.title = 'Close Detached Window';
    btnDetach.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
  }
}

if (btnDetach) {
  btnDetach.addEventListener('click', () => {
    if (isDetachedWindow) {
      window.close();
    } else {
      sendRuntimeMessage({ type: 'ui.open_detached_window' }, (res) => {
        if (!res?.success && typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
          window.open(chrome.runtime.getURL('sidepanel.html?detached=true'), 'AgentBridgeDetached', 'width=680,height=800,menubar=no,toolbar=no');
        }
      });
    }
  });
}

// ==========================================================================
// THEME SWITCHER
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('agentbridge_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme: string) {
  if (!btnTheme) return;
  const iconMoon = btnTheme.querySelector('.icon-moon') as HTMLElement;
  const iconSun = btnTheme.querySelector('.icon-sun') as HTMLElement;
  if (iconMoon && iconSun) {
    if (theme === 'light') {
      iconMoon.style.display = 'none';
      iconSun.style.display = 'inline-block';
    } else {
      iconMoon.style.display = 'inline-block';
      iconSun.style.display = 'none';
    }
  }
}

if (btnTheme) {
  btnTheme.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('agentbridge_theme', nextTheme);
    updateThemeIcon(nextTheme);
    showToast(`Switched to ${nextTheme} mode`);
  });
}
initTheme();

// ==========================================================================
// INITIAL STATE & PUSH LISTENER
// ==========================================================================
sendRuntimeMessage({ type: 'get_initial_state' }, (res) => {
  if (res) {
    if (res.ws_status) updateConnectionStatus(res.ws_status);
    if (res.task) renderTask(res.task);
  }
});

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'task.state_update' && message.payload?.task) {
      renderTask(message.payload.task);
    }
    if (message.type === 'ws.status_change' && message.payload?.status) {
      updateConnectionStatus(message.payload.status);
    }
  });
}

// ==========================================================================
// ACTIONS & CONTROLS
// ==========================================================================
btnRunCustom.addEventListener('click', () => {
  const goal = customTaskInput.value.trim();
  if (!goal) return;
  sendRuntimeMessage({
    type: 'task.trigger_custom_task',
    payload: { goal }
  });
  showToast('Starting task execution...');
});

customTaskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    btnRunCustom.click();
  }
});

chipShopping.addEventListener('click', () => {
  customTaskInput.value = 'Find the 3 cheapest laptops under ₹50,000 on this website';
  sendRuntimeMessage({ type: 'task.trigger_shopping_demo' });
  showToast('Triggering shopping workflow...');
});

chipArticles.addEventListener('click', () => {
  customTaskInput.value = 'Read all visible articles and summarize the main points';
  sendRuntimeMessage({ type: 'task.trigger_article_demo' });
  showToast('Triggering article digest workflow...');
});

chipForm.addEventListener('click', () => {
  customTaskInput.value = 'Fill registration form with the provided details';
  sendRuntimeMessage({ type: 'task.trigger_form_demo' });
  showToast('Triggering form batching workflow...');
});

chipGmail.addEventListener('click', () => {
  customTaskInput.value = "Read today's unread Gmail emails and summarize the important ones";
  sendRuntimeMessage({ type: 'task.trigger_gmail_demo' });
  showToast('Triggering Gmail triage workflow...');
});

// AI DOM Inspector Toggle
btnToggleAIDOM.addEventListener('click', () => {
  isAIDOMVisible = !isAIDOMVisible;
  const parentCard = btnToggleAIDOM.closest('.diagnostics-card');
  if (isAIDOMVisible) {
    if (aidomBtnText) aidomBtnText.textContent = 'Hide DOM';
    if (parentCard) parentCard.classList.add('drawer-open');
    aidomPreview.style.display = 'block';
    aidomCode.textContent = 'Analyzing active tab DOM structure...';

    sendRuntimeMessage({ type: 'page.inspect_current_tab' }, (res) => {
      if (res && res.result) {
        const compact = {
          page: {
            url: res.result.url,
            title: res.result.title,
            application: res.result.application,
            page_type: res.result.page_type
          },
          elements_count: res.result.elements?.length || 0,
          entities: res.result.entities || [],
          actions: res.result.actions || [],
          forms_count: res.result.forms?.length || 0,
          tables_count: res.result.tables?.length || 0,
          state: res.result.state
        };
        aidomCode.textContent = JSON.stringify(compact, null, 2);
      } else {
        aidomCode.textContent = res?.error || 'Unable to inspect active tab DOM.';
      }
    });
  } else {
    if (aidomBtnText) aidomBtnText.textContent = 'Inspect DOM';
    if (parentCard) parentCard.classList.remove('drawer-open');
    aidomPreview.style.display = 'none';
  }
});

// Copy Output
if (btnCopyResult) {
  btnCopyResult.addEventListener('click', () => {
    const text = resultContent.textContent || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Result copied to clipboard!');
    });
  });
}

if (btnCopyAIDOM) {
  btnCopyAIDOM.addEventListener('click', () => {
    const text = aidomCode.textContent || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('AI DOM schema copied to clipboard!');
    });
  });
}

// Pause, Resume, Stop
btnPause.addEventListener('click', () => {
  sendRuntimeMessage({ type: 'task.user_pause' });
  showToast('Agent execution paused');
});

btnResume.addEventListener('click', () => {
  sendRuntimeMessage({ type: 'task.user_resume' });
  showToast('Agent execution resumed');
});

btnStop.addEventListener('click', () => {
  sendRuntimeMessage({ type: 'task.user_stop' });
  showToast('Agent stopped');
});

// Click connection indicator to toggle Python backend server
connBadge.addEventListener('click', () => {
  sendRuntimeMessage({ type: 'task.toggle_server_connection' }, (res) => {
    if (res?.status) {
      updateConnectionStatus(res.status);
      showToast(res.status === 'connecting' ? 'Connecting to Python backend...' : 'Switched to Local AI mode');
    }
  });
});
