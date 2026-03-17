# Freetime Projects

Portfolio-style project collection focused on three browser projects that are being built step by step.

## Current projects

- **Project 1: Advanced Calculator**
  - Goal: Build a calculator with both standard and advanced operations.
  - Current stage: Beginner-friendly working version complete with keypad logic, history pinning, memory actions, and scientific shortcuts.

- **Project 2: Advanced Calendar**
  - Goal: Build a structured calendar with richer date/event views.
  - Current stage: HTML/CSS layout complete, functionality not started.

- **Project 3: Tetris Game**
  - Goal: Build a browser Tetris with clean controls, scoring, and line-clear logic.
  - Current stage: HTML/CSS layout complete, functionality not started.

## Repository structure

- `index.html` - Homepage with project cards
- `project1.html` - Advanced Calculator page
- `project2.html` - Advanced Calendar page
- `project3.html` - Tetris Game page
- `script.js` - Browser interactivity, currently used by the calculator page
- `script.py` - Python reference calculator engine for reviewing the same expression logic outside the browser
- `styles.css` - Shared design system used by all pages

## Run locally

This is currently a static HTML/CSS project, so there are no dependencies to install.

No extra tools are required to run the website itself.

### Option 1

Open `index.html` directly in a browser.

### Option 2

Use VS Code Live Server and open the project from a local URL.

### Option 3

Run a simple local server from this folder:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`.

## Optional tools

- **Node.js** (optional): useful for JavaScript tooling and syntax checks, but not required to open the site.
- **Python** (optional for browser use, useful for this project): used by `script.py` to mirror calculator logic in a second language.

If you install Node and the `node` command is not recognized in VS Code terminal, restart VS Code (or your PC) so PATH refreshes.

## Python logic preview

The calculator logic is also mirrored in `script.py` so the project shows both JavaScript and Python.

```bash
python script.py "2*(3+4)"
python script.py --action sqrt "81"
python script.py --action log "1000"
```

## Suggested next improvements

- Expand the calculator with more scientific actions or history controls before moving to the calendar
- Add a small "status" badge per project (Planning / In Progress / Completed)
- Add screenshots or short GIF previews when features are implemented
- Add a short changelog section to track milestones

## Contact

- LinkedIn: https://www.linkedin.com/in/tarik-j-51a341249/

---

_Last updated: 2026-03-17_
