import assert from 'assert';
import { TarBuilder, TarReader } from '../lib/tar.js';
import { createBundleFromPayload, extractBundle } from '../background/service_worker.js';

// Polyfill Blob if missing (Node environment)
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts, options) {
      this.parts = parts;
      this.type = options.type;
      this.size = parts.reduce((acc, part) => acc + part.length, 0);
    }
    async arrayBuffer() {
      const buffer = new Uint8Array(this.size);
      let offset = 0;
      for (const part of this.parts) {
        buffer.set(new Uint8Array(part), offset);
        offset += part.byteLength;
      }
      return buffer.buffer;
    }
  };
}

async function runTests() {
  console.log("Running Phase 1 Unit Tests...");

  try {
    // Test 1: Bundle Creation & Path Traversal Prevention
    console.log("Test 1: Tar building and parsing");
    const builder = new TarBuilder();
    builder.addFile("test.txt", "Hello World");
    
    // Path traversal check
    let caughtTraversal = false;
    try {
      builder.addFile("../evil.sh", "echo 'evil'");
    } catch (e) {
      caughtTraversal = true;
    }
    assert.ok(caughtTraversal, "Path traversal should throw an error");

    const blob = builder.build();
    assert.ok(blob, "Blob should be created");
    
    const buffer = await blob.arrayBuffer();
    const extracted = TarReader.read(buffer);
    
    assert.strictEqual(extracted.length, 1, "Should extract exactly 1 file");
    assert.strictEqual(extracted[0].name, "test.txt", "Filename should match");
    const text = new TextDecoder().decode(extracted[0].data);
    assert.strictEqual(text, "Hello World", "File content should match");

    // Test 2: Service Worker Bundle Creation and manifest generation
    console.log("Test 2: createBundleFromPayload and manifest generation");
    
    const filesPayload = [
      {
        name: 'video/recording.webm',
        content: Array.from(new TextEncoder().encode("fake_video_data"))
      },
      {
        name: 'report.pdf',
        content: Array.from(new TextEncoder().encode("fake_pdf_data"))
      }
    ];

    const bundleBlob = createBundleFromPayload(filesPayload);
    const bundleBuffer = await bundleBlob.arrayBuffer();

    // Test 3: Service Worker Bundle Extraction and manifest parsing
    console.log("Test 3: extractBundle and manifest parsing");
    const result = extractBundle(bundleBuffer);
    
    assert.ok(result.manifest, "Manifest should exist");
    assert.strictEqual(result.manifest.version, "1.0", "Manifest version should be 1.0");
    assert.strictEqual(result.manifest.files.length, 2, "Manifest should list 2 files");
    
    const videoFile = result.manifest.files.find(f => f.category === 'video');
    assert.ok(videoFile, "Video file should be in manifest");
    assert.strictEqual(videoFile.filename, "video/recording.webm", "Video filename should match spec");
    
    const docFile = result.manifest.files.find(f => f.category === 'document');
    assert.ok(docFile, "Document should be in manifest");
    assert.strictEqual(docFile.filename, "documents/report.pdf", "Document path should be prefixed by category plural");

    console.log("All Phase 1 tests passed successfully! ✅");
  } catch (error) {
    console.error("Test failed: ❌", error);
    process.exit(1);
  }
}

runTests();
