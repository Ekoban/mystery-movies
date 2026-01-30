# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A romantic riddle game where the player discovers letters of "TALLINN" through film/game-based enigmas. Pure HTML5/CSS3/vanilla JS — no frameworks, no build step.

Hosted on Firebase Hosting. Repo: `Ekoban/mystery-movies`.

## Commands

```bash
# Local dev
npx serve .

# Deploy
npx firebase-tools deploy --project mystery-movies-dianette

# Reset game state (browser console)
localStorage.removeItem('caseFile')
```

## Architecture

**Flat file structure** — single CSS file, single JS file, static HTML pages.

### Flow

`index.html` → 7 gate pages → `convergence.html` → `reveal-w3x9q7f2.html`

### game.js

All game logic lives here, driven by `data-page` and `data-gate` attributes on `<body>`:

- **GATES array**: riddle text, answers, key letter positions — the source of truth for all enigma data
- **State management**: `localStorage` key `caseFile` stores progression as JSON (`entry`, `completed[]`, `letters[]`, `finalUnlocked`, `finished`)
- **Progression enforcement**: each page checks `caseFile` and redirects to the last valid page if the player tries to skip ahead
- **Page initializers**: `initEntry()`, `initGate(hash)`, `initConvergence()` — detected and dispatched on `DOMContentLoaded`
- **Input system**: `createInputs()` builds input boxes from answer strings, spaces become visual separators (`.word-spacer`), not input boxes. `wireInputs()` handles auto-advance, backspace, paste, arrow keys
- **Animations**: shake (wrong answer), flicker (correct answer), fade overlay (page transitions), typewriter (riddle text, first visit only via `sessionStorage`)

### styles.css

Dark investigation aesthetic for game pages. The reveal page (`data-page="destination"`) has its own inline styles — `styles.css` only provides a minimal override to disable the grain/CRT effects.

### Gate pages

All 7 gate HTML files are identical except for the `data-gate` attribute. The hash in the filename must match. Game.js populates the riddle, creates inputs, and sets the file indicator dynamically.

### Reveal page (reveal-w3x9q7f2.html)

Self-contained page with inline styles (Playfair Display + Inter), photo grids from `img/`, and autoplay background music (`img/gustave.mp3`). Uses `data-page="destination"` for the JS progression check.

## Key Design Decisions

- **Gate URL hashes are intentionally random** — don't use sequential names
- **Reveal page URL is obfuscated** — don't rename to anything guessable
- **Answers are in plaintext in game.js** — acceptable for this use case
- **keyIndex** is 0-based among input boxes only (spaces excluded)
- **Typewriter plays once per session** (`sessionStorage`), game progress persists across sessions (`localStorage`)
- **Word spacers are minimal** (6px/4px mobile) to avoid revealing word boundaries
