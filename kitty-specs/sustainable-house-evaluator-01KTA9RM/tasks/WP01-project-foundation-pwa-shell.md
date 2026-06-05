---
work_package_id: WP01
title: Project Foundation & PWA Shell
dependencies: []
requirement_refs:
- FR-018
- FR-019
- NFR-001
- NFR-003
- NFR-006
planning_base_branch: master
merge_target_branch: master
branch_strategy: Planning artifacts for this feature were generated on master. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into master unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-sustainable-house-evaluator-01KTA9RM
base_commit: 46b3c71cfb064e36cb2bb75ce64378ee6d5d363f
created_at: '2026-06-05T12:17:23.666826+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
- T007
shell_pid: '77192'
history: []
authoritative_surface: src/
execution_mode: code_change
owned_files:
- index.html
- manifest.json
- sw.js
- README.md
- src/css/main.css
- src/css/print.css
- src/js/app.js
- src/js/pwa.js
- .github/workflows/pages.yml
tags: []
---

# WP01 — Project Foundation & PWA Shell

## Objective

Establish the complete project file structure, SPA shell, base CSS system, PWA manifest, Service
Worker, and GitHub Pages deployment. Every subsequent WP builds on this foundation.

## Context

- **Stack**: Vanilla HTML + CSS + JavaScript; no build tools; no npm; no framework
- **Hosting**: GitHub Pages at `https://<owner>.github.io/susty-house/`
- **Offline strategy**: Service Worker with Cache-First; all assets pre-cached on install
- **Only external dep**: `js-yaml` from CDN — must be in the SW precache list
- **SPA routing**: `app.js` shows/hides named `<section>` elements; no URL hash routing in v1
- Spec: `kitty-specs/sustainable-house-evaluator-01KTA9RM/spec.md`
- Plan: `kitty-specs/sustainable-house-evaluator-01KTA9RM/plan.md`

## Subtasks

### T001 — Create project directory structure and index.html SPA shell

**Purpose**: Establish the root file layout and the single HTML shell that hosts all app views.

**Steps**:
1. Create the following directories: `src/css/`, `src/js/`, `src/js/views/`, `src/data/`,
   `.github/workflows/`
2. Create `index.html` at repo root with:
   - `<!DOCTYPE html>` and `<html lang="en">`
   - `<meta charset="UTF-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`
   - `<meta name="theme-color" content="#2d6a4f">`
   - `<link rel="manifest" href="manifest.json">`
   - `<link rel="stylesheet" href="src/css/main.css">`
   - `<link rel="stylesheet" href="src/css/print.css" media="print">`
   - `<link rel="stylesheet" href="src/css/overrides.css">` (stub — filled by WP08)
   - A `<header>` with app title "Sustainable House Evaluator" and a score badge placeholder
   - Five named `<section>` elements with `id` and `hidden` attribute:
     - `#view-home` — house profile list
     - `#view-profile` — create/edit house profile + capacity
     - `#view-assessment` — assessment walkthrough
     - `#view-results` — score + recommendations
     - `#view-loading` — spinner (visible on startup)
   - `<script type="module" src="src/js/app.js"></script>` at bottom of `<body>`

**Files**: `index.html` (new, ~50 lines)
**Validation**: HTML validates with no errors; all 5 `<section>` elements present with correct IDs

---

### T002 — Create base CSS system

**Purpose**: Establish the CSS custom properties, layout grid, typography scale, and colour
system that all views use.

