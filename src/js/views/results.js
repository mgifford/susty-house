/* Sustainable House Evaluator — Results View (stub — implemented in WP05) */
import { getState } from '../store.js';

export function initResultsView() {
  // Wired up in WP05
}

export function renderResultsView() {
  const section = document.getElementById('view-results');
  if (!section) return;
  const state = getState();
  const score = state.activeAssessment?.overall_score ?? 0;
  section.innerHTML = `
    <div class="container">
      <h1 tabindex="-1">Results</h1>
      <p class="text-muted">Full results view coming in WP05.</p>
      <p>Overall score: <strong>${Math.round(score)}</strong></p>
      <button class="btn btn-primary mt-md" id="btn-results-back" type="button">
        ← Back to Assessment
      </button>
    </div>
  `;
  section.querySelector('#btn-results-back')?.addEventListener('click', () => {
    window.App.showView('view-assessment');
  });
}
