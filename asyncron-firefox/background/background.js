/**
 * background.js for Firefox (MV2)
 * Ported from service_worker.js (Chrome MV3)
 * 
 * Note: Firefox MV2 background scripts do not support ES modules.
 * This file contains inlined logic from TarBuilder and TarReader.
 */

// --- INLINED LIB: tar.js ---

class TarBuilder {
  constructor() {
    this.buffers = [];
    this.written = 0;
  }

  _padNumber(num, length) {
    let str = num.toString(8);
    while (str.length < length - 1) str = "0" + str;
    return str + " \0";
  }

  _writeString(buffer, offset, str, length) {
    for (let i = 0; i < length; i++) {
      buffer[offset + i] = i < str.length ? str.charCodeAt(i) & 0xff : 0;
    }
  }

  addFile(name, content) {
    if (typeof content === "string") {
      content = new TextEncoder().encode(content);
    }
    
    if (name.includes("..")) {
      throw new Error("Path traversal is not allowed: " + name);
    }

    const header = new Uint8Array(512);
    
    this._writeString(header, 0, name, 100);
    this._writeString(header, 100, "0000777", 8);
    this._writeString(header, 108, "0000000", 8);
    this._writeString(header, 116, "0000000", 8);
    
    let sizeStr = content.length.toString(8);
    while (sizeStr.length < 11) sizeStr = "0" + sizeStr;
    this._writeString(header, 124, sizeStr + " ", 12);
    
    const mtime = Math.floor(Date.now() / 1000).toString(8);
    let mtimeStr = mtime;
    while (mtimeStr.length < 11) mtimeStr = "0" + mtimeStr;
    this._writeString(header, 136, mtimeStr + " ", 12);
    
    this._writeString(header, 156, "0", 1);
    this._writeString(header, 257, "ustar  \0", 8);
    
    for (let i = 0; i < 8; i++) {
      header[148 + i] = 32;
    }
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    let checksumStr = checksum.toString(8);
    while (checksumStr.length < 6) checksumStr = "0" + checksumStr;
    this._writeString(header, 148, checksumStr + "\0 ", 8);

    this.buffers.push(header);
    this.buffers.push(content);
    
    const paddingLength = (512 - (content.length % 512)) % 512;
    if (paddingLength > 0) {
      this.buffers.push(new Uint8Array(paddingLength));
    }
  }

  build() {
    this.buffers.push(new Uint8Array(1024));
    if (typeof Blob !== "undefined") {
      return new Blob(this.buffers, { type: "application/x-tar" });
    }
    return this.buffers;
  }
}

class TarReader {
  static read(buffer) {
    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let offset = 0;
    const files = [];
    const decoder = new TextDecoder("utf-8");

    while (offset < data.length - 512) {
      const header = data.subarray(offset, offset + 512);
      let isEmpty = true;
      for (let i = 0; i < 512; i++) {
        if (header[i] !== 0) {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) break;

      let nameEnd = 0;
      while (nameEnd < 100 && header[nameEnd] !== 0) nameEnd++;
      const name = decoder.decode(header.subarray(0, nameEnd));

      let sizeEnd = 124;
      while (sizeEnd < 136 && header[sizeEnd] !== 0 && header[sizeEnd] !== 32) sizeEnd++;
      const sizeStr = decoder.decode(header.subarray(124, sizeEnd)).trim();
      const size = parseInt(sizeStr, 8);

      offset += 512;
      
      if (name.includes("..")) {
        throw new Error("Invalid tar file: path traversal detected -> " + name);
      }

      if (size > 0) {
        const fileData = data.subarray(offset, offset + size);
        files.push({ name, size, data: fileData });
      } else {
        files.push({ name, size, data: new Uint8Array(0) });
      }

      offset += size;
      const padding = (512 - (size % 512)) % 512;
      offset += padding;
    }
    return files;
  }
}

// --- PORTED BACKGROUND LOGIC ---

function generateBundleManifest(files) {
  const manifest = {
    version: "1.0",
    created_at: new Date().toISOString(),
    creator: "Asyncron User",
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

function getCategoryFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf', 'txt', 'md', 'doc', 'docx'].includes(ext)) return 'document';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
  if (['js', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext)) return 'code';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  return 'document';
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

function createBundleFromPayload(filesPayload) {
  const tar = new TarBuilder();
  
  const allFiles = filesPayload.map(f => {
    if (f.name.includes('/')) {
      return {
        category: 'video',
        filename: f.name,
        mime_type: 'video/webm',
        data: new Uint8Array(f.content)
      };
    }

    const category = getCategoryFromExtension(f.name);
    const path = `${category}s/${f.name}`;
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

function extractBundle(arrayBuffer) {
  const files = TarReader.read(arrayBuffer);
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

  const extractedFiles = manifest.files.map(meta => {
    const file = files.find(f => f.name === meta.filename);
    return {
      meta,
      data: file ? file.data : null
    };
  });

  return { manifest, files: extractedFiles };
}

// Open UI in a persistent window when extension icon is clicked
browser.browserAction.onClicked.addListener(() => {
  browser.windows.create({
    url: browser.runtime.getURL("popup/popup.html"),
    type: "popup",
    width: 380,
    height: 650
  });
});

// Firefox/Chrome message listener (using polyfill browser namespace)
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'create_bundle') {
    try {
      const bundleBlob = createBundleFromPayload(request.files);
      // In background scripts, we need to convert Blob to ArrayBuffer/Array for messaging
      bundleBlob.arrayBuffer().then(buffer => {
        sendResponse({ success: true, data: Array.from(new Uint8Array(buffer)) });
      });
      return true; // Keep channel open for async arrayBuffer promise
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
  return true;
});

// Auto-open viewer when an .async bundle is downloaded
browser.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    browser.downloads.search({ id: delta.id }).then((results) => {
      if (results && results[0] && results[0].filename.endsWith('.async')) {
        browser.windows.create({
          url: browser.runtime.getURL("popup/popup.html?view=true"),
          type: "popup",
          width: 380,
          height: 650
        });
      }
    });
  }
});
