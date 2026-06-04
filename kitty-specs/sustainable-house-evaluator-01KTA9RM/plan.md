# Implementation Plan: Sustainable House Evaluator

**Mission ID**: 01KTA9RMG76YKC83Z6EAG1N323  
**Mission Slug**: sustainable-house-evaluator-01KTA9RM  
**Spec**: kitty-specs/sustainable-house-evaluator-01KTA9RM/spec.md  
**Plan Created**: 2026-06-04  
**Branch contract**: planning on `master`, merge target `master`

---

## Branch Contract

| Property | Value |
|---|---|
| Current branch at plan start | `master` |
| Planning / base branch | `master` |
| Final merge target | `master` |
| `branch_matches_target` | ✅ true |

---

## Engineering Alignment

| Decision | Choice | Rationale |
|---|---|---|
| Tech stack | Vanilla HTML + CSS + JavaScript | No build tooling, maximum portability, easy to contribute to |
| File structure | `src/js/`, `src/css/`, `src/data/` multi-file layout | Maintainable without bundler; served as static files |
| Item data authoring | `src/data/items.json` | Upgrade items and weights editable independently of app logic |
| YAML serialisation | `js-yaml` loaded from CDN | True YAML with comment support; only external runtime dependency |
| Local persistence | `localStorage` for lightweight session state; `IndexedDB` for structured data (profiles, assessments) | IndexedDB handles multi-profile multi-snapshot data volumes reliably |
| Offline / PWA | Service Worker + Cache API + `manifest.json` | Registered on GitHub Pages (HTTPS); Cache-First strategy for all app assets |
| Hosting | GitHub Pages | Free, HTTPS, auto-deploys from `master` |
| HTML report | Client-side Blob + anchor download | No server, no PDF dependency; print CSS handles layout |
| i18n readiness | All UI strings in `src/data/strings.json` | Swap one file to translate |

---

## Charter Check

No charter file exists at `.kittify/charter/charter.md`. Charter check **skipped**.

---

## Technical Context

**Runtime environment**: Browser (modern: Chrome, Firefox, Safari, Edge). No Node.js at runtime.

**Only external dependency**: `js-yaml` v4.x via CDN (`https://cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js`).  
Service Worker pre-caches this CDN asset on first load so it is available offline.

**Unique ID generation**: `crypto.randomUUID()` — available in all target browsers on HTTPS (GitHub Pages).

**State management**: A plain JS `store.js` module holds in-memory application state. Every mutation triggers an auto-save to IndexedDB. `localStorage` holds only the "last active profile ID" pointer.

**Scoring algorithm**: Weighted average of non-N/A items.
- Each item has a `weight` (1–10) in `items.json`
- Score per item = `(slider_value / 5) × weight`  
- Category score = `sum(item_scores) / sum(item_weights) × 100` (only non-N/A items)
- Overall score = weighted average of category scores, weighted by sum of item weights in each category

**Recommendation filtering**:
- Budget: each item in `items.json` carries `budget_min` (one of `limited | moderate | substantial | major`)
- Skill: `skill_min` (one of `novice | basic_diy | experienced | trade`)
- Time: `time_min` (one of `quick | weekend | extended | hired`)
- An item is "feasible" if the user's stated level is ≥ the item's minimum threshold
- Ambition sort: `light_touch` → sort feasible items by impact score ASC (low-hanging fruit first); `deep_green` → sort by impact score DESC

**SPA view routing**: Single `index.html` shell. JavaScript shows/hides named `<section>` elements to simulate page navigation. No URL hash routing required in v1.

**Service Worker strategy**: Cache-First for all cached assets. A precache manifest lists every file in `src/` plus `index.html`, `manifest.json`, and the js-yaml CDN URL. On install, all assets are fetched and stored. Updates use a "skip waiting" pattern.

---

## Work Packages

