/* Sustainable House Evaluator — Assessment Walkthrough View */
import { getState, setState, subscribe } from '../store.js';
import * as assessment from '../assessment.js';

let _activeCategoryKey = null;

export function initAssessmentView() {
  subscribe(state => {
    if (state.currentView === 'assessment') {
      // Only full re-render on view switch, not on every state change
    }
  });
}

export async function renderAssessmentView() {
  const state = getState();
  const section = document.getElementById('view-assessment');
  if (!section) return;

  // Ensure we have an active assessment
  if (!state.activeProfileId) {
    window.App.showView('view-home');
    return;
  }

  if (!state.activeAssessment) {
    await assessment.loadOrStartAssessment(state.activeProfileId);
  }

  const currentState = getState();
  const cats = currentState.itemCatalogue;
  if (!cats || cats.length === 0) {
    section.innerHTML = '<div class="container"><p>Loading catalogue…</p></div>';
    return;
  }

  if (!_activeCategoryKey) _activeCategoryKey = cats[0].key;

  _renderShell(section, currentState);
  _renderCategory(_activeCategoryKey);

  // Subscribe to score/progress updates (lightweight — only updates badge parts)
  subscribe(_updateProgressDisplay);
}

function _renderShell(section, state) {
  const cats = state.itemCatalogue;
  const progress = assessment.getProgress(state.activeAssessment);
  const profile = state.activeProfile;

  section.innerHTML = `
    <div class="container">
      <div class="flex justify-between items-center flex-wrap gap-sm mb-md">
        <div>
          <button class="btn btn-ghost" id="btn-back-results" type="button">← Results</button>
          <h1 tabindex="-1" style="display:inline;margin-left:8px">
            ${window.t('assessment.title')}
          </h1>
          ${profile ? `<span class="text-muted text-sm"> — ${esc(profile.nickname)}</span>` : ''}
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-reset-assessment" type="button">
          Reset
        </button>
      </div>

      <!-- Overall progress bar -->
      <div class="card mb-md" style="padding:12px 16px">
        <div class="flex justify-between items-center mb-sm">
          <span class="text-sm" id="progress-label">
            ${window.t('assessment.progress')}: <strong id="progress-pct">${progress.overall}%</strong>
          </span>
          <button class="btn btn-primary btn-sm" id="btn-view-results" type="button">
            ${window.t('assessment.complete')} →
          </button>
        </div>
        <div class="progress-bar-wrap" role="progressbar"
             aria-valuenow="${progress.overall}" aria-valuemin="0" aria-valuemax="100"
             aria-label="${window.t('aria.progress_bar')}">
          <div class="progress-bar-fill" id="overall-progress-fill"
               style="width:${progress.overall}%"></div>
        </div>
      </div>

      <div class="view-grid">
        <!-- Category navigation -->
        <nav class="category-nav" aria-label="Assessment categories">
          <!-- Mobile: select dropdown -->
          <div class="mobile-cat-select" style="display:none">
            <label for="cat-select" class="visually-hidden">Choose category</label>
            <select id="cat-select" class="mb-md">
              ${cats.map(cat => `
                <option value="${cat.key}" ${cat.key === _activeCategoryKey ? 'selected' : ''}>
                  ${cat.label}
                </option>`).join('')}
            </select>
          </div>
          <!-- Desktop: list -->
          <ul class="desktop-cat-list" style="list-style:none;padding:0;margin:0">
            ${cats.map(cat => {
              const pct = progress.byCategory[cat.key] ?? 0;
              const active = cat.key === _activeCategoryKey;
              return `
                <li>
                  <button class="cat-nav-btn${active ? ' active' : ''}"
                          data-cat="${cat.key}" type="button"
                          aria-current="${active ? 'true' : 'false'}">
                    <span class="cat-nav-label">${cat.label}</span>
                    <span class="cat-nav-pct text-sm ${pct === 100 ? 'text-success' : 'text-muted'}">${pct}%</span>
                  </button>
                </li>`;
            }).join('')}
          </ul>
        </nav>

        <!-- Category content pane -->
        <div id="category-content" role="main"></div>
      </div>
    </div>
  `;

  _applyCategoryNavStyles(section);
  _wireAssessmentEvents(section);
}

