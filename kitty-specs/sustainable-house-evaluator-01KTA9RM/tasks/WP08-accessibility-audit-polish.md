---
work_package_id: WP08
title: Accessibility Audit and Polish
dependencies:
- WP06
- WP07
requirement_refs:
- NFR-005
- NFR-006
- NFR-007
- NFR-009
planning_base_branch: master
merge_target_branch: master
branch_strategy: Planning artifacts for this feature were generated on master. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into master unless the human explicitly redirects the landing branch.
subtasks:
- T034
- T035
- T036
- T037
history: []
authoritative_surface: src/css/
execution_mode: code_change
owned_files:
- src/css/overrides.css
- kitty-specs/sustainable-house-evaluator-01KTA9RM/checklists/final-audit.md
tags: []
---

# WP08 — Accessibility Audit and Polish

## Objective

Audit the complete app against WCAG 2.1 AA, fix all critical and serious violations, validate
responsive layout across breakpoints, verify cross-browser compatibility, and document the
final audit results.

## Context

- NFR-005: WCAG 2.1 AA — all interactive controls keyboard-accessible; colour contrast
- NFR-006: functional at 320px–2560px
- NFR-007: Chrome, Firefox, Safari, Edge current versions
- SC-1: first-time user completes full assessment in under 20 minutes
- All CSS fixes go in `src/css/overrides.css` (new file, imported by index.html stub)
- Audit document in `kitty-specs/.../checklists/final-audit.md`
- This WP runs LAST — all UI is complete; it is a quality validation and fix pass

## Subtasks

### T034 — Run accessibility audit and document findings

**Purpose**: Systematically audit all 4 views for WCAG 2.1 AA compliance.

**Steps**:
1. Open the app in Chrome DevTools; run axe DevTools (or axe-core bookmarklet) on each view:
   - `#view-home`, `#view-profile`, `#view-assessment`, `#view-results`
2. Test keyboard navigation on each view:
   - Tab through all interactive elements; verify logical order
   - Verify sliders respond to arrow keys with correct `aria-valuetext` updates
   - Verify modal confirms (profile delete, assessment reset) are reachable by keyboard
   - Verify no keyboard trap exists in any view
3. Test with screen reader (VoiceOver/macOS or NVDA/Windows):
   - Navigate to `#view-assessment`; verify slider value announcements
   - Rate an item; verify `aria-live="polite"` score region announces the new score
   - Navigate the category sidebar; verify each item is announced with category label
4. Check colour contrast with browser DevTools:
   - All normal text ≥ 4.5:1
   - Large text (≥ 24px regular or 18.67px bold) ≥ 3:1
   - UI components (sliders, buttons, progress bars) ≥ 3:1 against background
5. Document all findings (pass/fail/N/A) in
   `kitty-specs/sustainable-house-evaluator-01KTA9RM/checklists/final-audit.md`
   using the format:
   ```
   | WCAG SC | View | Element | Result | Notes |
   ```

**Files**: `kitty-specs/.../checklists/final-audit.md` (new)
**Validation**: Audit document exists with at least 20 WCAG success criteria evaluated

---

### T035 — Fix critical and serious accessibility violations

**Purpose**: Remediate all axe-reported critical/serious issues and keyboard navigation
failures found in T034.

**Steps**:
1. Common issues to look for and fix via `src/css/overrides.css` or inline attribute changes
   in the JS view modules (coordinate with respective WP owners if needed):
   - **Focus visibility**: ensure all focusable elements have a visible 2px outline;
     add to overrides.css: `:focus-visible { outline: 2px solid var(--color-primary);
     outline-offset: 2px; }`
   - **Slider `aria-valuetext`**: if not set correctly in WP04, add in overrides
   - **Score badge `aria-live`**: if missing, add `role="status" aria-live="polite"` to
     the badge element
   - **Form error associations**: verify all `role="alert"` error spans are adjacent to
     their inputs and announced correctly
   - **Category nav landmark**: verify `<nav aria-label="Assessment categories">` is present
   - **Skip link**: add a "Skip to main content" visually-hidden skip link at the top of
     `index.html` (WP01 file is already merged; add via overrides.css visibility and a
     small inline script to wire it, or add directly to the DOM on load)
