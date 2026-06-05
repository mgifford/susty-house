---
work_package_id: WP04
title: Assessment Walkthrough UI
dependencies:
- WP03
requirement_refs:
- FR-003
- FR-004
- FR-005
- FR-009
- FR-019
- FR-020
- NFR-004
- NFR-005
planning_base_branch: master
merge_target_branch: master
branch_strategy: Planning artifacts for this feature were generated on master. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into master unless the human explicitly redirects the landing branch.
subtasks:
- T016
- T017
- T018
- T019
- T020
- T021
history: []
authoritative_surface: src/js/
execution_mode: code_change
owned_files:
- src/js/assessment.js
- src/js/views/assessment.js
tags: []
agent: "copilot"
shell_pid: "14103"
---

# WP04 — Assessment Walkthrough UI

## Objective

Implement the core assessment experience: a guided walkthrough of all six upgrade categories,
each presenting items with sliders, N/A toggles, guidance text, and notes. Progress indicators
update live. Score updates in real time as sliders move.

## Context

- Views render into `#view-assessment` (created by WP01)
- Item catalogue loaded from `store.state.itemCatalogue` (WP02)
- Scoring engine is stubbed in this WP (calls a placeholder); WP05 provides the real engine
- All strings via `window.t(key)`; slider labels from `items.json`
- NFR-004: slider response within 300ms
- NFR-005: WCAG 2.1 AA — sliders must have `aria-valuetext`, score uses `aria-live`
- Data model: `kitty-specs/sustainable-house-evaluator-01KTA9RM/data-model.md`

## Subtasks

### T016 — Create src/js/assessment.js module

**Purpose**: Business logic for starting, updating, and resetting assessments. Views call
this; never db.js directly.

**Steps**:
1. Create `src/js/assessment.js` exporting:
   - `startAssessment(profileId)`: creates a new Assessment object with `id` (randomUUID),
     `house_profile_id`, `created_at`, `overall_score: 0`, `categories` array initialised
     from `store.state.itemCatalogue` (each item gets `slider_value: 0`,
     `not_applicable: false`, `notes: ""`), calls `db.putAssessment()`, sets
     `store.setState({activeAssessmentId, activeAssessment})`
   - `saveItemResult(assessmentId, categoryKey, itemKey, {sliderValue, notApplicable, notes})`:
     deep-updates the matching item in `state.activeAssessment.categories[].items[]`, calls
     `store.setState({activeAssessment: updated})` (auto-persist kicks in from store.js)
   - `getProgress(assessment)`: returns `{overall: number, byCategory: {catKey: number}}`
     where each value is the % of items rated (slider > 0 or N/A = true) out of total
   - `resetAssessment(assessmentId)`: sets all item slider_values to 0 and not_applicable
     to false, updates store and persists

**Files**: `src/js/assessment.js` (new, ~100 lines)
**Validation**: `startAssessment(profileId)` creates assessment with correct structure;
`saveItemResult()` updates nested item; `getProgress()` returns 0 initially and increases
after items are rated

---

### T017 — Build category navigation sidebar/stepper

**Purpose**: Let users navigate between the 6 categories sequentially or by direct click
(FR-003), with visual completion status per category (FR-019).

**Steps**:
1. In `src/js/views/assessment.js`, render a `<nav aria-label="Assessment categories">`
   containing an ordered list of category items. Each category shows:
   - Category label
   - A progress indicator (e.g., "3/8 items" or a small progress bar)
   - Visual state: not started (grey), in progress (amber), complete (green) — determined
     by `getProgress().byCategory[key]`
2. Clicking a category nav item calls `showCategory(categoryKey)` to render that category
   in the main content pane
3. On mobile (< 768px), collapse the nav into a `<select>` dropdown to save vertical space
4. Add "Previous" / "Next" buttons at the bottom of the content pane for sequential
   navigation
5. Keyboard: category nav items receive `tabindex="0"`, respond to Enter/Space

**Files**: `src/js/views/assessment.js` (new section, ~80 lines)
**Validation**: All 6 categories shown in nav; clicking each renders that category; on 320px
a dropdown replaces the sidebar

---

### T018 — Build item slider and N/A toggle components

**Purpose**: Render each upgrade item with its slider, N/A checkbox, slider labels, and
guidance text (FR-004, FR-005).

**Steps**:
1. `renderItem(item, itemResult)` function that returns an HTML string or DOM fragment:
   - `<article class="item-card">` wrapping:
     - `<h3>` with item label
     - `<p class="guidance">` with item guidance text from items.json
     - `<label>` + `<input type="range" min="0" max="5" step="1">` styled with tick marks
     - Slider value label below showing current `slider_labels[sliderValue]`
     - `aria-valuetext` attribute set to `slider_labels[sliderValue]`
     - `aria-label` set to item label
     - N/A `<label>` + `<input type="checkbox">` — when checked, disables the slider with
       `disabled` attribute and visually dims it
     - Notes `<label>` + `<textarea rows="2" placeholder="...">` for free-text notes
