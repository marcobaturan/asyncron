/**
 * lib/svg_icons.js
 * Contains pure SVG paths and logic to compose the realistic metaicon.
 */

const CSS_STYLES = `
  .asyncron-svg { 
    font-family: system-ui, -apple-system, sans-serif;
  }
  .tv-bezel {
    fill: #2a2a2a;
    stroke: #111;
    stroke-width: 2;
  }
  .tv-screen {
    fill: #111;
    stroke: #000;
    stroke-width: 2;
  }
  .tv-stand {
    fill: #333;
    stroke: #111;
    stroke-width: 2;
  }
  .tv-antenna {
    stroke: #666;
    stroke-width: 3;
    stroke-linecap: round;
  }
  .tv-play {
    fill: #fff;
    opacity: 0.8;
    transition: all 0.2s ease;
  }
  .asyncron-interactive { 
    cursor: pointer; 
  }
  .asyncron-interactive:hover .tv-play {
    fill: #4A9EFF;
    opacity: 1;
    transform: scale(1.1);
    transform-origin: 80px 65px;
  }
  .botonera-bg {
    fill: #333;
    stroke: #222;
    stroke-width: 2;
  }
  .subicon {
    transition: all 0.2s ease;
  }
  .asyncron-interactive:hover .subicon {
    filter: brightness(1.2) drop-shadow(0 0 2px rgba(74, 158, 255, 0.8));
  }
  .subicon-bg {
    fill: #222;
    stroke: #111;
    stroke-width: 1;
    transition: all 0.2s ease;
  }
  .asyncron-interactive:hover .subicon-bg {
    fill: #1a1a1a;
    stroke: #4A9EFF;
  }
  .badge-bg {
    fill: #ff4a4a;
  }
  .badge-text {
    fill: white;
    font-size: 8px;
    font-weight: bold;
    text-anchor: middle;
    dominant-baseline: central;
  }
`;

// Paths mapped to a 14x14 coordinate space with realistic filled vectors
const SUBICONS = {
  document: `<path d="M2 1v12c0 .6.4 1 1 1h8c.6 0 1-.4 1-1V4L8 1H3c-.6 0-1 .4-1 1z" fill="#f0f0f0" stroke="#888" stroke-width="1"/>
             <path d="M8 1v3h4" fill="#d0d0d0" stroke="#888" stroke-width="1"/>
             <line x1="4" y1="6" x2="9" y2="6" stroke="#bbb" stroke-width="1" stroke-linecap="round"/>
             <line x1="4" y1="9" x2="10" y2="9" stroke="#bbb" stroke-width="1" stroke-linecap="round"/>
             <line x1="4" y1="12" x2="8" y2="12" stroke="#bbb" stroke-width="1" stroke-linecap="round"/>`,
             
  image: `<rect x="1" y="2" width="12" height="10" rx="1" fill="#fff" stroke="#888" stroke-width="1"/>
          <circle cx="9.5" cy="4.5" r="1.5" fill="#ffb74d" stroke="none"/>
          <path d="M1 12 L5 8 L8 11 L9.5 9.5 L13 13" fill="none" stroke="#4caf50" stroke-width="1"/>
          <path d="M1 12 L5 8 L8 11 L9.5 9.5 L13 13 L13 12 L1 12 Z" fill="#81c784" stroke="none"/>`,
          
  link: `<circle cx="7" cy="7" r="6" fill="#2196f3" stroke="#1565c0" stroke-width="1"/>
         <ellipse cx="7" cy="7" rx="2.5" ry="6" fill="none" stroke="#fff" stroke-width="1" opacity="0.6"/>
         <line x1="1" y1="7" x2="13" y2="7" stroke="#fff" stroke-width="1" opacity="0.6"/>`,
         
  audio: `<path d="M2 7 C2 3 12 3 12 7" fill="none" stroke="#607d8b" stroke-width="2"/>
          <rect x="1" y="6" width="3" height="6" rx="1" fill="#37474f" stroke="#263238" stroke-width="1"/>
          <rect x="10" y="6" width="3" height="6" rx="1" fill="#37474f" stroke="#263238" stroke-width="1"/>
          <path d="M2 9 L2 11 M12 9 L12 11" stroke="#4fc3f7" stroke-width="1"/>`,
          
  video: `<rect x="1" y="2" width="12" height="10" rx="1" fill="#263238" stroke="#111" stroke-width="1"/>
          <rect x="3" y="2" width="8" height="10" fill="#37474f"/>
          <circle cx="2" cy="4" r="0.5" fill="#fff"/><circle cx="2" cy="7" r="0.5" fill="#fff"/><circle cx="2" cy="10" r="0.5" fill="#fff"/>
          <circle cx="12" cy="4" r="0.5" fill="#fff"/><circle cx="12" cy="7" r="0.5" fill="#fff"/><circle cx="12" cy="10" r="0.5" fill="#fff"/>
          <polygon points="5,4 5,10 10,7" fill="#fff"/>`,
          
  code: `<rect x="1" y="2" width="12" height="10" rx="1" fill="#212121" stroke="#000" stroke-width="1"/>
         <rect x="1" y="2" width="12" height="3" fill="#424242"/>
         <circle cx="3" cy="3.5" r="1" fill="#ef5350"/>
         <circle cx="6" cy="3.5" r="1" fill="#ffca28"/>
         <circle cx="9" cy="3.5" r="1" fill="#66bb6a"/>
         <path d="M3 7 L5 9 L3 11" fill="none" stroke="#4fc3f7" stroke-width="1" stroke-linecap="round"/>
         <line x1="6" y1="11" x2="9" y2="11" stroke="#fff" stroke-width="1" stroke-linecap="round"/>`
};

