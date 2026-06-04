# Research: Sustainable House Evaluator

**Mission**: sustainable-house-evaluator-01KTA9RM  
**Generated**: 2026-06-04  

---

## 1. Service Worker — Offline PWA (Vanilla JS, GitHub Pages)

**Decision**: Cache-First strategy with a precache manifest in `sw.js`  
**Rationale**: All app assets are static and version-controlled. Cache-First ensures instant load and
full offline availability. On install, the SW fetches every asset in the precache list. On activate,
old caches are purged. The CDN-loaded `js-yaml` URL is included in the precache list.

**Key patterns**:
- `self.skipWaiting()` + `clients.claim()` for immediate activation on first install
- Cache name includes a version string (e.g., `susty-house-v1`) so updates invalidate the old cache
- Update flow: on new SW detected, show an "Update available — reload" banner (non-blocking)

**Alternatives considered**:
- Workbox: well-supported but adds a build step; rejected to keep no-build-tools constraint
- Network-First: slower offline experience; rejected

---

## 2. IndexedDB Access Pattern (No Library)

**Decision**: Hand-rolled `db.js` wrapper using native `IDBDatabase` API with Promise wrappers  
**Rationale**: The spec's C-001 (no server) and vanilla-JS constraint rules out Dexie.js or
PouchDB (both require npm or a non-trivial CDN script). The data model is simple enough (3 object
stores, no complex queries) to implement directly.

**Object stores**:
```
house_profiles   keyPath: "id"        — HouseProfile records
assessments      keyPath: "id"        — Assessment records (incl. all ItemResults inline)
                                        indexes: ["house_profile_id"]
```

**Key pattern**: All IDs use `crypto.randomUUID()` (available on HTTPS/GitHub Pages in all
target browsers). No external UUID library needed.

**Fallback**: If IndexedDB is unavailable (very old browser, private mode in some Safari versions),
fall back to `localStorage` with JSON serialisation. Show a warning banner.

**Alternatives considered**:
- Dexie.js via CDN: convenient but 30 kB extra weight and one more CDN dependency; rejected
- localStorage-only: 5 MB limit is too small for multi-snapshot longitudinal data; rejected as primary

---

## 3. YAML Schema Design

**Decision**: `schema_version: "1.0"` embedded in every export; multi-snapshot via top-level `assessments[]` array  
**Rationale**: Version field enables future migration tooling (C-005). Array of snapshots supports
longitudinal tracking (FR-013, SC-7) without needing a database on the receiving end.

**Schema outline**:
```yaml
schema_version: "1.0"
exported_at: "2026-06-04T21:00:00Z"
house:
  id: string           # crypto.randomUUID()
  nickname: string
  year_built: integer
  floor_area_sqm: number
  storeys: integer
  construction_type: enum(wood_frame|masonry|manufactured|other)
  climate_zone: enum(cold|temperate|hot_dry|hot_humid|mixed)
  occupant_count: integer
  created_at: ISO8601
capacity:
  budget_range: enum(limited|moderate|substantial|major)
  time_availability: enum(limited|weekends|extended|hired)
  skill_level: enum(novice|basic_diy|experienced|trade)
  ambition_level: enum(light_touch|meaningful|significant|deep_green)
assessments:
  - id: string
    created_at: ISO8601
    overall_score: number    # 0–100
    assessor_name: string|null
    assessor_company: string|null
    categories:
      - name: string         # matches category key from items.json
        score: number        # 0–100
        completion_pct: number
        items:
          - key: string      # matches item key from items.json
            slider_value: integer  # 0–5
            not_applicable: boolean
            notes: string|null
```

**Import validation**: On import, check `schema_version` field; reject unknown versions with a
clear error message. Validate that all required top-level keys are present.

---

## 4. Scoring Algorithm

**Decision**: Normalised weighted average; item scores normalised to 0–100 before weighting  
**Formula**:
```
item_score      = (slider_value / 5) × 100
category_score  = Σ(item_score × weight) / Σ(weight)   for non-N/A items only
overall_score   = Σ(category_score × category_weight) / Σ(category_weight)
category_weight = Σ(item weights in category)
```

This produces an overall score of 0–100 where 100 means every item is at maximum (slider = 5).
N/A items are excluded from both numerator and denominator so they don't deflate the score.

**Edge case**: If all items in a category are marked N/A, the category is excluded from the
overall score calculation.

---

## 5. Recommendation Filtering & Sorting

**Decision**: Enum ordinal comparison for capacity thresholds  
**Rationale**: Budget/skill/time enum values have a natural ordering:

