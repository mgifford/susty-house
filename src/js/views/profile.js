/* Sustainable House Evaluator — Profile Form View */
import { getState, setState, subscribe } from '../store.js';
import * as profiles from '../profiles.js';

const CONSTRUCTION_TYPES = ['wood_frame','masonry','manufactured','other'];
const CLIMATE_ZONES      = ['cold','temperate','hot_dry','hot_humid','mixed'];
const BUDGET_RANGES      = ['limited','moderate','substantial','major'];
const TIME_OPTIONS       = ['limited','weekends','extended','hired'];
const SKILL_LEVELS       = ['novice','basic_diy','experienced','trade'];
const AMBITION_LEVELS    = ['light_touch','meaningful','significant','deep_green'];

export function initProfileView() {
  subscribe(state => {
    if (state.currentView === 'profile') renderForm(state);
  });
}

function renderForm(state) {
  const section = document.getElementById('view-profile');
  if (!section || section.hasAttribute('hidden')) return;

  const p = state.activeProfile; // null = new profile, object = edit mode

  section.innerHTML = `
    <div class="container" style="max-width:680px">
      <button class="btn btn-ghost mb-md" id="btn-back-home" type="button">
        ← Back
      </button>
      <h1 tabindex="-1">${p ? 'Edit Profile' : window.t('profile.title')}</h1>

      <form id="profile-form" novalidate>
        <div id="profile-error-summary" class="card mb-md" role="alert"
             aria-labelledby="profile-error-summary-title" hidden tabindex="-1">
          <h2 id="profile-error-summary-title">There are problems with this form</h2>
          <ul id="profile-error-list"></ul>
        </div>

        <div class="card mb-md">
          <h2>House Details</h2>

          <div class="form-group">
            <label for="f-nickname">${window.t('profile.nickname')} *</label>
            <input type="text" id="f-nickname" name="nickname" required
                   maxlength="100" autocomplete="off"
                   value="${esc(p?.nickname ?? '')}"
                   aria-describedby="err-nickname">
            <span class="field-error" id="err-nickname"></span>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label for="f-year">${window.t('profile.year_built')} *</label>
              <input type="number" id="f-year" name="year_built" required
                     min="1800" max="${new Date().getFullYear()}"
                     value="${p?.year_built ?? ''}" aria-describedby="err-year_built">
              <span class="field-error" id="err-year_built"></span>
            </div>
            <div class="form-group">
              <label for="f-area">${window.t('profile.floor_area')} *</label>
              <input type="number" id="f-area" name="floor_area_sqm" required
                     min="1" step="0.1"
                     value="${p?.floor_area_sqm ?? ''}" aria-describedby="err-floor_area_sqm">
              <span class="field-error" id="err-floor_area_sqm"></span>
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label for="f-storeys">${window.t('profile.storeys')} *</label>
              <select id="f-storeys" name="storeys" required aria-describedby="err-storeys">
                <option value="">— select —</option>
                ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${p?.storeys==n?'selected':''}>${n}</option>`).join('')}
              </select>
              <span class="field-error" id="err-storeys"></span>
            </div>
            <div class="form-group">
              <label for="f-occupants">${window.t('profile.occupants')} *</label>
              <input type="number" id="f-occupants" name="occupant_count" required
                     min="1" max="20"
                     value="${p?.occupant_count ?? ''}" aria-describedby="err-occupant_count">
              <span class="field-error" id="err-occupant_count"></span>
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label for="f-construction">${window.t('profile.construction_type')} *</label>
              <select id="f-construction" name="construction_type" required aria-describedby="err-construction_type">
                <option value="">— select —</option>
                ${CONSTRUCTION_TYPES.map(v => `<option value="${v}" ${p?.construction_type===v?'selected':''}>${window.t('profile.type.'+v)}</option>`).join('')}
              </select>
              <span class="field-error" id="err-construction_type"></span>
            </div>
            <div class="form-group">
              <label for="f-climate">${window.t('profile.climate_zone')} *</label>
              <select id="f-climate" name="climate_zone" required aria-describedby="err-climate_zone">
                <option value="">— select —</option>
                ${CLIMATE_ZONES.map(v => `<option value="${v}" ${p?.climate_zone===v?'selected':''}>${window.t('profile.zone.'+v)}</option>`).join('')}
              </select>
              <span class="field-error" id="err-climate_zone"></span>
            </div>
          </div>
        </div>

        <div class="card mb-md">
          <h2>Your Capacity</h2>
          <p class="text-muted text-sm mb-md">This helps us prioritise recommendations to what's realistic for you.</p>

          ${renderCapacityField('f-budget', 'budget_range', 'Budget for improvements', BUDGET_RANGES, 'capacity.budget.', p?.capacity?.budget_range)}
          ${renderCapacityField('f-time', 'time_availability', 'Time available', TIME_OPTIONS, 'capacity.time.', p?.capacity?.time_availability)}
          ${renderCapacityField('f-skill', 'skill_level', 'Your skill level', SKILL_LEVELS, 'capacity.skill.', p?.capacity?.skill_level)}
          ${renderCapacityField('f-ambition', 'ambition_level', 'Sustainability ambition', AMBITION_LEVELS, 'capacity.ambition.', p?.capacity?.ambition_level)}
        </div>

        <details class="card mb-md">
          <summary style="cursor:pointer;font-weight:600;padding:4px 0">
            Assessor Info (optional — for professional use)
          </summary>
          <div class="mt-md">
            <div class="form-group">
              <label for="f-assessor-name">Assessor name</label>
              <input type="text" id="f-assessor-name" name="assessor_name" autocomplete="name"
                     value="${esc(p?.capacity?.assessor_name ?? '')}">
            </div>
            <div class="form-group">
              <label for="f-assessor-company">Assessor company</label>
              <input type="text" id="f-assessor-company" name="assessor_company"
                     value="${esc(p?.capacity?.assessor_company ?? '')}">
            </div>
          </div>
        </details>

        <div class="cluster mt-md">
          <button type="submit" class="btn btn-primary">${window.t('profile.save')}</button>
          <button type="button" class="btn btn-secondary" id="btn-cancel-profile">${window.t('profile.cancel')}</button>
        </div>

        <div role="status" aria-live="polite" id="save-status" class="text-sm mt-sm" style="min-height:1.5em"></div>
      </form>
    </div>
  `;

  // Back / cancel
  section.querySelector('#btn-back-home').addEventListener('click', goHome);
  section.querySelector('#btn-cancel-profile').addEventListener('click', goHome);

  // Inline validation on blur
  section.querySelectorAll('input[required], select[required]').forEach(el => {
    el.addEventListener('blur', () => validateField(el, section));
  });

  // Form submit
  section.querySelector('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = collectFormData(section);
    const { valid, errors } = profiles.validateProfile(data);

    if (!valid) {
      showErrors(errors, section);
      section.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    try {
      const state = getState();
      if (state.activeProfileId) {
        await profiles.updateProfile(state.activeProfileId, data);
      } else {
        const profile = await profiles.createProfile(data);
        await profiles.setActiveProfile(profile.id);
      }

      const statusEl = section.querySelector('#save-status');
      if (statusEl) {
        statusEl.textContent = 'Profile saved!';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      }

      // Navigate to assessment
      setState({ currentView: 'assessment' });
      window.App.showView('view-assessment');
    } catch (err) {
      if (err.errors) {
        showErrors(err.errors, section);
      } else {
        window.App.showToast('Error saving profile: ' + err.message);
      }
    }
  });
}

function renderCapacityField(id, name, label, options, prefix, currentVal) {
  return `
    <div class="form-group">
      <label for="${id}">${label} *</label>
      <select id="${id}" name="${name}" required aria-describedby="err-${name}">
        <option value="">— select —</option>
        ${options.map(v => `<option value="${v}" ${currentVal===v?'selected':''}>${window.t(prefix+v)}</option>`).join('')}
      </select>
      <span class="field-error" id="err-${name}"></span>
    </div>
  `;
}

function collectFormData(section) {
  const f = section.querySelector('#profile-form');
  const fd = new FormData(f);
  return {
    nickname:          fd.get('nickname'),
    year_built:        Number(fd.get('year_built')),
    floor_area_sqm:    Number(fd.get('floor_area_sqm')),
    storeys:           Number(fd.get('storeys')),
    construction_type: fd.get('construction_type'),
    climate_zone:      fd.get('climate_zone'),
    occupant_count:    Number(fd.get('occupant_count')),
    capacity: {
      budget_range:      fd.get('budget_range'),
      time_availability: fd.get('time_availability'),
      skill_level:       fd.get('skill_level'),
      ambition_level:    fd.get('ambition_level'),
      assessor_name:     fd.get('assessor_name') || null,
      assessor_company:  fd.get('assessor_company') || null,
    },
  };
}

function validateField(el, section) {
  // Real-time per-field validation on blur
  const name = el.name;
  const val  = el.value;
  const errEl = section.querySelector(`#err-${name}`);
  if (!errEl) return;
  if (el.required && !val) {
    errEl.textContent = window.t('error.required_field');
    el.setAttribute('aria-invalid', 'true');
  } else {
    errEl.textContent = '';
    el.removeAttribute('aria-invalid');
  }
}

function showErrors(errors, section) {
  // Clear all
  section.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
  section.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  const summary = section.querySelector('#profile-error-summary');
  const list = section.querySelector('#profile-error-list');
  if (summary) summary.setAttribute('hidden', '');
  if (list) list.innerHTML = '';

  // Set new
  for (const [field, msg] of Object.entries(errors)) {
    const errEl = section.querySelector(`#err-${field}`);
    const input = section.querySelector(`[name="${field}"]`);
    if (errEl) errEl.textContent = msg;
    if (input) input.setAttribute('aria-invalid', 'true');
    if (list && input) {
      const labelText = input.labels?.[0]?.textContent?.replace('*', '').trim() || field;
      const item = document.createElement('li');
      item.innerHTML = `<a href="#${input.id}">${esc(labelText)} - ${esc(msg)}</a>`;
      list.appendChild(item);
    }
  }

  if (list?.children.length && summary) {
    summary.removeAttribute('hidden');
    summary.focus();
    summary.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const target = section.querySelector(link.getAttribute('href'));
        target?.focus();
      });
    });
  }
}

function goHome() {
  setState({ currentView: 'home' });
  window.App.showView('view-home');
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function renderProfileView() {
  renderForm(getState());
}

