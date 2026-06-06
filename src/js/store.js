/* Sustainable House Evaluator — In-Memory State Store */

import * as db from './db.js';

const initialState = {
  currentView: 'home',
  activeProfileId: null,
  activeProfile: null,
  activeAssessmentId: null,
  activeAssessment: null,
  itemCatalogue: [],
  strings: {},
  isDirty: false,
  isLoading: false,
  error: null,
  profiles: [],
};

let _state = { ...initialState };
const _subscribers = new Set();
let _persistTimer = null;

// ---------- Public API ----------

export function getState() {
  return Object.freeze({ ..._state });
}

export function setState(patch) {
  _state = { ..._state, ...patch };
  _notifySubscribers();
  // Auto-persist active assessment (debounced 200ms)
  if ('activeAssessment' in patch && patch.activeAssessment) {
    clearTimeout(_persistTimer);
    _persistTimer = setTimeout(() => {
      db.putAssessment(patch.activeAssessment).catch(err =>
        console.warn('[Store] Auto-persist failed:', err)
      );
    }, 200);
  }
}

export function subscribe(fn) {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
}

// ---------- Bootstrap: load item catalogue and strings ----------

export async function loadCatalogue() {
  try {
    const basePath = location.pathname.startsWith('/susty-house/') ? '/susty-house' : '';
    const [itemsRes, stringsRes] = await Promise.all([
      fetch(`${basePath}/src/data/items.json`),
      fetch(`${basePath}/src/data/strings.json`),
    ]);
    const itemsData = await itemsRes.json();
    const stringsData = await stringsRes.json();
    setState({ itemCatalogue: itemsData.categories, strings: stringsData });
    // Install global t() helper
    window.t = (key) => stringsData[key] ?? key;
  } catch (err) {
    console.error('[Store] Failed to load catalogue:', err);
    window.t = (key) => key;
  }
}

// ---------- Internal ----------

function _notifySubscribers() {
  const state = getState();
  _subscribers.forEach(fn => {
    try { fn(state); } catch (e) { console.error('[Store] Subscriber error:', e); }
  });
}
