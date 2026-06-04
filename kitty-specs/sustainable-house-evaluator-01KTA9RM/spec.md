# Sustainable House Evaluator

**Mission ID**: 01KTA9RMG76YKC83Z6EAG1N323  
**Mission Slug**: sustainable-house-evaluator-01KTA9RM  
**Mission Type**: software-dev  
**Status**: Draft  
**Created**: 2026-06-04  

---

## Overview

The Sustainable House Evaluator is a progressive web application that guides homeowners and home
improvement professionals through a structured, multi-phase assessment of a house's sustainability
profile. Inspired by the WCAG-EM structured evaluation methodology, the tool collects house
characteristics, owner capacity (budget, time, skills, and ambition), and then walks users through
a room-by-room and system-by-system sustainability review. Each item is evaluated using sliders or
checklist inputs, contributing to a cumulative weighted sustainability score. The app surfaces
prioritised recommendations tailored to the user's capacity and ambition. All data is stored
locally in the browser with no account or server required. Users can export a `.yaml` file to
resume their assessment in any browser at any time, and a `.html` file as a human-readable
printable report. The tool is designed for long-term, repeated revisiting as improvements are made
over months and years.

---

## Goals

- Give homeowners and professionals a clear, structured picture of a house's current sustainability
  status across energy, water, and materials dimensions.
- Help users prioritise improvements based on what is realistic given their budget, time, skill
  level, and ambition.
- Support long-term improvement journeys by allowing assessments to be saved, loaded, and updated
  over time.
- Operate fully offline after first load, with no dependency on external servers or accounts.

---

## Target Users

| User Type | Description |
|---|---|
| **Homeowner** | No technical background; assessing their own home for improvement planning |
| **Professional** | Home energy auditor or contractor conducting an assessment on behalf of a client |

Both user types access the same tool. Professionals are offered optional fields (e.g., assessor
name/company) that appear in the exported report.

---

## User Scenarios & Testing

### Scenario 1 — First-time homeowner self-assessment

A homeowner opens the app for the first time. They create a new house profile, enter the house
details (approximate size, year built, construction type), and fill in their owner capacity
(modest budget, weekends available, DIY-capable, medium ambition). They walk through the
guided assessment category by category, rating their current insulation, windows, furnace, and
water systems. At the end, they see a sustainability score of 42/100 with a prioritised list of
five recommended upgrades filtered to their budget and skills. They export a `.yaml` file and a
`.html` report, and bookmark the app.

**Acceptance**: House created, capacity set, all categories assessed, score displayed, both export
formats download successfully.

---

### Scenario 2 — Returning user updating a previous assessment

Six months later, the same homeowner has replaced their furnace. They re-open the app, load their
`.yaml` file, navigate to the Heating & Cooling category, update the furnace item to "upgraded",
and see their score rise. They export an updated `.html` report showing the improvement
over the original assessment.

**Acceptance**: YAML imports correctly, prior answers are restored, score recalculates after edit,
updated report exports with new date.

---

### Scenario 3 — Professional auditor assessing a client's home

A contractor opens the app on a tablet. They enter their name and company in the optional assessor
fields, create a house profile for the client, and complete the full assessment walkthrough.
They export a `.html` report and share it with the client, and save the `.yaml` for their records.

**Acceptance**: Assessor fields appear in exported report, all upgrade categories present and
accessible on tablet, HTML report is print-friendly.

---

### Scenario 4 — Offline use with no internet connection

A user opens the app in airplane mode after having visited it previously. All features work
without any network request.

**Acceptance**: App loads and functions fully offline after first load; no features degrade
without connectivity.

---

### Scenario 5 — Multi-year longitudinal tracking

A homeowner opens the app annually. Each year they load the previous `.yaml`, complete a fresh
assessment pass, and export a new `.html` report. The report shows the current assessment date
and prior snapshots side-by-side.

**Acceptance**: YAML supports multiple timestamped assessment snapshots; report shows history if
present.

---

## Upgrade Categories

The assessment is organised into six top-level categories:

