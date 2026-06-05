/* Sustainable House Evaluator — Results View (WP05) */
import * as db from '../db.js';
import { exportToHTML } from '../export-html.js';
import { exportToYAML } from '../export-yaml.js';
import { getState, subscribe } from '../store.js';
import { computeCategoryScore } from '../scoring.js';
import { getRecommendations } from '../recommendations.js';

const SCORE_LABELS = [
  [0,  39, 'Needs attention',  'score-low'],
  [40, 69, 'Making progress',  'score-mid'],
  [70, 100, 'Great work!',     'score-high'],
];

function scoreClass(score) {
  for (const [lo, hi, , cls] of SCORE_LABELS) {
    if (score >= lo && score <= hi) return cls;
  }
  return 'score-low';
}

function scoreLabel(score) {
  for (const [lo, hi, lbl] of SCORE_LABELS) {
    if (score >= lo && score <= hi) return lbl;
  }
  return '';
}

function buildGaugeArc(score) {
  // SVG arc gauge: 0–100 maps to 0–270 degrees (starts at 225deg, clockwise)
  const r = 54, cx = 60, cy = 65;
  const totalDeg = 270;
  const startDeg = 225;
  const deg = (score / 100) * totalDeg;
  const endDeg = startDeg + deg;

  function polar(deg, radius) {
    const rad = (deg - 90) * (Math.PI / 180);
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  }

  const [sx, sy] = polar(startDeg, r);
  const [ex, ey] = polar(endDeg, r);
  const largeArc = deg > 180 ? 1 : 0;

  // Track arc (full 270°)
  const [tx, ty] = polar(startDeg + totalDeg, r);
  return { sx, sy, ex, ey, tx, ty, largeArc, cx, cy, r };
}

