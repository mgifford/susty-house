# Contract: import-yaml.js — YAML Import

**Module**: `src/js/import-yaml.js`  
**Responsibility**: Parses a YAML string, validates schema version and required fields,
and returns a structured object ready for persistence.

---

## Exports

```js
/**
 * Parses and validates a YAML string exported by this app.
 *
 * @param {string} yamlText
 * @returns {{ profile: HouseProfile, assessments: Assessment[] }}
 * @throws {ImportError}  if YAML is malformed, schema_version is unknown,
 *                        or required fields are missing
 */
export function importFromYAML(yamlText)
```

## ImportError

```js
class ImportError extends Error {
  constructor(message, { field = null, schemaVersion = null } = {})
  field: string | null        // which field failed validation, if known
  schemaVersion: string | null // which schema version was found
}
```

## Validation rules

1. `schema_version` must be present and equal to `"1.0"` (or a supported future version)
2. `house.id`, `house.nickname`, `house.created_at` must be present
3. `capacity` must be present with all four enum fields using valid values
4. `assessments` must be an array (may be empty)
5. Each assessment's `id` and `created_at` must be present
6. Unknown fields are ignored (forward-compatibility)

## Dependencies

- `js-yaml` (global `jsyaml` loaded from CDN)
