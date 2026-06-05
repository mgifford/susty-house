---
work_package_id: WP07
title: HTML Report Generation
dependencies:
- WP05
requirement_refs:
- FR-011
- FR-014
- FR-015
- NFR-009
planning_base_branch: master
merge_target_branch: master
branch_strategy: Planning artifacts for this feature were generated on master. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into master unless the human explicitly redirects the landing branch.
subtasks:
- T030
- T031
- T032
- T033
history: []
authoritative_surface: src/js/
execution_mode: code_change
owned_files:
- src/js/export-html.js
tags: []
---

# WP07 — HTML Report Generation

## Objective

Generate a self-contained, print-ready HTML report of the current assessment that can be
downloaded, opened in any browser, emailed, and printed to PDF — all without a server.

## Context

- Contract: `contracts/export-html.md`
- The HTML report is fully self-contained: all CSS is inline in a `<style>` block
- No external resources referenced in the generated file (NFR-009)
- All dynamic values must be HTML-escaped to prevent XSS in the downloaded file
- SC-4: report must print correctly on A4/Letter paper
- FR-015: assessor name/company shown if set, gracefully absent if not
- FR-013/SC-7: history section shown if multiple assessment snapshots exist in YAML

## Subtasks

### T030 — Create src/js/export-html.js report structure and header

**Purpose**: Build the HTML report document shell with header, inline CSS, and house
profile summary (FR-014).

**Steps**:
1. Create `src/js/export-html.js` with:

   `escapeHtml(str)` helper:
   - Replaces `&`, `<`, `>`, `"`, `\'' ` with HTML entities
   - Returns empty string for null/undefined

   `today()` helper: returns `YYYY-MM-DD`

   `toHTMLString(profile, currentAssessment, history, catalogue, recommendations)`:
   - Build one large template literal HTML string
   - **DOCTYPE and head**: `<!DOCTYPE html><html lang="en"><head>...`; include `<meta
     charset="UTF-8">`, `<meta name="viewport">`, `<title>Sustainability Report — {nickname}</title>`,
     and a `<style>` block with all report CSS (see T031)
   - **Header section** (`<header>`):
     - `<h1>Sustainability Assessment Report</h1>`
     - House nickname as `<h2>`
     - Assessment date: `currentAssessment.created_at` formatted as readable date
     - If `profile.capacity.assessor_name`: show "Assessed by: {name}" and company if set
     - Overall score displayed prominently: large `{score}/100`
   - **House profile summary** (`<section>`):
     - Table of all 7 house fields with labels and values
     - `<h2>House Details</h2>`
   - **Owner capacity summary** (`<section>`):
     - Table of 4 capacity fields with human-readable labels (use strings mapping)

**Files**: `src/js/export-html.js` (new, partial ~100 lines)
**Validation**: Generated HTML string opens in browser without errors; header shows correct
nickname and date

---

### T031 — Add inline CSS for report layout and print styles

**Purpose**: Make the report look professional on screen and on paper without any external
CSS dependency (NFR-009, SC-4).

**Steps**:
1. In the `<style>` block of `toHTMLString()`, include:
   - Base: `font-family: Georgia, serif; color: #1a1a1a; max-width: 900px; margin: auto`
   - Headings: hierarchical sizes, green `#2d6a4f` for `h1`, dark for `h2/h3`
   - Tables: `border-collapse: collapse`, alternating row colour (`#f9f9f9`)
   - Score display: large bold number, colour by range (red/amber/green)
   - Category score bars: HTML `<progress>` element or `<div>` with inline `style="width:X%"`
   - Recommendation cards: light border, padding, priority badge
   - History table: compact, muted colour for past snapshots
   - `@media print`:
     - `@page { size: A4; margin: 15mm }`
     - Hide any browser chrome artifacts
     - `break-inside: avoid` on all `.card` and `tr` elements
     - Ensure no background colours print (use `print-color-adjust: exact` only for
       score colour)
     - Font size minimum 11pt
     - Page break before `<section class="history">` if present

