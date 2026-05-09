# PROJECT.md — Asyncron Chrome Extension

## Status
Not started

## Repository
To be created: ~/Projects/portfolio/asyncron/

## Methodology
SDD — Spec-Driven Development.
Read BRIEFING.md specs before implementing any feature.
Use session-continuity skill — write SESSION_LOG.md after every phase.

---

## Task list

### Phase 0 — Setup (mandatory before any code)
- [ ] Read BRIEFING.md completely
- [ ] Read all skills referenced in startup prompt
- [ ] Create ~/Projects/portfolio/asyncron/ directory
- [ ] Initialise git repository
- [ ] Create extension directory structure as defined in SPEC 3
- [ ] Verify tar.js library available (npm or CDN)
- [ ] Write SESSION_LOG.md
- [ ] HITL checkpoint: confirm structure before Phase 1

### Phase 1 — Bundle format (SPEC 1)
- [ ] Implement tar bundle creation in service_worker.js
- [ ] Implement manifest.json generation
- [ ] Implement bundle extraction (read manifest from .async file)
- [ ] Unit tests: bundle creation, manifest parsing, path traversal prevention
- [ ] Write SESSION_LOG.md

### Phase 2 — SVG metaicon (SPEC 2 + SPEC 7)
- [ ] Define all SVG paths as constants in svg_icons.js
- [ ] Implement metaicon composer (categories → SVG)
- [ ] Implement hover tooltips
- [ ] Implement click handlers per category
- [ ] Unit tests: SVG generation for all category combinations
- [ ] Write SESSION_LOG.md

### Phase 3 — Recorder UI (SPEC 4)
- [ ] Build popup.html layout
- [ ] Implement screen capture (chrome.tabCapture)
- [ ] Implement camera capture (getUserMedia)
- [ ] Implement file attachment list
- [ ] Implement CREATE BUNDLE button → calls service_worker
- [ ] Write SESSION_LOG.md
- [ ] HITL checkpoint before testing recording

### Phase 4 — Chat injector (SPEC 5)
- [ ] Implement .async attachment detection in DOM
- [ ] Implement metaicon injection
- [ ] Implement file download on click (chrome.downloads)
- [ ] Test on Slack Web
- [ ] Test on WhatsApp Web
- [ ] Test on Google Chat
- [ ] Write SESSION_LOG.md

### Phase 5 — QA (SPEC 6)
- [ ] Run full unit test suite
- [ ] Run integration tests
- [ ] Manual end-to-end test: record → bundle → share → receive → open
- [ ] Write SESSION_LOG.md

### Phase 6 — Polish
- [ ] Generate extension icons (16, 48, 128px PNG from SVG)
- [ ] Add _locales/en/messages.json
- [ ] Review manifest.json permissions (minimum required)
- [ ] Write SESSION_LOG.md

---

## Known constraints
- Manifest V3: no persistent background pages — use service worker
- chrome.tabCapture requires activeTab permission and user gesture
- Content scripts cannot use chrome.downloads directly — must message service worker
- .async files fetched by content script may hit CORS — handle gracefully
- WhatsApp Web uses heavy DOM mutation — MutationObserver required for injection

---

## HITL checkpoints
- Phase 0 complete: confirm directory structure
- Before any chrome.tabCapture call during development
- Before any DOM injection in Phase 4
- Before git push to public repository

---

## Startup prompt for Antigravity / OpenCode

```
Read BRIEFING.md and PROJECT.md from this project.
Read global rules from: ~/Projects/AI_team/my-company-configuration/AG_Structure/.antigravity/rules.md
Read STYLE.md from: ~/Projects/AI_team/my-company-configuration/STYLE.md
Read HITL protocol from: ~/Projects/AI_team/my-company-configuration/HITL.md
Read CLAUDE.md from: ~/Projects/AI_team/my-company-configuration/CC_Structure/CLAUDE.md
Read session continuity skill from: ~/Projects/AI_team/my-company-configuration/AG_Structure/.agent/skills/session-continuity/SKILL.md

Assigned role: Frontend Developer + Chrome Extension Specialist.

CRITICAL — SDD PROTOCOL:
Before implementing any spec, confirm your interpretation to the human.
Write SESSION_LOG.md after every phase completes or fails.
When tokens are running low, trigger: write compact log — then stop.

PHASE 0 — Start here:
1. Read BRIEFING.md and PROJECT.md completely.
2. Create directory ~/Projects/portfolio/asyncron/ with structure from SPEC 3.
3. Verify tar.js is available: search npm for 'tar browser compatible'.
4. Report findings and directory structure to human.
5. Wait for explicit YES before Phase 1.
```