export function generateMetaIconSvg(files) {
  const categoryCounts = {};
  files.forEach(f => {
    categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
  });

  const subCategories = Object.keys(categoryCounts).filter(cat => {
    if (cat === 'video') return categoryCounts[cat] > 1;
    return SUBICONS[cat] !== undefined;
  });

  const slotWidth = 26;
  const totalSlotsWidth = subCategories.length * slotWidth;
  const botoneraWidth = Math.max(100, totalSlotsWidth + 20);
  const botoneraX = 80 - (botoneraWidth / 2);
  const startX = 80 - (totalSlotsWidth / 2);

  let subIconsSvg = '';
  subCategories.forEach((cat, index) => {
    const x = startX + index * slotWidth;
    const y = 125; // Botonera inner Y
    const count = categoryCounts[cat];
    const tooltipText = `${cat} (${count})`;
    
    // Calculate badge
    const badge = count > 1 ? `
      <circle cx="${x + 20}" cy="${y + 4}" r="5" class="badge-bg" />
      <text x="${x + 20}" y="${y + 4.5}" class="badge-text">${count > 9 ? '9+' : count}</text>
    ` : '';

    subIconsSvg += `
      <g class="asyncron-interactive" data-category="${cat}">
        <title>${tooltipText}</title>
        <!-- Icon Button Background -->
        <rect x="${x + 2}" y="${y + 4}" width="20" height="20" rx="4" class="subicon-bg" />
        <!-- Icon Graphic -->
        <g transform="translate(${x + 5}, ${y + 7})" class="subicon">
          ${SUBICONS[cat]}
        </g>
        ${badge}
      </g>
    `;
  });

  const videoCount = categoryCounts['video'] || 1;
  const videoBadge = videoCount > 1 ? `
    <circle cx="130" cy="35" r="8" class="badge-bg" />
    <text x="130" y="36" class="badge-text" style="font-size: 10px;">${videoCount > 9 ? '9+' : videoCount}</text>
  ` : '';

  return `
    <svg viewBox="0 0 160 160" width="160" height="160" xmlns="http://www.w3.org/2000/svg" class="asyncron-svg">
      <style>${CSS_STYLES}</style>
      
      <!-- TV Antenna -->
      <line x1="80" y1="25" x2="50" y2="5" class="tv-antenna" />
      <line x1="80" y1="25" x2="110" y2="5" class="tv-antenna" />
      <circle cx="50" cy="5" r="3" fill="#666" />
      <circle cx="110" cy="5" r="3" fill="#666" />
      <path d="M 75 25 L 85 25 L 80 15 Z" fill="#666" />

      <!-- TV Stand -->
      <path d="M 70 105 L 90 105 L 100 118 L 60 118 Z" class="tv-stand" />
      <rect x="55" y="118" width="50" height="4" rx="2" fill="#222" />

      <!-- Main TV Screen Area (Interactive) -->
      <g class="asyncron-interactive" data-category="video_main">
        <title>Main Video</title>
        
        <!-- TV Bezel -->
        <rect x="20" y="25" width="120" height="80" rx="8" class="tv-bezel" />
        
        <!-- TV Screen -->
        <rect x="28" y="33" width="104" height="64" rx="4" class="tv-screen" />
        
        <!-- Play Button -->
        <polygon points="70,50 70,80 95,65" class="tv-play" />
        
        ${videoBadge}
      </g>

      <!-- Botonera Panel (Only show if there are subicons) -->
      ${subCategories.length > 0 ? `
        <rect x="${botoneraX}" y="125" width="${botoneraWidth}" height="28" rx="8" class="botonera-bg" />
        ${subIconsSvg}
      ` : ''}
      
    </svg>
  `.trim();
}

export function createMetaIconElement(files, onCategoryClick) {
  const container = document.createElement('div');
  container.className = 'asyncron-metaicon-container';
  
  // Safely parse the SVG string
  const svgString = generateMetaIconSvg(files);
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgNode = doc.documentElement;
  
  // Ensure the element is appended to the container
  container.appendChild(svgNode);

  container.addEventListener('click', (e) => {
    const target = e.target.closest('.asyncron-interactive');
    if (!target) return;

    const category = target.getAttribute('data-category');
    if (category) {
      e.preventDefault();
      e.stopPropagation();
      
      if (category === 'video_main') {
        onCategoryClick('video', true);
      } else {
        onCategoryClick(category, false);
      }
    }
  });

  return container;
}