| WP | Title | Key Requirements | Est. Complexity |
|---|---|---|---|
| WP-01 | Project foundation & PWA shell | FR-018, NFR-001, NFR-003 | Low |
| WP-02 | Data layer — items.json + IndexedDB | FR-016, FR-017, A-1 | Medium |
| WP-03 | House profile & capacity forms | FR-001, FR-002, FR-017 | Medium |
| WP-04 | Assessment walkthrough UI | FR-003, FR-004, FR-005, FR-009, FR-019, FR-020 | High |
| WP-05 | Scoring & recommendations engine | FR-006, FR-007, FR-008, SC-5, SC-6 | Medium |
| WP-06 | YAML import / export | FR-010, FR-012, FR-013, SC-2, C-005 | Medium |
| WP-07 | HTML report generation | FR-011, FR-014, FR-015, SC-4, NFR-009 | Medium |
| WP-08 | Accessibility, responsive design & polish | NFR-005, NFR-006, NFR-007, SC-1 | Medium |

---

## Work Package Details

### WP-01 — Project Foundation & PWA Shell

**Goal**: Establish the project file structure, base styles, PWA manifest, Service Worker, and GitHub Pages deployment.

**Deliverables**:
- `index.html` — SPA shell with `<section>` containers for each view (hidden by default)
- `src/css/main.css` — CSS custom-properties colour system, layout grid, typography scale
- `src/css/print.css` — Print-only styles (included via `<link media="print">`)
- `src/js/app.js` — View router: `showView(name)`, `hideAllViews()`, initial load logic
- `src/js/pwa.js` — Service worker registration and update handling
- `sw.js` — Service worker with precache list and cache-first strategy
- `manifest.json` — PWA manifest (name, icons, theme colour, start URL)
- `.github/workflows/deploy.yml` — GitHub Pages deploy action (if needed beyond default)
- `README.md` — Project README

**Acceptance**:
- App installs as a PWA on Chrome and Safari
- All assets load from cache when offline after first visit
- Base layout renders correctly on 320 px and 1440 px viewports

---

### WP-02 — Data Layer: items.json + IndexedDB

**Goal**: Define all upgrade item content and establish the local persistence layer.

**Deliverables**:
- `src/data/items.json` — Full item catalogue: 6 categories, ~35 items each with `key`, `label`, `guidance`, `weight`, `budget_min`, `skill_min`, `time_min`, `ambition_levels[]`, `slider_labels[6]`
- `src/data/strings.json` — All user-visible UI strings keyed for i18n readiness
- `src/js/db.js` — IndexedDB wrapper module: `openDB()`, CRUD for `HouseProfile`, `Assessment`, `ItemResult` object stores
- `src/js/store.js` — In-memory state module: `getState()`, `setState(patch)`, `subscribe(fn)`, auto-persist on mutation

**Acceptance**:
- `items.json` passes schema validation (manual checklist): all 6 categories present, every item has required fields
- `db.js` round-trips a HouseProfile object: create → read → update → delete without errors
- `store.js` calls persist handler within 100 ms of a state mutation

---

### WP-03 — House Profile & Capacity Forms

**Goal**: Allow users to create, edit, switch, and delete house profiles; enter owner capacity.

**Deliverables**:
- View: Home screen — list of saved profiles, "New Assessment" button, "Import from YAML" button
- View: House Profile form — 7 house fields + 4 capacity fields + optional assessor fields
- Form validation: required fields highlighted, descriptive error messages
- `src/js/profiles.js` — `createProfile(data)`, `updateProfile(id, patch)`, `deleteProfile(id)`, `listProfiles()`

**Acceptance**:
- FR-001, FR-002 satisfied: all fields saveable and restorable
- FR-017 satisfied: profiles list shows all saved profiles; rename and delete work
- Form fields accessible via keyboard; labels correctly associated with inputs
- Profile data round-trips through IndexedDB without loss

---

### WP-04 — Assessment Walkthrough UI

