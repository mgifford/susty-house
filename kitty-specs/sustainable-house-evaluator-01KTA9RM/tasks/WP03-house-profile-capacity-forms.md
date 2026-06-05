---
work_package_id: WP03
title: House Profile and Capacity Forms
dependencies:
- WP02
requirement_refs:
- FR-001
- FR-002
- FR-017
- NFR-005
- NFR-006
planning_base_branch: master
merge_target_branch: master
branch_strategy: Planning artifacts for this feature were generated on master. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into master unless the human explicitly redirects the landing branch.
subtasks:
- T012
- T013
- T014
- T015
history: []
authoritative_surface: src/js/views/
execution_mode: code_change
owned_files:
- src/js/profiles.js
- src/js/views/home.js
- src/js/views/profile.js
tags: []
---

# WP03 — House Profile and Capacity Forms

## Objective

Implement the home screen (profile list) and the house profile + owner capacity form. Users
can create, switch, rename, and delete house profiles. All data persists to IndexedDB.

## Context

- Views render into the `<section>` containers created by WP01
- All UI strings come from `strings.json` via `window.t(key)` (WP02)
- Profiles persist via `db.js` CRUD; state updates via `store.setState()` (WP02)
- Entity shapes: see `kitty-specs/sustainable-house-evaluator-01KTA9RM/data-model.md`
- Accessibility: all form controls must have associated `<label>`; keyboard-operable
- NFR-006: forms must be usable on a 320px mobile viewport

## Subtasks

### T012 — Create src/js/profiles.js CRUD module

**Purpose**: Encapsulate all HouseProfile business logic: create, read, update, delete,
and validate. View modules call this; they never call db.js directly.

**Steps**:
1. Create `src/js/profiles.js` exporting:
   - `createProfile(data)`: validates required fields, generates `id` via
     `crypto.randomUUID()`, sets `created_at` to ISO timestamp, embeds `capacity` sub-object
     from data, calls `db.putProfile()`, updates `store.setState({profiles: [...]})`
   - `updateProfile(id, patch)`: merges patch into existing profile, calls `db.putProfile()`,
     refreshes store profiles list
   - `deleteProfile(id)`: confirms id exists, calls `db.deleteProfile(id)` (which cascades
     to assessments), refreshes store
   - `listProfiles()`: calls `db.getAllProfiles()`, sets `store.setState({profiles})`
   - `setActiveProfile(id)`: calls `db.getProfile(id)`, sets
     `store.setState({activeProfileId: id, activeProfile: profile})`, writes `id` to
     `localStorage.setItem("lastActiveProfileId", id)`
   - `validateProfile(data)`: returns `{valid: bool, errors: {fieldName: string}}`;
     validates nickname (required, max 100), year_built (1800–current year),
     floor_area_sqm (>0), storeys (1–6), occupant_count (1–20), all required enum fields

2. Enum allowed values (must match items.json thresholds):
   - `construction_type`: wood_frame, masonry, manufactured, other
   - `climate_zone`: cold, temperate, hot_dry, hot_humid, mixed
   - `budget_range`: limited, moderate, substantial, major
   - `time_availability`: limited, weekends, extended, hired
   - `skill_level`: novice, basic_diy, experienced, trade
   - `ambition_level`: light_touch, meaningful, significant, deep_green

**Files**: `src/js/profiles.js` (new, ~120 lines)
**Validation**: `createProfile({nickname:"Test",...})` saves to IDB; `listProfiles()`
returns it; `deleteProfile(id)` removes it; `validateProfile({})` returns errors for all
required fields

---

### T013 — Create src/js/views/home.js (profile list view)

**Purpose**: Render the home screen showing saved profiles, with actions to open, rename,
delete, create new, and import from YAML.

**Steps**:
1. Create `src/js/views/home.js` exporting `initHomeView()`:
   - Subscribe to `store` changes; re-render profile list whenever `state.profiles` changes
   - `render()` function: clears `#view-home` content and inserts:
     - `<h1>` with `t("home.title")`
     - If `state.profiles.length === 0`: empty-state message using `t("home.no_profiles")`
     - Profile card list: for each profile a `.card` with nickname, year built, floor area,
       last assessment date (if any), and three buttons: "Open", "Rename", "Delete"
     - "New Assessment" button (primary) → calls `profiles.createProfile()` flow
     - "Import from YAML" button → triggers hidden `<input type="file" accept=".yaml,.yml">`
       (the import-yaml module handles this in WP06; for now wire to a TODO stub)
   - "Open" button: calls `profiles.setActiveProfile(id)`, then
     `store.setState({currentView: "assessment"})`
   - "Rename" button: prompts with current nickname (use `window.prompt()` for v1),
     calls `profiles.updateProfile(id, {nickname: newName})`
   - "Delete" button: confirms with `window.confirm(t("home.delete_confirm"))`, calls
     `profiles.deleteProfile(id)`
   - On init: call `profiles.listProfiles()` to hydrate store