```
BUDGET:   limited(0) < moderate(1) < substantial(2) < major(3)
SKILL:    novice(0)  < basic_diy(1) < experienced(2) < trade(3)
TIME:     limited(0) < weekends(1) < extended(2) < hired(3)
AMBITION: light_touch(0) < meaningful(1) < significant(2) < deep_green(3)
```

An item is **feasible** when: `userBudgetOrdinal >= itemBudgetMinOrdinal`
AND `userSkillOrdinal >= itemSkillMinOrdinal`  
AND `userTimeOrdinal >= itemTimeMinOrdinal`

After filtering to feasible items, exclude items already rated 5 (excellent).
Sort remaining items:
- `light_touch` or `meaningful`: ascending by `impact_potential` (low-effort wins first)
- `significant` or `deep_green`: descending by `impact_potential` (highest-impact first)

`impact_potential` = `weight × (5 - current_slider_value)` — the "gap" to maximum, weighted.

---

## 6. HTML Report — Client-Side Generation

**Decision**: Build HTML string in JS and deliver via `URL.createObjectURL(new Blob(...))`  
**Rationale**: No external dependency, no server. The blob URL is assigned to a hidden `<a>` element
which is clicked programmatically to trigger download. The downloaded file is fully self-contained
HTML (inline CSS) so it renders correctly without a web server.

**Print layout**: `@media print` CSS ensures page breaks between categories, no coloured
backgrounds, serif font for readability, URL expansion for any links.

**Self-contained**: The HTML report embeds a `<style>` block with all required CSS so it
renders identically in any browser without network access.

---

## 7. items.json — Upgrade Item Catalogue

**Decision**: 6 categories, approximately 35 items total, weights 1–10 scaled by typical sustainability impact  
**Weight rationale** (based on general building science principles):

| Category | Typical Weight Range | Rationale |
|---|---|---|
| Building Envelope | 6–10 | Highest impact; reduces heating/cooling loads permanently |
| Heating & Cooling | 7–10 | Direct energy consumption; heat pump upgrades are high-impact |
| Hot Water | 4–7 | Significant energy use; heat pump water heater is high-impact |
| Renewable Energy | 5–9 | High long-term impact; higher upfront cost/complexity |
| Water Efficiency | 2–5 | Lower absolute energy impact but important for water sustainability |
| Lighting & Appliances | 2–5 | Marginal individual impact; collectively meaningful |

**Capacity threshold rationale**: Items like "add attic insulation" are `budget: limited, skill: basic_diy`;
items like "install ground-source heat pump" are `budget: major, skill: trade`.

---

## 8. PWA Manifest & GitHub Pages

**Decision**: `manifest.json` at repo root; GitHub Pages default deploy from `master` branch root  
**Key manifest fields**:
```json
{
  "name": "Sustainable House Evaluator",
  "short_name": "SustyHouse",
  "start_url": "/susty-house/",
  "scope": "/susty-house/",
  "display": "standalone",
  "theme_color": "#2d6a4f",
  "background_color": "#ffffff",
  "icons": [...]
}
```

**GitHub Pages note**: When hosted at `https://username.github.io/susty-house/`, `start_url` and
`scope` must include the `/susty-house/` path prefix. Service worker `sw.js` must be in the root
so its scope covers the entire app.

---

## 9. Accessibility — Slider Controls

**Decision**: Use `<input type="range">` with `aria-valuetext` for human-readable labels  
**Rationale**: Native range inputs are keyboard-accessible by default (arrow keys). `aria-valuetext`
maps the numeric value (0–5) to the slider label text from `items.json` (e.g., "No insulation",
"Minimal", "Some", "Moderate", "Good", "Excellent").

**Live score updates**: Wrap the score display in `<div role="status" aria-live="polite">` so
screen readers announce score changes without interrupting the user.

**Focus management**: After view transitions, use `element.focus()` on the new view's `<h2>` heading
(with `tabindex="-1"` to allow programmatic focus without adding to tab order).

---

## 10. Internationalisation Readiness

**Decision**: `src/data/strings.json` as a flat key-value map; loaded at startup; referenced by `t('key')` helper  
**Pattern**:
```js
// src/js/app.js
import strings from '../data/strings.json' assert { type: 'json' };
window.t = (key) => strings[key] ?? key;
```

All user-visible strings in HTML templates and JS use `t('key')` rather than hardcoded English.
JSON import assertions are supported in Chrome 91+, Firefox 116+, Safari 17+.

**Alternative for older browsers**: Fetch `strings.json` via `fetch()` on startup and cache in a
module-level variable.
