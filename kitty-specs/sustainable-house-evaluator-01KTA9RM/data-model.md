# Data Model: Sustainable House Evaluator

**Mission**: sustainable-house-evaluator-01KTA9RM  
**Generated**: 2026-06-04  

---

## Overview

All data is stored client-side. There are two persistence layers:

| Layer | Used For | Capacity |
|---|---|---|
| **IndexedDB** | `HouseProfile`, `Assessment` (incl. inline `ItemResult[]`) | Effectively unlimited |
| **localStorage** | `lastActiveProfileId` (pointer only) | < 100 bytes |
| **In-memory store** | Active session state (current profile, active assessment, UI state) | Session lifetime |

---

## Entity Definitions

### HouseProfile

Stored in IndexedDB object store `house_profiles` with `keyPath: "id"`.

```js
{
  id: string,              // crypto.randomUUID()
  nickname: string,        // required, max 100 chars
  year_built: number,      // integer, 1800–currentYear
  floor_area_sqm: number,  // positive number
  storeys: number,         // integer 1–6
  construction_type: enum, // "wood_frame" | "masonry" | "manufactured" | "other"
  climate_zone: enum,      // "cold" | "temperate" | "hot_dry" | "hot_humid" | "mixed"
  occupant_count: number,  // integer 1–20
  created_at: string,      // ISO 8601
  capacity: OwnerCapacity  // embedded object (1:1)
}
```

**Validation rules**:
- `nickname`: required, non-empty after trim
- `year_built`: integer between 1800 and current year
- `floor_area_sqm`: positive number
- `storeys`: integer 1–6
- `occupant_count`: integer 1–20
- All enum fields: must match one of the allowed values

---

### OwnerCapacity

Embedded within `HouseProfile` (not a separate store).

```js
{
  budget_range: enum,       // "limited" | "moderate" | "substantial" | "major"
  time_availability: enum,  // "limited" | "weekends" | "extended" | "hired"
  skill_level: enum,        // "novice" | "basic_diy" | "experienced" | "trade"
  ambition_level: enum,     // "light_touch" | "meaningful" | "significant" | "deep_green"
  assessor_name: string,    // optional, null if not set
  assessor_company: string  // optional, null if not set
}
```

---

### Assessment

Stored in IndexedDB object store `assessments` with `keyPath: "id"`.  
Index: `house_profile_id` (for querying assessments by profile).

```js
{
  id: string,              // crypto.randomUUID()
  house_profile_id: string,// FK → HouseProfile.id
  created_at: string,      // ISO 8601
  updated_at: string,      // ISO 8601; updated on every item save
  overall_score: number,   // 0–100, computed
  categories: CategoryResult[]  // inline array
}
```

---

### CategoryResult

Embedded in `Assessment.categories[]`.

```js
{
  name: string,            // category key, e.g. "building_envelope"
  score: number,           // 0–100, computed
  completion_pct: number,  // 0–100, % of non-N/A items rated (slider > 0)
  items: ItemResult[]      // inline array
}
```

---

### ItemResult

Embedded in `CategoryResult.items[]`.

```js
{
  key: string,             // item key, matches items.json e.g. "attic_insulation"
  slider_value: number,    // integer 0–5
  not_applicable: boolean, // if true, slider_value is ignored in scoring
  notes: string            // free text, may be empty string
}
```

---

### AssessmentSnapshot (YAML export unit)

Not stored in IndexedDB — constructed at export time by joining `HouseProfile` + all `Assessment` records.

```js
{
  schema_version: "1.0",
  exported_at: string,         // ISO 8601
  house: HouseProfile,         // full HouseProfile object
  assessments: Assessment[]    // all assessments for this profile, sorted by created_at ASC
}
```

---

### UpgradeItem (from items.json — read-only at runtime)

```js
{
  key: string,                // unique key, snake_case, e.g. "attic_insulation"
  label: string,              // display name
  guidance: string,           // plain-language explanation
  weight: number,             // integer 1–10; higher = greater sustainability impact
  budget_min: enum,           // minimum budget tier: "limited"|"moderate"|"substantial"|"major"
  skill_min: enum,            // minimum skill tier: "novice"|"basic_diy"|"experienced"|"trade"
  time_min: enum,             // minimum time tier: "limited"|"weekends"|"extended"|"hired"
  ambition_levels: string[],  // which ambition levels this item is relevant for
  slider_labels: string[6]    // labels for slider positions 0–5
}
```

---

### UpgradeCategory (from items.json — read-only at runtime)

```js
{
  key: string,        // e.g. "building_envelope"
  label: string,      // display name
  description: string,// short category description
  items: UpgradeItem[]
}
```

---

## IndexedDB Schema

**Database name**: `susty-house-db`  
**Version**: `1`

| Object Store | Key Path | Indexes |
|---|---|---|
| `house_profiles` | `id` | — |
| `assessments` | `id` | `house_profile_id` |

---

## State Store Shape (in-memory)

```js
{
  // Navigation
  currentView: string,              // "home" | "profile" | "assessment" | "results"

  // Active profile
  activeProfileId: string | null,
  activeProfile: HouseProfile | null,

  // Active assessment
  activeAssessmentId: string | null,
  activeAssessment: Assessment | null,

  // Loaded item catalogue (from items.json)
  itemCatalogue: UpgradeCategory[],

  // UI flags
  isDirty: boolean,                 // unsaved changes
  isLoading: boolean,
  error: string | null,

  // Profile list (for home screen)
  profiles: HouseProfile[]
}
```

---

## Enum Ordinal Map

Used by the recommendation filter for threshold comparison:

```js
const BUDGET_ORDINAL   = { limited: 0, moderate: 1, substantial: 2, major: 3 };
const SKILL_ORDINAL    = { novice: 0, basic_diy: 1, experienced: 2, trade: 3 };
const TIME_ORDINAL     = { limited: 0, weekends: 1, extended: 2, hired: 3 };
const AMBITION_ORDINAL = { light_touch: 0, meaningful: 1, significant: 2, deep_green: 3 };
```

---

## Data Flow Diagram (prose)

1. **App load**: `app.js` calls `db.openDB()` → loads `lastActiveProfileId` from `localStorage` → if set, loads that `HouseProfile` from IndexedDB → hydrates `store.js` state → shows last view.
2. **New profile**: User submits profile form → `profiles.createProfile(data)` → saves to IndexedDB → updates `store.profiles[]` → navigates to assessment.
3. **Item rated**: Slider change event → `assessment.saveItemResult(...)` → `scoring.computeOverallScore(...)` → `store.setState({activeAssessment: updated})` → store auto-saves full assessment to IndexedDB → score badge updates via `store.subscribe`.
4. **Export YAML**: User clicks Export → `export-yaml.exportToYAML(profile, allAssessments)` → js-yaml serialises → Blob download.
5. **Import YAML**: User picks file → `import-yaml.importFromYAML(text)` → validates schema → upserts HouseProfile + Assessment records in IndexedDB → hydrates store → shows results view.
6. **Export HTML**: User clicks Report → `export-html.exportToHTML(profile, activeAssessment, history)` → HTML string built → Blob download.
