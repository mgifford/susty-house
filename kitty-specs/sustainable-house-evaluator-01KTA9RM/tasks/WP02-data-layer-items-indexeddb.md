---
work_package_id: WP02
title: Data Layer — items.json and IndexedDB
dependencies:
- WP01
requirement_refs:
- FR-016
- FR-017
- NFR-002
- NFR-010
- C-001
- C-003
- C-005
planning_base_branch: master
merge_target_branch: master
branch_strategy: Planning artifacts for this feature were generated on master. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into master unless the human explicitly redirects the landing branch.
subtasks:
- T008
- T009
- T010
- T011
history: []
authoritative_surface: src/data/
execution_mode: code_change
owned_files:
- src/data/items.json
- src/data/strings.json
- src/js/db.js
- src/js/store.js
tags: []
agent: "copilot"
shell_pid: "7801"
---

# WP02 — Data Layer: items.json and IndexedDB

## Objective

Define the full upgrade item catalogue and establish the local persistence layer. This WP
provides the data and storage foundation that all subsequent WPs consume.

## Context

- **items.json**: 6 categories, ~35 items; each item has weight, guidance text, and capacity
  thresholds used by scoring and recommendation modules
- **strings.json**: all user-visible UI strings; keyed for future i18n (NFR-010)
- **db.js**: Promise-wrapped IndexedDB CRUD; falls back to localStorage shim if IDB unavailable
- **store.js**: in-memory reactive state; auto-persists active assessment on mutation
- Data model details: `kitty-specs/sustainable-house-evaluator-01KTA9RM/data-model.md`
- Contract details: `kitty-specs/sustainable-house-evaluator-01KTA9RM/contracts/db.md`
  and `contracts/store.md`
- No data must ever leave the device (NFR-002, C-001)

## Subtasks

### T008 — Create src/data/items.json with full upgrade item catalogue

**Purpose**: Author all 6 categories and ~35 upgrade items with weights, guidance, and
capacity thresholds (FR-005, A-1, C-003).

**Steps**:
1. Create `src/data/items.json` with top-level key `"categories"` containing an array of 6
   category objects. Each category has: `key`, `label`, `description`, `items[]`.
   Each item has: `key`, `label`, `guidance`, `weight` (1–10), `budget_min`, `skill_min`,
   `time_min`, `ambition_levels[]`, `slider_labels[6]`.

2. **Category 1 — building_envelope** (~8 items): attic_insulation (weight 10), wall_insulation
   (9), basement_insulation (8), windows (9), exterior_doors (6), air_sealing (8),
   roofing_material (5), crawlspace_insulation (7).

3. **Category 2 — heating_cooling** (~7 items): furnace_boiler (10), heat_pump_air (9),
   heat_pump_ground (8), air_conditioning (6), hrv_erv (7), smart_thermostat (5),
   duct_sealing (6).

4. **Category 3 — hot_water** (~4 items): tank_water_heater (7), tankless_water_heater (7),
   heat_pump_water_heater (8), solar_thermal (7).

5. **Category 4 — renewable_energy** (~5 items): solar_pv (9), battery_storage (7),
   ev_charger (6), small_wind (4), green_power_tariff (3).

6. **Category 5 — water_efficiency** (~6 items): low_flow_fixtures (4), low_flow_toilet (5),
   rainwater_harvesting (4), greywater_reuse (4), drought_tolerant_landscaping (3),
   smart_irrigation (3).

7. **Category 6 — lighting_appliances** (~5 items): led_lighting (5), efficient_fridge (4),
   efficient_washer (4), efficient_dishwasher (3), smart_power_strips (2).

8. **Capacity thresholds** (examples): attic_insulation → budget_min: "limited",
   skill_min: "basic_diy", time_min: "weekends"; heat_pump_ground → budget_min: "major",
   skill_min: "trade", time_min: "hired"; low_flow_fixtures → budget_min: "limited",
   skill_min: "novice", time_min: "limited".

9. **slider_labels** for every item must be exactly 6 strings, e.g.:
   `["Not done", "Minimal", "Some", "Moderate", "Good", "Excellent"]` (varies by item).

10. **guidance** must be 1–3 plain-English sentences explaining what the upgrade is and
    why it matters (no jargon, no region-specific code references — C-003).

**Files**: `src/data/items.json` (new, ~300 lines)
**Validation**: JSON parses without errors; all 6 categories present; each item has all 9
required fields; `slider_labels` arrays each have exactly 6 entries

---

### T009 — Create src/data/strings.json with all UI strings

**Purpose**: Centralise every user-visible string to enable future translation (NFR-010).

**Steps**:
1. Create `src/data/strings.json` as a flat key–value object. Cover all labels, headings,
   button text, placeholder text, error messages, and ARIA labels used across all views.
   Include at minimum:
   - Navigation: `"nav.home"`, `"nav.profile"`, `"nav.assessment"`, `"nav.results"`
   - Home view: `"home.title"`, `"home.new_profile"`, `"home.import_yaml"`,
     `"home.no_profiles"`, `"home.delete_confirm"`
   - Profile form: `"profile.title"`, `"profile.nickname"`, `"profile.year_built"`,
     `"profile.floor_area"`, `"profile.storeys"`, `"profile.construction_type"`,
     `"profile.climate_zone"`, `"profile.occupants"`, `"profile.save"`, and all enum
     option labels for construction type, climate zone, budget, time, skill, ambition
   - Assessment: `"assessment.title"`, `"assessment.not_applicable"`, `"assessment.notes"`,
     `"assessment.progress"`, `"assessment.reset_confirm"`, `"assessment.complete"`
   - Results: `"results.title"`, `"results.overall_score"`, `"results.category_scores"`,
     `"results.recommendations"`, `"results.export_yaml"`, `"results.export_html"`
   - Errors: `"error.idb_unavailable"`, `"error.import_invalid"`,
     `"error.import_schema_version"`, `"error.required_field"`
   - ARIA: `"aria.score_badge"`, `"aria.progress_bar"`, `"aria.slider_value"`

