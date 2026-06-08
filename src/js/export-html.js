/* Sustainable House Evaluator — HTML Report Export */

import { computeCategoryScore } from './scoring.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value) {
  return String(value ?? 'house')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'house';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return escapeHtml(date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }));
}

function formatText(value) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function scoreMeta(score) {
  if (score >= 70) return { className: 'score-high', label: 'Strong' };
  if (score >= 40) return { className: 'score-mid', label: 'Improving' };
  return { className: 'score-low', label: 'Needs attention' };
}

function firstSentence(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^.*?[.!?](?:\s|$)/);
  return escapeHtml((match ? match[0] : trimmed).trim());
}

function getCategoryDef(catalogue, categoryKey) {
  return catalogue.find((category) => category.key === categoryKey) ?? null;
}

function getItemDef(categoryDef, itemKey) {
  return categoryDef?.items.find((item) => item.key === itemKey) ?? null;
}

function categoryScoreRows(currentAssessment, catalogue) {
  return catalogue.map((categoryDef) => {
    const categoryResult = currentAssessment.categories.find((category) => category.name === categoryDef.key);
    const computed = computeCategoryScore(categoryResult ?? { name: categoryDef.key, items: [] }, categoryDef);
    const score = computed.score;
    const completion = computed.completionPct;
    const isNA = score === null;
    const numericScore = typeof score === 'number' ? Math.round(score) : null;
    const meta = scoreMeta(numericScore ?? 0);

    return `
      <tr>
        <th scope="row">${escapeHtml(categoryDef.label)}</th>
        <td>${isNA ? 'N/A' : `${numericScore}/100`}</td>
        <td>${completion}%</td>
        <td>${isNA ? 'Not applicable' : escapeHtml(meta.label)}</td>
        <td>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill ${escapeHtml(meta.className)}" style="width:${isNA ? 0 : numericScore}%"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function findingsSections(currentAssessment, catalogue) {
  return catalogue.map((categoryDef) => {
    const categoryResult = currentAssessment.categories.find((category) => category.name === categoryDef.key)
      ?? { items: [] };

    const itemRows = categoryDef.items.map((itemDef) => {
      const itemResult = categoryResult.items.find((item) => item.key === itemDef.key)
        ?? { slider_value: 0, not_applicable: false, notes: '' };
      const currentState = itemDef.slider_labels?.[itemResult.slider_value] ?? `Level ${itemResult.slider_value}`;

      return `
        <tr>
          <th scope="row">${escapeHtml(itemDef.label)}</th>
          <td>${escapeHtml(currentState)}</td>
          <td>${itemResult.not_applicable ? 'Yes' : 'No'}</td>
          <td>${escapeHtml(itemResult.notes || '')}</td>
        </tr>
      `;
    }).join('');

    return `
      <section class="findings-group card">
        <h3>${escapeHtml(categoryDef.label)}</h3>
        <table>
          <caption>${escapeHtml(categoryDef.label)} findings</caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Current state</th>
              <th scope="col">N/A</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </section>
    `;
  }).join('');
}

function recommendationItems(recommendations) {
  if (!recommendations.length) {
    return '<p>No recommendations match the current assessment and capacity settings.</p>';
  }

  return `
    <ol class="recommendations">
      ${recommendations.map((recommendation) => {
        const priority = recommendation.impact_potential >= 30
          ? 'High'
          : recommendation.impact_potential >= 15
            ? 'Medium'
            : 'Low';

        return `
          <li class="recommendation-card">
            <h3>${escapeHtml(recommendation.label)}</h3>
            <p class="meta-line">
              <span class="badge">${escapeHtml(priority)} priority</span>
              <span>${escapeHtml(recommendation.category_label)}</span>
            </p>
            <p>${firstSentence(recommendation.guidance)}</p>
            <p class="meta-line">
              <span>Current state: ${escapeHtml(recommendation.slider_labels?.[recommendation.current_slider_value] ?? `Level ${recommendation.current_slider_value}`)}</span>
              <span>Budget: ${escapeHtml(formatText(recommendation.budget_min))}</span>
              <span>Skill: ${escapeHtml(formatText(recommendation.skill_min))}</span>
              <span>Time: ${escapeHtml(formatText(recommendation.time_min))}</span>
            </p>
          </li>
        `;
      }).join('')}
    </ol>
  `;
}

function historySection(history, catalogue) {
  if (!history.length) return '';

  const headerCells = catalogue
    .map((category) => `<th scope="col">${escapeHtml(category.label)}</th>`)
    .join('');

  const rows = history
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((assessment) => {
      const categoryCells = catalogue.map((category) => {
        const categoryResult = assessment.categories.find((item) => item.name === category.key);
        const computed = computeCategoryScore(categoryResult ?? { name: category.key, items: [] }, category);
        const score = computed.score;
        return `<td>${typeof score === 'number' ? `${Math.round(score)}/100` : 'N/A'}</td>`;
      }).join('');

      return `
        <tr>
          <th scope="row">${formatDate(assessment.created_at)}</th>
          <td>${Math.round(assessment.overall_score ?? 0)}/100</td>
          ${categoryCells}
        </tr>
      `;
    }).join('');

  return `
    <section class="history page-break-before">
      <h2>Assessment History</h2>
      <table>
        <caption>Previous assessment snapshots</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Overall</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function reportStyles() {
  return `
    :root {
      color-scheme: light;
      --green: #2d6a4f;
      --green-soft: #d8f3dc;
      --amber: #9a6700;
      --red: #b42318;
      --ink: #1f2933;
      --muted: #52606d;
      --border: #d9e2ec;
      --surface: #ffffff;
      --surface-alt: #f8fafc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: var(--ink);
      background: #fff;
    }
    main {
      max-width: 900px;
      margin: 0 auto;
    }
    h1, h2, h3 {
      color: var(--green);
      break-after: avoid;
      page-break-after: avoid;
    }
    h1 { font-size: 24pt; margin-bottom: 8px; }
    h2 { font-size: 18pt; margin: 28px 0 12px; }
    h3 { font-size: 14pt; margin: 0 0 10px; }
    p, li, td, th {
      font-size: 11pt;
      orphans: 3;
      widows: 3;
    }
    p { margin: 0 0 12px; }
    section { margin-top: 24px; }
    .card {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      background: var(--surface);
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .header-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      align-items: start;
    }
    .score-panel {
      border: 2px solid var(--green);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      background: var(--green-soft);
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .score-number {
      font-size: 30pt;
      font-weight: 700;
      line-height: 1.1;
    }
    .score-low { color: var(--red); }
    .score-mid { color: var(--amber); }
    .score-high { color: var(--green); }
    .score-status {
      font-weight: 700;
      margin-top: 6px;
    }
    .meta-line {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      color: var(--muted);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    caption {
      text-align: left;
      font-weight: 700;
      margin-bottom: 8px;
    }
    thead {
      display: table-header-group;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    tbody tr:nth-child(even) {
      background: var(--surface-alt);
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .bar-track {
      width: 100%;
      min-width: 120px;
      height: 10px;
      background: #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 999px;
    }
    .bar-fill.score-low { background: var(--red); }
    .bar-fill.score-mid { background: var(--amber); }
    .bar-fill.score-high { background: var(--green); }
    .recommendations {
      margin: 0;
      padding-left: 20px;
    }
    .recommendation-card {
      border: 1px solid var(--border);
      border-left: 4px solid var(--green);
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .badge {
      display: inline-block;
      border: 1px solid currentColor;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 10pt;
      font-weight: 700;
    }
    .muted {
      color: var(--muted);
    }
    @page {
      margin: 15mm;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      a[href]::after {
        content: " (" attr(href) ")";
        font-size: 0.875em;
        color: #333;
        word-break: break-all;
      }
      a[href^="#"]::after,
      a[href^="javascript:"]::after {
        content: "";
      }
      .page-break-before {
        break-before: page;
        page-break-before: always;
      }
    }
  `;
}

export function toHTMLString(profile, currentAssessment, history, catalogue, recommendations) {
  if (!profile?.id || !currentAssessment?.id || !Array.isArray(catalogue)) {
    throw new Error('A saved profile, assessment, and catalogue are required before you can export HTML.');
  }

  const score = Math.round(currentAssessment.overall_score ?? 0);
  const scoreDetails = scoreMeta(score);
  const assessorLine = profile.capacity?.assessor_name
    ? `
        <p class="meta-line">
          <span>Assessed by: ${escapeHtml(profile.capacity.assessor_name)}</span>
          ${profile.capacity.assessor_company ? `<span>${escapeHtml(profile.capacity.assessor_company)}</span>` : ''}
        </p>
      `
    : '';

  const houseRows = [
    ['Nickname', profile.nickname],
    ['Year built', profile.year_built],
    ['Floor area (m²)', profile.floor_area_sqm],
    ['Storeys', profile.storeys],
    ['Construction type', formatText(profile.construction_type)],
    ['Climate zone', formatText(profile.climate_zone)],
    ['Occupants', profile.occupant_count],
  ].map(([label, value]) => `
    <tr>
      <th scope="row">${escapeHtml(label)}</th>
      <td>${escapeHtml(value)}</td>
    </tr>
  `).join('');

  const capacityRows = [
    ['Budget', formatText(profile.capacity?.budget_range)],
    ['Time availability', formatText(profile.capacity?.time_availability)],
    ['Skill level', formatText(profile.capacity?.skill_level)],
    ['Ambition level', formatText(profile.capacity?.ambition_level)],
  ].map(([label, value]) => `
    <tr>
      <th scope="row">${escapeHtml(label)}</th>
      <td>${escapeHtml(value)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>House Fitness Report - ${escapeHtml(profile.nickname)}</title>
    <style>${reportStyles()}</style>
  </head>
  <body>
    <main>
      <header class="card">
        <div class="header-grid">
          <div>
            <h1>House Fitness Report</h1>
            <h2>${escapeHtml(profile.nickname)}</h2>
            <p class="meta-line">
              <span>This report: ${formatDate(currentAssessment.created_at)}</span>
              <span>Overall fitness score: ${score}/100</span>
            </p>
            ${assessorLine}
          </div>
          <aside class="score-panel">
            <div class="score-number ${escapeHtml(scoreDetails.className)}">${score}/100</div>
            <div class="score-status">${escapeHtml(scoreDetails.label)}</div>
            <p class="muted">House fitness score</p>
          </aside>
        </div>
      </header>

      <section class="card">
        <h2>House Details</h2>
        <table>
          <caption>House profile summary</caption>
          <tbody>${houseRows}</tbody>
        </table>
      </section>

      <section class="card">
        <h2>Owner Capacity</h2>
        <table>
          <caption>Capacity settings used for recommendations</caption>
          <tbody>${capacityRows}</tbody>
        </table>
      </section>

      <section class="card">
        <h2>Category Scores</h2>
        <table>
          <caption>Scores and completion by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Score</th>
              <th scope="col">Completion</th>
              <th scope="col">Status</th>
              <th scope="col">Progress</th>
            </tr>
          </thead>
          <tbody>${categoryScoreRows(currentAssessment, catalogue)}</tbody>
        </table>
      </section>

      <section>
        <h2>Detailed Findings</h2>
        ${findingsSections(currentAssessment, catalogue)}
      </section>

      <section class="card">
        <h2>Recommended Next Steps</h2>
        ${recommendationItems(recommendations)}
      </section>

      ${historySection(history, catalogue)}
    </main>
  </body>
</html>`;
}

export function exportToHTML(profile, currentAssessment, history, catalogue, recommendations) {
  const htmlString = toHTMLString(profile, currentAssessment, history, catalogue, recommendations);
  const blob = new Blob([htmlString], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `susty-house-report-${slugify(profile.nickname)}-${today()}.html`;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