function _applyCategoryNavStyles(section) {
  const existing = document.getElementById('assessment-nav-styles');
  if (existing) return;
  const style = document.createElement('style');
  style.id = 'assessment-nav-styles';
  style.textContent = `
    .cat-nav-btn {
      display: flex; justify-content: space-between; align-items: center;
      width: 100%; padding: 10px 12px; margin-bottom: 4px;
      background: transparent; border: 1px solid transparent;
      border-radius: 6px; cursor: pointer; text-align: left;
      font-family: inherit; font-size: 0.9rem; font-weight: 500;
      color: var(--color-text); transition: background 150ms;
    }
    .cat-nav-btn:hover { background: var(--color-surface-alt); }
    .cat-nav-btn.active {
      background: var(--color-surface); border-color: var(--color-primary);
      color: var(--color-primary); font-weight: 700;
    }
    .cat-nav-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
    .text-success { color: var(--color-success); }
    @media (max-width: 767px) {
      .desktop-cat-list { display: none !important; }
      .mobile-cat-select { display: block !important; }
    }
  `;
  document.head.appendChild(style);
}

function _wireAssessmentEvents(section) {
  // Desktop category nav
  section.querySelectorAll('.cat-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeCategoryKey = btn.dataset.cat;
      section.querySelectorAll('.cat-nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.cat === _activeCategoryKey);
        b.setAttribute('aria-current', b.dataset.cat === _activeCategoryKey ? 'true' : 'false');
      });
      _renderCategory(_activeCategoryKey);
    });
  });

  // Mobile select
  const catSelect = section.querySelector('#cat-select');
  if (catSelect) {
    catSelect.addEventListener('change', () => {
      _activeCategoryKey = catSelect.value;
      _renderCategory(_activeCategoryKey);
    });
  }

  // View results
  section.querySelector('#btn-view-results')?.addEventListener('click', () => {
    setState({ currentView: 'results' });
    window.App.showView('view-results');
  });

  // Back to results
  section.querySelector('#btn-back-results')?.addEventListener('click', () => {
    setState({ currentView: 'results' });
    window.App.showView('view-results');
  });

  // Reset
  section.querySelector('#btn-reset-assessment')?.addEventListener('click', async () => {
    if (!confirm(window.t('assessment.reset_confirm'))) return;
    const state = getState();
    await assessment.resetAssessment(state.activeProfileId);
    _activeCategoryKey = getState().itemCatalogue[0]?.key ?? null;
    renderAssessmentView();
    window.App.showToast('Assessment reset.');
  });
}

function _renderCategory(categoryKey) {
  const content = document.getElementById('category-content');
  if (!content) return;

  const state = getState();
  const catDef = state.itemCatalogue.find(c => c.key === categoryKey);
  if (!catDef) return;

  const catResult = state.activeAssessment?.categories?.find(c => c.name === categoryKey);

  content.innerHTML = `
    <div>
      <h2 tabindex="-1">${catDef.label}</h2>
      <p class="text-muted text-sm mb-md">${catDef.description}</p>
      <div class="stack" id="items-container">
        ${catDef.items.map(itemDef => {
          const itemResult = catResult?.items?.find(i => i.key === itemDef.key)
            ?? { slider_value: 0, not_applicable: false, notes: '' };
          return renderItemCard(itemDef, itemResult);
        }).join('')}
      </div>
    </div>
  `;

  // Focus heading
  const h2 = content.querySelector('h2');
  if (h2) h2.focus();

  // Wire item events
  _wireItemEvents(content, categoryKey);
}

