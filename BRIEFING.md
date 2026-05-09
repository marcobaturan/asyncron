# BRIEFING.md — Asyncron Firefox Port + Repo Restructure

## Project
Port the working Asyncron Chrome Extension (PoC) to Firefox.
Restructure the repository so both extensions coexist in separate subfolders.
Both are popup-only (no chat injector in this version).
No marketplace publishing — both are installed manually (Load Unpacked / Load Temporary Add-on).

## Framework paths
- Rules: ~/Projects/AI_team/my-company-configuration/AG_Structure/.antigravity/rules.md
- STYLE.md: ~/Projects/AI_team/my-company-configuration/STYLE.md
- HITL: ~/Projects/AI_team/my-company-configuration/HITL.md
- CLAUDE.md: ~/Projects/AI_team/my-company-configuration/CC_Structure/CLAUDE.md
- Session continuity: ~/Projects/AI_team/my-company-configuration/AG_Structure/.agent/skills/session-continuity/SKILL.md

## Working directory
~/Projects/portfolio/asyncron/

---

## Context — What exists

The Chrome extension is a working PoC with:
- Popup with two modes: **Packager** and **Unpackager**
- Packager: record video, attach files, generate `.async` (uncompressed tar bundle)
- Unpackager: open `.async` file, inspect contents, selectively open files with system apps
- Bundle format: tar archive with `manifest.json` + categorised subfolders
- Metaicon: compound SVG (TV screen + category subicons) — implemented in `lib/svg_icons.js`
- Background: `service_worker.js` (Chrome MV3)
- Shared libs: `lib/tar.js`, `lib/svg_icons.js`
- Tests: `tests/test_phase1.js`, `tests/test_phase2.js` — all passing

---

## SPEC 1 — Repository restructure

Current structure (to be reorganised):
```
asyncron/
├── background/
├── content_scripts/
├── lib/
├── popup/
├── icons/
├── tests/
├── manifest.json
└── package.json
```

Target structure:
```
asyncron/
├── asyncron-chrome/          ← existing Chrome code moved here
│   ├── background/
│   │   └── service_worker.js
│   ├── lib/
│   │   ├── tar.js
│   │   └── svg_icons.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── icons/
│   ├── tests/
│   │   ├── test_phase1.js
│   │   └── test_phase2.js
│   ├── manifest.json         ← MV3
│   └── package.json
│
├── asyncron-firefox/         ← new Firefox port
│   ├── background/
│   │   └── background.js     ← MV2 background script (not service worker)
│   ├── lib/
│   │   ├── tar.js            ← copy from chrome (identical)
│   │   ├── svg_icons.js      ← copy from chrome (identical)
│   │   └── browser-polyfill.js ← webextension-polyfill
│   ├── popup/
│   │   ├── popup.html        ← copy, adjust script imports
│   │   ├── popup.js          ← adapted (browser.* namespace)
│   │   └── popup.css         ← copy (identical)
│   ├── icons/                ← copy (identical)
│   ├── tests/                ← copy (identical — logic unchanged)
│   └── manifest.json         ← MV2
│
├── BRIEFING.md
├── PROJECT.md
├── SESSION_LOG.md
└── README.md                 ← updated with both installation guides
```

### Migration rules
- Move, do not copy, the Chrome files into `asyncron-chrome/`
- All shared logic (tar.js, svg_icons.js) is duplicated into both folders — no symlinks
- Rationale: each extension must be self-contained for manual loading

---

## SPEC 2 — Firefox manifest (MV2)

File: `asyncron-firefox/manifest.json`

