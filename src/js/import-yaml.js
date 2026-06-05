/* Sustainable House Evaluator — YAML Import */

import * as db from './db.js';
import { listProfiles } from './profiles.js';
import { setState } from './store.js';

const ENUMS = {
  budget_range: ['limited', 'moderate', 'substantial', 'major'],
  time_availability: ['limited', 'weekends', 'extended', 'hired'],
  skill_level: ['novice', 'basic_diy', 'experienced', 'trade'],
  ambition_level: ['light_touch', 'meaningful', 'significant', 'deep_green'],
  construction_type: ['wood_frame', 'masonry', 'manufactured', 'other'],
  climate_zone: ['cold', 'temperate', 'hot_dry', 'hot_humid', 'mixed'],
};

let importHandlerReady = false;

function requireYaml() {
  if (!window.jsyaml?.load) {
    throw new ImportError('YAML import is unavailable because the YAML library did not load.');
  }
  return window.jsyaml;
}

function requireField(object, field, parentLabel) {
  if (object?.[field] === undefined || object?.[field] === null || object?.[field] === '') {
    throw new ImportError(`Missing required field: ${parentLabel}.${field}`, {
      field: `${parentLabel}.${field}`,
    });
  }
  return object[field];
}

function requireEnum(object, field, parentLabel) {
  const value = requireField(object, field, parentLabel);
  if (!ENUMS[field].includes(value)) {
    throw new ImportError(`Invalid value for ${parentLabel}.${field}: ${value}`, {
      field: `${parentLabel}.${field}`,
    });
  }
  return value;
}

function getImportAlert() {
  const homeView = document.getElementById('view-home');
  if (!homeView) return null;

  let alert = homeView.querySelector('#import-yaml-alert');
  if (!alert) {
    const controls = homeView.querySelector('.cluster');
    if (!controls?.parentElement) return null;

    alert = document.createElement('div');
    alert.id = 'import-yaml-alert';
    alert.className = 'field-error mt-sm';
    alert.setAttribute('role', 'alert');
    alert.setAttribute('tabindex', '-1');
    controls.parentElement.insertAdjacentElement('afterend', alert);
  }

  return alert;
}

function clearImportAlert() {
  const alert = document.getElementById('import-yaml-alert');
  if (alert) {
    alert.textContent = '';
    alert.setAttribute('hidden', '');
  }
}

function showImportAlert(message) {
  const alert = getImportAlert();
  if (!alert) return;
  alert.textContent = message;
  alert.removeAttribute('hidden');
  alert.focus();
}

export class ImportError extends Error {
  constructor(message, { field = null, schemaVersion = null } = {}) {
    super(message);
    this.name = 'ImportError';
    this.field = field;
    this.schemaVersion = schemaVersion;
  }
}

export function importFromYAML(yamlText) {
  const yaml = requireYaml();
  let parsed;

  try {
    parsed = yaml.load(yamlText);
  } catch (error) {
    throw new ImportError(`Invalid YAML: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new ImportError('Invalid YAML: expected a YAML document with house, capacity, and assessments.');
  }

  if (parsed.schema_version !== '1.0') {
    throw new ImportError('Unsupported schema version. This app can import schema version 1.0 only.', {
      schemaVersion: parsed.schema_version ?? null,
    });
  }

  const house = parsed.house;
  const capacity = parsed.capacity;

  if (!house || typeof house !== 'object') {
    throw new ImportError('Missing required field: house', { field: 'house' });
  }
  if (!capacity || typeof capacity !== 'object') {
    throw new ImportError('Missing required field: capacity', { field: 'capacity' });
  }
  if (!Array.isArray(parsed.assessments)) {
    throw new ImportError('Missing required field: assessments', { field: 'assessments' });
  }

  const profile = {
    id: requireField(house, 'id', 'house'),
    nickname: requireField(house, 'nickname', 'house'),
    year_built: requireField(house, 'year_built', 'house'),
    floor_area_sqm: requireField(house, 'floor_area_sqm', 'house'),
    storeys: requireField(house, 'storeys', 'house'),
    construction_type: requireEnum(house, 'construction_type', 'house'),
    climate_zone: requireEnum(house, 'climate_zone', 'house'),
    occupant_count: requireField(house, 'occupant_count', 'house'),
    created_at: requireField(house, 'created_at', 'house'),
    capacity: {
      budget_range: requireEnum(capacity, 'budget_range', 'capacity'),
      time_availability: requireEnum(capacity, 'time_availability', 'capacity'),
      skill_level: requireEnum(capacity, 'skill_level', 'capacity'),
      ambition_level: requireEnum(capacity, 'ambition_level', 'capacity'),
      assessor_name: capacity.assessor_name ?? null,
      assessor_company: capacity.assessor_company ?? null,
    },
  };

  const assessments = parsed.assessments.map((assessment, index) => {
    if (!assessment || typeof assessment !== 'object') {
      throw new ImportError(`Assessment ${index + 1} is invalid.`, {
        field: `assessments[${index}]`,
      });
    }

    const categories = Array.isArray(assessment.categories) ? assessment.categories : [];

    return {
      id: requireField(assessment, 'id', `assessments[${index}]`),
      house_profile_id: profile.id,
      created_at: requireField(assessment, 'created_at', `assessments[${index}]`),
      updated_at: assessment.updated_at ?? assessment.created_at,
      overall_score: assessment.overall_score ?? 0,
      categories: categories.map((category, categoryIndex) => ({
        name: requireField(category, 'name', `assessments[${index}].categories[${categoryIndex}]`),
        score: category.score ?? null,
        completion_pct: category.completion_pct ?? 0,
        items: Array.isArray(category.items)
          ? category.items.map((item, itemIndex) => ({
              key: requireField(
                item,
                'key',
                `assessments[${index}].categories[${categoryIndex}].items[${itemIndex}]`
              ),
              slider_value: item.slider_value ?? 0,
              not_applicable: Boolean(item.not_applicable),
              notes: item.notes ?? '',
            }))
          : [],
      })),
    };
  }).sort((a, b) => a.created_at.localeCompare(b.created_at));

  return { profile, assessments };
}

export function initImportHandler() {
  if (importHandlerReady) return;
  importHandlerReady = true;

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('#btn-import-yaml');
    if (!trigger) return;

    clearImportAlert();
    const input = document.getElementById('import-file-input');
    if (!input) {
      showImportAlert('The import control is not available yet. Reload the page and try again.');
      return;
    }

    input.value = '';
    input.click();
  });

  document.addEventListener('change', async (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'import-file-input') return;

    const [file] = input.files ?? [];
    if (!file) return;

    clearImportAlert();

    try {
      const yamlText = await file.text();
      const { profile, assessments } = importFromYAML(yamlText);

      await db.putProfile(profile);
      for (const assessment of assessments) {
        await db.putAssessment(assessment);
      }

      await listProfiles();

      const latestAssessment = assessments[assessments.length - 1] ?? null;
      setState({
        activeProfileId: profile.id,
        activeProfile: profile,
        activeAssessmentId: latestAssessment?.id ?? null,
        activeAssessment: latestAssessment,
      });
      localStorage.setItem('lastActiveProfileId', profile.id);

      window.App.showView('view-home');
      window.App.showToast('Assessment loaded successfully.');
    } catch (error) {
      const message = error instanceof ImportError
        ? error.message
        : 'Could not import this YAML file. Check the file and try again.';
      showImportAlert(message);
    } finally {
      input.value = '';
    }
  });
}
