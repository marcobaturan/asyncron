import { TarBuilder, TarReader } from '../lib/tar.js';

/**
 * Service worker handles the heavy lifting of bundle creation and extraction
 * to keep the popup and content scripts lightweight and responsive.
 */

// Generate the manifest.json for the .async bundle
function generateBundleManifest(files) {
  const manifest = {
    version: "1.0",
    created_at: new Date().toISOString(),
    creator: "Asyncron User", // Can be customized later
    title: "Asyncron Bundle",
    files: files.map(f => ({
      category: f.category,
      filename: f.filename,
      mime_type: f.mime_type,
      size_bytes: f.data.length
    }))
  };
  return JSON.stringify(manifest, null, 2);
}

// Assemble the .async bundle
export function createBundle(videoData, additionalFiles = []) {
  const tar = new TarBuilder();
  
  // All files to include
  const allFiles = [
    {
      category: 'video',
      filename: 'video/recording.webm',
      mime_type: 'video/webm',
      data: videoData
    },
    ...additionalFiles.map(f => {
      // additional files should be categorized by path: e.g. documents/file.pdf
      const path = `${f.category}s/${f.filename}`; // Pluralizing category name as per SPEC 1
      return {
        category: f.category,
        filename: path,
        mime_type: f.mime_type,
        data: f.data
      };
    })
  ];

  // Generate and add manifest
  const manifestJson = generateBundleManifest(allFiles);
  tar.addFile('manifest.json', manifestJson);

  // Add all files
  allFiles.forEach(f => {
    tar.addFile(f.filename, f.data);
  });

  return tar.build();
}

// Extract the .async bundle and parse its manifest
export function extractBundle(arrayBuffer) {
  const files = TarReader.read(arrayBuffer);
  
  // Find manifest.json
  const manifestFile = files.find(f => f.name === 'manifest.json');
  if (!manifestFile) {
    throw new Error("Invalid .async bundle: missing manifest.json");
  }

  const decoder = new TextDecoder("utf-8");
  const manifestStr = decoder.decode(manifestFile.data);
  
  let manifest;
  try {
    manifest = JSON.parse(manifestStr);
  } catch (e) {
    throw new Error("Invalid .async bundle: manifest.json is not valid JSON");
  }

  // Map manifest entries to extracted data
  const extractedFiles = manifest.files.map(meta => {
    const file = files.find(f => f.name === meta.filename);
    if (!file) {
      console.warn(`File described in manifest not found in tar: ${meta.filename}`);
    }
    return {
      meta,
      data: file ? file.data : null
    };
  });

  return { manifest, files: extractedFiles };
}

// Helper to map file extensions to categories
function getCategoryFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf', 'txt', 'md', 'doc', 'docx'].includes(ext)) return 'document';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
  if (['js', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext)) return 'code';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  return 'document'; // default fallback
}

function getMimeTypeFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'mp3': 'audio/mpeg',
    'js': 'text/javascript',
    'json': 'application/json',
    'webm': 'video/webm',
    'mp4': 'video/mp4'
  };
  return map[ext] || 'application/octet-stream';
}

// Assemble the .async bundle
export function createBundleFromPayload(filesPayload) {
  const tar = new TarBuilder();
  
  const allFiles = filesPayload.map(f => {
    // If it's already got a slash (e.g. video/recording.webm), use it as is
    if (f.name.includes('/')) {
      return {
        category: 'video', // we know it's video from popup
        filename: f.name,
        mime_type: 'video/webm',
        data: new Uint8Array(f.content)
      };
    }

    const category = getCategoryFromExtension(f.name);
    const path = `${category}s/${f.name}`; // e.g. documents/file.pdf
    return {
      category: category,
      filename: path,
      mime_type: getMimeTypeFromExtension(f.name),
      data: new Uint8Array(f.content)
    };
  });

  const manifestJson = generateBundleManifest(allFiles);
  tar.addFile('manifest.json', manifestJson);

  allFiles.forEach(f => {
    tar.addFile(f.filename, f.data);
  });

  return tar.build();
}

// Open UI in a persistent window when extension icon is clicked
if (typeof chrome !== 'undefined' && chrome.action) {
  chrome.action.onClicked.addListener((tab) => {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup/popup.html"),
      type: "popup",
      width: 380,
      height: 650
    });
  });
}

// Auto-open viewer when an .async bundle is downloaded
if (typeof chrome !== 'undefined' && chrome.downloads) {
  chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state && delta.state.current === 'complete') {
      chrome.downloads.search({ id: delta.id }, (results) => {
        if (results && results[0] && results[0].filename.endsWith('.async')) {
          chrome.windows.create({
            url: chrome.runtime.getURL("popup/popup.html?view=true"),
            type: "popup",
            width: 380,
            height: 650
          });
        }
      });
    }
  });
}

// Chrome Extension message listener
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'create_bundle') {
      try {
        const bundleUint8 = createBundleFromPayload(request.files);
        sendResponse({ success: true, data: Array.from(bundleUint8) });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    } else if (request.action === 'extract_bundle') {
      try {
        const result = extractBundle(new Uint8Array(request.arrayBuffer));
        sendResponse({ success: true, result });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    }
    return true; // Keep message channel open for async response
  });
}
