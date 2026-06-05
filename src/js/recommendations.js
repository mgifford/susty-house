/* Sustainable House Evaluator — Recommendations Engine (WP05) */

const BUDGET  = { limited: 0, moderate: 1, substantial: 2, major: 3 };
const SKILL   = { novice: 0, basic_diy: 1, experienced: 2, trade: 3 };
const TIME    = { limited: 0, weekends: 1, extended: 2, hired: 3 };
const AMBITION = { light_touch: 0, meaningful: 1, significant: 2, deep_green: 3 };

/**
 * Returns a prioritised list of recommended upgrade items filtered
 * by the user's capacity.
 *
 * @param {{ categories: Array }} assessment
 * @param {{ budget_range: string, skill_level: string, time_availability: string, ambition_level: string }} capacity
 * @param {Array} catalogue  - full items.json categories array
 * @param {number} [limit=10]  - 0 = no limit
 * @returns {Array}  RecommendationItem[]
 */
export function getRecommendations(assessment, capacity, catalogue, limit = 10) {
  if (!assessment || !capacity || !catalogue) return [];

  const userBudget  = BUDGET[capacity.budget_range]  ?? 0;
  const userSkill   = SKILL[capacity.skill_level]    ?? 0;
  const userTime    = TIME[capacity.time_availability] ?? 0;
  const userAmbition = AMBITION[capacity.ambition_level] ?? 0;

  const results = [];

  for (const categoryDef of catalogue) {
    const categoryResult = assessment.categories.find(c => c.name === categoryDef.key);

    for (const itemDef of categoryDef.items) {
      const itemResult = categoryResult?.items.find(i => i.key === itemDef.key)
        ?? { slider_value: 0, not_applicable: false };

      // Exclude already-excellent or explicitly N/A items
      if (itemResult.not_applicable) continue;
      if (itemResult.slider_value === 5) continue;

      // Exclude items beyond user's capacity
      if (BUDGET[itemDef.budget_min]  > userBudget)  continue;
      if (SKILL[itemDef.skill_min]    > userSkill)   continue;
      if (TIME[itemDef.time_min]      > userTime)    continue;

      const impact_potential = itemDef.weight * (5 - itemResult.slider_value);

      results.push({
        key: itemDef.key,
        label: itemDef.label,
        guidance: itemDef.guidance,
        category_key: categoryDef.key,
        category_label: categoryDef.label,
        current_slider_value: itemResult.slider_value,
        impact_potential,
        weight: itemDef.weight,
        budget_min: itemDef.budget_min,
        skill_min: itemDef.skill_min,
        time_min: itemDef.time_min,
        slider_labels: itemDef.slider_labels,
      });
    }
  }

  // Sort: ascending (quick wins) for light_touch/meaningful; descending for significant/deep_green
  if (userAmbition <= 1) {
    results.sort((a, b) => a.impact_potential - b.impact_potential);
  } else {
    results.sort((a, b) => b.impact_potential - a.impact_potential);
  }

  return limit > 0 ? results.slice(0, limit) : results;
}