2. Write all CSS fixes into `src/css/overrides.css`; keep them minimal and targeted
3. Re-run axe on each view after fixes; all critical and serious violations resolved

**Files**: `src/css/overrides.css` (new, ~60 lines)
**Validation**: axe DevTools reports zero critical and zero serious violations on all 4 views

---

### T036 — Validate responsive layout across breakpoints

**Purpose**: Verify the app is usable on all target screen widths (NFR-006).

**Steps**:
1. Test in Chrome DevTools Device Emulation at:
   - 320×568 (small phone, portrait) — verify no horizontal scroll; nav collapses to select
   - 375×667 (iPhone SE) — verify form fields not too small to tap
   - 768×1024 (tablet, portrait) — verify sidebar nav shows; form uses 2-column layout
   - 1024×768 (tablet, landscape / small laptop) — verify full layout
   - 1440×900 (desktop) — verify max-width container centered
   - 2560×1440 (large desktop) — verify no over-stretched layout
2. Fix any layout issues found via `src/css/overrides.css` additions:
   - Common fixes: touch target sizes (min 44×44px for buttons), font size minimum 16px
     on mobile inputs (prevents iOS zoom), slider thumb size on mobile
3. Test the profile form on 320px: all fields must be vertically stacked and fully visible

**Files**: `src/css/overrides.css` (additions)
**Validation**: No horizontal scroll at 320px; all interactive elements meet 44×44px touch
target on 375px viewport

---

### T037 — Cross-browser validation and final smoke test

**Purpose**: Verify the app works correctly in Chrome, Firefox, Safari, and Edge (NFR-007).

**Steps**:
1. Open the app in each target browser and verify:
   - App loads and all 4 views are accessible
   - IndexedDB: create a profile, save an assessment — verify data persists on reload
   - YAML export: download the file; verify it opens as readable YAML
   - YAML import: import the downloaded file; verify profile and assessment are restored
   - HTML report: download the report; open in browser; verify all sections present; print
     preview shows no truncated content
   - Offline: throttle to offline in DevTools; reload; verify app still works
   - PWA install: on Chrome, verify "Install" button appears in address bar
2. Document any browser-specific issues found and fix in `overrides.css`
3. Update `final-audit.md` with cross-browser results table:
   ```
   | Feature | Chrome | Firefox | Safari | Edge |
   ```

**Files**: `kitty-specs/.../checklists/final-audit.md` (updated),
`src/css/overrides.css` (any browser-specific fixes added)
**Validation**: All 4 browsers complete the smoke test checklist with no failures; final
audit document shows all tests as PASS

---

## Definition of Done

- [ ] axe DevTools reports zero critical and zero serious violations on all 4 views
- [ ] All interactive elements reachable and operable via keyboard alone
- [ ] Slider `aria-valuetext` announces current label text to screen readers
- [ ] Score `aria-live` region announces score changes on slider interaction
- [ ] No horizontal scroll at 320px viewport width
- [ ] All tap targets ≥ 44×44px on mobile viewports
- [ ] App functions offline in Chrome after first load (Service Worker active)
- [ ] All 4 browsers pass the smoke test checklist
- [ ] `final-audit.md` documents all audit findings with pass/fail status

## Risks

- **Cross-browser IndexedDB differences**: Safari private mode blocks IDB; the localStorage
  fallback (WP02) handles this; verify fallback activates and shows the warning banner
- **CSS `print-color-adjust`**: not supported in older Safari; test print preview in Safari

## Implementation Command

```bash
spec-kitty agent action implement WP08 --agent copilot
```

## Activity Log

- 2026-06-05T19:22:36Z – unknown – Moved to for_review
