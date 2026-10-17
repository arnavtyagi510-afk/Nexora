# NEXORA — Step 1 (design system + homepage)

NEXORA is a career-tech platform for students, freshers, and job seekers. This ZIP is the **Step 1** foundation: a design system and a complete homepage.

## Tech stack

Plain **HTML + CSS + JavaScript**. There is no `package.json`, no build step, and no dependencies to install. The original project was a single static `index.html`, so that approach was kept.

## How to run

**Quickest:** unzip, then double-click `index.html` (or open it in any modern browser).

**Optional local server** (any one of these, from this folder):

```bash
python3 -m http.server 8000     # then open http://localhost:8000
# or
npx serve .
```

An internet connection is only needed for the Google Font (Plus Jakarta Sans). Offline, the page falls back to the system font and still works.

## Project structure

```
index.html                 Homepage markup (semantic sections + SVG icon sprite)
assets/
  favicon.svg
  css/
    tokens.css             Design tokens: colour, type scale, spacing, radius, shadows, layout
    base.css               Reset, element defaults, focus style, utilities (.sr-only, .container)
    components.css         Buttons, inputs, chips, badges, cards, segmented control, dialog, toast
    home.css               Homepage layout: header, hero, sections, footer, responsive rules
  js/
    data.js                Demo opportunities (all fictional companies)
    main.js                Mobile menu, demo cards + filter, bookmarks, search placeholder, dialogs
```

## Design system quick reference

- Colours live in `assets/css/tokens.css` (`--color-bg #F7F5EF`, `--color-primary #244B3B`, `--color-sage`, `--color-mint`, `--color-text`, `--color-text-muted`, `--color-border`). Change them there.
- Buttons: `.btn .btn--primary | .btn--secondary | .btn--text` (+ `.btn--lg`, `.btn--block`, `.is-loading`, `disabled`).
- Other components: `.chip`, `.badge`, `.card`, `.segmented`, `.input` / `.select`, `.dialog`, `.toast`, `.soon-tag`.
- Icons: add a `<symbol id="i-name">` to the sprite in `index.html`, then use `<svg class="icon"><use href="#i-name"/></svg>`.

## What works today

- Responsive navigation with a working mobile menu (opens/closes via button, Escape, link click, or outside click).
- Hero search form (keyword, location, type) and popular-search chips.
- Six demo opportunity cards with a Jobs / Internships filter and a bookmark toggle.
- Category cards that fill the search keyword.
- Why NEXORA, How It Works, and footer sections.

## Known limitations (intentional for Step 1)

- **Search is not connected.** Submitting shows a clear status message; nothing is searched.
- **All opportunities are demo data** from fictional companies, clearly labelled. "View Role" opens a dialog explaining this. Nothing can be applied to.
- **Bookmarks** are stored only in the visitor's own browser (`localStorage`) and are for demonstration.
- **Not built yet** (marked "Soon" or shown with a dialog): Sign In, Get Started, Companies, Resources, View All, About, Contact, Privacy, Terms.
- No authentication, database, recruiter tools, or real job API.
- Contact details and legal text are deliberately not included.
- The Google Font loads from the internet; no fonts are bundled.