**Steps**:
1. Create `src/css/main.css` with:
   - `:root` block defining CSS custom properties:
     - `--color-primary: #2d6a4f` (forest green)
     - `--color-primary-light: #52b788`
     - `--color-surface: #ffffff`
     - `--color-surface-alt: #f0f4f0`
     - `--color-text: #1a1a1a`
     - `--color-text-muted: #595959` (≥ 4.5:1 on white)
     - `--color-border: #767676`
     - `--color-error: #d62828`
     - `--color-success: #386641`
     - `--radius: 6px`
     - `--spacing-xs: 4px`, `--spacing-sm: 8px`, `--spacing-md: 16px`,
       `--spacing-lg: 24px`, `--spacing-xl: 40px`
     - `--font-body: system-ui, sans-serif`
     - `--font-size-base: 1rem`, `--font-size-lg: 1.25rem`, `--font-size-xl: 1.5rem`
   - Base resets: `box-sizing: border-box`, margin/padding resets
   - `body`: font, background, colour from CSS vars
   - `header`: sticky top bar with app title and score badge
   - `.container`: max-width 900px, auto margins, responsive padding
   - `.view`: display none by default; `.view.active` → display block
   - Button styles: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
   - Form styles: label + input pairs, range input, checkbox, textarea
   - Score badge: `.score-badge` circular badge with colour transitions
   - Progress bar: `.progress-bar` with fill width as CSS variable
   - Card: `.card` with border, padding, border-radius
   - Utility classes: `.visually-hidden`, `.text-muted`, `.mt-md`, `.gap-sm`
   - Responsive breakpoints: 480px, 768px, 1024px using `@media (min-width: ...)`
2. Create `src/css/print.css` (media="print"):
   - Hide: `header`, `.btn`, `.nav-sidebar`, `#view-loading`
   - Force white background, black text
   - Page break rules: `break-inside: avoid` on cards
   - Expand link `href` in `::after` pseudo-element
   - Font sizes for readability on paper

**Files**: `src/css/main.css` (new, ~180 lines), `src/css/print.css` (new, ~40 lines)
**Validation**: App header renders on 320px and 1440px viewports; no horizontal scroll

---

### T003 — Create PWA manifest.json

**Purpose**: Enable "Add to Home Screen" / PWA install on Chrome and Safari.

**Steps**:
1. Create `manifest.json` at repo root:
   ```json
   {
     "name": "Sustainable House Evaluator",
     "short_name": "SustyHouse",
     "description": "Assess and improve your home's sustainability",
     "start_url": "/susty-house/",
     "scope": "/susty-house/",
     "display": "standalone",
     "theme_color": "#2d6a4f",
     "background_color": "#ffffff",
     "icons": [
       { "src": "src/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "src/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
       { "src": "src/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png",
         "purpose": "maskable" }
     ]
   }
   ```
2. Create `src/icons/` directory with simple SVG-based placeholder PNGs (or pure CSS icon
   generated as a data URI embedded in an SVG). Use a house silhouette with green background.
   Minimum: create 192×192 and 512×512 PNG placeholders. A simple solid-green square with a
   white house icon is sufficient for v1.

**Files**: `manifest.json` (new), `src/icons/icon-192.png`, `src/icons/icon-512.png`
**Validation**: Chrome DevTools > Application > Manifest shows no errors

---

### T004 — Create Service Worker with cache-first strategy

**Purpose**: Enable full offline functionality after first load (FR-018, NFR-001).

**Steps**:
1. Create `sw.js` at repo root:
   ```js
   const CACHE_NAME = 'susty-house-v1';
   const PRECACHE_URLS = [
     '/susty-house/',
     '/susty-house/index.html',
     '/susty-house/manifest.json',
     '/susty-house/src/css/main.css',
     '/susty-house/src/css/print.css',
     '/susty-house/src/css/overrides.css',
     '/susty-house/src/js/app.js',
     '/susty-house/src/js/pwa.js',
     '/susty-house/src/js/db.js',
     '/susty-house/src/js/store.js',
     '/susty-house/src/js/profiles.js',
     '/susty-house/src/js/assessment.js',
     '/susty-house/src/js/scoring.js',
     '/susty-house/src/js/recommendations.js',
     '/susty-house/src/js/export-yaml.js',
     '/susty-house/src/js/import-yaml.js',
     '/susty-house/src/js/export-html.js',
     '/susty-house/src/js/views/home.js',
     '/susty-house/src/js/views/profile.js',
     '/susty-house/src/js/views/assessment.js',
     '/susty-house/src/js/views/results.js',
     '/susty-house/src/data/items.json',
     '/susty-house/src/data/strings.json',
     'https://cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js',
   ];
   ```
   - `install` event: cache all PRECACHE_URLS, call `self.skipWaiting()`
   - `activate` event: delete old caches (any `susty-house-*` cache not matching `CACHE_NAME`),
     call `clients.claim()`
   - `fetch` event: Cache-First strategy — return cached response if available, else fetch and
     cache the response

