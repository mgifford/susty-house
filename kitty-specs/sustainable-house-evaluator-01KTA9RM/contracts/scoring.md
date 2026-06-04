# Contract: scoring.js — Scoring Engine

**Module**: `src/js/scoring.js`  
**Responsibility**: Pure functions that compute sustainability scores from assessment data.
No side effects; deterministic for the same inputs.

---

## Exports

```js
/**
 * Computes a single item's score contribution.
 * Returns 0 if not_applicable is true.
 * @param {ItemResult} itemResult
 * @param {UpgradeItem} itemDef  - from items.json
 * @returns {{ score: number, weight: number }}  score = 0–100
 */
export function computeItemScore(itemResult, itemDef)

/**
 * Computes a category score from its item results.
 * Excludes N/A items from numerator and denominator.
 * Returns null if all items are N/A.
 * @param {CategoryResult} categoryResult
 * @param {UpgradeCategory} categoryDef  - from items.json
 * @returns {{ score: number | null, completionPct: number }}
 */
export function computeCategoryScore(categoryResult, categoryDef)

/**
 * Computes the overall sustainability score (0–100).
 * Categories where all items are N/A are excluded.
 * Returns 0 if no scoreable items exist.
 * @param {Assessment} assessment
 * @param {UpgradeCategory[]} catalogue  - full items.json catalogue
 * @returns {number}  0–100, rounded to 1 decimal place
 */
export function computeOverallScore(assessment, catalogue)
```

## Scoring Formula

```
itemScore      = (slider_value / 5) × 100           [0–100]
categoryScore  = Σ(itemScore × weight) / Σ(weight)  [0–100, N/A excluded]
overallScore   = Σ(categoryScore × Σweights) / Σ(allWeights)
```
