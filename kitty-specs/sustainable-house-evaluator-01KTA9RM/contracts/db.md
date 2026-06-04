# Contract: db.js — IndexedDB Wrapper

**Module**: `src/js/db.js`  
**Responsibility**: Opens and manages the `susty-house-db` IndexedDB database.
Provides Promise-based CRUD for `HouseProfile` and `Assessment` records.

---

## Exports

```js
/**
 * Opens (or upgrades) the IndexedDB database.
 * Must be called once at app start before any other db.* calls.
 * @returns {Promise<IDBDatabase>}
 */
export async function openDB()

/**
 * Saves (create or replace) a HouseProfile.
 * @param {HouseProfile} profile
 * @returns {Promise<void>}
 */
export async function putProfile(profile)

/**
 * Returns all HouseProfile records, sorted by created_at ASC.
 * @returns {Promise<HouseProfile[]>}
 */
export async function getAllProfiles()

/**
 * Returns a single HouseProfile by id, or null if not found.
 * @param {string} id
 * @returns {Promise<HouseProfile|null>}
 */
export async function getProfile(id)

/**
 * Deletes a HouseProfile and all associated Assessments.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteProfile(id)

/**
 * Saves (create or replace) an Assessment.
 * @param {Assessment} assessment
 * @returns {Promise<void>}
 */
export async function putAssessment(assessment)

/**
 * Returns all Assessments for a given HouseProfile id, sorted by created_at ASC.
 * @param {string} profileId
 * @returns {Promise<Assessment[]>}
 */
export async function getAssessmentsForProfile(profileId)

/**
 * Returns a single Assessment by id, or null if not found.
 * @param {string} id
 * @returns {Promise<Assessment|null>}
 */
export async function getAssessment(id)

/**
 * Deletes a single Assessment by id.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteAssessment(id)
```

## Error Handling

- All functions reject their Promise with a descriptive `Error` on IDB errors.
- `openDB()` falls back to a `localStorage`-backed shim if IDB is unavailable; logs a console warning.
