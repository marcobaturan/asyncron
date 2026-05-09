// lib/bundle.js

import { TarBuilder, TarReader } from './tar.js';

export function generateBundleManifest(files) {
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

export function getCategoryFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  
  if ((filename.startsWith('link') && ext === 'txt') || ext === 'url') return 'link';
  
  if (['pdf', 'txt', 'md', 'doc', 'docx', 'odt', 'rtf', 'csv', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'document';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) return 'audio';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv', 'flv'].includes(ext)) return 'video';
  
  const codeExtensions = [
    // Web
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'graphql',
    // Python
    'py', 'pyw', 'pyx', 'ipynb',
    // C/C++/C#
    'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'hxx', 'cs',
    // Java/Kotlin/Scala
    'java', 'kt', 'kts', 'scala', 'sc', 'groovy',
    // PHP/Ruby
    'php', 'phtml', 'rb', 'erb', 'gemspec',
    // Go/Rust/Swift
    'go', 'rs', 'swift',
    // Shell/Scripts
    'sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1', 'awk', 'sed',
    // Functional/Other
    'hs', 'lhs', 'ml', 'mli', 'fs', 'fsx', 'clj', 'cljs', 'edn', 'ex', 'exs', 'erl', 'hrl',
    // Misc
    'lua', 'sql', 'dart', 'r', 'm', 'mm', 'f', 'f90', 'v', 'vhd', 'sv', 'zig', 'nim', 'elm', 'pl', 'pm',
    // Configs
    'yml', 'yaml', 'toml', 'ini', 'env', 'conf', 'cfg', 'dockerfile', 'makefile'
  ];
  if (codeExtensions.includes(ext)) return 'code';
  
  return 'document'; // Fallback
}

export function getMimeTypeFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml',
    'mp3': 'audio/mpeg',
    'js': 'text/javascript',
    'json': 'application/json',
    'html': 'text/html',
    'css': 'text/css',
    'webm': 'video/webm',
    'mp4': 'video/mp4'
  };
  return map[ext] || 'application/octet-stream';
}

export function createBundleFromPayload(filesPayload) {
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

  return tar.build(); // Returns a Blob in the browser
}

export function extractBundle(arrayBuffer) {
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
