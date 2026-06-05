# Sustainable House Evaluator

A progressive web application for assessing and improving the sustainability of your home.
Inspired by the WCAG-EM structured evaluation methodology, it guides homeowners and
professionals through a room-by-room sustainability review with scored categories, capacity-
filtered recommendations, and exportable reports.

**Live app**: https://mike.gifford.github.io/susty-house/ *(after GitHub Pages deployment)*

---

## Features

- 🏡 Guided assessment across 6 categories (building envelope, HVAC, hot water, renewables,
  water efficiency, lighting & appliances)
- 📊 Weighted sustainability score (0–100) with category breakdowns
- 🎯 Recommendations filtered by your budget, skills, time, and ambition
- 💾 Saves locally in your browser — no account needed
- 📤 Export as `.yaml` (re-importable) or `.html` (printable report)
- 📥 Import a `.yaml` file to resume an assessment in any browser
- 📅 Longitudinal tracking — revisit and compare assessments over time
- ✈️ Works fully offline after first visit (PWA)

---

## Run Locally

No npm, no build tools needed. Just serve the files:

```bash
# Python
python -m http.server 8080

# Node
npx serve .

# VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

Then open http://localhost:8080 in your browser.

**Note**: The app is served at `/susty-house/` on GitHub Pages. When running locally on
`localhost:8080/`, some PWA install features require HTTPS. All core features work over
plain HTTP.

---

## Project Structure

```
susty-house/
├── index.html          # SPA shell
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline/cache)
├── src/
│   ├── css/            # Stylesheets
│   ├── js/             # Application modules
│   │   └── views/      # View renderers (home, profile, assessment, results)
│   ├── data/           # items.json (upgrade catalogue), strings.json (i18n)
│   └── icons/          # App icons
└── kitty-specs/        # Specification and planning documents
```

---

## Contributing

See `kitty-specs/sustainable-house-evaluator-01KTA9RM/` for the full specification,
implementation plan, work packages, and data model.

To implement a work package:

```bash
spec-kitty agent action implement WP01 --agent <your-name> --mission sustainable-house-evaluator-01KTA9RM
```