**Goal**: Guide users through all six upgrade categories with sliders, N/A toggles, guidance text, notes, and progress tracking.

**Deliverables**:
- View: Category nav — sidebar or stepper showing 6 categories with completion indicators
- View: Category detail — list of items with slider, N/A checkbox, guidance text, notes textarea
- `src/js/assessment.js` — `startAssessment(profileId)`, `saveItemResult(assessmentId, itemKey, data)`, `getProgress(assessmentId)`, `resetAssessment(assessmentId)`
- Score display widget — live-updating score badge visible throughout walkthrough

**Acceptance**:
- FR-003: user can navigate to any category directly or proceed sequentially
- FR-004: sliders render with 6 positions (0–5), N/A toggle disables slider
- FR-005: guidance text shown for every item
- FR-009: notes saved per item and restored on revisit
- FR-019: per-category progress bar updates as items are rated; overall % shown in header
- FR-020: reset clears all item ratings and resets score to 0
- SC-6: score updates within 300 ms of slider change

---

### WP-05 — Scoring & Recommendations Engine

**Goal**: Compute the weighted sustainability score and surface filtered, sorted recommendations.

**Deliverables**:
- `src/js/scoring.js` — `computeItemScore(sliderValue, weight)`, `computeCategoryScore(items)`, `computeOverallScore(categories)`
- `src/js/recommendations.js` — `getRecommendations(assessmentState, capacity)`: filters by budget/skill/time thresholds, sorts by ambition
- View: Results screen — overall score gauge/meter, per-category score bars, top-N recommendation cards
- Recommendation card: item label, why-it-matters excerpt, capacity badges

**Acceptance**:
- SC-5: no item above the user's budget_min or skill_min appears in top recommendations
- SC-6: overall score recalculates on every slider change without page reload
- Results view renders correctly with 0 items rated, partial completion, and 100% completion
- Score is deterministic: same inputs always produce same output

---

### WP-06 — YAML Import / Export

**Goal**: Enable full assessment persistence via `.yaml` files that can be exported and re-imported in any browser.

**Deliverables**:
- `src/js/export-yaml.js` — `exportToYAML(houseProfile, capacity, assessmentSnapshots[])`: serialises to YAML string using js-yaml, triggers file download
- `src/js/import-yaml.js` — `importFromYAML(fileContent)`: parses YAML using js-yaml, validates schema version, returns structured object
- YAML schema version field: `schema_version: "1.0"`
- Multi-snapshot support: `assessments[]` array in YAML preserves all past snapshots
- Import UI: file picker on home screen or drag-and-drop zone

**Acceptance**:
- SC-2: YAML exported in Chrome re-imports correctly in Firefox with no data loss
- FR-013: YAML from a profile with 3 assessments contains all 3 with correct timestamps
- Invalid YAML shows a clear error message (not a silent failure or crash)
- `schema_version` is present in every exported file

---

### WP-07 — HTML Report Generation

**Goal**: Generate a print-ready HTML report of the current assessment.

**Deliverables**:
- `src/js/export-html.js` — `exportToHTML(houseProfile, capacity, assessmentSnapshot, history[])`: builds HTML string, triggers Blob download
- Report sections: header (house name, date, assessor if set), executive summary (overall score), per-category sections with item-level ratings and notes, recommendations table, history table (if multiple snapshots)
- Print CSS: `src/css/print.css` — page breaks, A4/Letter margins, no decorative backgrounds

**Acceptance**:
- SC-4: printed report on A4 shows all sections without truncation
- FR-014: all required data fields present in the report
- FR-015: assessor name/company appear when set, gracefully absent when not
- Report generates and downloads within 2 seconds
- Report is self-contained (no external resources after download)

---

### WP-08 — Accessibility, Responsive Design & Polish

**Goal**: Audit and remediate accessibility issues; validate responsive layout across breakpoints; final UX polish.

