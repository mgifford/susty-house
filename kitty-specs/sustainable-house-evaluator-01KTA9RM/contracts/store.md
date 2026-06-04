# Contract: store.js — In-Memory State Store

**Module**: `src/js/store.js`  
**Responsibility**: Holds the single in-memory application state object.
Notifies subscribers on mutations. Auto-persists the active assessment to IndexedDB
on every mutation that changes `activeAssessment`.

---

## Exports

```js
/**
 * Returns the current state (read-only snapshot).
 * @returns {AppState}
 */
export function getState()

/**
 * Merges patch into state and notifies all subscribers.
 * Triggers auto-persist if patch includes activeAssessment.
 * @param {Partial<AppState>} patch
 * @returns {void}
 */
export function setState(patch)

/**
 * Registers a callback invoked on every setState call.
 * Returns an unsubscribe function.
 * @param {(state: AppState) => void} fn
 * @returns {() => void}
 */
export function subscribe(fn)
```

## Constraints

- `getState()` returns a frozen shallow copy; mutations to the returned object have no effect.
- `setState` merges at the top level only (shallow merge); nested objects must be replaced in full.
- Auto-persist calls `db.putAssessment()` asynchronously; errors are logged but do not throw.
