/* Sustainable House Evaluator — Assessment Business Logic */
import * as db from './db.js';
import { getState, setState } from './store.js';
import { computeOverallScore } from './scoring.js';

/**
 * Start a new assessment for the given profile.
 * Initialises all item results from the current item catalogue.
 */
export async function startAssessment(profileId) {
  const { itemCatalogue } = getState();

  const categories = itemCatalogue.map(cat => ({
    name: cat.key,
    score: 0,
    completion_pct: 0,
    items: cat.items.map(item => ({
      key: item.key,
      slider_value: 0,
      not_applicable: false,
      notes: '',
    })),
  }));

  const assessment = {
    id: crypto.randomUUID(),
    house_profile_id: profileId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    overall_score: 0,
    categories,
  };

  await db.putAssessment(assessment);
  setState({ activeAssessmentId: assessment.id, activeAssessment: assessment });
  return assessment;
}

/**
 * Load the most recent assessment for a profile, or start a new one.
 */
export async function loadOrStartAssessment(profileId) {
  const assessments = await db.getAssessmentsForProfile(profileId);
  if (assessments.length > 0) {
    const latest = assessments[assessments.length - 1];
    setState({ activeAssessmentId: latest.id, activeAssessment: latest });
    return latest;
  }
  return startAssessment(profileId);
}

/**
 * Save an item result and trigger a state update.
 * Does NOT recompute score — scoring.js does that after calling this.
 */
export function saveItemResult(categoryKey, itemKey, { sliderValue, notApplicable, notes }) {
  const state = getState();
  if (!state.activeAssessment) return;

  // Deep-clone to avoid mutating state directly
  const assessment = JSON.parse(JSON.stringify(state.activeAssessment));

  const cat = assessment.categories.find(c => c.name === categoryKey);
  if (!cat) return;
  const item = cat.items.find(i => i.key === itemKey);
  if (!item) return;

  if (sliderValue !== undefined) item.slider_value = sliderValue;
  if (notApplicable !== undefined) item.not_applicable = notApplicable;
  if (notes !== undefined) item.notes = notes;

  assessment.updated_at = new Date().toISOString();

  // Recompute category completion_pct
  const rated = cat.items.filter(i => i.slider_value > 0 || i.not_applicable).length;
  cat.completion_pct = Math.round((rated / cat.items.length) * 100);

  // Recompute overall score in real time
  const { itemCatalogue } = getState();
  assessment.overall_score = computeOverallScore(assessment, itemCatalogue);

  setState({ activeAssessment: assessment });
  return assessment;
}

/**
 * Returns overall and per-category completion percentages.
 */
export function getProgress(assessment) {
  if (!assessment) return { overall: 0, byCategory: {} };

  let totalItems = 0, ratedItems = 0;
  const byCategory = {};

  for (const cat of assessment.categories) {
    const rated = cat.items.filter(i => i.slider_value > 0 || i.not_applicable).length;
    byCategory[cat.name] = cat.items.length
      ? Math.round((rated / cat.items.length) * 100) : 0;
    totalItems += cat.items.length;
    ratedItems += rated;
  }

  return {
    overall: totalItems ? Math.round((ratedItems / totalItems) * 100) : 0,
    byCategory,
  };
}

/**
 * Reset — clears the active assessment in place.
 */
export async function resetAssessment(profileId) {
  const state = getState();
  const currentAssessment = state.activeAssessment;

  if (!currentAssessment || state.activeProfileId !== profileId) {
    return startAssessment(profileId);
  }

  const clearedAssessment = {
    ...JSON.parse(JSON.stringify(currentAssessment)),
    updated_at: new Date().toISOString(),
    overall_score: 0,
    categories: currentAssessment.categories.map(category => ({
      ...category,
      score: 0,
      completion_pct: 0,
      items: category.items.map(item => ({
        ...item,
        slider_value: 0,
        not_applicable: false,
        notes: '',
      })),
    })),
  };

  await db.putAssessment(clearedAssessment);
  setState({ activeAssessmentId: clearedAssessment.id, activeAssessment: clearedAssessment });
  return clearedAssessment;
}
