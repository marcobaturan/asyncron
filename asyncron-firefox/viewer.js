import { TarReader } from './lib/tar.js';
import { createMetaIconElement } from './lib/svg_icons.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const viewerDisplay = document.getElementById('viewer-display');
const mainVideo = document.getElementById('main-video');
const bundleName = document.getElementById('bundle-name');
const bundleDate = document.getElementById('bundle-date');
const attachmentsList = document.getElementById('attachments-list');
const metaiconDisplay = document.getElementById('metaicon-display');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

async function handleFile(file) {
  if (!file.name.endsWith('.async') && !file.name.endsWith('.tar')) {
    alert("Please select a valid .async bundle.");
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const parsedFiles = TarReader.read(arrayBuffer);

    const manifestFile = parsedFiles.find(f => f.name === 'manifest.json');
    if (!manifestFile) throw new Error("Missing manifest.json");

    const manifest = JSON.parse(new TextDecoder().decode(manifestFile.data));
    
    bundleName.textContent = file.name;
    bundleDate.textContent = `Generated: ${new Date(manifest.timestamp).toLocaleString()}`;

    // Find main video
    const videoMeta = manifest.files.find(f => f.category === 'video' && f.filename.includes('recording.webm'));
    if (videoMeta) {
      const videoFile = parsedFiles.find(f => f.name === videoMeta.filename);
      if (videoFile) {
        const blob = new Blob([videoFile.data], { type: 'video/webm' });
        mainVideo.src = URL.createObjectURL(blob);
      }
    }

    // Render Metaicon
    metaiconDisplay.innerHTML = '';
    const metaIcon = createMetaIconElement(manifest.files, (category, isMainVideo) => {
        // Highlight logic could go here, for now just scroll or alert
        console.log(`Clicked ${category} (Main: ${isMainVideo})`);
    });
    metaiconDisplay.appendChild(metaIcon);

    // List attachments
    attachmentsList.innerHTML = '';
    manifest.files.forEach(meta => {
      const fileData = parsedFiles.find(pf => pf.name === meta.filename);
      if (!fileData) return;

      const card = document.createElement('div');
      card.className = 'attachment-card';
      
      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = getEmojiForCategory(meta.category);
      
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = meta.filename.split('/').pop();
      
      const cat = document.createElement('span');
      cat.className = 'category';
      cat.textContent = meta.category;

      card.appendChild(icon);
      card.appendChild(name);
      card.appendChild(cat);
      
      card.onclick = () => {
        if (meta.category === 'link') {
          let url = new TextDecoder().decode(fileData.data);
          if (!url.match(/^https?:\/\//)) {
            url = 'https://' + url;
          }
          window.open(url, '_blank');
        } else {
          const blob = new Blob([fileData.data], { type: meta.mime_type });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = meta.filename.split('/').pop();
          a.click();
        }
      };

      attachmentsList.appendChild(card);
    });

    dropZone.style.display = 'none';
    viewerDisplay.style.display = 'block';

  } catch (err) {
    console.error(err);
    alert("Error reading bundle: " + err.message);
  }
}

function getEmojiForCategory(cat) {
  switch(cat) {
    case 'video': return '🎥';
    case 'document': return '📄';
    case 'image': return '🖼️';
    case 'link': return '🔗';
    case 'code': return '💻';
    case 'audio': return '🔊';
    default: return '📁';
  }
}