function gaugeHtml(score, cssClass) {
  const { sx, sy, ex, ey, tx, ty, largeArc, cx, cy, r } = buildGaugeArc(score);
  const [tSx, tSy] = [ /* track start */ (() => {
    const rad = (225 - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  })() ][0];

  const [trackEndX, trackEndY] = (() => {
    const rad = ((225 + 270) - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  })();

  const [fillX, fillY] = [sx, sy];

  return `
    <svg class="score-gauge ${cssClass}" viewBox="0 0 120 90" aria-hidden="true" focusable="false" width="160" height="120">
      <path d="M ${sx.toFixed(2)} ${sy.toFixed(2)}
               A ${r} ${r} 0 1 1 ${trackEndX.toFixed(2)} ${trackEndY.toFixed(2)}"
            fill="none" stroke="#d1e7d9" stroke-width="10" stroke-linecap="round"/>
      ${score > 0 ? `
      <path d="M ${fillX.toFixed(2)} ${fillY.toFixed(2)}
               A ${r} ${r} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}"
            fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"
            class="gauge-fill"/>
      ` : ''}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="gauge-number">${Math.round(score)}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" class="gauge-denom">/100</text>
    </svg>`;
}

function categoryRow(catDef, catResult) {
  const { score, completionPct } = computeCategoryScore(catResult, catDef);
  const displayScore = score === null ? 'N/A' : `${Math.round(score)}/100`;
  const barWidth = score === null ? 0 : Math.round(score);
  const cls = score === null ? '' : scoreClass(score);

  return `
    <tr>
      <td class="cat-label">${catDef.label}</td>
      <td class="cat-score ${cls}">${displayScore}</td>
      <td class="cat-bar-cell">
        <div class="progress-bar-wrap" aria-hidden="true">
          <div class="progress-bar-fill ${cls}" style="width:${barWidth}%"></div>
        </div>
      </td>
      <td class="cat-completion">${completionPct}% rated</td>
    </tr>`;
}

function recommendationCard(rec, index) {
  const currentLabel = rec.slider_labels?.[rec.current_slider_value] ?? `Level ${rec.current_slider_value}`;
  const impactLevel = rec.impact_potential >= 30 ? 'High' : rec.impact_potential >= 15 ? 'Medium' : 'Low';
  const impactCls = rec.impact_potential >= 30 ? 'badge-high' : rec.impact_potential >= 15 ? 'badge-mid' : 'badge-low';

  return `
    <div class="recommendation-card card" aria-labelledby="rec-title-${index}">
      <div class="rec-header">
        <span class="rec-category">${rec.category_label}</span>
        <span class="priority-badge ${impactCls}" aria-label="Impact: ${impactLevel}">${impactLevel} impact</span>
      </div>
      <h3 id="rec-title-${index}" class="rec-title">${rec.label}</h3>
      <p class="guidance">${rec.guidance}</p>
      <p class="rec-current text-muted">Current state: <em>${currentLabel}</em></p>
    </div>`;
}

function renderEmpty(section) {
  section.innerHTML = `
    <div class="container">
      <h1 tabindex="-1">Results</h1>
      <p class="text-muted">No assessment found. Start an assessment to see your results.</p>
      <button class="btn btn-primary mt-md" id="btn-results-start" type="button">
        Start Assessment
      </button>
    </div>`;
  section.querySelector('#btn-results-start')?.addEventListener('click', () => {
    window.App.showView('view-assessment');
  });
}

export function initResultsView() {
  subscribe(() => {
    const section = document.getElementById('view-results');
    if (!section || section.hasAttribute('hidden')) return;
    renderResultsView();
  });
}

export function renderResultsView() {
  const section = document.getElementById('view-results');
  if (!section) return;

  const state = getState();
  const { activeAssessment, activeProfile, itemCatalogue } = state;

  if (!activeAssessment || !itemCatalogue?.length) {
    renderEmpty(section);
    return;
  }

  const score = activeAssessment.overall_score ?? 0;
  const capacity = activeProfile?.capacity ?? {
    budget_range: 'moderate',
    skill_level: 'basic_diy',
    time_availability: 'weekends',
    ambition_level: 'meaningful',
  };

  const recommendations = getRecommendations(activeAssessment, capacity, itemCatalogue, 10);
  const cssClass = scoreClass(score);
  const label = scoreLabel(score);

  const categoryRows = itemCatalogue.map(catDef => {
    const catResult = activeAssessment.categories.find(c => c.name === catDef.key)
      ?? { name: catDef.key, items: [] };
    return categoryRow(catDef, catResult);
  }).join('');

  const recCards = recommendations.length
    ? recommendations.map((rec, i) => recommendationCard(rec, i)).join('')
    : '<p class="text-muted">No recommendations available given your current capacity settings. Try updating your capacity in the profile view.</p>';

  section.innerHTML = `
    <div class="container">
      <h1 tabindex="-1">Your Sustainability Results</h1>

      <!-- Overall score -->
      <section class="results-score-section" aria-label="Overall score">
        <div class="score-gauge-wrap">
          <div role="meter" aria-valuenow="${Math.round(score)}" aria-valuemin="0" aria-valuemax="100"
               aria-label="Overall sustainability score: ${Math.round(score)} out of 100">
            ${gaugeHtml(score, cssClass)}
          </div>
          <p class="score-headline ${cssClass}">${label}</p>
          <p class="text-muted">House sustainability score</p>
        </div>
      </section>

      <!-- Per-category breakdown -->
      <section aria-label="Category breakdown" class="mt-lg">
        <h2>Category Breakdown</h2>
        <div class="table-wrap">
          <table class="category-table">
            <caption class="sr-only">Sustainability scores by category</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Score</th>
                <th scope="col" aria-hidden="true">Progress</th>
                <th scope="col">Completion</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Recommendations -->
      <section aria-label="Recommendations" class="mt-lg">
        <h2>Recommended Next Steps</h2>
        <p class="text-muted">Based on your current ratings and capacity settings.</p>
        <div class="recommendations-list">
          ${recCards}
        </div>
      </section>

      <!-- Export actions -->
      <section aria-label="Export" class="mt-lg card-actions">
        <button class="btn btn-secondary" id="btn-export-yaml" type="button">
          Export YAML
        </button>
        <button class="btn btn-secondary" id="btn-export-html" type="button">
          Export HTML Report
        </button>
        <button class="btn btn-primary" id="btn-results-back" type="button">
          ← Back to Assessment
        </button>
      </section>
    </div>`;

  section.querySelector('#btn-results-back')?.addEventListener('click', () => {
    window.App.showView('view-assessment');
  });

  section.querySelector('#btn-export-yaml')?.addEventListener('click', async () => {
    try {
      const { activeProfile, activeProfileId } = getState();
      if (!activeProfile || !activeProfileId) {
        throw new Error('A saved house profile is required before you can export YAML.');
      }

      const assessments = await db.getAssessmentsForProfile(activeProfileId);
      exportToYAML(activeProfile, assessments);
      window.App.showToast('YAML export started.');
    } catch (error) {
      window.App.showToast(error.message);
    }
  });

  section.querySelector('#btn-export-html')?.addEventListener('click', async () => {
    try {
      const state = getState();
      if (!state.activeProfile || !state.activeProfileId || !state.activeAssessment || !state.activeAssessmentId) {
        throw new Error('A saved house profile and assessment are required before you can export HTML.');
      }

      const allAssessments = await db.getAssessmentsForProfile(state.activeProfileId);
      const history = allAssessments.filter((assessment) => assessment.id !== state.activeAssessmentId);

      exportToHTML(
        state.activeProfile,
        state.activeAssessment,
        history,
        state.itemCatalogue,
        recommendations
      );
      window.App.showToast('HTML report export started.');
    } catch (error) {
      window.App.showToast(error instanceof Error ? error.message : 'Could not export the HTML report.');
    }
  });
}
