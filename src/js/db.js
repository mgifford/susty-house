/* Sustainable House Evaluator — IndexedDB Wrapper */

const DB_NAME = 'susty-house-db';
const DB_VERSION = 1;
let _db = null;
let _usingFallback = false;

// localStorage fallback storage
const _fallback = {
  house_profiles: {},
  assessments: {},
};

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function openDB() {
  if (_db) return _db;

  if (typeof indexedDB === 'undefined') {
    _initFallback();
    return null;
  }

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('house_profiles')) {
        db.createObjectStore('house_profiles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('assessments')) {
        const store = db.createObjectStore('assessments', { keyPath: 'id' });
        store.createIndex('house_profile_id', 'house_profile_id', { unique: false });
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      _db.onerror = (e) => console.error('[DB] Error:', e.target.error);
      resolve(_db);
    };

    req.onerror = () => {
      console.warn('[DB] IndexedDB unavailable, using localStorage fallback');
      _initFallback();
      resolve(null);
    };

    req.onblocked = () => {
      console.warn('[DB] Database upgrade blocked by another tab');
    };
  });
}

function _initFallback() {
  _usingFallback = true;
  try {
    const saved = localStorage.getItem('susty-house-fallback');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(_fallback.house_profiles, parsed.house_profiles || {});
      Object.assign(_fallback.assessments, parsed.assessments || {});
    }
  } catch (e) {
    console.warn('[DB] Could not restore fallback data:', e);
  }
}

function _saveFallback() {
  try {
    localStorage.setItem('susty-house-fallback', JSON.stringify(_fallback));
  } catch (e) {
    console.warn('[DB] Could not save fallback data:', e);
  }
}

// ---------- House Profiles ----------

export async function putProfile(profile) {
  if (_usingFallback) {
    _fallback.house_profiles[profile.id] = profile;
    _saveFallback();
    return;
  }
  const tx = _db.transaction('house_profiles', 'readwrite');
  await idbRequest(tx.objectStore('house_profiles').put(profile));
}

export async function getAllProfiles() {
  if (_usingFallback) {
    return Object.values(_fallback.house_profiles)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  const tx = _db.transaction('house_profiles', 'readonly');
  const profiles = await idbRequest(tx.objectStore('house_profiles').getAll());
  return profiles.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function getProfile(id) {
  if (_usingFallback) return _fallback.house_profiles[id] ?? null;
  const tx = _db.transaction('house_profiles', 'readonly');
  return await idbRequest(tx.objectStore('house_profiles').get(id)) ?? null;
}

export async function deleteProfile(id) {
  // Cascade delete assessments
  const assessments = await getAssessmentsForProfile(id);
  for (const a of assessments) {
    await deleteAssessment(a.id);
  }
  if (_usingFallback) {
    delete _fallback.house_profiles[id];
    _saveFallback();
    return;
  }
  const tx = _db.transaction('house_profiles', 'readwrite');
  await idbRequest(tx.objectStore('house_profiles').delete(id));
}

// ---------- Assessments ----------

export async function putAssessment(assessment) {
  if (_usingFallback) {
    _fallback.assessments[assessment.id] = assessment;
    _saveFallback();
    return;
  }
  const tx = _db.transaction('assessments', 'readwrite');
  await idbRequest(tx.objectStore('assessments').put(assessment));
}

export async function getAssessmentsForProfile(profileId) {
  if (_usingFallback) {
    return Object.values(_fallback.assessments)
      .filter(a => a.house_profile_id === profileId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  return new Promise((resolve, reject) => {
    const tx = _db.transaction('assessments', 'readonly');
    const index = tx.objectStore('assessments').index('house_profile_id');
    const req = index.getAll(profileId);
    req.onsuccess = () => {
      const results = (req.result || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAssessment(id) {
  if (_usingFallback) return _fallback.assessments[id] ?? null;
  const tx = _db.transaction('assessments', 'readonly');
  return await idbRequest(tx.objectStore('assessments').get(id)) ?? null;
}

export async function deleteAssessment(id) {
  if (_usingFallback) {
    delete _fallback.assessments[id];
    _saveFallback();
    return;
  }
  const tx = _db.transaction('assessments', 'readwrite');
  await idbRequest(tx.objectStore('assessments').delete(id));
}
