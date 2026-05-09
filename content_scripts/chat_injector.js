// chat_injector.js

(async () => {
  console.log("Asyncron chat injector loaded.");

  // Import our SVG icons generator
  const svgIconsUrl = chrome.runtime.getURL('lib/svg_icons.js');
  const { createMetaIconElement } = await import(svgIconsUrl);

  const processedElements = new WeakSet();
  const manifestCache = new Map();

  // Platform specific selectors for attachments
  const PLATFORM_SELECTORS = [
    'a[href$=".async"]', // Generic fallback
    'a[download$=".async"]',
    // Add Slack specific classes if needed, usually they have links with file extension in the name
    // Add WhatsApp Web specific selectors
  ];

  function getSelectorString() {
    return PLATFORM_SELECTORS.join(', ');
  }

  // Scan the DOM for un-processed .async attachments
  async function scanForAttachments() {
    const elements = document.querySelectorAll(getSelectorString());
    
    for (const el of elements) {
      if (processedElements.has(el)) continue;
      processedElements.add(el);
      
      const url = el.href;
      if (!url) continue;

      try {
        await processAttachment(el, url);
      } catch (e) {
        console.error("Asyncron: Failed to process attachment", e);
      }
    }
  }

  async function processAttachment(element, url) {
    let manifest = manifestCache.get(url);
    
    // For the MVP, we just fetch the file to get the manifest.
    // In a real implementation, we would use Range headers or a stream
    // to only download the first few KB containing the manifest.
    if (!manifest) {
      console.log(`Asyncron: Fetching ${url}`);
      // Send message to background to fetch and extract so we don't deal with CORS in some strict CSPs
      // Wait, content scripts bypass CORS if host_permissions are set, but background is safer.
      const response = await fetch(url).catch(() => null);
      if (!response || !response.ok) {
        throw new Error("Failed to fetch bundle");
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Import TarReader dynamically
      const tarUrl = chrome.runtime.getURL('lib/tar.js');
      const { TarReader } = await import(tarUrl);
      
      let parsedFiles;
      try {
        parsedFiles = TarReader.read(arrayBuffer);
      } catch (e) {
        throw new Error("Failed to read tar bundle: " + e.message);
      }
      
      const manifestFile = parsedFiles.find(f => f.name === 'manifest.json');
      if (!manifestFile) {
        throw new Error("Invalid .async bundle: missing manifest.json");
      }
      
      const decoder = new TextDecoder("utf-8");
      const manifestStr = decoder.decode(manifestFile.data);
      
      try {
        manifest = JSON.parse(manifestStr);
      } catch (e) {
        throw new Error("Invalid .async bundle: manifest.json is not valid JSON");
      }
      
      // Map manifest entries to extracted data
      const extractedFiles = manifest.files.map(meta => {
        const file = parsedFiles.find(f => f.name === meta.filename);
        return {
          meta,
          data: file ? file.data : null
        };
      });
      
      // Cache the parsed bundle globally for this URL so we don't re-download on clicks
      manifestCache.set(url, {
        manifest,
        files: extractedFiles
      });
    }

    renderMetaIcon(element, url);
  }

  function renderMetaIcon(element, url) {
    const cached = manifestCache.get(url);
    if (!cached) return;

    // Convert manifest files list to the format expected by SVG generator
    // SVG generator expects {category, filename}
    const svgFilesInput = cached.manifest.files;

    const metaIcon = createMetaIconElement(svgFilesInput, (category, isMainVideo) => {
      handleCategoryClick(url, category, isMainVideo);
    });

    // Replace or wrap the element
    // For MVP, we insert our metaicon before the element and hide the original link
    element.style.display = 'none';
    element.parentNode.insertBefore(metaIcon, element);
  }

  function handleCategoryClick(url, category, isMainVideo) {
    const cached = manifestCache.get(url);
    if (!cached) return;

    const filesToDownload = cached.files.filter(f => {
      if (isMainVideo) {
        return f.meta.category === 'video' && f.meta.filename.includes('recording.webm');
      }
      return f.meta.category === category;
    });

    filesToDownload.forEach(fileObj => {
      if (!fileObj.data) return;
      
      const blob = new Blob([fileObj.data], { type: fileObj.meta.mime_type });
      const objectUrl = URL.createObjectURL(blob);
      
      // Extract just the basename for the downloaded file
      const basename = fileObj.meta.filename.split('/').pop();
      
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = basename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }, 100);
    });
  }

  // Set up MutationObserver to catch dynamically loaded chat messages
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      scanForAttachments();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial scan
  scanForAttachments();

})();
