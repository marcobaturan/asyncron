# BRIEFING.md — Asyncron Chrome Extension

## Project
Asyncron is a Chrome Extension (Manifest V3) that allows users to package a
video recording together with associated files (documents, images, audio, links,
code) into a proprietary `.async` bundle. The bundle is shared via any web-based
chat. Recipients with the extension installed see a compound SVG metaicon instead
of a generic file attachment. Clicking parts of the metaicon downloads and opens
the corresponding files using the system's default applications.

## Purpose
Async video communication for distributed teams working across time zones and
rotating shifts. Replaces synchronous video calls with structured async bundles
that are intuitive to consume via point-and-click.

## Framework paths
- Rules: ~/Projects/AI_team/my-company-configuration/AG_Structure/.antigravity/rules.md
- STYLE.md: ~/Projects/AI_team/my-company-configuration/STYLE.md
- HITL: ~/Projects/AI_team/my-company-configuration/HITL.md
- CLAUDE.md: ~/Projects/AI_team/my-company-configuration/CC_Structure/CLAUDE.md
- Session continuity skill: ~/Projects/AI_team/my-company-configuration/AG_Structure/.agent/skills/session-continuity/SKILL.md

---

## Hardware constraints (rule 93)
- CPU: AMD Ryzen 7 series 4000 — 8 cores
- RAM: 16 GB (shared iGPU)
- OS: Debian 12 / Chrome browser
- Extension runs in browser — no local compute budget concerns for MVP

---

## Stack

| Layer | Technology | Rationale |
|---|---|---|
| Extension platform | Chrome Extension Manifest V3 | Required for Chrome Web Store |
| UI framework | Vanilla JS + SVG | No framework needed — minimal UI |
| Bundle format | `.async` = tar archive (no compression) | Open format, cross-platform, no proprietary dependency |
| Tar implementation | `tar.js` (pure JS) or `js-tar` | Browser-compatible, no native binary |
| Screen recording | `chrome.tabCapture` + `MediaRecorder API` | Native Chrome APIs |
| Camera recording | `getUserMedia` + `MediaRecorder API` | Standard Web API |
| Metaicon rendering | Inline SVG (injected into DOM) | Scalable, no external assets |
| File type detection | MIME type + file extension map | Simple lookup table |
| System file opening | `chrome.downloads` API | Opens with system default app |
| Manifest version | V3 | Required — V2 is deprecated |

---

## SPEC 1 — `.async` bundle format

The `.async` file is a standard tar archive (uncompressed) with a fixed internal structure.

### Internal structure
```
bundle.async (tar)
├── manifest.json        ← metadata (version, creator, timestamp, file list)
├── video/
│   └── recording.webm   ← the main video (always present)
├── documents/           ← optional
│   └── [files...]
├── images/              ← optional
│   └── [files...]
├── audio/               ← optional
│   └── [files...]
├── links/               ← optional
│   └── links.json       ← array of {label, url}
└── code/                ← optional
    └── [files...]
```

### manifest.json structure
```json
{
  "version": "1.0",
  "created_at": "ISO8601 timestamp",
  "creator": "optional display name",
  "title": "optional bundle title",
  "files": [
    {
      "category": "video|document|image|audio|link|code",
      "filename": "recording.webm",
      "mime_type": "video/webm",
      "size_bytes": 1234567
    }
  ]
}
```

### Validation rules
- [ ] bundle must always contain exactly one video file
- [ ] manifest.json must always be present and valid JSON
- [ ] categories must be one of: video, document, image, audio, link, code
- [ ] file paths inside tar must not contain `..` (path traversal prevention)

---

## SPEC 2 — Metaicon (SVG compound icon)

The metaicon is injected into the DOM of any web chat page when the extension
detects a `.async` file attachment. It replaces the generic file attachment preview.

### Visual structure
```
┌─────────────────────────┐
│                         │
│    [TV screen area]     │  ← clickable → downloads + opens video
│    rounded corners      │
│                         │
└─────────────────────────┘
│  [subicons row]         │  ← one icon per category present (not per file count)
│  📜  📷  🔗  ♪  📷  <>  │
└─────────────────────────┘
```

### Subicon mapping (SVG, not emoji)
| Category | SVG icon | Appears when |
|---|---|---|
| document | scroll/parchment | ≥1 document file |
| image | polaroid frame | ≥1 image file |
| link | chain link | ≥1 link in links.json |
| audio | musical note | ≥1 audio file |
| video (secondary) | film camera | only if >1 video (rare) |
| code | angle brackets `</>` | ≥1 code file |

### Behaviour on click
- Click TV screen area → download video file → browser opens with system default player
- Click any subicon → download all files in that category → system opens each with default app
- Hover on icon → tooltip showing category name and file count