**Files**: `src/data/strings.json` (new, ~80 lines)
**Validation**: JSON parses; no duplicate keys; at least 60 entries present

---

### T010 — Create src/js/db.js IndexedDB wrapper

**Purpose**: Provide a Promise-based CRUD API over IndexedDB for HouseProfile and Assessment
records (FR-016, FR-017, C-001).

**Steps**:
1. Create `src/js/db.js` implementing the interface from
   `kitty-specs/sustainable-house-evaluator-01KTA9RM/contracts/db.md`:
   - Module-level `let _db = null` to hold the open database instance
   - `openDB()`: opens `susty-house-db` version 1; in `onupgradeneeded` creates:
     - `house_profiles` object store with `keyPath: "id"`
     - `assessments` object store with `keyPath: "id"` and index `house_profile_id`
   - `putProfile(profile)`: `IDBObjectStore.put(profile)` in a readwrite transaction
   - `getAllProfiles()`: `getAll()` on `house_profiles`, sorted by `created_at` ASC
   - `getProfile(id)`: `get(id)` on `house_profiles`
   - `deleteProfile(id)`: deletes profile + all assessments for that profile in one transaction
   - `putAssessment(assessment)`: `put(assessment)` in `assessments` store
   - `getAssessmentsForProfile(profileId)`: uses `house_profile_id` index, sorted by
     `created_at` ASC
   - `getAssessment(id)`: `get(id)` on `assessments`
   - `deleteAssessment(id)`: `delete(id)` on `assessments`
2. Implement localStorage fallback: if `indexedDB` is undefined or `openDB()` rejects, swap
   to a thin in-memory + localStorage shim that serialises the same operations as JSON.
   Log `console.warn('IndexedDB unavailable, using localStorage fallback')`.
3. All functions return Promises. Wrap `IDBRequest` objects with a helper:
   ```js
   function idbRequest(req) {
     return new Promise((resolve, reject) => {
       req.onsuccess = () => resolve(req.result);
       req.onerror = () => reject(req.error);
     });
   }
   ```

**Files**: `src/js/db.js` (new, ~150 lines)
**Validation**: `openDB()` resolves; `putProfile({id:'test',...})` then `getProfile('test')`
returns the same object; `deleteProfile('test')` removes it; no console errors

---

### T011 — Create src/js/store.js in-memory reactive state

**Purpose**: Maintain in-memory application state, notify subscribers on mutations, and
auto-persist the active assessment to IndexedDB on every change (FR-016).

**Steps**:
1. Create `src/js/store.js` implementing the interface from
   `kitty-specs/sustainable-house-evaluator-01KTA9RM/contracts/store.md`:
   - Initial state shape (from data-model.md):
     ```js
     const initialState = {
       currentView: 'home',
       activeProfileId: null,
       activeProfile: null,
       activeAssessmentId: null,
       activeAssessment: null,
       itemCatalogue: [],
       isDirty: false,
       isLoading: false,
       error: null,
       profiles: []
     };
     ```
   - `getState()`: returns `Object.freeze({...state})` (shallow frozen copy)
   - `setState(patch)`: merges patch into state, calls all subscribers, then if
     `patch.activeAssessment !== undefined`, asynchronously calls `db.putAssessment()`
   - `subscribe(fn)`: adds `fn` to subscribers array, returns unsubscribe function
   - Auto-persist: debounce `db.putAssessment()` calls by 200ms to avoid thrashing on
     rapid slider changes

2. Load `strings.json` via `fetch('/susty-house/src/data/strings.json')` and expose global
   `window.t = (key) => strings[key] ?? key` helper for all UI modules.

3. Load `items.json` via `fetch('/susty-house/src/data/items.json')` and set
   `state.itemCatalogue` from the result.

**Files**: `src/js/store.js` (new, ~100 lines)
**Validation**: `setState({currentView: 'profile'})` triggers subscribed callback;
`getState().currentView` returns `'profile'`; auto-persist fires within 300ms of mutation

---

## Definition of Done

- [ ] `src/data/items.json` has exactly 6 categories with ≥ 35 total items
- [ ] Every item in items.json has all 9 required fields; all `slider_labels` arrays have 6 entries
- [ ] `src/data/strings.json` has ≥ 60 string keys covering all views
- [ ] `db.js` passes round-trip test: create → get → update → delete without error
- [ ] `store.js` triggers subscribers within one event loop tick of `setState()`
- [ ] Auto-persist fires within 300ms of `setState({activeAssessment: ...})`
- [ ] localStorage fallback activates without throwing when IDB is stubbed out

## Risks

- **items.json size**: ~35 items with guidance text; keep guidance concise (1–3 sentences) to
  keep file under 50 kB
- **IDB in private mode (older Safari)**: the fallback shim handles this but has a 5 MB
  localStorage limit — sufficient for typical use

## Implementation Command

```bash
spec-kitty agent action implement WP02 --agent copilot
```

## Activity Log

- 2026-06-05T16:42:28Z – copilot – shell_pid=7801 – Started implementation via action command