**Files**: `sw.js` (new, ~60 lines)
**Validation**: After first load, Chrome DevTools > Application > Cache shows all URLs cached;
navigating offline still loads the app

---

### T005 — Create app.js view router

**Purpose**: Bootstrap the app, load modules, and manage view transitions.

**Steps**:
1. Create `src/js/app.js`:
   - Export `showView(viewId)` function: adds `active` class to target section, removes it from
     all others, calls `element.focus()` on the section's first `<h2>` (for a11y)
   - Export `hideAllViews()` function
   - On DOMContentLoaded:
     1. Show `#view-loading`
     2. Dynamically import `./db.js` and call `openDB()`
     3. Import `./store.js` and initialise state
     4. Import `./views/home.js` and call `initHomeView()`
     5. Import `./views/profile.js` and call `initProfileView()`
     6. Import `./views/assessment.js` and call `initAssessmentView()`
     7. Import `./views/results.js` and call `initResultsView()`
     8. Load `lastActiveProfileId` from localStorage; if set, show `#view-home` else
        show `#view-home` (fresh start)
     9. Hide `#view-loading`
   - Subscribe to store state changes; on `currentView` change, call `showView()`
   - Expose a global `window.App = { showView }` for use from view modules

**Files**: `src/js/app.js` (new, ~80 lines)
**Validation**: App loads; `#view-home` becomes visible; no console errors

---

### T006 — Create pwa.js Service Worker registration

**Purpose**: Register the Service Worker and show an update banner when a new version is
available.

**Steps**:
1. Create `src/js/pwa.js`:
   - Check `'serviceWorker' in navigator`; if not, log warning and return
   - Register `'/susty-house/sw.js'` with scope `'/susty-house/'`
   - On `updatefound`: when new SW installs, listen for its `statechange`; when `installed`
     and `navigator.serviceWorker.controller` exists (i.e., update, not first install), insert
     a `<div class="update-banner">` into `<body>` with text "Update available — reload to
     get the latest version" and a Reload button that calls `location.reload()`
   - Add `import './pwa.js'` to `app.js` bootstrap

**Files**: `src/js/pwa.js` (new, ~40 lines)
**Validation**: SW registers in DevTools; revisiting after code change shows update banner

---

### T007 — Configure GitHub Pages deployment

**Purpose**: Auto-deploy the app to GitHub Pages on every push to `master`.

**Steps**:
1. Create `.github/workflows/pages.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [master]
     workflow_dispatch:
   permissions:
     contents: read
     pages: write
     id-token: write
   concurrency:
     group: pages
     cancel-in-progress: false
   jobs:
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/configure-pages@v5
         - uses: actions/upload-pages-artifact@v3
           with:
             path: '.'
         - id: deployment
           uses: actions/deploy-pages@v4
   ```
2. Create `README.md` with:
   - Project name and one-paragraph description
   - Link to live GitHub Pages URL
   - "How to run locally" section (just: clone repo, serve with `python -m http.server` or
     VS Code Live Server — no npm install needed)
   - "How to contribute" section referencing the kitty-specs directory

**Files**: `.github/workflows/pages.yml` (new), `README.md` (new)
**Validation**: Workflow appears in GitHub Actions tab; push to master triggers deployment

---

## Definition of Done

- [ ] All 9 owned files exist and are non-empty
- [ ] `index.html` has 5 `<section>` views with correct IDs
- [ ] CSS custom properties system in place; app header visible at 320px and 1440px
- [ ] PWA manifest passes Chrome DevTools Application panel validation
- [ ] Service Worker registers successfully on GitHub Pages HTTPS
- [ ] All PRECACHE_URLS list matches the actual file paths in the project
- [ ] GitHub Actions workflow file is syntactically valid YAML
- [ ] `src/css/overrides.css` does NOT exist yet (stub reference in index.html is OK)

## Risks

- **GitHub Pages path prefix**: All SW cache keys and manifest URLs must include `/susty-house/`
  prefix; forgetting this breaks offline on Pages (but works locally). Verify with DevTools.
- **ES module imports**: `app.js` uses `import()` dynamic imports; ensure `type="module"` is set
  on the script tag in `index.html`.

## Implementation Command

```bash
spec-kitty agent action implement WP01 --agent copilot
```