| # | Category | Example Items |
|---|---|---|
| 1 | **Building Envelope** | Attic insulation, wall insulation, basement/crawlspace insulation, windows (single/double/triple), exterior doors, air sealing, roofing material |
| 2 | **Heating & Cooling** | Furnace/boiler, heat pump (air-source / ground-source), air conditioning, mechanical ventilation/HRV, programmable or smart thermostat |
| 3 | **Hot Water** | Tank water heater, tankless water heater, heat pump water heater, solar thermal collector |
| 4 | **Renewable Energy & Transportation** | Solar photovoltaic panels, battery storage, EV charger, small wind |
| 5 | **Water Efficiency** | Low-flow fixtures (taps, showers, toilets), rainwater harvesting, greywater reuse, native/drought-tolerant landscaping, smart irrigation |
| 6 | **Lighting & Appliances** | LED lighting, efficient appliances (fridge, washer, dishwasher, dryer), smart power strips, embodied carbon awareness |

---

## House Profile Fields

Collected at session start before the assessment begins:

| Field | Purpose |
|---|---|
| House nickname | Human-readable label for saved files |
| Year built | Proxy for likely construction quality and original standards |
| Approximate floor area | Scales expected insulation/HVAC needs |
| Number of storeys | Affects envelope heat-loss surface area |
| Construction type | Wood frame, masonry, manufactured/mobile, other |
| Climate zone (general) | Cold, temperate, hot-dry, hot-humid, mixed — self-reported |
| Number of occupants | Affects water and energy consumption baselines |

---

## Owner Capacity Fields

Collected once per session; influences recommendation filtering and priority scoring:

| Field | Options |
|---|---|
| Budget range | Limited (< $1 k), Moderate ($1 k–$10 k), Substantial ($10 k–$50 k), Major investment (> $50 k) |
| Time availability | < 1 weekend/month, 1–2 weekends/month, Extended time, Hiring out |
| Skill level | Complete novice, Comfortable with basic DIY, Experienced DIYer, Trade-skilled |
| Sustainability ambition | Light touch, Meaningful improvements, Significant retrofit, Deep green (near net-zero) |

---

## Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| FR-001 | Users can create a new house profile by entering nickname, year built, floor area, storeys, construction type, climate zone, and occupant count | Proposed |
| FR-002 | Users can enter owner capacity (budget range, time availability, skill level, ambition level) as part of the house profile setup | Proposed |
| FR-003 | The app guides users through all six upgrade categories in sequence; users can also jump directly to any category | Proposed |
| FR-004 | Each upgrade item can be rated using a slider (current state: 0 = none/poor → 5 = excellent/done) and marked as Not Applicable | Proposed |
| FR-005 | Each upgrade item displays contextual guidance text explaining what the upgrade is and why it matters, in plain language | Proposed |
| FR-006 | Each upgrade item carries a predefined weighted impact score; the app computes a cumulative sustainability score (0–100) across all non-N/A items | Proposed |
| FR-007 | The app displays a prioritised list of recommended next upgrades, filtered to items feasible within the user's stated budget, time, and skill level | Proposed |
| FR-008 | Recommendations are sorted by the user's stated ambition level (quick wins first for low-ambition; high-impact systemic upgrades first for high-ambition) | Proposed |
| FR-009 | Users can add free-text notes to any individual upgrade item | Proposed |
| FR-010 | Users can export the full assessment as a `.yaml` file (machine-readable, re-importable) | Proposed |
| FR-011 | Users can export the full assessment as a `.html` file (human-readable, print-friendly report) | Proposed |
| FR-012 | Users can import a previously exported `.yaml` file to restore a saved assessment session in any browser | Proposed |
| FR-013 | The YAML format supports multiple timestamped assessment snapshots for the same house, enabling longitudinal tracking | Proposed |
| FR-014 | The HTML report displays assessment date, house profile summary, owner capacity, overall score, per-category scores, item-level ratings with notes, and prioritised recommendations | Proposed |
| FR-015 | The HTML report includes optional assessor name and company fields visible in the report output | Proposed |
| FR-016 | The app auto-saves the active session to browser localStorage/IndexedDB so progress is not lost on page refresh or accidental close | Proposed |
| FR-017 | Users can manage multiple saved house profiles within the local store (create, rename, delete, switch) | Proposed |
| FR-018 | The app functions fully after first load without any network connection (offline-first, installable PWA) | Proposed |
| FR-019 | Assessment progress is shown visually with a progress indicator per category and an overall completion percentage | Proposed |
| FR-020 | Users can reset an assessment for a given house profile and start the walkthrough fresh | Proposed |

---

## Non-Functional Requirements

