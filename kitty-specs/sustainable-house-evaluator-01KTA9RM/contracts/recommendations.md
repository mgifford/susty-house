# Contract: recommendations.js — Recommendation Filter & Sorter

**Module**: `src/js/recommendations.js`  
**Responsibility**: Filters the item catalogue to items that are feasible for the user's
capacity, excludes already-completed items, and sorts by priority given the user's ambition.

---

## Exports

```js
/**
 * Returns a prioritised list of recommended upgrade items.
 *
 * Filtering:
 *   - Exclude items where not_applicable = true
 *   - Exclude items where slider_value = 5 (already excellent)
 *   - Exclude items where item.budget_min ordinal > user budget ordinal
 *   - Exclude items where item.skill_min ordinal > user skill ordinal
 *   - Exclude items where item.time_min ordinal > user time ordinal
 *
 * Sorting:
 *   - light_touch | meaningful → ascending by impact_potential (quick wins first)
 *   - significant | deep_green → descending by impact_potential (highest impact first)
 *
 * impact_potential = item.weight × (5 - slider_value)
 *
 * @param {Assessment} assessment
 * @param {OwnerCapacity} capacity
 * @param {UpgradeCategory[]} catalogue
 * @param {number} [limit=10]  - max items to return; 0 = no limit
 * @returns {RecommendationItem[]}
 */
export function getRecommendations(assessment, capacity, catalogue, limit = 10)
```

## RecommendationItem shape

```js
{
  key: string,               // item key
  label: string,
  guidance: string,
  category_key: string,
  category_label: string,
  current_slider_value: number,
  impact_potential: number,
  weight: number,
  budget_min: string,
  skill_min: string,
  time_min: string
}
```
