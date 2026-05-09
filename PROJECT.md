# PROJECT.md — Asyncron Firefox Port + Repo Restructure

## Status
Not started

## Working directory
~/Projects/portfolio/asyncron/

## Methodology
SDD. Read BRIEFING.md before any action.
Write SESSION_LOG.md after every phase.
Use session-continuity skill for model handoff.

---

## Task list

### Phase 0 — Read and verify (mandatory)
- [x] Read BRIEFING.md completely
- [x] Read existing Chrome code: ls asyncron-chrome/ (or current root)
- [x] Identify exact file names in current Chrome extension
- [x] Report current directory structure to human
- [x] HITL checkpoint: confirm restructure plan before moving any file

### Phase 1 — Repository restructure (SPEC 1)
- [x] Create asyncron-chrome/ subfolder
- [x] Move all existing Chrome extension files into asyncron-chrome/
- [ ] Verify Chrome extension still loads after move (human tests in Chrome)
- [x] Create asyncron-firefox/ subfolder with empty structure
- [x] HITL checkpoint before moving files

### Phase 2 — Firefox manifest (SPEC 2)
- [x] Create asyncron-firefox/manifest.json (MV2)
- [x] Verify manifest is valid JSON

### Phase 3 — Install polyfill (SPEC 5)
- [x] Download browser-polyfill.min.js to asyncron-firefox/lib/
- [x] Copy tar.js from asyncron-chrome/lib/ to asyncron-firefox/lib/
- [x] Copy svg_icons.js from asyncron-chrome/lib/ to asyncron-firefox/lib/
- [x] Copy icons/ from asyncron-chrome/ to asyncron-firefox/

### Phase 4 — Firefox background script (SPEC 3)
- [x] Create asyncron-firefox/background/background.js
- [x] Port service_worker.js with MV2 adaptations
- [x] Replace chrome.* with browser.* OR verify polyfill covers all calls
- [x] Remove service worker specific code (install event, importScripts)

### Phase 5 — Firefox popup (SPEC 4)
- [x] Copy popup.css to asyncron-firefox/popup/ (identical)
- [x] Copy popup.html to asyncron-firefox/popup/ — adjust script load order
- [x] Add browser-polyfill.js as first script in popup.html
- [x] Copy popup.js — replace chrome.tabCapture with getDisplayMedia if present
- [x] Verify ES module imports work in Firefox popup context

### Phase 6 — README (SPEC 6)
- [x] Create/update asyncron/README.md
- [x] Add Chrome manual installation instructions
- [x] Add Firefox manual installation instructions
- [x] Add Packager usage guide
- [x] Add Unpackager usage guide
- [x] Add .async format description

### Phase 7 — QA (SPEC 7)
- [ ] Load asyncron-chrome/ in Chrome — verify still works
- [ ] Load asyncron-firefox/ in Firefox about:debugging
- [ ] Test packager in Firefox
- [ ] Test cross-browser bundle compatibility (Chrome → Firefox, Firefox → Chrome)
- [ ] Write final SESSION_LOG.md

### Phase 8 — Git
- [ ] git add .
- [ ] git commit -m "feat: add Firefox port, restructure into asyncron-chrome/ and asyncron-firefox/"
- [ ] HITL checkpoint before push

---

## Known risks
- Firefox MV2 background scripts do not support ES modules — if service_worker.js
  uses top-level import/export, background.js needs the code inlined or concatenated
- getDisplayMedia in Firefox popup requires user gesture — same as Chrome
- Temporary add-on in Firefox is lost on restart — document clearly in README

---

## HITL checkpoints
- Phase 0: confirm file list before moving anything
- Phase 1: confirm Chrome still works after restructure
- Phase 8: before git push

---

## Startup prompt for Antigravity / OpenCode

```
Read BRIEFING.md and PROJECT.md from this project directory (~/Projects/portfolio/asyncron/).
Read global rules from: ~/Projects/AI_team/my-company-configuration/AG_Structure/.antigravity/rules.md
Read STYLE.md from: ~/Projects/AI_team/my-company-configuration/STYLE.md
Read HITL protocol from: ~/Projects/AI_team/my-company-configuration/HITL.md
Read CLAUDE.md from: ~/Projects/AI_team/my-company-configuration/CC_Structure/CLAUDE.md
Read session continuity skill from: ~/Projects/AI_team/my-company-configuration/AG_Structure/.agent/skills/session-continuity/SKILL.md

Assigned role: Frontend Developer + Browser Extension Specialist.

CRITICAL — READ FIRST:
The Chrome extension already works. Do NOT modify its logic.
The task is: (1) restructure the repo, (2) port to Firefox.
Any change to Chrome code must be approved via HITL checkpoint first.

PHASE 0 — Start here:
1. Read BRIEFING.md and PROJECT.md completely.
2. Run: ls ~/Projects/portfolio/asyncron/
3. Run: cat ~/Projects/portfolio/asyncron/asyncron-chrome/manifest.json (or current manifest.json location)
4. Report the exact current file structure to human.
5. Wait for explicit YES before moving any file.

Write SESSION_LOG.md after every phase using the session-continuity skill format.
When tokens are running low: write compact SESSION_LOG immediately, then stop.
```