function renderItemCard(itemDef, itemResult) {
  const sliderPct = (itemResult.slider_value / 5) * 100;
  const currentLabel = itemDef.slider_labels[itemResult.slider_value] ?? '';
  const isNA = itemResult.not_applicable;

  return `
    <article class="item-card${isNA ? ' not-applicable' : ''}"
             id="item-${itemDef.key}" data-item-key="${itemDef.key}">
      <h3>${esc(itemDef.label)}</h3>

      ${itemDef.guidance.length > 120
        ? `<details class="mb-sm">
             <summary class="guidance" style="cursor:pointer">
               ${esc(itemDef.guidance.split('.')[0])}.
             </summary>
             <p class="guidance">${esc(itemDef.guidance)}</p>
           </details>`
        : `<p class="guidance">${esc(itemDef.guidance)}</p>`
      }

      <div class="slider-row">
        <input type="range"
               id="slider-${itemDef.key}"
               min="0" max="5" step="1"
               value="${itemResult.slider_value}"
               ${isNA ? 'disabled' : ''}
               style="--slider-pct: ${sliderPct}%"
               aria-label="${esc(itemDef.label)}"
               aria-valuemin="0" aria-valuemax="5"
               aria-valuenow="${itemResult.slider_value}"
               aria-valuetext="${esc(currentLabel)}">
        <div class="slider-labels" aria-hidden="true">
          <span>${esc(itemDef.slider_labels[0] ?? '0')}</span>
          <span>${esc(itemDef.slider_labels[5] ?? '5')}</span>
        </div>
        <p class="slider-current" id="label-${itemDef.key}" aria-live="polite">
          ${esc(currentLabel)}
        </p>
      </div>

      <label class="check-group mt-sm">
        <input type="checkbox"
               id="na-${itemDef.key}"
               ${isNA ? 'checked' : ''}>
        <span>${window.t('assessment.not_applicable')}</span>
      </label>

      <div class="form-group mt-sm">
        <label for="notes-${itemDef.key}" class="text-sm">
          ${window.t('assessment.notes')}
        </label>
        <textarea id="notes-${itemDef.key}" rows="2"
                  placeholder="Optional notes…">${esc(itemResult.notes ?? '')}</textarea>
      </div>
    </article>
  `;
}

function _wireItemEvents(container, categoryKey) {
  container.querySelectorAll('.item-card').forEach(card => {
    const itemKey   = card.dataset.itemKey;
    const slider    = card.querySelector(`#slider-${itemKey}`);
    const naBox     = card.querySelector(`#na-${itemKey}`);
    const notesArea = card.querySelector(`#notes-${itemKey}`);
    const labelEl   = card.querySelector(`#label-${itemKey}`);

    const state = getState();
    const catDef = state.itemCatalogue.find(c => c.key === categoryKey);
    const itemDef = catDef?.items.find(i => i.key === itemKey);

    if (slider && itemDef) {
      slider.addEventListener('input', () => {
        const val = Number(slider.value);
        const pct = (val / 5) * 100;
        slider.style.setProperty('--slider-pct', pct + '%');
        slider.setAttribute('aria-valuenow', val);
        const lbl = itemDef.slider_labels[val] ?? String(val);
        slider.setAttribute('aria-valuetext', lbl);
        if (labelEl) labelEl.textContent = lbl;

        assessment.saveItemResult(categoryKey, itemKey, { sliderValue: val });
        _recomputeAndUpdateScore();
        _updateProgressDisplay(getState());
      });
    }

    if (naBox) {
      naBox.addEventListener('change', () => {
        const isNA = naBox.checked;
        if (slider) slider.disabled = isNA;
        card.classList.toggle('not-applicable', isNA);
        assessment.saveItemResult(categoryKey, itemKey, { notApplicable: isNA });
        _recomputeAndUpdateScore();
        _updateProgressDisplay(getState());
      });
    }

    if (notesArea) {
      notesArea.addEventListener('change', () => {
        assessment.saveItemResult(categoryKey, itemKey, { notes: notesArea.value });
      });
    }
  });
}

function _recomputeAndUpdateScore() {
  // Import scoring lazily (WP05 provides it; stub until then)
  import('../scoring.js').then(({ computeOverallScore }) => {
    const state = getState();
    if (!state.activeAssessment || !state.itemCatalogue) return;
    const score = computeOverallScore(state.activeAssessment, state.itemCatalogue);
    const assessment_updated = { ...state.activeAssessment, overall_score: score };
    setState({ activeAssessment: assessment_updated });
  }).catch(() => {
    // scoring.js not yet available (WP05) — skip silently
  });
}

function _updateProgressDisplay(state) {
  const progress = assessment.getProgress(state.activeAssessment);

  const fill = document.getElementById('overall-progress-fill');
  const pctEl = document.getElementById('progress-pct');
  const bar = fill?.closest('[role="progressbar"]');
  if (fill) fill.style.width = progress.overall + '%';
  if (pctEl) pctEl.textContent = progress.overall + '%';
  if (bar)  bar.setAttribute('aria-valuenow', progress.overall);

  const section = document.getElementById('view-assessment');
  if (!section) return;
  for (const [catKey, pct] of Object.entries(progress.byCategory)) {
    const btn = section.querySelector(`.cat-nav-btn[data-cat="${catKey}"] .cat-nav-pct`);
    if (btn) {
      btn.textContent = pct + '%';
      btn.className = `cat-nav-pct text-sm ${pct === 100 ? 'text-success' : 'text-muted'}`;
    }
  }
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
