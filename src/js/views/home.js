/* Sustainable House Evaluator — Home View */
import { getState, setState, subscribe } from '../store.js';
import * as profiles from '../profiles.js';

export function initHomeView() {
  subscribe(state => {
    if (state.currentView === 'home') render(state);
  });
  // Initial render will happen when view is shown
}

function render(state) {
  const section = document.getElementById('view-home');
  if (!section || section.hasAttribute('hidden')) return;

  const profileList = state.profiles;

  section.innerHTML = `
    <div class="container">
      <div class="flex justify-between items-center mb-md flex-wrap gap-sm">
        <h1 tabindex="-1">${window.t('home.title')}</h1>
        <div class="cluster">
          <button class="btn btn-primary" id="btn-new-profile" type="button">
            + ${window.t('home.new_profile')}
          </button>
          <button class="btn btn-secondary" id="btn-import-yaml" type="button">
            ↑ ${window.t('home.import_yaml')}
          </button>
          <input type="file" id="import-file-input" accept=".yaml,.yml"
                 class="visually-hidden" aria-hidden="true" tabindex="-1">
        </div>
      </div>

      ${profileList.length === 0 ? renderEmpty() : renderProfileList(profileList, state.activeProfileId)}
    </div>
  `;

  // Wire events
  section.querySelector('#btn-new-profile').addEventListener('click', () => {
    setState({ activeProfileId: null, activeProfile: null, currentView: 'profile' });
    window.App.showView('view-profile');
  });

  // Import button — wired properly by import-yaml.js (WP06); stub click for now
  section.querySelector('#btn-import-yaml').addEventListener('click', () => {
    const input = section.querySelector('#import-file-input');
    if (input) input.click();
  });

  // Profile card actions
  section.querySelectorAll('[data-action="open"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await profiles.setActiveProfile(id);
      setState({ currentView: 'assessment' });
      window.App.showView('view-assessment');
    });
  });

  section.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await profiles.setActiveProfile(id);
      setState({ currentView: 'profile' });
      window.App.showView('view-profile');
    });
  });

  section.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const nickname = btn.dataset.nickname;
      if (!confirm(window.t('home.delete_confirm').replace('{name}', nickname))) return;
      await profiles.deleteProfile(id);
      window.App.showToast('Profile deleted.');
    });
  });
}

function renderEmpty() {
  return `
    <div class="card text-center mt-lg">
      <p class="text-muted">${window.t('home.no_profiles')}</p>
      <button class="btn btn-primary mt-md" id="btn-new-profile-empty" type="button">
        + ${window.t('home.new_profile')}
      </button>
    </div>
  `;
}

function renderProfileList(profileList, activeId) {
  return `
    <div class="stack" role="list">
      ${profileList.map(p => renderProfileCard(p, activeId)).join('')}
    </div>
  `;
}

function renderProfileCard(profile, activeId) {
  const isActive = profile.id === activeId;
  return `
    <article class="card${isActive ? ' active-profile' : ''}" role="listitem">
      <div class="flex justify-between items-center flex-wrap gap-sm">
        <div>
          <h2 class="text-base" style="font-size:1.1rem">${esc(profile.nickname)}</h2>
          <p class="text-muted text-sm">
            Built ${profile.year_built} · ${profile.floor_area_sqm} m² · ${profile.storeys} storey${profile.storeys > 1 ? 's' : ''}
            · ${window.t('profile.zone.' + profile.climate_zone) || profile.climate_zone}
          </p>
        </div>
        <div class="cluster">
          <button class="btn btn-primary btn-sm" type="button"
                  data-action="open" data-id="${profile.id}">
            Open Assessment
          </button>
          <button class="btn btn-secondary btn-sm" type="button"
                  data-action="edit" data-id="${profile.id}">
            Edit Profile
          </button>
          <button class="btn btn-danger btn-sm" type="button"
                  data-action="delete" data-id="${profile.id}"
                  data-nickname="${esc(profile.nickname)}"
                  aria-label="Delete ${esc(profile.nickname)}">
            Delete
          </button>
        </div>
      </div>
    </article>
  `;
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Re-export render so app.js can trigger it when switching to home view
export function renderHomeView() {
  render(getState());
}