**Files**: `src/js/export-html.js` (CSS added to style block, ~80 lines of CSS)
**Validation**: Print preview of a generated report shows all sections on A4 with no
truncated content; no horizontal overflow

---

### T032 — Add detailed findings and recommendations sections to report

**Purpose**: Include per-category item ratings with notes, and the prioritised
recommendation list (FR-014, FR-015).

**Steps**:
1. Continue `toHTMLString()` body:

   **Category scores section** (`<section>`):
   - `<h2>Category Scores</h2>`
   - Table: Category | Score | Completion | Status (N/A if all items N/A)
   - One `<progress>` or styled bar per category

   **Detailed findings section** (`<section>`):
   - For each category: `<h3>{categoryLabel}</h3>`, then a table of items:
     - Columns: Item | Current State | N/A | Notes
     - "Current State" = `slider_labels[slider_value]` from catalogue
     - N/A column shows checkmark if `not_applicable === true`
     - Notes column shows notes text (escaped) or empty cell

   **Recommendations section** (`<section>`):
   - `<h2>Recommended Next Steps</h2>`
   - Ordered list of recommendation cards: each shows item label, category, current state,
     a "Priority" badge (High/Medium/Low based on impact_potential quartile), guidance
     excerpt (first sentence only), and capacity indicators (budget/skill icons)

   **Assessor fields** (FR-015):
   - Already in header (T030); if not set, those lines are simply absent from the HTML

**Files**: `src/js/export-html.js` (continued, ~150 lines)
**Validation**: Generated report includes all 6 category sections; each item appears with
its current state and any notes; recommendations list is non-empty for a partial assessment

---

### T033 — Add history section and wire export button

**Purpose**: Show prior assessment snapshots when multiple exist (SC-7); wire the download
button in the results view.

**Steps**:
1. History section in `toHTMLString()`:
   - If `history.length > 0`:
     - `<section class="history"><h2>Assessment History</h2>`
     - Table: Date | Overall Score | Categories with score columns
     - Each row = one past snapshot; current assessment NOT in history table (it is the
       main report)
     - Label current report date clearly as "This Report"
   - If `history.length === 0`: omit the section entirely

2. `exportToHTML(profile, currentAssessment, history, catalogue, recommendations)`:
   - Calls `toHTMLString()`
   - Creates `new Blob([htmlStr], {type: "text/html"})`
   - Filename: `susty-house-report-${slugify(profile.nickname)}-${today()}.html`
   - Same anchor-click-revoke pattern as `export-yaml.js`

3. In `src/js/views/results.js` (WP05, already merged): wire the "Export HTML Report"
   button to call:
   ```js
   const allAssessments = await db.getAssessmentsForProfile(state.activeProfileId);
   const history = allAssessments.filter(a => a.id !== state.activeAssessmentId);
   exportToHTML(state.activeProfile, state.activeAssessment, history,
                state.itemCatalogue, recommendations);
   ```

**Files**: `src/js/export-html.js` (completed, ~40 lines added)
**Validation**: Report with 2 prior assessments shows a history table with 2 rows; report
with no history shows no history section; download button triggers file download

---

## Definition of Done

- [ ] Generated HTML is fully self-contained (no external CSS/JS/image references)
- [ ] All 6 category sections appear in the detailed findings
- [ ] Assessor name/company shown when set; gracefully absent when not
- [ ] History section present only when prior snapshots exist
- [ ] Print preview on A4 shows no truncated content, min 11pt font
- [ ] All user-supplied text (nickname, notes) is HTML-escaped in the report
- [ ] Export button in results view triggers file download

## Risks

- **Large reports**: A house with many items and long notes could produce a large HTML
  file; keep guidance excerpts to first sentence only to limit report size
- **`results.js` owned by WP05**: the button wiring in T033 touches `results.js`; since
  WP07 runs after WP05 is merged, this is a clean sequential addition

## Implementation Command

```bash
spec-kitty agent action implement WP07 --agent copilot
```