| ID | Requirement | Threshold | Status |
|---|---|---|---|
| NFR-001 | Offline availability | All features available after first page load with no network; app installable as a PWA | Proposed |
| NFR-002 | Data privacy | No data leaves the user's device; no analytics, telemetry, or external requests after first load | Proposed |
| NFR-003 | Performance — initial load | App is interactive within 5 seconds on a mid-range device on a 4G connection | Proposed |
| NFR-004 | Performance — interactions | Slider changes, score recalculation, and screen transitions complete within 300 ms | Proposed |
| NFR-005 | Accessibility | Meets WCAG 2.1 Level AA; all interactive controls are keyboard-accessible; colour contrast meets minimum ratios | Proposed |
| NFR-006 | Responsive design | Fully functional on screen widths 320 px–2 560 px; usable on tablet in a field setting | Proposed |
| NFR-007 | Browser compatibility | Works on current versions of Chrome, Firefox, Safari, and Edge | Proposed |
| NFR-008 | YAML portability | Exported `.yaml` files can be imported by any conforming instance of the app regardless of device or browser origin | Proposed |
| NFR-009 | HTML report print quality | HTML report renders cleanly when printed or saved as PDF; no truncated content, readable font sizes | Proposed |
| NFR-010 | Internationalisation readiness | All user-visible strings are in a single replaceable resource file to allow future translation without code changes | Proposed |

---

## Constraints

| ID | Constraint | Status |
|---|---|---|
| C-001 | No server-side storage, database, or backend API; the app is entirely client-side | Proposed |
| C-002 | No user account, login, or registration flow | Proposed |
| C-003 | The app must not reference region-specific building codes, standards bodies, or regulatory thresholds; guidance is generic and internationally applicable | Proposed |
| C-004 | Single-user per session; no multi-user collaboration or shared sessions in v1 | Proposed |
| C-005 | The YAML schema version is embedded in every exported file; breaking schema changes require a documented migration path | Proposed |

---

## Key Entities

| Entity | Key Attributes |
|---|---|
| **HouseProfile** | id, nickname, year_built, floor_area_sqm, storeys, construction_type, climate_zone, occupant_count, created_at |
| **OwnerCapacity** | house_profile_id, budget_range, time_availability, skill_level, ambition_level |
| **Assessment** | id, house_profile_id, created_at, overall_score, assessor_name (optional), assessor_company (optional) |
| **CategoryResult** | assessment_id, category_name, category_score, completion_pct |
| **ItemResult** | assessment_id, category_name, item_key, slider_value (0–5), not_applicable (bool), notes (text) |
| **AssessmentSnapshot** | Serialised Assessment + all CategoryResults + all ItemResults at a point in time; multiple snapshots per house stored in the YAML |

---

## Success Criteria

| # | Criterion |
|---|---|
| SC-1 | A first-time user completes a full house assessment (profile + all six categories) within 20 minutes without needing external help |
| SC-2 | Users can export a `.yaml` file and successfully re-import it in a different browser, restoring their full assessment with no data loss |
| SC-3 | The app loads and all features work correctly with no active internet connection after at least one prior visit |
| SC-4 | The HTML report is readable and complete when printed to paper or PDF on a standard A4 / Letter page |
| SC-5 | Recommendations shown to a user include only items within their stated budget and skill range; no inaccessible items surface as top priorities |
| SC-6 | After updating one or more upgrade items, the overall score updates immediately without requiring a page reload |
| SC-7 | Multiple timestamped assessment snapshots for the same house are preserved in the YAML and visible in the report when history exists |

---

## Assumptions

| # | Assumption |
|---|---|
| A-1 | Default item weights are defined at build time based on general sustainability principles; they are not user-adjustable in v1 |
| A-2 | Climate zone is self-reported by the user; the app does not perform geographic lookup or validation |
| A-3 | "Budget" reflects the user's total available budget for home improvement, not a per-item budget |
| A-4 | The HTML report is generated entirely client-side with no print service or external PDF dependency |
| A-5 | The YAML schema version is embedded in every exported file to support future migration tooling |
| A-6 | Guidance text for each upgrade item is authored in English in v1; translations are deferred to a future version |
| A-7 | The app supports browser "Install to home screen" (PWA) as the primary installation path on mobile |

---

## Out of Scope (v1)

- User accounts, cloud backup, or cross-device sync
- Region-specific building codes, rebate programmes, or regulatory lookups
- Cost estimation or contractor referral features
- Multi-user or collaborative assessments
- Native iOS / Android app (PWA covers mobile via browser)
- AI-generated upgrade recommendations
- Integration with smart home sensors or utility data APIs
