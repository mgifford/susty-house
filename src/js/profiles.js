/* Sustainable House Evaluator — Profile CRUD */
import * as db from './db.js';
import { getState, setState } from './store.js';

const REQUIRED_FIELDS = ['nickname', 'year_built', 'floor_area_sqm', 'storeys',
  'construction_type', 'climate_zone', 'occupant_count'];
const CAPACITY_FIELDS = ['budget_range', 'time_availability', 'skill_level', 'ambition_level'];

const ENUMS = {
  construction_type: ['wood_frame','masonry','manufactured','other'],
  climate_zone: ['cold','temperate','hot_dry','hot_humid','mixed'],
  budget_range: ['limited','moderate','substantial','major'],
  time_availability: ['limited','weekends','extended','hired'],
  skill_level: ['novice','basic_diy','experienced','trade'],
  ambition_level: ['light_touch','meaningful','significant','deep_green'],
};

export function validateProfile(data) {
  const errors = {};
  const year = new Date().getFullYear();
  
  if (!data.nickname?.trim()) errors.nickname = window.t('error.required_field');
  if (!data.year_built || data.year_built < 1800 || data.year_built > year)
    errors.year_built = `Enter a year between 1800 and ${year}`;
  if (!data.floor_area_sqm || data.floor_area_sqm <= 0)
    errors.floor_area_sqm = 'Enter a positive floor area';
  if (!data.storeys || data.storeys < 1 || data.storeys > 6)
    errors.storeys = 'Enter 1–6 storeys';
  if (!data.occupant_count || data.occupant_count < 1 || data.occupant_count > 20)
    errors.occupant_count = 'Enter 1–20 occupants';
  
  for (const [field, values] of Object.entries(ENUMS)) {
    const val = data[field] ?? data.capacity?.[field];
    if (val && !values.includes(val)) errors[field] = 'Invalid option';
  }
  for (const f of ['construction_type','climate_zone']) {
    if (!data[f]) errors[f] = window.t('error.required_field');
  }
  for (const f of CAPACITY_FIELDS) {
    if (!data.capacity?.[f]) errors[f] = window.t('error.required_field');
  }
  
  return { valid: Object.keys(errors).length === 0, errors };
}

export async function createProfile(data) {
  const { valid, errors } = validateProfile(data);
  if (!valid) throw Object.assign(new Error('Validation failed'), { errors });
  
  const profile = {
    id: crypto.randomUUID(),
    nickname: data.nickname.trim(),
    year_built: Number(data.year_built),
    floor_area_sqm: Number(data.floor_area_sqm),
    storeys: Number(data.storeys),
    construction_type: data.construction_type,
    climate_zone: data.climate_zone,
    occupant_count: Number(data.occupant_count),
    created_at: new Date().toISOString(),
    capacity: {
      budget_range: data.capacity.budget_range,
      time_availability: data.capacity.time_availability,
      skill_level: data.capacity.skill_level,
      ambition_level: data.capacity.ambition_level,
      assessor_name: data.capacity.assessor_name?.trim() || null,
      assessor_company: data.capacity.assessor_company?.trim() || null,
    },
  };
  
  await db.putProfile(profile);
  await listProfiles();
  return profile;
}

export async function updateProfile(id, patch) {
  const existing = await db.getProfile(id);
  if (!existing) throw new Error('Profile not found');
  const updated = { ...existing, ...patch };
  if (patch.capacity) updated.capacity = { ...existing.capacity, ...patch.capacity };
  await db.putProfile(updated);
  await listProfiles();
  const state = getState();
  if (state.activeProfileId === id) {
    setState({ activeProfile: updated });
  }
  return updated;
}

export async function deleteProfile(id) {
  await db.deleteProfile(id);
  await listProfiles();
  const state = getState();
  if (state.activeProfileId === id) {
    setState({ activeProfileId: null, activeProfile: null,
                activeAssessmentId: null, activeAssessment: null });
    localStorage.removeItem('lastActiveProfileId');
  }
}

export async function listProfiles() {
  const profiles = await db.getAllProfiles();
  setState({ profiles });
  return profiles;
}

export async function setActiveProfile(id) {
  const profile = await db.getProfile(id);
  if (!profile) throw new Error('Profile not found: ' + id);
  setState({ activeProfileId: id, activeProfile: profile });
  localStorage.setItem('lastActiveProfileId', id);
  return profile;
}