### SVG design constraints (4E principle — rule 94)
- All icons are simple geometric SVG paths — no external image assets
- Monochrome with accent color on hover (#4A9EFF — accessible blue)
- TV screen: rounded rectangle, aspect ratio 16:9 area inside frame
- Total icon dimensions: 120×100px viewBox
- Dark mode compatible (uses currentColor where possible)

---

## SPEC 3 — Extension structure (Manifest V3)

```
asyncron/
├── manifest.json
├── background/
│   └── service_worker.js    ← handles bundle creation, file assembly
├── content_scripts/
│   └── chat_injector.js     ← detects .async attachments, injects metaicon
├── popup/
│   ├── popup.html           ← recorder UI
│   ├── popup.js
│   └── popup.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── lib/
│   ├── tar.js               ← tar bundle creation/extraction
│   └── svg_icons.js         ← all SVG paths as JS constants
└── _locales/
    └── en/
        └── messages.json
```

### manifest.json key fields
```json
{
  "manifest_version": 3,
  "name": "Asyncron",
  "version": "0.1.0",
  "description": "Async video bundles for distributed teams",
  "permissions": [
    "tabCapture",
    "downloads",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/service_worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content_scripts/chat_injector.js"]
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": "icons/icon48.png"
  }
}
```

---

## SPEC 4 — Recorder UI (popup)

### Layout
```
┌──────────────────────────────┐
│  ASYNCRON                    │
├──────────────────────────────┤
│  [● REC]  [■ STOP]           │  ← recording controls
│  Source: [Screen ▼]          │  ← dropdown: Screen / Camera / Both
├──────────────────────────────┤
│  Attachments:                │
│  [+ Add files]               │
│  📄 report.pdf        [×]    │
│  🎵 briefing.mp3      [×]    │
├──────────────────────────────┤
│  [  CREATE BUNDLE  ]         │  ← disabled until recording exists
└──────────────────────────────┘
```

### Behaviour
- REC button starts recording (screen, camera, or both via PiP)
- STOP button stops recording and saves webm to memory
- Add files opens file picker — files added to attachment list
- CREATE BUNDLE assembles tar archive → downloads as `asyncron_[timestamp].async`
- Bundle creation is disabled if no video recorded

---

## SPEC 5 — Chat injector (content script)

### Detection logic
```javascript
// Scan DOM for links or elements containing .async
// Supported chat platforms (MVP): any page with <a href="*.async"> or
// file attachment elements containing .async filename
```

### Injection logic
1. Find `.async` attachment elements in page DOM
2. Fetch the `.async` file (or read from download)
3. Parse tar → read manifest.json
4. Generate SVG metaicon from manifest categories
5. Replace or wrap the original attachment element with metaicon
6. Attach click handlers per category

### Supported chat platforms (MVP — detect by hostname)
- Slack (app.slack.com)
- Google Chat (chat.google.com)
- Telegram Web WebK (web.telegram.org/k/) — note: different DOM from WebZ
- Telegram Web WebZ (web.telegram.org/a/) — note: different DOM from WebK
- Generic fallback: any `<a>` tag with `.async` extension

Note — WhatsApp Web and Microsoft Teams deferred to v2:
- WhatsApp Web: heavy DOM mutation + end-to-end encryption complicates injection
- Teams: file attachments served from SharePoint domain, CORS issues likely

---

## SPEC 6 — QA requirements

- Unit test: tar bundle created with correct internal structure
- Unit test: manifest.json parsed correctly from bundle
- Unit test: metaicon SVG generated for each category combination
- Unit test: file type → category mapping correct for 20 common MIME types
- Integration test: record screen → create bundle → bundle contains valid video
- Integration test: inject metaicon into mock DOM element
- Manual test: end-to-end on Slack Web and WhatsApp Web

---

## SPEC 7 — Icons

### Extension icon
Simple geometric icon: async symbol (⟳) inside a screen shape. SVG exported to PNG at 16, 48, 128px.

### Metaicon SVG (embedded in svg_icons.js)
All subicons are pure SVG paths defined as JS string constants.
No external image dependencies. No emoji. No Unicode symbols.

---

## Out of scope (MVP)
- End-to-end encryption of bundle contents
- Bundle password protection
- Video compression or transcoding
- Mobile Chrome extension (desktop Chrome only for MVP)
- Chrome Web Store submission
- Backend server or user accounts

---

## 4E evaluation (rule 94)
| Criterion | Assessment |
|---|---|
| Economic | Zero backend cost — pure client-side extension |
| Efficient | tar (no compression) keeps CPU usage minimal |
| Effective | Single click to consume any content type |
| Ecological | No server infrastructure, no data transfer beyond the file itself |
