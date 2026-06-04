# Contract: export-html.js — HTML Report Builder

**Module**: `src/js/export-html.js`  
**Responsibility**: Builds a self-contained, print-ready HTML report from assessment data
and triggers a file download.

---

## Exports

```js
/**
 * Exports the assessment as a .html report file download.
 * The HTML is fully self-contained (inline CSS, no external resources).
 *
 * @param {HouseProfile} profile
 * @param {Assessment} currentAssessment  - the snapshot to feature in the report
 * @param {Assessment[]} history          - prior snapshots (may be empty)
 * @param {UpgradeCategory[]} catalogue   - for label/guidance lookups
 * @param {RecommendationItem[]} recommendations
 * @returns {void}
 */
export function exportToHTML(profile, currentAssessment, history, catalogue, recommendations)

/**
 * Builds the HTML string (no download) — useful for testing and preview.
 *
 * @param {HouseProfile} profile
 * @param {Assessment} currentAssessment
 * @param {Assessment[]} history
 * @param {UpgradeCategory[]} catalogue
 * @param {RecommendationItem[]} recommendations
 * @returns {string}  Complete HTML document string
 */
export function toHTMLString(profile, currentAssessment, history, catalogue, recommendations)
```

## Report Sections (in order)

1. **Header** — house nickname, assessment date, assessor name/company (if set)
2. **Overall Score** — numeric score + visual gauge (CSS-only)
3. **House Profile Summary** — all profile fields
4. **Owner Capacity** — budget, time, skills, ambition
5. **Category Scores** — table of category name, score, completion %
6. **Detailed Findings** — per category: each item with slider value, N/A status, notes
7. **Recommendations** — ordered list of next-step upgrades with guidance excerpts
8. **History** — if `history.length > 0`, shows prior assessment dates and overall scores

## Filename convention

`susty-house-report-<nickname-slug>-<YYYY-MM-DD>.html`

## Constraints

- No external CSS or JS references in the generated file
- Inline `<style>` block includes `@media print` rules
- All dynamic values HTML-escaped to prevent XSS in the downloaded file