**Deliverables**:
- ARIA roles and labels on all interactive controls (sliders, category nav, dialogs)
- `aria-live` region for live score updates
- Keyboard navigation: all controls reachable and operable via Tab/Enter/Space/Arrow keys
- Focus management: after view transitions, focus moves to the new view's heading
- Colour contrast audit: all text ≥ 4.5:1, large text ≥ 3:1, UI components ≥ 3:1
- Responsive layout validation at 320 px, 768 px, 1024 px, 1440 px, 2560 px
- Empty states: no profiles yet, no assessment started, no recommendations (all N/A)
- Error states: import failure, IndexedDB unavailable (fallback to localStorage-only)

**Acceptance**:
- Automated axe-core scan reports zero critical or serious violations
- Tab order follows logical reading order on all views
- Slider is operable with arrow keys and announces current value to screen readers
- NFR-005 (WCAG 2.1 AA), NFR-006 (responsive) satisfied

---

## Dependency Order

```
WP-01 (foundation)
  └─ WP-02 (data layer)
       ├─ WP-03 (profile forms)
       │    └─ WP-04 (assessment UI)
       │         └─ WP-05 (scoring engine)
       │              ├─ WP-06 (YAML import/export)
       │              └─ WP-07 (HTML report)
       │                   └─ WP-08 (a11y & polish)
       └─ (WP-06 also needs WP-03 for profile data)
```

WP-08 can be applied incrementally alongside WP-03 through WP-07, but full audit runs after WP-07.

---

## Project File Tree (target state)

```
susty-house/
├── index.html                          # SPA shell
├── manifest.json                       # PWA manifest
├── sw.js                               # Service worker
├── README.md
├── .github/
│   └── workflows/
│       └── pages.yml                   # GitHub Pages deploy
└── src/
    ├── css/
    │   ├── main.css                    # App styles + CSS variables
    │   └── print.css                   # Print-specific styles
    ├── js/
    │   ├── app.js                      # View router, app init
    │   ├── db.js                       # IndexedDB wrapper
    │   ├── store.js                    # In-memory state + auto-persist
    │   ├── profiles.js                 # Profile CRUD
    │   ├── assessment.js               # Assessment walkthrough logic
    │   ├── scoring.js                  # Scoring algorithm
    │   ├── recommendations.js          # Recommendation filter + sort
    │   ├── export-yaml.js              # YAML export
    │   ├── import-yaml.js              # YAML import + validation
    │   ├── export-html.js              # HTML report builder
    │   └── pwa.js                      # Service worker registration
    └── data/
        ├── items.json                  # Upgrade items, weights, guidance
        └── strings.json                # UI strings (i18n)

kitty-specs/sustainable-house-evaluator-01KTA9RM/
├── spec.md
├── plan.md                             # ← this file
├── research.md
├── data-model.md
├── contracts/
│   ├── db.md                           # IndexedDB module interface
│   ├── store.md                        # State store interface
│   ├── scoring.md                      # Scoring module interface
│   ├── recommendations.md              # Recommendations module interface
│   ├── export-yaml.md                  # YAML export interface
│   ├── import-yaml.md                  # YAML import interface
│   ├── export-html.md                  # HTML report interface
│   └── items-json.schema.json          # items.json JSON Schema
└── checklists/
    └── requirements.md
```

---

## Gates (pre-task-generation)

| Gate | Status | Notes |
|---|---|---|
| Spec complete and no `[NEEDS CLARIFICATION]` markers | ✅ Pass | Spec has no open clarifications |
| Charter check | ⏭️ Skipped | No charter file present |
| All planning questions answered | ✅ Pass | 5/5 answered |
| Engineering alignment confirmed | ✅ Pass | Confirmed by user |
| Bulk-edit check | ✅ N/A | Not a bulk-edit mission |
| Branch matches target | ✅ Pass | `master` → `master` |

---

## Next Step

Run `/spec-kitty.tasks` to generate work package task files.

**Branch contract (final):**
- Planning branch: `master`
- Merge target: `master`
