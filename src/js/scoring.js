/* Sustainable House Evaluator — Scoring Engine (WP05) */

/**
 * Computes a single item's score contribution.
 * Returns score=0, weight=itemDef.weight if not_applicable is true
 * so N/A items don't count toward weighted average.
 *
 * @param {{ slider_value: number, not_applicable: boolean }} itemResult
 * @param {{ weight: number }} itemDef
 * @returns {{ score: number, weight: number, isNA: boolean }}
 */
export function computeItemScore(itemResult, itemDef) {
  if (itemResult.not_applicable) {
    return { score: 0, weight: itemDef.weight, isNA: true };
  }
  const score = (itemResult.slider_value / 5) * 100;
  return { score, weight: itemDef.weight, isNA: false };
}

/**
 * Computes a category score from its item results.
 * Excludes N/A items from numerator and denominator.
 *
 * @param {{ name: string, items: Array }} categoryResult
 * @param {{ key: string, items: Array }} categoryDef
 * @returns {{ score: number|null, completionPct: number }}
 */
export function computeCategoryScore(categoryResult, categoryDef) {
  const totalItems = categoryDef.items.length;
  let weightedSum = 0;
  let totalWeight = 0;
  let ratedOrNA = 0;

  for (const itemDef of categoryDef.items) {
    const itemResult = categoryResult.items.find(i => i.key === itemDef.key)
      ?? { slider_value: 0, not_applicable: false };

    const { score, weight, isNA } = computeItemScore(itemResult, itemDef);

    if (isNA) {
      ratedOrNA++;
      continue; // N/A items excluded from weighted average
    }

    if (itemResult.slider_value > 0) ratedOrNA++;

    weightedSum += score * weight;
    totalWeight += weight;
  }

  const completionPct = totalItems ? Math.round((ratedOrNA / totalItems) * 100) : 0;

  if (totalWeight === 0) {
    return { score: null, completionPct };
  }

  return {
    score: weightedSum / totalWeight,
    completionPct,
  };
}

/**
 * Computes the overall sustainability score (0–100).
 * Categories where all items are N/A are excluded.
 *
 * @param {{ categories: Array }} assessment
 * @param {Array} catalogue  - full items.json categories array
 * @returns {number}  0–100, rounded to 1 decimal place
 */
export function computeOverallScore(assessment, catalogue) {
  if (!assessment || !catalogue) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const categoryDef of catalogue) {
    const categoryResult = assessment.categories.find(c => c.name === categoryDef.key);
    if (!categoryResult) continue;

    const { score } = computeCategoryScore(categoryResult, categoryDef);
    if (score === null) continue; // all N/A, skip

    const categoryWeight = categoryDef.items.reduce((sum, item) => {
      const result = categoryResult.items.find(i => i.key === item.key);
      if (result?.not_applicable) return sum; // N/A items don't contribute weight
      return sum + item.weight;
    }, 0);

    if (categoryWeight === 0) continue;

    weightedSum += score * categoryWeight;
    totalWeight += categoryWeight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}
