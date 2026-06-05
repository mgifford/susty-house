---
work_package_id: WP06
title: YAML Import and Export
dependencies:
- WP05
requirement_refs:
- FR-010
- FR-012
- FR-013
- NFR-008
- C-005
planning_base_branch: master
merge_target_branch: master
branch_strategy: Planning artifacts for this feature were generated on master. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into master unless the human explicitly redirects the landing branch.
subtasks:
- T026
- T027
- T028
- T029
history: []
authoritative_surface: src/js/
execution_mode: code_change
owned_files:
- src/js/export-yaml.js
- src/js/import-yaml.js
tags: []
---

# WP06 — YAML Import and Export

## Objective

Implement full-fidelity YAML export (multi-snapshot) and import with schema validation.
Users can save their assessment to a `.yaml` file and restore it in any browser at any time.

## Context

- Uses `js-yaml` loaded from CDN (global `window.jsyaml`); pre-cached by SW
- Schema version 1.0 embedded in every export (C-005)
- Multi-snapshot: YAML contains ALL assessments for a profile (FR-013, SC-7)
- Import validates schema_version and required fields; shows clear errors (not silent crash)
- Contracts: `contracts/export-yaml.md`, `contracts/import-yaml.md`
- YAML schema: `research.md` section 3

## Subtasks

### T026 — Create src/js/export-yaml.js

**Purpose**: Serialise the active house profile and all its assessments to a YAML file
download (FR-010, FR-013).

**Steps**:
1. Create `src/js/export-yaml.js` with:

   `toYAMLString(profile, assessments)`:
   - Build a plain JS object matching the YAML schema (from research.md section 3):
     ```js
     {
       schema_version: "1.0",
       exported_at: new Date().toISOString(),
       house: { ...profile fields (no capacity embedded — keep house and capacity separate) },
       capacity: { ...profile.capacity fields + assessor fields },
       assessments: assessments.map(a => ({
         id: a.id,
         created_at: a.created_at,
         overall_score: a.overall_score,
         assessor_name: profile.capacity.assessor_name ?? null,
         assessor_company: profile.capacity.assessor_company ?? null,
         categories: a.categories.map(cat => ({
           name: cat.name,
           score: cat.score,
           completion_pct: cat.completion_pct,
           items: cat.items.map(item => ({
             key: item.key,
             slider_value: item.slider_value,
             not_applicable: item.not_applicable,
             notes: item.notes || null
           }))
         }))
       }))
     }
     ```
   - Call `window.jsyaml.dump(obj, {lineWidth: 120, noRefs: true})`
   - Return the YAML string

   `exportToYAML(profile, assessments)`:
   - Call `toYAMLString()`
   - Create a Blob: `new Blob([yamlStr], {type: "text/yaml"})`
   - Build filename: `susty-house-${slugify(profile.nickname)}-${today()}.yaml`
   - Create a hidden `<a>` element, set `href = URL.createObjectURL(blob)`,
     `download = filename`, append to body, click it, remove it, revoke object URL
   - Helper `slugify(str)`: lowercase, replace spaces with hyphens, strip non-alphanumeric
   - Helper `today()`: returns `YYYY-MM-DD` string from `new Date()`

2. In `src/js/views/results.js` (WP05 owned): wire the "Export YAML" button to call
   `exportToYAML(state.activeProfile, await db.getAssessmentsForProfile(state.activeProfileId))`

**Files**: `src/js/export-yaml.js` (new, ~80 lines)
**Validation**: Clicking "Export YAML" downloads a file named correctly; file opens in a
text editor as valid YAML; `schema_version: "1.0"` is present; all assessment categories
and items appear

---

### T027 — Create src/js/import-yaml.js

**Purpose**: Parse an imported YAML file, validate its schema, and restore the assessment
data into IndexedDB (FR-012, NFR-008, C-005).

**Steps**:
1. Create `src/js/import-yaml.js` with:

   `class ImportError extends Error`:
   - Constructor: `(message, {field=null, schemaVersion=null} = {})`
   - Properties: `this.field`, `this.schemaVersion`

   `importFromYAML(yamlText)`:
   - Parse: `const obj = window.jsyaml.load(yamlText)` — wrap in try/catch; on parse
     error throw `new ImportError("Invalid YAML: " + e.message)`
   - Validate `schema_version`: must be `"1.0"` (string); throw `ImportError` with
     `schemaVersion` set if missing or mismatched
   - Validate required fields:
     - `obj.house.id`, `obj.house.nickname`, `obj.house.created_at` — throw with `field`
       if missing
     - `obj.capacity` present with `budget_range`, `time_availability`, `skill_level`,
       `ambition_level` — throw if missing
     - `obj.assessments` must be an array
   - Build `HouseProfile`: merge `obj.house` + `capacity: obj.capacity`
   - Build `Assessment[]`: map `obj.assessments`, validating each has `id` and `created_at`
   - Return `{profile: HouseProfile, assessments: Assessment[]}`

