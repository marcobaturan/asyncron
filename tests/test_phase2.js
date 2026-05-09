import assert from 'assert';
import { generateMetaIconSvg, createMetaIconElement } from '../lib/svg_icons.js';

// Simple DOM mock for testing createMetaIconElement
if (typeof global.document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      return {
        tagName: tag,
        className: '',
        innerHTML: '',
        listeners: {},
        addEventListener(event, handler) {
          this.listeners[event] = handler;
        },
        // Mock click event
        _simulateClick(dataCategory) {
          if (this.listeners['click']) {
            this.listeners['click']({
              target: {
                closest: (selector) => {
                  if (selector === '.asyncron-interactive') {
                    return {
                      getAttribute: (attr) => attr === 'data-category' ? dataCategory : null
                    };
                  }
                  return null;
                }
              },
              preventDefault: () => {},
              stopPropagation: () => {}
            });
          }
        }
      };
    }
  };
}

async function runTests() {
  console.log("Running Phase 2 Unit Tests...");

  try {
    // Test 1: Single video only
    console.log("Test 1: Single video generation");
    const files1 = [{ category: 'video', filename: 'video/recording.webm' }];
    const svg1 = generateMetaIconSvg(files1);
    
    assert.ok(svg1.includes('data-category="video_main"'), "Should contain main video area");
    assert.ok(!svg1.includes('data-category="document"'), "Should not contain document subicon");
    assert.ok(!svg1.includes('data-category="video"'), "Should not contain secondary video subicon");
    assert.ok(svg1.includes('<title>Video (1)</title>'), "Should have video tooltip");

    // Test 2: Video + Document + Image
    console.log("Test 2: Multiple categories");
    const files2 = [
      { category: 'video', filename: 'video/recording.webm' },
      { category: 'document', filename: 'documents/spec.pdf' },
      { category: 'document', filename: 'documents/notes.txt' },
      { category: 'image', filename: 'images/photo.png' }
    ];
    const svg2 = generateMetaIconSvg(files2);
    
    assert.ok(svg2.includes('data-category="document"'), "Should contain document subicon");
    assert.ok(svg2.includes('<title>document (2)</title>'), "Should show 2 documents in tooltip");
    assert.ok(svg2.includes('data-category="image"'), "Should contain image subicon");
    assert.ok(svg2.includes('<title>image (1)</title>'), "Should show 1 image in tooltip");

    // Test 3: Multiple videos
    console.log("Test 3: Multiple videos");
    const files3 = [
      { category: 'video', filename: 'video/recording.webm' },
      { category: 'video', filename: 'video/extra.mp4' }
    ];
    const svg3 = generateMetaIconSvg(files3);
    assert.ok(svg3.includes('data-category="video"'), "Should contain secondary video subicon for multiple videos");
    assert.ok(svg3.includes('<title>video (2)</title>'), "Should show secondary video tooltip");
    assert.ok(svg3.includes('<title>Video (2)</title>'), "Main TV should also show 2 videos");

    // Test 4: All categories
    console.log("Test 4: All categories");
    const filesAll = [
      { category: 'video', filename: 'vid1' },
      { category: 'video', filename: 'vid2' },
      { category: 'document', filename: 'doc' },
      { category: 'image', filename: 'img' },
      { category: 'link', filename: 'lnk' },
      { category: 'audio', filename: 'aud' },
      { category: 'code', filename: 'src' }
    ];
    const svgAll = generateMetaIconSvg(filesAll);
    const expectedCategories = ['document', 'image', 'link', 'audio', 'video', 'code'];
    for (const cat of expectedCategories) {
      assert.ok(svgAll.includes(`data-category="${cat}"`), `Should contain subicon for ${cat}`);
    }

    // Test 5: DOM creation and click handlers
    console.log("Test 5: DOM creation and Event Delegation");
    let clickedCategory = null;
    let isMain = false;
    const element = createMetaIconElement(files2, (cat, main) => {
      clickedCategory = cat;
      isMain = main;
    });

    assert.ok(element.innerHTML.length > 0, "innerHTML should be populated");
    
    // Simulate main video click
    element._simulateClick('video_main');
    assert.strictEqual(clickedCategory, 'video', "Clicking video_main should report 'video'");
    assert.strictEqual(isMain, true, "isMain should be true for video_main");

    // Simulate document click
    element._simulateClick('document');
    assert.strictEqual(clickedCategory, 'document', "Clicking document should report 'document'");
    assert.strictEqual(isMain, false, "isMain should be false for document");

    console.log("All Phase 2 tests passed successfully! ✅");
  } catch (error) {
    console.error("Test failed: ❌", error);
    process.exit(1);
  }
}

runTests();
