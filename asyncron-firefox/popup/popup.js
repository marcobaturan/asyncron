// popup.js
import { createBundleFromPayload } from '../lib/bundle.js';
import { TarReader } from '../lib/tar.js';
import { createMetaIconElement } from '../lib/svg_icons.js';

let selectedFiles = [];
let isRecording = false;

// Real recording variables
let mediaRecorder = null;
let recordedChunks = [];
let recordedVideoBlob = null;
let activeStream = null;
let animationFrameId = null;

const urlParams = new URLSearchParams(window.location.search);

document.addEventListener('DOMContentLoaded', () => {
  const btnRec = document.getElementById('btn-rec');
  const btnStop = document.getElementById('btn-stop');
  const btnAddFiles = document.getElementById('btn-add-files');
  const fileInput = document.getElementById('file-input');
  const btnAddLink = document.getElementById('btn-add-link');
  const linkInputContainer = document.getElementById('link-input-container');
  const linkInput = document.getElementById('link-input');
  const btnSaveLink = document.getElementById('btn-save-link');
  const attachmentList = document.getElementById('attachment-list');
  const btnCreate = document.getElementById('btn-create');
  const statusIndicator = document.getElementById('recording-status');
  const sourceSelect = document.getElementById('source');

  // Tabs
  const tabCreate = document.getElementById('tab-create');
  const tabView = document.getElementById('tab-view');
  const panelCreate = document.getElementById('panel-create');
  const panelView = document.getElementById('panel-view');

  if (urlParams.get('view') === 'true') {
    switchTab('view');
    loadRecentBundles();
  }

  tabCreate.addEventListener('click', () => switchTab('create'));
  tabView.addEventListener('click', () => switchTab('view'));

  function switchTab(tab) {
    if (tab === 'create') {
      tabCreate.classList.add('active');
      tabView.classList.remove('active');
      panelCreate.style.display = 'block';
      panelView.style.display = 'none';
    } else {
      tabView.classList.add('active');
      tabCreate.classList.remove('active');
      panelView.style.display = 'block';
      panelCreate.style.display = 'none';
      loadRecentBundles();
    }
  }

  // Add Files
  btnAddFiles.addEventListener('click', () => {
    fileInput.click();
  });

  // Add Link
  btnAddLink.addEventListener('click', () => {
    linkInputContainer.style.display = 'flex';
    linkInput.focus();
  });

  btnSaveLink.addEventListener('click', () => {
    const url = linkInput.value.trim();
    if (url) {
      const data = new TextEncoder().encode(url);
      const linkName = `link_${Date.now()}.txt`;
      const linkFileObj = {
        name: linkName,
        isVirtual: true,
        arrayBuffer: async () => data.buffer
      };
      selectedFiles.push(linkFileObj);
      renderAttachments();
      updateCreateButton();
      linkInput.value = '';
      linkInputContainer.style.display = 'none';
    }
  });

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
      if (!selectedFiles.find(sf => sf.name === f.name)) {
        selectedFiles.push(f);
      }
    });
    renderAttachments();
    updateCreateButton();
    fileInput.value = '';
  });

  function renderAttachments() {
    attachmentList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = 'attachment-item';
      
      const span = document.createElement('span');
      span.className = 'filename';
      span.textContent = file.name;
      span.title = file.name;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', () => {
        selectedFiles.splice(index, 1);
        renderAttachments();
        updateCreateButton();
      });

      li.appendChild(span);
      li.appendChild(removeBtn);
      attachmentList.appendChild(li);
    });
  }

  // Recording Implementation
  btnRec.addEventListener('click', async () => {
    try {
      recordedChunks = [];
      const source = sourceSelect.value;
      
      if (source === 'camera') {
        activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        startMediaRecorder(activeStream);
      } else if (source === 'screen') {
        try {
          activeStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          startMediaRecorder(activeStream);
        } catch (e) {
          console.error('Display capture failed:', e);
        }
      } else if (source === 'both') {
        try {
          const tabStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          
          let cameraStream = null;
          try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } catch (e) {
            console.warn('Camera capture failed:', e);
            alert('Camera access denied or unavailable. Falling back to screen only.');
          }
          
          if (!cameraStream) {
            activeStream = tabStream;
            startMediaRecorder(activeStream);
            return;
          }

          compositeStreams(tabStream, cameraStream);
        } catch (e) {
          console.error('Display capture failed:', e);
        }
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Failed to start recording: ' + err.message + '\n\nIf camera access was denied, please click the camera icon in the URL bar to allow it.');
    }
  });

  function compositeStreams(tabStream, cameraStream) {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    const tabVideo = document.createElement('video');
    tabVideo.srcObject = tabStream;
    tabVideo.muted = true;
    tabVideo.play();

    const camVideo = document.createElement('video');
    camVideo.srcObject = cameraStream;
    camVideo.muted = true;
    camVideo.play();

    function draw() {
      if (!isRecording) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw screen (main)
      if (tabVideo.readyState >= 2) {
        ctx.drawImage(tabVideo, 0, 0, canvas.width, canvas.height);
      }
      
      // Draw camera (PiP - bottom right)
      if (camVideo.readyState >= 2) {
        const pipWidth = 320;
        const pipHeight = 240;
        const margin = 20;
        ctx.drawImage(camVideo, canvas.width - pipWidth - margin, canvas.height - pipHeight - margin, pipWidth, pipHeight);
        
        // Draw border around PiP
        ctx.strokeStyle = '#4A9EFF';
        ctx.lineWidth = 4;
        ctx.strokeRect(canvas.width - pipWidth - margin, canvas.height - pipHeight - margin, pipWidth, pipHeight);
      }
      
      animationFrameId = requestAnimationFrame(draw);
    }

    // Wait for videos to be ready before starting draw loop
    Promise.all([
      new Promise(r => tabVideo.onloadedmetadata = r),
      new Promise(r => camVideo.onloadedmetadata = r)
    ]).then(() => {
      const mixedStream = canvas.captureStream(30);
      
      // Mix audio tracks
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      
      if (tabStream.getAudioTracks().length > 0) {
        const tabAudioSource = audioCtx.createMediaStreamSource(tabStream);
        tabAudioSource.connect(dest);
      }
      if (cameraStream.getAudioTracks().length > 0) {
        const camAudioSource = audioCtx.createMediaStreamSource(cameraStream);
        camAudioSource.connect(dest);
      }
      
      dest.stream.getAudioTracks().forEach(track => mixedStream.addTrack(track));
      
      // Keep references to stop them later
      activeStream = new MediaStream([...tabStream.getTracks(), ...cameraStream.getTracks()]);
      
      // Set state and start
      isRecording = true;
      draw();
      startMediaRecorder(mixedStream);
    });
  }

  function startMediaRecorder(stream) {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      recordedVideoBlob = new Blob(recordedChunks, { type: 'video/webm' });
      updateCreateButton();
    };
    mediaRecorder.start();

    isRecording = true;
    btnRec.disabled = true;
    btnStop.disabled = false;
    statusIndicator.textContent = 'Recording...';
    statusIndicator.style.color = 'var(--danger-color)';
  }

  btnStop.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
    }

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    isRecording = false;
    btnRec.disabled = false;
    btnStop.disabled = true;
    statusIndicator.textContent = 'Recording stopped';
    statusIndicator.style.color = 'var(--text-muted)';
  });

  function updateCreateButton() {
    if (recordedVideoBlob && !isRecording) {
      btnCreate.disabled = false;
    } else {
      btnCreate.disabled = true;
    }
  }

  // Create Bundle
  btnCreate.addEventListener('click', async () => {
    btnCreate.disabled = true;
    btnCreate.textContent = 'CREATING...';

    try {
      const filesPayload = [];

      if (recordedVideoBlob) {
        const arrayBuffer = await recordedVideoBlob.arrayBuffer();
        filesPayload.push({
          name: 'video/recording.webm',
          content: arrayBuffer
        });
      }

      for (const file of selectedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        filesPayload.push({
          name: file.name,
          content: arrayBuffer
        });
      }

      // Build bundle locally!
      const blob = createBundleFromPayload(filesPayload);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = 'asyncron_' + timestamp + '.async';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      // Reset UI
      selectedFiles = [];
      recordedVideoBlob = null;
      recordedChunks = [];
      renderAttachments();
      updateCreateButton();
      statusIndicator.textContent = 'Ready';
      btnCreate.textContent = 'CREATE BUNDLE';

    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error: ' + error.message);
      resetCreateButton();
    }
  });

  function resetCreateButton() {
    btnCreate.disabled = false;
    btnCreate.textContent = 'CREATE BUNDLE';
  }

  // --- VIEWER TAB LOGIC ---
  const dropZone = document.getElementById('drop-zone');
  const bundleInput = document.getElementById('bundle-input');
  const btnBrowseBundle = document.getElementById('btn-browse-bundle');
  const viewerDisplay = document.getElementById('viewer-display');
  const metaiconContainer = document.getElementById('metaicon-container');
  const bundleNameLabel = document.getElementById('bundle-name');
  const recentBundlesList = document.getElementById('recent-bundles-list');

  async function loadRecentBundles() {
    if (!browser.downloads) return;
    
    // In Firefox, filenameRegex is not supported, we use query and filter manually
    const items = await browser.downloads.search({
      query: '.async',
      limit: 20,
      orderBy: ['-startTime']
    });

    const asyncFiles = items.filter(item => item.filename.endsWith('.async')).slice(0, 5);

    if (asyncFiles && asyncFiles.length > 0) {
      recentBundlesList.innerHTML = '';
      asyncFiles.forEach(item => {
        const div = document.createElement('div');
        div.className = 'recent-item';
        div.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: #2a2a2a; border-radius: 4px; margin-bottom: 4px; border: 1px solid #333;';
        
        const info = document.createElement('div');
        info.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 10px;';
        
        const name = document.createElement('span');
        name.style.cssText = 'font-size: 11px; color: #eee;';
        name.textContent = item.filename.split(/[\\/]/).pop();
        
        const path = document.createElement('div');
        path.style.cssText = 'font-size: 9px; color: #666;';
        path.textContent = item.filename;

        info.appendChild(name);
        info.appendChild(path);

        const btnLocate = document.createElement('button');
        btnLocate.className = 'btn btn-small';
        btnLocate.style.fontSize = '9px';
        btnLocate.textContent = 'LOCATE';
        btnLocate.title = 'Open folder to drag & drop';
        btnLocate.onclick = () => {
          if (browser.downloads.show) {
            browser.downloads.show(item.id);
          } else {
            console.log("browser.downloads.show not available");
          }
        };

        div.appendChild(info);
        div.appendChild(btnLocate);
        recentBundlesList.appendChild(div);
      });
    }
  }

  const btnFullViewer = document.getElementById('btn-full-viewer');
  if (btnFullViewer) {
    btnFullViewer.addEventListener('click', () => {
      browser.tabs.create({ url: browser.runtime.getURL('viewer.html') });
    });
  }

  btnBrowseBundle.addEventListener('click', () => bundleInput.click());

  bundleInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleBundleFile(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleBundleFile(e.dataTransfer.files[0]);
    }
  });

  async function handleBundleFile(file) {
    if (!file.name.endsWith('.async') && !file.name.endsWith('.tar')) {
      alert("Please select a valid .async or .tar file.");
      return;
    }
    bundleNameLabel.textContent = file.name;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsedFiles = TarReader.read(arrayBuffer);
      
      const manifestFile = parsedFiles.find(f => f.name === 'manifest.json');
      if (!manifestFile) throw new Error("Invalid .async bundle: missing manifest.json");
      
      const manifest = JSON.parse(new TextDecoder("utf-8").decode(manifestFile.data));
      
      const extractedFiles = manifest.files.map(meta => {
        const f = parsedFiles.find(pf => pf.name === meta.filename);
        return { meta, data: f ? f.data : null };
      });

      // Render Metaicon
      metaiconContainer.innerHTML = '';
      const metaIcon = createMetaIconElement(manifest.files, (category, isMainVideo) => {
        const filesToDownload = extractedFiles.filter(f => {
          if (isMainVideo) return f.meta.category === 'video' && f.meta.filename.includes('recording.webm');
          return f.meta.category === category;
        });

        filesToDownload.forEach(fileObj => {
          if (!fileObj.data) return;
          
          if (fileObj.meta.category === 'link') {
            let urlStr = new TextDecoder("utf-8").decode(fileObj.data);
            if (!urlStr.match(/^https?:\/\//)) {
              urlStr = 'https://' + urlStr;
            }
            window.open(urlStr, '_blank');
            return;
          }

          const blob = new Blob([fileObj.data], { type: fileObj.meta.mime_type });
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = fileObj.meta.filename.split('/').pop();
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(objectUrl);
          }, 100);
        });
      });
      metaiconContainer.appendChild(metaIcon);
      
      document.querySelector('.viewer-upload').style.display = 'none';
      viewerDisplay.style.display = 'block';

    } catch (err) {
      alert("Failed to parse bundle: " + err.message);
    }
  }

});
