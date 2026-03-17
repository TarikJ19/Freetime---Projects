# Freetime Projects

Portfolio-style project collection focused on three browser projects that are being built step by step.

## Current projects

- **Project 1: Advanced Calculator**
  - Goal: Build a calculator with both standard and advanced operations.
  - Current stage: In Progress (functional build complete, now polishing and extending controls).

- **Project 2: Advanced Calendar**
  - Goal: Build a structured calendar with richer date/event views.
  - Current stage: In Progress (month/week/day views, category filter, browser-saved events, and basic event editing are live).

- **Project 3: Tetris Game**
  - Goal: Build a browser Tetris with clean controls, scoring, and line-clear logic.
  - Current stage: In Progress (playable phase with spawn, movement, rotation, soft/hard drop, game-over overlay, and restart flow).

## Project status badges

These badges are now visible on the homepage and each project page.

| Project | Badge |
| --- | --- |
| Project 1: Advanced Calculator | In Progress |
| Project 2: Advanced Calendar | In Progress |
| Project 3: Tetris Game | In Progress |

## Repository structure

- `index.html` - Homepage with project cards
- `project1.html` - Advanced Calculator page
- `project2.html` - Advanced Calendar page
- `project3.html` - Tetris Game page
- `calculator.js` - Dedicated JavaScript logic for Project 1 (calculator)
- `calendar.js` - Dedicated JavaScript logic for Project 2 (calendar)
- `tetris-config.js` - Shared Tetris constants, speed rules, and piece templates
- `tetris-engine.js` - Pure Tetris game logic (board, movement, collision, scoring)
- `tetris-render.js` - DOM rendering for board, next piece, and stats
- `tetris-controls.js` - Keyboard/button input wiring for Tetris
- `tetris.js` - Tetris page entry point that connects modules together
- `script.js` - Legacy pointer file kept for history/transition
- `script.py` - Python reference calculator engine for reviewing the same expression logic outside the browser
- `server.js` - Simple local Node.js server for running the site on localhost
- `smoke-test.js` - Combined smoke tests for calculator and calendar logic
- `tetris-smoke.js` - Smoke tests for Tetris engine start-phase logic
- `package.json` - Optional npm scripts for local server and smoke tests
- `styles.css` - Shared design system used by all pages
- `assets/previews/calculator-preview.svg` - Visual preview image for implemented calculator milestone

## Run locally

This is primarily a static HTML/CSS/JS project, so no required dependencies are needed for browser use.

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

### Option 4

Run the Node.js server from this folder:

```bash
node server.js
```

Then open `http://localhost:3000`.

### Option 5

Run core smoke tests directly:

```bash
node smoke-test.js
node tetris-smoke.js
```

### Optional npm scripts

If you prefer npm commands:

```bash
npm test
npm start
```

`npm test` runs both smoke suites (`smoke-test.js` + `tetris-smoke.js`) and `npm start` runs `node server.js`.

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

## Project 2 mini milestone plan

- [x] M1: Month navigation (Previous/Next) and current month title
- [x] M2: Date selection and clear visual markers (today + selected date)
- [x] M3: Event list with add/remove actions for selected day
- [x] M4: Event persistence using array state + localStorage
- [x] M5: Event metadata (time/category) and edit flow
- [x] M6: Week view / day view and filter controls

## Visual preview (implemented milestone)

![Calculator preview](assets/previews/calculator-preview.svg)

## Milestone tracker

- [x] Expand the calculator with more scientific actions or history controls before moving to the calendar
  - Implemented: history pinning, clear history, and single-entry remove control.
- [x] Add a small "status" badge per project (Planning / In Progress / Completed)
  - Implemented on homepage cards and project headers.
- [x] Add screenshots or short GIF previews when features are implemented
  - Implemented: calculator preview image added.
- [x] Add a short changelog section to track milestones
  - Implemented below.

## Changelog

- 2026-03-17
  - Calculator functionality extended and simplified for beginner-friendly flow.
  - History controls now include pin, clear, load, and single-entry remove.
  - JavaScript codebase split by project (`calculator.js`, `calendar.js`, `tetris.js`) to reduce monolithic complexity.
  - Calendar now supports Previous/Next month navigation, day selection, and today marker.
  - Calendar now supports month/week/day mode and category filter controls.
  - Calendar events now support add/remove, time/category metadata, and edit flow.
  - Calendar events persist in localStorage.
  - Project 2 status moved from Planning to In Progress.
  - Status badges added across homepage and project pages.
  - Visual preview image added for calculator milestone.
  - Node.js local server included (`server.js`) for localhost workflow.
  - Tetris moved from planning shell to playable start phase (spawn, move, rotate, soft drop, pause, reset).
  - Tetris code split into beginner-friendly modules (`tetris-config.js`, `tetris-engine.js`, `tetris-render.js`, `tetris-controls.js`, `tetris.js`).
  - Added Tetris smoke tests (`tetris-smoke.js`) and included them in `npm test`.
  - Tetris phase 2 added: hard drop action, game-over overlay, restart button flow, and smoother level-speed curve.
  - Added hold piece system (single-use per turn) and ghost-piece landing preview.
  - Added small soft-drop score bonus and updated control panel hints.
  - Added ghost toggle control (button + G key) and clearer hold readiness hint in panel.
  - Added lightweight line-clear flash feedback and a browser-audio stub for clear events.
  - Added sound on/off toggle (button + M key) that mutes the audio stub.
  - Added row-specific cell flash on line clear with delayed render for visible before/after feedback.

## Contact

- LinkedIn: https://www.linkedin.com/in/tarik-j-51a341249/

---

_Last updated: 2026-03-17_
