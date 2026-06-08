/* =========================================================
   Sustainable House Evaluator — App Entry Point & View Router
   ========================================================= */

import { registerServiceWorker } from './pwa.js';
import { openDB } from './db.js';
import { getState, setState, subscribe } from './store.js';
import { loadCatalogue } from './store.js';

// ---------- View Router -----------------------------------

const VIEWS = ['view-loading', 'view-home', 'view-profile', 'view-assessment', 'view-results'];
const VIEW_ROUTES = {
  'view-home': '',
  'view-profile': 'profile',
  'view-assessment': 'assessment',
  'view-results': 'results',
};

const ASSESSMENT_CATEGORY_ROUTES = {
  building_envelope: 'assessment-envelope',
  heating_cooling: 'assessment-temperature',
  hot_water: 'assessment-hot-water',
  renewable_energy: 'assessment-renewables',
  water_efficiency: 'assessment-water',
  lighting_appliances: 'assessment-lighting',
};

const LEGACY_ASSESSMENT_CATEGORY_ROUTES = {
  'assessment-renewable-energy': 'renewable_energy',
};

const MODULE_VERSION = '20260608-3';

function versionedModulePath(path) {
  return `${path}?v=${MODULE_VERSION}`;
}

function slugify(value) {
  return String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
}

function routeFragmentForView(viewId) {
  return VIEW_ROUTES[viewId] ?? '';
}

function routeFragmentForCategory(categoryKey) {
  return ASSESSMENT_CATEGORY_ROUTES[categoryKey] ?? `assessment-${slugify(categoryKey)}`;
}

function categoryKeyFromRouteFragment(fragment) {
  const legacyCategoryKey = LEGACY_ASSESSMENT_CATEGORY_ROUTES[fragment];
  if (legacyCategoryKey) return legacyCategoryKey;

  const aliasEntry = Object.entries(ASSESSMENT_CATEGORY_ROUTES)
    .find(([, routeFragment]) => routeFragment === fragment);
  if (aliasEntry) return aliasEntry[0];

  if (!fragment?.startsWith('assessment-')) return null;

  const suffix = fragment.slice('assessment-'.length);
  const normalizedSuffix = suffix.replace(/-/g, '_');
  const exactEntry = Object.keys(ASSESSMENT_CATEGORY_ROUTES)
    .find(categoryKey => categoryKey === normalizedSuffix);
  if (exactEntry) return exactEntry;

  const slugMatch = Object.keys(ASSESSMENT_CATEGORY_ROUTES)
    .find(categoryKey => slugify(categoryKey) === suffix);
  return slugMatch ?? null;
}

function parseRouteFromLocation() {
  const hashFragment = location.hash.replace(/^#/, '').trim();
  const queryStage = new URLSearchParams(location.search).get('stage')?.trim() ?? '';
  const fragment = hashFragment || queryStage;

  if (!fragment || fragment === 'home') {
    return { viewId: 'view-home', fragment: '', categoryKey: null };
  }

  if (fragment === 'profile') {
    return { viewId: 'view-profile', fragment: 'profile', categoryKey: null };
  }

  if (fragment === 'results') {
    return { viewId: 'view-results', fragment: 'results', categoryKey: null };
  }

  if (fragment === 'assessment') {
    return { viewId: 'view-assessment', fragment: 'assessment', categoryKey: null };
  }

  const categoryKey = categoryKeyFromRouteFragment(fragment);
  if (categoryKey) {
    return {
      viewId: 'view-assessment',
      fragment: routeFragmentForCategory(categoryKey),
      categoryKey,
    };
  }

  return { viewId: 'view-home', fragment: '', categoryKey: null };
}

function syncRoute(fragment, replace = false) {
  const nextFragment = fragment ? `#${fragment}` : '';
  if (location.hash === nextFragment) return;

  if (!fragment) {
    history[replace ? 'replaceState' : 'pushState'](null, '', `${location.pathname}${location.search}`);
    return;
  }

  if (replace) {
    history.replaceState(null, '', `${location.pathname}${location.search}${nextFragment}`);
    return;
  }

  location.hash = fragment;
}

function resolveRouteForStartup(route, hasActiveProfile) {
  if (route.viewId === 'view-profile') {
    return { viewId: 'view-profile', fragment: 'profile' };
  }

  if (route.viewId === 'view-results') {
    return hasActiveProfile
      ? { viewId: 'view-results', fragment: 'results' }
      : { viewId: 'view-profile', fragment: 'profile' };
  }

  if (route.viewId === 'view-assessment') {
    return hasActiveProfile
      ? route
      : { viewId: 'view-profile', fragment: 'profile' };
  }

  return { viewId: 'view-home', fragment: '' };
}

function handleRouteChange() {
  const route = parseRouteFromLocation();
  const resolved = resolveRouteForStartup(route, !!getState().activeProfileId);
  const needsSync = resolved.viewId !== route.viewId || resolved.fragment !== route.fragment;

  showView(resolved.viewId, {
    routeFragment: resolved.fragment,
    syncHistory: needsSync,
    replaceHistory: true,
  });
}

/**
 * Show one view, hide all others. Moves focus to the view's first heading.
 * @param {string} viewId  - the section id (without #)
 */
export function showView(viewId, options = {}) {
  const {
    routeFragment = routeFragmentForView(viewId),
    syncHistory = true,
    replaceHistory = false,
  } = options;

  setState({ currentView: viewId.replace('view-', '') });

  if (viewId !== 'view-loading' && syncHistory) {
    syncRoute(routeFragment, replaceHistory);
  }

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
    import(versionedModulePath('./views/assessment.js')).then(m => m.renderAssessmentView());
  }
  if (viewId === 'view-home') {
    import(versionedModulePath('./views/home.js')).then(m => m.renderHomeView?.());
  }
  if (viewId === 'view-profile') {
    import(versionedModulePath('./views/profile.js')).then(m => m.renderProfileView?.());
  }
  if (viewId === 'view-results') {
    import(versionedModulePath('./views/results.js')).then(m => m.renderResultsView?.());
  }
}

export function hideAllViews() {
  VIEWS.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.setAttribute('hidden', ''); el.classList.remove('active'); }
  });
}

export function setRoute(fragment, options = {}) {
  syncRoute(fragment, options.replace === true);
}

export function getRouteInfo() {
  return parseRouteFromLocation();
}

export function getAssessmentCategoryRoute(categoryKey) {
  return routeFragmentForCategory(categoryKey);
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
      import(versionedModulePath('./views/home.js')),
      import(versionedModulePath('./views/profile.js')),
      import(versionedModulePath('./views/assessment.js')),
      import(versionedModulePath('./views/results.js')),
      import(versionedModulePath('./import-yaml.js')),
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

    const resolved = resolveRouteForStartup(parseRouteFromLocation(), !!getState().activeProfileId);
    showView(resolved.viewId, { routeFragment: resolved.fragment, replaceHistory: true });
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
window.App = { showView, hideAllViews, showToast, announceStatus, setRoute, getRouteInfo, getAssessmentCategoryRoute };

window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('popstate', handleRouteChange);

// ---------- Start -----------------------------------------
document.addEventListener('DOMContentLoaded', boot);
