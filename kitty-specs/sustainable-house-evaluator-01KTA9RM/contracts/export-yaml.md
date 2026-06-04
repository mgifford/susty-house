# Contract: export-yaml.js — YAML Export

**Module**: `src/js/export-yaml.js`  
**Responsibility**: Serialises a HouseProfile and its associated Assessments into
a YAML string conforming to schema version 1.0, then triggers a file download.

---

## Exports

```js
/**
 * Exports the house profile and all assessments as a .yaml file download.
 * Triggers browser file download immediately.
 *
 * @param {HouseProfile} profile
 * @param {Assessment[]} assessments  - all snapshots, sorted created_at ASC
 * @returns {void}
 */
export function exportToYAML(profile, assessments)

/**
 * Serialises to YAML string (no download) — useful for testing.
 *
 * @param {HouseProfile} profile
 * @param {Assessment[]} assessments
 * @returns {string}  YAML string
 */
export function toYAMLString(profile, assessments)
```

## Filename convention

`susty-house-<nickname-slug>-<YYYY-MM-DD>.yaml`  
Example: `susty-house-my-house-2026-06-04.yaml`

## Dependencies

- `js-yaml` (global `jsyaml` loaded from CDN)
