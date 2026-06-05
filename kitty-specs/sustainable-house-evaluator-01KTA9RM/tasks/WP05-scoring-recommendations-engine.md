---
work_package_id: WP05
title: Scoring and Recommendations Engine
dependencies:
- WP04
requirement_refs:
- FR-006
- FR-007
- FR-008
- NFR-004
planning_base_branch: master
merge_target_branch: master
branch_strategy: Planning artifacts for this feature were generated on master. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into master unless the human explicitly redirects the landing branch.
subtasks:
- T022
- T023
- T024
- T025
history: []
authoritative_surface: src/js/
execution_mode: code_change
owned_files:
- src/js/scoring.js
- src/js/recommendations.js
- src/js/views/results.js
tags: []
---

# WP05 — Scoring and Recommendations Engine

## Objective

Implement the weighted scoring algorithm and the capacity-filtered, ambition-sorted
recommendation engine. Connect both to the assessment view and render the results screen.

## Context

- Scoring formula and enum ordinals: `kitty-specs/.../data-model.md` (Enum Ordinal Map)
- Module contracts: `contracts/scoring.md`, `contracts/recommendations.md`
- SC-5: only items within user budget and skill appear as top recommendations
- SC-6: score updates without page reload; NFR-004: within 300ms
- WP04 uses a stub; this WP replaces the stub with real implementations

## Subtasks

### T022 — Create src/js/scoring.js

**Purpose**: Pure scoring functions — deterministic, no side effects (FR-006).

**Steps**:
1. Create `src/js/scoring.js` with three exported functions per `contracts/scoring.md`:

   `computeItemScore(itemResult, itemDef)`:
   - Returns `{score: 0, weight: itemDef.weight}` if `itemResult.not_applicable === true`
   - Otherwise: `score = (itemResult.slider_value / 5) * 100`
   - Returns `{score, weight: itemDef.weight}`

   `computeCategoryScore(categoryResult, categoryDef)`:
   - Build an array of `computeItemScore()` results for all items in categoryResult
   - Filter out N/A items (weight included only for non-N/A)
   - If all items are N/A: return `{score: null, completionPct: 0}`
   - `weightedSum = sum(score * weight)` for non-N/A items
   - `totalWeight = sum(weight)` for non-N/A items
   - `score = weightedSum / totalWeight` (0–100)
   - `completionPct = (items with slider_value > 0 or not_applicable) / total items * 100`
   - Returns `{score, completionPct}`

   `computeOverallScore(assessment, catalogue)`:
   - For each category: find matching categoryDef in catalogue; call `computeCategoryScore()`
   - Exclude categories where `score === null` (all N/A)
   - `overallScore = sum(categoryScore * categoryWeight) / sum(categoryWeight)`
     where `categoryWeight = sum(item weights in category, non-N/A only)`
   - Return value rounded to 1 decimal place; return 0 if no scoreable items

2. Wire into `assessment.js`: after `saveItemResult()`, call `computeOverallScore()` and
   update `state.activeAssessment.overall_score` via `store.setState()`

**Files**: `src/js/scoring.js` (new, ~80 lines)
**Validation**: Score of all-0 assessment = 0; score of all-5 assessment = 100; marking all
items N/A returns 0; one item at 5 out of two items at 0 produces a proportional result

---

### T023 — Create src/js/recommendations.js

**Purpose**: Filter the item catalogue to feasible items and sort by priority (FR-007, FR-008,
SC-5).

**Steps**:
1. Create `src/js/recommendations.js` per `contracts/recommendations.md`.

2. Define enum ordinal maps (copied from data-model.md):
   ```js
   const BUDGET = {limited:0, moderate:1, substantial:2, major:3};
   const SKILL  = {novice:0, basic_diy:1, experienced:2, trade:3};
   const TIME   = {limited:0, weekends:1, extended:2, hired:3};
   const AMBITION = {light_touch:0, meaningful:1, significant:2, deep_green:3};
   ```

3. `getRecommendations(assessment, capacity, catalogue, limit=10)`:
   - Flatten all items across categories into one list with their `categoryKey` and
     `categoryLabel`
   - For each item: find its `ItemResult` in `assessment`; default to `{slider_value:0,
     not_applicable:false}` if not yet rated
   - **Filter out**: `not_applicable === true`; `slider_value === 5`
   - **Filter out** if `BUDGET[itemDef.budget_min] > BUDGET[capacity.budget_range]`
   - **Filter out** if `SKILL[itemDef.skill_min] > SKILL[capacity.skill_level]`
   - **Filter out** if `TIME[itemDef.time_min] > TIME[capacity.time_availability]`
   - Compute `impact_potential = itemDef.weight * (5 - sliderValue)`
   - **Sort**: if `AMBITION[capacity.ambition_level] <= 1` (light_touch or meaningful):
     sort ascending by `impact_potential` (quick wins first);
     else sort descending (highest impact first)
   - Apply `limit` (0 = no limit)
   - Return array of `RecommendationItem` objects (shape in contracts/recommendations.md)

