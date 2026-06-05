/* =========================================================
   Sustainable House Evaluator — App Entry Point & View Router
   ========================================================= */

import { registerServiceWorker } from './pwa.js';
import { openDB } from './db.js';
import { getState, setState, subscribe } from './store.js';
import { loadCatalogue } from './store.js';

// ---------- View Router -----------------------------------

const VIEWS = ['view-loading', 'view-home', 'view-profile', 'view-assessment', 'view-results'];

/**
 * Show one view, hide all others. Moves focus to the view's first heading.
 * @param {string} viewId  - the section id (without #)
 */
export function showView(viewId) {
  setState({ currentView: viewId.replace('view-', '') });

  VIEWS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === viewId) {
      el.removeAttribute('hidden');
      el.classList.add('active');
      // Move focus to first heading for screen readers
      const heading = el.querySelector('h1, h2, [tabindex="-1"]');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: false });
      }
    } else {
      el.setAttribute('hidden', '');
      el.classList.remove('active');
    }
  });

  // Trigger view-specific renders
  if (viewId === 'view-assessment') {
    import('./views/assessment.js').then(m => m.renderAssessmentView());
  }
  if (viewId === 'view-home') {
    import('./views/home.js').then(m => m.renderHomeView?.());
  }
  if (viewId === 'view-results') {
    import('./views/results.js').then(m => m.renderResultsView?.());
  }
}

export function hideAllViews() {
  VIEWS.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.setAttribute('hidden', ''); el.classList.remove('active'); }
  });
}

// ---------- Score Badge -----------------------------------

function updateScoreBadge(score) {
  const badge = document.getElementById('score-badge');
  if (!badge) return;
  const valueEl = badge.querySelector('.score-value');
  if (valueEl) valueEl.textContent = Math.round(score);
  badge.classList.remove('score-low', 'score-mid', 'score-high');
  if (score < 40)      badge.classList.add('score-low');
  else if (score < 70) badge.classList.add('score-mid');
  else                 badge.classList.add('score-high');
  badge.removeAttribute('hidden');
}

function announceStatus(message) {
  const region = document.getElementById('app-status');
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}

// ---------- Bootstrap -------------------------------------

async function boot() {
  showView('view-loading');

  try {
    // Register PWA service worker
    registerServiceWorker();

    // Open IndexedDB
    await openDB();

    // Load item catalogue and UI strings
    await loadCatalogue();

    // Lazily import view modules
    const [
      { initHomeView },
      { initProfileView },
      { initAssessmentView },
      { initResultsView },
      { initImportHandler },
    ] = await Promise.all([
      import('./views/home.js'),
      import('./views/profile.js'),
      import('./views/assessment.js'),
      import('./views/results.js'),
      import('./import-yaml.js'),
    ]);

    initHomeView();
    initProfileView();
    initAssessmentView();
    initResultsView();
    initImportHandler();

    // Restore last active profile
    const lastProfileId = localStorage.getItem('lastActiveProfileId');
    if (lastProfileId) {
      const { setActiveProfile } = await import('./profiles.js');
      await setActiveProfile(lastProfileId).catch(() => {
        localStorage.removeItem('lastActiveProfileId');
      });
    }

    // Subscribe: keep score badge and view in sync with state
    subscribe(state => {
      if (state.activeAssessment?.overall_score !== undefined) {
        updateScoreBadge(state.activeAssessment.overall_score);
      }
    });

    showView('view-home');
  } catch (err) {
    console.error('[App] Boot error:', err);
    const loading = document.getElementById('view-loading');
    if (loading) {
      loading.innerHTML = `
        <div class="container text-center mt-lg">
          <h1>Something went wrong</h1>
          <p class="text-muted">${err.message}</p>
          <button class="btn btn-primary mt-md" onclick="location.reload()">Reload</button>
        </div>`;
    }
  }
}

// ---------- Toast helper (global) -------------------------

export function showToast(message, durationMs = 3000) {
  announceStatus(message);
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('aria-hidden', 'true');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), durationMs);
}

// Expose to other modules
window.App = { showView, hideAllViews, showToast, announceStatus };

// ---------- Start -----------------------------------------
document.addEventListener('DOMContentLoaded', boot);
