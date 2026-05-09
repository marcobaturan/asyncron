# Asyncron

![Asyncron Logo](assets/logo.png)

Asyncron is a local-first tool for asynchronous communication. It allows you to record your screen and attach files (code, documents, links) into a single, secure, and private `.async` bundle.

---

## 🚀 Key Features

- **Multimodal Recording:** Capture screen, camera, or both simultaneously.
- **Smart Bundling:** Packages recordings with attachments in an `.async` format (based on TAR).
- **Standalone Viewer:** Play recordings and extract files without needing external servers.
- **Cross-Browser:** Full support for Chrome (MV3) and Firefox (MV2).
- **Total Privacy:** All processing happens locally in your browser.

## 📂 Project Structure

- `asyncron-chrome/`: Extension for Google Chrome (Manifest V3).
- `asyncron-firefox/`: Extension for Mozilla Firefox (Manifest V2).
- `assets/`: Visual assets and branding.
- `scripts/`: Automation and maintenance tools.

---

## 🛠️ Installation Guide (Developer Mode)

### Chrome / Edge / Brave
1.  Navigate to `chrome://extensions/`.
2.  Enable **Developer mode** (top right corner).
3.  Click **Load unpacked**.
4.  Select the `asyncron-chrome/` folder.

### Firefox
1.  Navigate to `about:debugging#/runtime/this-firefox`.
2.  Click **Load Temporary Add-on...**.
3.  Select the `manifest.json` file inside `asyncron-firefox/`.

---

## 📺 Standalone Viewer
Asyncron now includes a full desktop viewer that decouples viewing from the extension interface.

- **Access:** Open it from the **VIEWER** tab in the extension or by opening `viewer.html` directly in any browser.
- **Usage:** Drag and drop any `.async` file onto the drop zone.
- **Features:** Integrated video player, individual file downloads, and automatic link protocol handling.

---

## 🏗️ Technical Architecture

- **.async Format:** Based on the TAR standard for maximum compatibility.
- **Local Cryptography:** Bundles are generated entirely on the client side.
- **Polyfill:** Uses `webextension-polyfill` to ensure interoperability between Chrome and Firefox APIs.

---

## 📄 License
This project is open source and available under the MIT License.