**Files**: `src/js/recommendations.js` (new, ~80 lines)
**Validation**: User with budget="limited" never sees items with budget_min="major";
user with ambition="light_touch" sees items sorted with lowest impact_potential first;
items with slider_value=5 are excluded

---

### T024 — Create src/js/views/results.js (results screen)

**Purpose**: Display the overall score gauge, per-category score bars, and top-10
recommendation cards (FR-006, FR-007, FR-008).

**Steps**:
1. Create `src/js/views/results.js` exporting `initResultsView()`:
   - Subscribe to `store`; re-render when `state.activeAssessment` changes
   - `render()` inserts into `#view-results`:

     **Overall score section**: large circular or arc gauge (CSS-only, no SVG library);
     shows score as `XX/100`; colour transitions: 0–39 red, 40–69 amber, 70–100 green;
     sub-text "Your house sustainability score"; `role="meter"` with `aria-valuenow`,
     `aria-valuemin="0"`, `aria-valuemax="100"`

     **Per-category section**: table or grid with one row per category showing category
     label, score (or "N/A" if all items marked N/A), and a horizontal progress bar
     (CSS `width` set to score%)

     **Recommendations section**: heading "Recommended Next Steps"; calls
     `recommendations.getRecommendations()` with current assessment and capacity;
     renders top 10 as `.recommendation-card` elements showing: item label, category,
     current state (slider label text), `impact_potential` as a visual priority badge,
     and guidance excerpt

     **Export buttons**: "Export YAML" and "Export HTML Report" buttons (wired to stubs
     here; WP06 and WP07 implement the real exporters)

     **Back button**: returns to assessment view

2. If no active assessment exists: show an empty state with a "Start Assessment" button

**Files**: `src/js/views/results.js` (new, ~180 lines)
**Validation**: Score gauge shows 0 for unrated assessment; after rating items it updates;
recommendations show only items within user capacity; export buttons are visible

---

### T025 — Integrate scoring into live assessment updates

**Purpose**: Connect scoring.js to the assessment walkthrough so the score badge in the
header updates in real time on every slider change (SC-6, NFR-004).

**Steps**:
1. In `src/js/assessment.js`, after calling `store.setState({activeAssessment: updated})`,
   call `scoring.computeOverallScore(updatedAssessment, store.getState().itemCatalogue)`
   and then call `store.setState({activeAssessment: {...updated, overall_score: newScore}})`
2. In `src/js/app.js` (WP01), subscribe to store; on every state change update the
   score badge `<div id="score-badge">` in the header with `state.activeAssessment?.overall_score`
3. Verify the full round-trip: slider change → `saveItemResult()` → scoring → store →
   header badge update is perceptible within 300ms (NFR-004)

**Files**: `src/js/assessment.js` (existing, ~10 lines added; owned by WP04 — coordinate
with WP04 implementer or do both WPs in sequence), `src/js/views/results.js` (minor wiring)
**Note**: Since `assessment.js` is owned by WP04, if WP05 runs after WP04 is merged, this
is a clean addition. If implemented in the same session, add directly.
**Validation**: Move a slider; verify `document.getElementById("score-badge")` text changes
without a page reload; DevTools shows no layout thrash

---

## Definition of Done

- [ ] `scoring.js`: all-0 assessment scores 0; all-5 scores 100; N/A items excluded correctly
- [ ] `recommendations.js`: no item above user budget or skill appears in results
- [ ] `recommendations.js`: ambition=light_touch sorts ascending; deep_green sorts descending
- [ ] Results view: score gauge renders with correct colour for 3 score ranges
- [ ] Results view: per-category scores shown for all 6 categories
- [ ] Results view: up to 10 recommendation cards shown for a partial assessment
- [ ] Score badge in header updates within 300ms of slider change (NFR-004)

## Risks

- **WP04 ownership of assessment.js**: T025 requires a small change to `assessment.js`;
  ensure this WP is implemented after WP04 is complete to avoid conflicts

## Implementation Command

```bash
spec-kitty agent action implement WP05 --agent copilot
```