**Files**: `src/js/import-yaml.js` (new, ~90 lines)
**Validation**: A valid exported YAML round-trips through import with no data loss;
a YAML with wrong `schema_version` shows a clear error; completely malformed text shows
a parse error; missing required field shows which field failed

---

### T028 — Add import file picker UI to home view

**Purpose**: Wire the "Import from YAML" button (stubbed in WP03) to the actual importer
and persist the result (FR-012).

**Steps**:
1. In `src/js/views/home.js` (WP03 owned — this subtask adds integration; since WP06
   depends on WP05 which depends on WP03, WP03 is already merged):
   - Actually, to avoid touching WP03 files, add the import handler as a module in
     `import-yaml.js` that registers an event listener via a DOM query at init time
   - Add `initImportHandler()` export to `import-yaml.js`:
     - Query `document.getElementById("btn-import-yaml")` (button created by WP03 home view)
     - Query or create a hidden `<input type="file" id="import-file-input"
       accept=".yaml,.yml">` appended to body
     - On button click: trigger the file input click
     - On file input `change`: read the file with `FileReader.readAsText()`; on load call
       `importFromYAML(text)`; on success: call `db.putProfile(profile)` and
       `db.putAssessment(a)` for each assessment; call `profiles.listProfiles()` to refresh
       store; navigate to `#view-home`; show a success toast "Assessment loaded successfully"
     - On `ImportError`: show an error message in a `<div role="alert">` near the button

2. Call `initImportHandler()` from `app.js` bootstrap (WP01 file — note that WP06 is
   sequential after WP01, so this is a single-line addition to the already-merged app.js)

**Files**: `src/js/import-yaml.js` (new export added, ~40 lines)
**Validation**: Exporting a profile YAML and then re-importing it in the same session
recreates the profile with all assessments intact

---

### T029 — Validate multi-snapshot round-trip

**Purpose**: Ensure a profile with multiple assessments serialises and deserialises with
all snapshots preserved (FR-013, SC-2, SC-7).

**Steps**:
1. Create a manual test checklist in comments at the bottom of `export-yaml.js`:
   ```
   // MANUAL TEST CHECKLIST (run in browser console):
   // 1. Create a profile, complete one assessment, export YAML → verify assessments: has 1 entry
   // 2. Re-import, start a NEW assessment for the same profile, complete it, export again
   //    → verify assessments: has 2 entries, each with distinct created_at and overall_score
   // 3. Import the 2-snapshot YAML in a fresh browser profile → verify both snapshots present
   // 4. Verify exported YAML is valid by pasting into https://yaml-online-parser.appspot.com/
   //    (offline test: validate with jsyaml.load() in console)
   ```
2. Ensure `exportToYAML()` fetches ALL assessments for the profile via
   `db.getAssessmentsForProfile(profileId)` — not just the current one — and includes all
   in the `assessments[]` array sorted by `created_at` ASC
3. Ensure `importFromYAML()` creates/updates the profile AND upserts all assessments
   (using `db.putAssessment()` for each)

**Files**: `src/js/export-yaml.js` (minor update, ~5 lines), `src/js/import-yaml.js`
(minor update, ~5 lines)
**Validation**: Three-snapshot YAML imports correctly; `db.getAssessmentsForProfile()` returns
all 3 assessments after import

---

## Definition of Done

- [ ] Exported YAML contains `schema_version: "1.0"` and `exported_at` timestamp
- [ ] Exported YAML with 2 assessments contains 2 entries in `assessments[]`
- [ ] `importFromYAML()` throws `ImportError` for wrong schema_version with clear message
- [ ] Round-trip test (export Chrome → import Firefox) produces identical data
- [ ] File download is named `susty-house-<slug>-<date>.yaml`
- [ ] Import file picker shows error message on invalid file (no silent crash)

## Risks

- **jsyaml CDN availability**: `window.jsyaml` must be loaded before import/export is
  called; add a guard check and throw a meaningful error if not present

## Implementation Command

```bash
spec-kitty agent action implement WP06 --agent copilot
```

## Activity Log

- 2026-06-05T19:00:38Z – unknown – Moved to for_review