```json
{
  "manifest_version": 2,
  "name": "Asyncron",
  "version": "0.1.0",
  "description": "Async video bundles for distributed teams",
  "permissions": [
    "tabs",
    "downloads",
    "storage",
    "<all_urls>"
  ],
  "background": {
    "scripts": ["lib/browser-polyfill.js", "background/background.js"],
    "persistent": false
  },
  "browser_action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Note: Firefox MV2 uses `browser_action` not `action`. No `tabCapture` permission
needed if recording uses `getUserMedia` only (screen share via `getDisplayMedia`).

---

## SPEC 3 — Firefox background script

File: `asyncron-firefox/background/background.js`

This replaces the Chrome service worker. Firefox MV2 background scripts are
persistent (event-based with `persistent: false`).

Port `service_worker.js` with these changes:

| Chrome (service_worker.js) | Firefox (background.js) |
|---|---|
| `chrome.downloads.download()` | `browser.downloads.download()` |
| `chrome.runtime.onMessage` | `browser.runtime.onMessage` |
| `chrome.storage.local` | `browser.storage.local` |
| `self.addEventListener('install')` | Remove — not applicable in MV2 |
| `importScripts()` | Use `<script>` tags in popup instead |

If the polyfill (`browser-polyfill.js`) is loaded first, most `chrome.*` calls
work as-is. Verify each API call individually.

---

## SPEC 4 — Firefox popup adaptation

File: `asyncron-firefox/popup/popup.js`

Changes required:
1. Replace `chrome.runtime.sendMessage` with `browser.runtime.sendMessage`
   OR load polyfill in popup.html before popup.js — then no changes needed.
2. Screen recording: `chrome.tabCapture` is NOT available in Firefox popup context.
   Use `navigator.mediaDevices.getDisplayMedia()` instead — works in both browsers.
3. Camera: `navigator.mediaDevices.getUserMedia()` — identical in both browsers.

### popup.html script load order (Firefox)
```html
<script src="../lib/browser-polyfill.js"></script>
<script src="../lib/tar.js" type="module"></script>
<script src="../lib/svg_icons.js" type="module"></script>
<script src="popup.js" type="module"></script>
```

Note: Firefox MV2 does not support ES modules in background scripts but DOES
support them in popup context. Verify during testing.

---

## SPEC 5 — webextension-polyfill installation

```bash
cd asyncron-firefox/lib/
# Download the polyfill directly (no npm needed for a self-contained extension)
curl -L https://unpkg.com/webextension-polyfill@0.12.0/dist/browser-polyfill.min.js \
     -o browser-polyfill.js
```

Verify version compatibility: polyfill 0.12.0 supports Firefox 55+.

---

## SPEC 6 — README update

File: `asyncron/README.md`

Must contain these sections:

### Structure
Brief description of the two subfolders.

### Chrome — Manual installation
```
1. Open Chrome → chrome://extensions/
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the asyncron-chrome/ folder
5. Extension appears in toolbar
```

### Firefox — Manual installation
```
1. Open Firefox → about:debugging
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Navigate to asyncron-firefox/ folder
5. Select manifest.json
6. Extension appears in toolbar
Note: temporary add-on is removed on Firefox restart.
For permanent install without signing: use Firefox Developer Edition
and set xpinstall.signatures.required = false in about:config
```

### How to use — Packager mode
Brief step-by-step: open popup → record → attach files → create bundle → send .async file.

### How to use — Unpackager mode
Brief step-by-step: open popup → switch to unpackager → open .async → click categories to open files.

### .async bundle format
Brief description of internal tar structure and manifest.json.

---

## SPEC 7 — QA

After restructure and Firefox port:

- [ ] Chrome extension still loads correctly from `asyncron-chrome/`
- [ ] Firefox extension loads from `asyncron-firefox/` via about:debugging
- [ ] Packager: create `.async` bundle in Firefox
- [ ] Unpackager: open `.async` bundle created by Chrome in Firefox (cross-browser compatibility)
- [ ] Unpackager: open `.async` bundle created by Firefox in Chrome (cross-browser compatibility)
- [ ] README installation instructions verified on both browsers

---

## Technical differences summary

| Feature | Chrome (MV3) | Firefox (MV2) |
|---|---|---|
| Background | Service Worker | Background Script |
| API namespace | `chrome.*` | `browser.*` (polyfill bridges both) |
| Screen capture | `chrome.tabCapture` or `getDisplayMedia` | `getDisplayMedia` only |
| ES modules in popup | ✅ | ✅ |
| ES modules in background | ✅ (SW) | ❌ (use polyfill + concatenated scripts) |
| Marketplace cost | $5 one-time | Free |
| Temporary load | Load Unpacked | Load Temporary Add-on (lost on restart) |
| Permanent unsigned install | ✅ Developer mode | Firefox Developer Edition only |

---

## 4E evaluation (rule 94)
| Criterion | Assessment |
|---|---|
| Economic | Zero cost — Firefox Add-ons is free |
| Efficient | Shared logic duplicated, not symlinked — self-contained, no build step |
| Effective | Same UX on both browsers from identical popup UI |
| Ecological | No server, no build pipeline, minimal dependencies |