2. Wire change events:
   - Slider `input` event: call `assessment.saveItemResult(...)` with new slider value;
     update the displayed label text; trigger score recalculation
   - N/A checkbox `change` event: toggle `disabled` on slider; call `saveItemResult()` with
     `notApplicable` updated; trigger score recalculation
   - Notes `change` event (blur): call `saveItemResult()` with updated notes
3. When restoring a saved assessment, pre-populate slider values, N/A state, and notes from
   `state.activeAssessment`

**Files**: `src/js/views/assessment.js` (new section, ~120 lines)
**Validation**: Slider renders at correct position for a restored value; N/A checkbox disables
slider; keyboard arrow keys move slider; `aria-valuetext` matches slider label text

---

### T019 — Display guidance text per item

**Purpose**: Show plain-language guidance for each upgrade item (FR-005).

**Steps**:
1. Guidance text is the `guidance` field from `items.json`, already included in T018s
   `renderItem()` as `<p class="guidance">`.
2. Add a "Why this matters" `<details>/<summary>` toggle for items where guidance is longer
   than 100 characters, so the card stays compact. Show first sentence always; rest inside
   `<details>`.
3. Ensure guidance text has sufficient contrast (uses `--color-text-muted` which meets
   4.5:1) and adequate font size (min 0.9rem).

**Files**: `src/js/views/assessment.js` (guidance integrated into renderItem)
**Validation**: Every rendered item card shows at least one sentence of guidance text;
long guidance collapses under details toggle

---

### T020 — Create overall and per-category progress indicators

**Purpose**: Show assessment completion at category and overall level (FR-019).

**Steps**:
1. Add `<div class="progress-header">` at the top of the assessment view showing:
   - Overall completion %: "12 of 35 items rated (34%)"
   - An `<progress>` element (or CSS-styled div) with `aria-valuenow`, `aria-valuemin`,
     `aria-valuemax`, `aria-label`
2. Per-category progress shown in the sidebar (from T017): a mini bar under each category label
3. Overall score badge in the app `<header>` (from WP01 placeholder): update via
   `store.subscribe()` whenever `state.activeAssessment.overall_score` changes; the badge
   div has `role="status" aria-live="polite"` so screen readers announce score changes
4. Stub score display: until WP05 provides `scoring.computeOverallScore()`, display the
   raw count of rated items as a placeholder number

**Files**: `src/js/views/assessment.js` (new section, ~50 lines)
**Validation**: Rating an item increments the completion count; overall score badge updates
without page reload; `aria-live` region announces the new score

---

### T021 — Implement reset assessment function and button

**Purpose**: Allow users to clear all item ratings and start the assessment fresh (FR-020).

**Steps**:
1. Add a "Reset Assessment" button in the assessment view (e.g., in a settings/overflow menu)
2. On click: show `window.confirm(t("assessment.reset_confirm"))`; if confirmed, call
   `assessment.resetAssessment(state.activeAssessmentId)`
3. After reset: all sliders return to position 0, all N/A checkboxes unchecked, all notes
   cleared, progress resets to 0%, score badge shows 0
4. The reset creates a new assessment record (new `id`, new `created_at`) rather than
   modifying the existing one — this preserves history for longitudinal tracking

**Files**: `src/js/views/assessment.js` (new section, ~30 lines),
`src/js/assessment.js` (update `resetAssessment` to create new record, ~10 lines)
**Validation**: After reset, all sliders are at 0; progress shows 0%; the old assessment
record still exists in IndexedDB with its original data

---

## Definition of Done

- [ ] All 6 categories render with their items in the walkthrough
- [ ] Slider renders 6 positions; arrow keys move it; `aria-valuetext` matches label
- [ ] N/A checkbox disables slider and excludes item from scoring
- [ ] Notes saved on blur; restored correctly on revisit
- [ ] Per-category progress updates as items are rated
- [ ] Score badge updates within 300ms of slider change (NFR-004)
- [ ] Reset creates a new assessment record; old data preserved in IDB
- [ ] Category nav collapses to `<select>` at 320px width

## Risks

- **Nested state mutation**: `activeAssessment.categories[x].items[y]` is deeply nested;
  ensure `setState()` receives a full deep copy, not a mutated reference

## Implementation Command

```bash
spec-kitty agent action implement WP04 --agent copilot
```

## Activity Log

- 2026-06-05T17:37:08Z – copilot – shell_pid=14103 – Started implementation via action command
- 2026-06-05T17:51:45Z – copilot – shell_pid=14103 – WP04 implemented
- 2026-06-05T17:51:52Z – copilot – shell_pid=14103 – WP04 approved