2. Accessibility: "Delete" button uses `aria-label` including the profile nickname;
   profile cards have correct heading hierarchy

**Files**: `src/js/views/home.js` (new, ~100 lines)
**Validation**: Creating a profile, navigating to home shows profile card; delete removes it;
empty state shows when no profiles exist

---

### T014 — Create src/js/views/profile.js (profile + capacity form)

**Purpose**: Render the two-section form for house details and owner capacity.

**Steps**:
1. Create `src/js/views/profile.js` exporting `initProfileView()`:
   - Insert HTML into `#view-profile`:
     - `<h1>` "House Profile" with back button to home
     - **Section 1: House Details** — labelled form fields for all 7 house profile fields:
       - nickname: `<input type="text">` required
       - year_built: `<input type="number" min="1800" max="<current year>">` required
       - floor_area_sqm: `<input type="number" min="1">` required
       - storeys: `<select>` with options 1–6
       - construction_type: `<select>` with labelled options from strings.json
       - climate_zone: `<select>` with labelled options from strings.json
       - occupant_count: `<input type="number" min="1" max="20">` required
     - **Section 2: Your Capacity** — radio-group or `<select>` for each:
       - budget_range (4 options with friendly labels)
       - time_availability (4 options)
       - skill_level (4 options)
       - ambition_level (4 options)
     - **Section 3: Assessor Info (optional)** — collapsible with `<details>/<summary>`:
       - assessor_name: `<input type="text">`
       - assessor_company: `<input type="text">`
     - Save button (primary) + Cancel button
   - On "Save": call `validateProfile(data)`; display inline errors if invalid; call
     `createProfile()` or `updateProfile()` if editing an existing profile
   - On "Cancel": navigate back to home view without saving
   - When `state.activeProfile` is set (edit mode): pre-populate all fields from it

2. Inline validation: on blur of required fields, show error message in a `<span
   class="field-error" role="alert">` adjacent to the input

3. Accessibility: every `<input>` and `<select>` has a `<label>` with `for` attribute;
   all `<select>` options are non-empty; error spans use `role="alert"`

**Files**: `src/js/views/profile.js` (new, ~180 lines)
**Validation**: Submitting empty form shows errors on required fields; valid form saves
profile and navigates to assessment view; editing an existing profile pre-populates fields

---

### T015 — Wire profile form to store and IndexedDB with auto-save

**Purpose**: Ensure profile data round-trips correctly through store → IndexedDB → view,
and that the last active profile is restored on app reload (FR-016).

**Steps**:
1. In `app.js` startup sequence (from WP01), ensure:
   - `profiles.listProfiles()` is called before showing `#view-home`
   - If `localStorage.getItem("lastActiveProfileId")` is set, call
     `profiles.setActiveProfile(savedId)` — if profile no longer exists, clear the
     localStorage entry and show home with no active profile
2. Add a `<div role="status" aria-live="polite" id="save-status"></div>` near the Save
   button in the profile form; update its text to "Saved" briefly after successful save
   and clear after 2 seconds
3. In `home.js`, if `state.activeProfileId` is set, highlight that profile card with a
   `class="active-profile"` CSS indicator

**Files**: `src/js/views/profile.js` (modified, ~10 lines added), `src/js/views/home.js`
(modified, ~5 lines added) — both already owned by this WP
**Validation**: Create a profile, reload the page, verify the profile card is shown and
highlighted; delete the profile, reload, verify home shows empty state

---

## Definition of Done

- [ ] `profiles.js` validates all 7 house fields and 4 capacity fields with meaningful errors
- [ ] Home view renders profile cards, empty state, and all three profile action buttons
- [ ] Profile form pre-populates when editing; clears when creating new
- [ ] All `<input>` and `<select>` elements have associated `<label>` elements
- [ ] Inline field errors use `role="alert"` spans
- [ ] Last active profile is restored on app reload via localStorage pointer
- [ ] Form is usable on 320px viewport (no horizontal overflow)

## Risks

- **`window.prompt()` for rename**: acceptable for v1 but not keyboard-accessible on
  all browsers; document as a known v1 limitation for WP08 to address

## Implementation Command

```bash
spec-kitty agent action implement WP03 --agent copilot
```
