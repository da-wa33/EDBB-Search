const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
(document.head || document.documentElement).appendChild(script);

let blockMap = [];
let isLoaded = false;
let currentResults = [];
let selectedIndex = 0;

const overlay = document.createElement('div');
overlay.id = 'ebs-overlay';
overlay.innerHTML = `
  <div class="ebs-modal">
    <div class="ebs-header">
      <div class="ebs-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </div>
      <input type="text" id="ebs-input" placeholder="..." disabled autocomplete="off">
      <div class="ebs-shortcut-hint"><kbd>ESC</kbd></div>
    </div>
    <ul id="ebs-results">
      <li class="ebs-loading">
        <div class="ebs-spinner"></div>
        <span>Scanning...</span>
      </li>
    </ul>
    <div class="ebs-footer">
      <div class="ebs-keys">
        <span><kbd>↵</kbd> Select</span>
        <span><kbd>↑</kbd><kbd>↓</kbd> Move</span>
      </div>
      <span id="ebs-status" class="ebs-status">Initializing...</span>
    </div>
  </div>
`;
document.body.appendChild(overlay);

const input = document.getElementById('ebs-input');
const resultsList = document.getElementById('ebs-results');
const statusLabel = document.getElementById('ebs-status');

window.addEventListener('message', (event) => {
  if (event.data.type === 'EBS_BLOCK_LIST') {
    blockMap = event.data.blocks;
    isLoaded = true;
    
    input.placeholder = "Search blocks...";
    input.disabled = false;
    statusLabel.textContent = `${blockMap.length} blocks ready`;
    
    if (overlay.classList.contains('active')) {
      updateResults(input.value);
    }
    
    const btn = document.getElementById('ebs-header-btn');
    if(btn) btn.style.opacity = '1';
  }
});

function openSearch() {
  overlay.classList.add('active');
  input.focus();
  
  if (isLoaded) {
    if (input.value === '') updateResults('');
  } else {
    window.postMessage({ type: 'EBS_REQUEST_SCAN' }, '*');
  }
}

function closeSearch() {
  overlay.classList.remove('active');
}

function updateResults(query) {
  resultsList.innerHTML = '';
  selectedIndex = 0;
  
  if (!isLoaded) return;

  if (!query) {
    currentResults = blockMap.slice(0, 10);
  } else {
    const lowerQ = query.toLowerCase();
    currentResults = blockMap.filter(item => {
      const label = (item.label || "").toLowerCase();
      const id = (item.id || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      return label.includes(lowerQ) || id.includes(lowerQ) || cat.includes(lowerQ);
    }).slice(0, 50);
  }

  if (currentResults.length === 0) {
    const li = document.createElement('li');
    li.className = 'ebs-no-result';
    li.textContent = `"${query}" not found`;
    resultsList.appendChild(li);
    return;
  }

  currentResults.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="ebs-item-main">
        <span class="ebs-item-label">${escapeHtml(item.label)}</span>
        <span class="ebs-item-sub">${item.id}</span>
      </div>
      <div class="ebs-item-meta">
        <span class="ebs-item-cat">${item.category}</span>
      </div>
    `;
    
    li.addEventListener('click', () => {
      spawnBlock(item.id);
      closeSearch();
    });
    
    li.addEventListener('mousemove', () => {
        if (selectedIndex !== index) {
            selectedIndex = index;
            renderSelection();
        }
    });
    
    resultsList.appendChild(li);
  });
  
  renderSelection();
}

function renderSelection() {
  const items = resultsList.querySelectorAll('li:not(.ebs-no-result):not(.ebs-loading)');
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

function spawnBlock(blockType) {
  window.postMessage({ type: 'EBS_SPAWN_BLOCK', blockType: blockType }, '*');
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'k' || (e.shiftKey && e.key === 'F'))) {
    e.preventDefault();
    if (overlay.classList.contains('active')) {
      closeSearch();
    } else {
      openSearch();
    }
  }
  
  if (overlay.classList.contains('active')) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
      renderSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      renderSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentResults[selectedIndex]) {
        spawnBlock(currentResults[selectedIndex].id);
        closeSearch();
      }
    }
  }
});

input.addEventListener('input', (e) => updateResults(e.target.value));

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeSearch();
});

function setupHeaderButton() {
  const importBtn = document.getElementById('importBtn');
  
  if (importBtn && importBtn.parentElement) {
    const container = importBtn.parentElement;
    
    const btn = document.createElement('button');
    btn.id = 'ebs-header-btn';
    btn.className = 'p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors rounded-md hover:bg-slate-50 dark:hover:bg-slate-800';
    btn.title = 'Search Blocks (Ctrl+P)';
    
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    `;

    btn.addEventListener('click', openSearch);
    
    container.insertBefore(btn, container.firstChild);
  } else {
    setTimeout(setupHeaderButton, 500);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupHeaderButton);
} else {
  setupHeaderButton();
}