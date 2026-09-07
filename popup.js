// Muneeb Link Grabber - popup.js (Manifest V3)

const GROUPS_STORAGE_KEY = 'tab_link_collector_groups';
const NATIVE_HOST_NAME = 'com.muneeb.linkgrabber';

// DOM Elements
const copyAllTabsBtn = document.getElementById('copyAllTabsBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const toggleAllBtn = document.getElementById('toggleAllBtn');
const copyEverythingBtn = document.getElementById('copyEverythingBtn');
const totalLinksBadge = document.getElementById('totalLinksBadge');
const totalGroupsBadge = document.getElementById('totalGroupsBadge');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const groupsList = document.getElementById('groupsList');
const emptyState = document.getElementById('emptyState');
const noResultsState = document.getElementById('noResultsState');
const footerStatusText = document.getElementById('footerStatusText');

// GitHub Auto-Update DOM Elements
const updateBanner = document.getElementById('updateBanner');
const updateVersionTag = document.getElementById('updateVersionTag');
const btnApplyUpdate = document.getElementById('btnApplyUpdate');

// GitHub Auto-Update Configuration
const GITHUB_CONFIG = {
  enabled: true,
  user: 'zabiimobile-ux',
  repo: 'muneeb-downloader',
  branch: 'main'
};

// Modal Elements
const confirmModal = document.getElementById('confirmModal');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

// Toast Elements
const toastNotification = document.getElementById('toastNotification');
const toastContent = document.getElementById('toastContent');
const toastMessage = document.getElementById('toastMessage');
const toastIconSuccess = document.getElementById('toastIconSuccess');
const toastIconError = document.getElementById('toastIconError');

let allGroups = [];
let toastTimeout = null;

// Restricted URL schemes to ignore
const RESTRICTED_SCHEMES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'devtools://',
  'about:',
  'view-source:',
  'data:',
  'blob:',
  'file:'
];

// Color palette for domain avatars (Pastel Violet, Electric Cyan, Mint & Modern Accents)
const AVATAR_COLORS = [
  '#8b5cf6', '#7c3aed', '#6366f1', '#06b6d4', '#0ea5e9',
  '#10b981', '#14b8a6', '#3b82f6', '#ec4899', '#a855f7',
  '#f43f5e', '#d946ef', '#0284c7', '#059669', '#4f46e5'
];

function getAvatarColor(str) {
  if (!str) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function isRestrictedUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const lowerUrl = url.toLowerCase().trim();
  if (!lowerUrl || lowerUrl === 'about:blank') return true;
  return RESTRICTED_SCHEMES.some(scheme => lowerUrl.startsWith(scheme));
}

function isYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().trim();
  return lower.includes('youtube.com/') || lower.includes('youtu.be/') || lower.includes('youtube.com/watch') || lower.includes('youtube.com/shorts');
}

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return 'link';
  }
}

function getRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 90) return '1m ago';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Navigator clipboard failed, trying fallback:', err);
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}

function showToast(message, isError = false) {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastMessage.textContent = message;
  if (isError) {
    toastContent.classList.add('toast-error');
    toastIconSuccess.classList.add('hidden');
    toastIconError.classList.remove('hidden');
  } else {
    toastContent.classList.remove('toast-error');
    toastIconSuccess.classList.remove('hidden');
    toastIconError.classList.add('hidden');
  }

  toastNotification.classList.remove('hidden');

  toastTimeout = setTimeout(() => {
    toastNotification.classList.add('hidden');
  }, isError ? 3500 : 2500);
}

/**
 * Load groups from chrome.storage.local
 */
async function loadGroups() {
  return new Promise((resolve) => {
    chrome.storage.local.get([GROUPS_STORAGE_KEY], (result) => {
      allGroups = result[GROUPS_STORAGE_KEY] || [];
      // Ensure all groups have domain & createdAt
      allGroups = allGroups.map(grp => {
        if (!grp.createdAt && grp.timestamp) grp.createdAt = grp.timestamp;
        if (grp.links) {
          grp.links = grp.links.map(l => ({
            ...l,
            domain: l.domain || extractDomain(l.url)
          }));
        }
        return grp;
      });
      resolve(allGroups);
    });
  });
}

/**
 * Persist groups to chrome.storage.local
 */
async function persistGroups(groups) {
  allGroups = groups;
  return new Promise((resolve) => {
    chrome.storage.local.set({ [GROUPS_STORAGE_KEY]: groups }, () => {
      updateCounters();
      renderGroupsList();
      resolve();
    });
  });
}

function getTotalLinksCount() {
  return allGroups.reduce((acc, grp) => acc + (grp.links ? grp.links.length : 0), 0);
}

function updateCounters() {
  const totalLinks = getTotalLinksCount();
  const totalGroups = allGroups.length;

  totalLinksBadge.textContent = totalLinks;
  totalGroupsBadge.textContent = totalGroups;
  footerStatusText.textContent = `${totalLinks} link${totalLinks === 1 ? '' : 's'} · ${totalGroups} group${totalGroups === 1 ? '' : 's'}`;
}

/**
 * Render all groups
 */
function renderGroupsList() {
  const query = (searchInput.value || '').trim().toLowerCase();
  clearSearchBtn.classList.toggle('hidden', query.length === 0);

  if (allGroups.length === 0) {
    emptyState.classList.remove('hidden');
    noResultsState.classList.add('hidden');
    groupsList.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');

  let visibleGroups = allGroups;
  if (query) {
    visibleGroups = allGroups.map(grp => {
      const matchingLinks = (grp.links || []).filter(l =>
        (l.url && l.url.toLowerCase().includes(query)) ||
        (l.title && l.title.toLowerCase().includes(query)) ||
        (l.domain && l.domain.toLowerCase().includes(query))
      );
      const matchesGroupTitle = grp.title && grp.title.toLowerCase().includes(query);
      if (matchesGroupTitle || matchingLinks.length > 0) {
        return {
          ...grp,
          isExpanded: true, // Auto-expand matching groups during search
          links: matchesGroupTitle ? grp.links : matchingLinks
        };
      }
      return null;
    }).filter(Boolean);
  }

  if (visibleGroups.length === 0) {
    noResultsState.classList.remove('hidden');
    groupsList.innerHTML = '';
    return;
  }

  noResultsState.classList.add('hidden');
  groupsList.innerHTML = '';

  visibleGroups.forEach((group, index) => {
    const isNewest = index === 0 && !query;
    const isExpanded = group.isExpanded === true;
    const linkCount = (group.links || []).length;
    const relTime = getRelativeTime(group.createdAt || group.timestamp);

    const card = document.createElement('div');
    card.className = `group-card ${isNewest ? 'latest-card' : ''} ${isExpanded ? 'expanded' : ''}`;
    card.dataset.groupId = group.id;

    // Header
    const headerHtml = `
      <div class="group-header">
        <div class="group-title-area">
          <div class="group-toggle-icon ${isExpanded ? 'expanded' : ''}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
          <div class="group-meta">
            <div class="group-title-row">
              <span class="group-name">${escapeHtml(group.title)}</span>
              <span class="group-count-badge">${linkCount} link${linkCount === 1 ? '' : 's'}</span>
              ${isNewest ? '<span class="latest-pill">Latest</span>' : ''}
            </div>
            <div class="group-time-row">
              <span class="group-time">${escapeHtml(group.time || '')}</span>
              ${relTime ? `<span class="group-dot">•</span><span class="group-rel-time">${escapeHtml(relTime)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="group-actions">
          <button class="btn-group-action btn-copy-group" title="Copy all links in this group" aria-label="Copy group">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="btn-group-action btn-download-group" title="Download all links in this group" aria-label="Download group">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="btn-group-action btn-delete-group" title="Delete entire group" aria-label="Delete group">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Items Tray
    let itemsHtml = `<div class="group-items-tray ${isExpanded ? '' : 'collapsed'}">`;
    (group.links || []).forEach((item, linkIdx) => {
      const domain = item.domain || extractDomain(item.url);
      const initial = (domain[0] || 'L').toUpperCase();
      const avatarBg = getAvatarColor(domain);
      const displayTitle = item.title && item.title !== item.url ? item.title : domain;
      const isYT = isYouTubeUrl(item.url);

      itemsHtml += `
        <div class="group-link-item ${isYT ? 'youtube-link-item' : ''}" data-link-index="${linkIdx}">
          <div class="domain-avatar" style="background-color: ${avatarBg}">${initial}</div>
          <div class="link-info">
            <div class="link-top-row">
              <span class="link-domain">${escapeHtml(domain)}</span>
              ${isYT ? '<span class="yt-badge">YouTube</span>' : ''}
            </div>
            <div class="link-title" title="${escapeHtml(displayTitle)}">${escapeHtml(displayTitle)}</div>
            <a class="link-url" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(item.url)}">${escapeHtml(item.url)}</a>
          </div>
          <div class="item-actions">
            <button class="btn-item-action btn-copy-single" title="Copy URL" aria-label="Copy link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="btn-item-action btn-download-single ${isYT ? 'btn-download-yt' : ''}" title="Download this video" aria-label="Download video">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <button class="btn-item-action delete btn-delete-single" title="Delete link" aria-label="Delete link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      `;
    });
    itemsHtml += `</div>`;

    card.innerHTML = headerHtml + itemsHtml;

    // Expand / Collapse Header Click
    const titleArea = card.querySelector('.group-title-area');
    titleArea.addEventListener('click', () => {
      group.isExpanded = !group.isExpanded;
      const targetGroup = allGroups.find(g => g.id === group.id);
      if (targetGroup) {
        targetGroup.isExpanded = group.isExpanded;
        chrome.storage.local.set({ [GROUPS_STORAGE_KEY]: allGroups });
      }
      const tray = card.querySelector('.group-items-tray');
      const toggleIcon = card.querySelector('.group-toggle-icon');
      if (group.isExpanded) {
        card.classList.add('expanded');
        tray.classList.remove('collapsed');
        toggleIcon.classList.add('expanded');
      } else {
        card.classList.remove('expanded');
        tray.classList.add('collapsed');
        toggleIcon.classList.remove('expanded');
      }
    });

    // Copy entire group
    const copyGroupBtn = card.querySelector('.btn-copy-group');
    copyGroupBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const urlsText = (group.links || []).map(l => l.url).join('\n');
      const success = await copyToClipboard(urlsText);
      if (success) {
        copyGroupBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        showToast(`${group.links.length} links copied from ${group.title}!`);
        setTimeout(() => {
          copyGroupBtn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 1500);
      }
    });

    // Download entire group
    const downloadGroupBtn = card.querySelector('.btn-download-group');
    if (downloadGroupBtn) {
      downloadGroupBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const urls = (group.links || []).map(l => l.url.trim()).filter(Boolean);
        if (urls.length === 0) {
          showToast('No links in this group to download', true);
          return;
        }
        showToast(`Starting download for ${group.title} (${urls.length} links)...`);
        try {
          chrome.runtime.sendNativeMessage(
            NATIVE_HOST_NAME,
            { action: 'launch_downloader', urls: urls, mode: 'group' },
            (response) => {
              if (chrome.runtime.lastError) {
                showToast('Host not registered. Run Register_Downloader_Button.bat!', true);
              } else if (response && response.status === 'ok') {
                showToast(`Downloader started for ${group.title}!`);
              } else {
                showToast('Downloader started!');
              }
            }
          );
        } catch (err) {
          showToast('Host not found. Run Register_Downloader_Button.bat!', true);
        }
      });
    }

    // Delete entire group
    const deleteGroupBtn = card.querySelector('.btn-delete-group');
    deleteGroupBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const updated = allGroups.filter(g => g.id !== group.id);
      await persistGroups(updated);
      showToast(`${group.title} deleted`);
    });

    // Individual copy single link
    card.querySelectorAll('.btn-copy-single').forEach((btn, idx) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = group.links[idx];
        if (!item) return;
        const success = await copyToClipboard(item.url);
        if (success) {
          btn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          `;
          showToast('URL copied to clipboard!');
          setTimeout(() => {
            btn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            `;
          }, 1200);
        }
      });
    });

    // Individual download single video
    card.querySelectorAll('.btn-download-single').forEach((btn, idx) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = group.links[idx];
        if (!item || !item.url) return;
        downloadSingleUrl(item.url, item.title || item.domain);
      });
    });

    // Individual delete single link
    card.querySelectorAll('.btn-delete-single').forEach((btn, idx) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetGroup = allGroups.find(g => g.id === group.id);
        if (targetGroup) {
          targetGroup.links.splice(idx, 1);
          let updated = allGroups;
          if (targetGroup.links.length === 0) {
            updated = allGroups.filter(g => g.id !== group.id);
            showToast('Group deleted (empty)');
          } else {
            showToast('Link removed');
          }
          await persistGroups(updated);
        }
      });
    });

    groupsList.appendChild(card);
  });
}

/**
 * Window-Specific Tab Grabber:
 * Queries CURRENT window only, filters out internal/special URLs,
 * creates a new group, copies to clipboard, and shows toast.
 */
async function handleCopyAllTabs() {
  try {
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      if (!tabs || tabs.length === 0) {
        showToast('No open tabs found in this window', true);
        return;
      }

      const validTabs = tabs.filter(tab => tab.url && !isRestrictedUrl(tab.url));

      if (validTabs.length === 0) {
        showToast('No valid web tabs found in this window', true);
        return;
      }

      const tabUrls = validTabs.map(t => t.url.trim());
      const clipboardText = tabUrls.join('\n');
      await copyToClipboard(clipboardText);

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });

      const newGroupNumber = allGroups.length + 1;
      const newGroup = {
        id: 'grp_' + Date.now(),
        title: `Group ${newGroupNumber}`,
        time: `${dateStr}, ${timeStr}`,
        createdAt: Date.now(),
        timestamp: Date.now(),
        isExpanded: false, // Default collapsed
        links: validTabs.map(t => ({
          url: t.url.trim(),
          title: t.title || t.url.trim(),
          domain: extractDomain(t.url.trim())
        }))
      };

      const updatedGroups = [newGroup, ...allGroups];
      await persistGroups(updatedGroups);

      showToast(`${validTabs.length} links · Group ${newGroupNumber}`);
    });
  } catch (error) {
    console.error('Error grabbing tabs:', error);
    showToast('Failed to grab tabs', true);
  }
}

/**
 * Download single specific video URL immediately in Downloader
 */
function downloadSingleUrl(url, title) {
  if (!url) return;
  const displayTitle = title ? (title.length > 28 ? title.substring(0, 25) + '...' : title) : 'Video';
  showToast(`Starting download: ${displayTitle}...`);

  try {
    chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      { action: 'launch_downloader', urls: [url.trim()], mode: 'single' },
      (response) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || '';
          console.warn('Native host connection error:', errMsg);
          showToast('Host not registered. Run Register_Downloader_Button.bat!', true);
          return;
        }

        if (response && response.status === 'ok') {
          showToast(`Downloader started for: ${displayTitle}`);
        } else if (response && response.error) {
          showToast(`Downloader error: ${response.error}`, true);
        } else {
          showToast('Downloader started minimized!');
        }
      }
    );
  } catch (err) {
    console.error('sendNativeMessage exception:', err);
    showToast('Host not found. Run Register_Downloader_Button.bat!', true);
  }
}

/**
 * 1-Click Download: Native Messaging
 * Uses LATEST group's links and sends launch_downloader command.
 */
function handleDownload(e) {
  if (e) e.preventDefault();

  if (allGroups.length === 0) {
    showToast('No saved groups yet! Click "Copy All Tabs" first.', true);
    return;
  }

  const latestGroup = allGroups[0];
  if (!latestGroup || !latestGroup.links || latestGroup.links.length === 0) {
    showToast('Latest group has no links to download', true);
    return;
  }

  const urls = latestGroup.links.map(l => l.url.trim()).filter(Boolean);
  if (urls.length === 0) {
    showToast('No valid URLs found in latest group', true);
    return;
  }

  showToast(`Connecting to Downloader (${urls.length} links)...`);

  try {
    chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      { action: 'launch_downloader', urls: urls, mode: 'group' },
      (response) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || '';
          console.warn('Native host connection error:', errMsg);
          showToast('Host not registered. Run Register_Downloader_Button.bat!', true);
          return;
        }

        if (response && response.status === 'ok') {
          showToast(`Downloader launched (${response.count || urls.length} links)!`);
        } else if (response && response.error) {
          showToast(`Downloader error: ${response.error}`, true);
        } else {
          showToast('Downloader started minimized!');
        }
      }
    );
  } catch (err) {
    console.error('sendNativeMessage exception:', err);
    showToast('Host not found. Run Register_Downloader_Button.bat!', true);
  }
}

/**
 * Toggle Expand / Collapse All
 */
function handleToggleAll() {
  if (allGroups.length === 0) return;
  const anyExpanded = allGroups.some(g => g.isExpanded);
  const targetState = !anyExpanded;

  allGroups.forEach(g => {
    g.isExpanded = targetState;
  });

  chrome.storage.local.set({ [GROUPS_STORAGE_KEY]: allGroups }, () => {
    renderGroupsList();
    showToast(targetState ? 'Expanded all groups' : 'Collapsed all groups');
  });
}

/**
 * Copy ALL links from ALL groups
 */
async function handleCopyEverything() {
  if (allGroups.length === 0) {
    showToast('No saved groups to copy', true);
    return;
  }

  const allUrls = [];
  allGroups.forEach(grp => {
    if (grp.links) {
      grp.links.forEach(l => {
        if (l.url) allUrls.push(l.url.trim());
      });
    }
  });

  if (allUrls.length === 0) {
    showToast('No links found in any group', true);
    return;
  }

  const success = await copyToClipboard(allUrls.join('\n'));
  if (success) {
    showToast(`Copied ${allUrls.length} total links to clipboard!`);
  }
}

/**
 * Clear All Modal Controls
 */
function openClearModal() {
  if (allGroups.length === 0) {
    showToast('No saved groups to clear', true);
    return;
  }
  confirmModal.classList.remove('hidden');
}

function closeClearModal() {
  confirmModal.classList.add('hidden');
}

async function handleConfirmClear() {
  await persistGroups([]);
  closeClearModal();
  showToast('All saved groups deleted');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * GitHub Auto-Updater
 */
let latestUpdateData = null;

function isNewerVersion(remote, local) {
  if (!remote || !local) return false;
  const rParts = String(remote).replace(/^v/i, '').split('.').map(Number);
  const lParts = String(local).replace(/^v/i, '').split('.').map(Number);
  for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

async function checkForGitHubUpdate() {
  if (!GITHUB_CONFIG.enabled || !GITHUB_CONFIG.user || !GITHUB_CONFIG.repo) return;

  const currentVersion = chrome.runtime.getManifest().version; // e.g. "1.3.0"
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.user}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/version.json?_t=${Date.now()}`;

  try {
    const response = await fetch(rawUrl, { cache: 'no-cache' });
    if (!response.ok) return;

    const data = await response.json();
    if (!data || !data.version) return;

    if (isNewerVersion(data.version, currentVersion)) {
      latestUpdateData = data;
      if (updateVersionTag) updateVersionTag.textContent = `v${data.version}`;
      if (updateBanner) updateBanner.classList.remove('hidden');
    }
  } catch (err) {
    // Network offline or repo not public yet, silently skip
    console.debug('GitHub update check skipped:', err);
  }
}

async function handleApplyUpdate() {
  if (!latestUpdateData) return;

  if (btnApplyUpdate) {
    btnApplyUpdate.disabled = true;
    btnApplyUpdate.innerHTML = '<span>Updating...</span>';
  }
  showToast(`Downloading update v${latestUpdateData.version}...`);

  const downloadUrl = latestUpdateData.zip_url || latestUpdateData.download_url;

  try {
    chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      { action: 'update_extension', zip_url: downloadUrl },
      (response) => {
        if (chrome.runtime.lastError || !response || response.status !== 'ok') {
          if (latestUpdateData.download_url) {
            chrome.tabs.create({ url: latestUpdateData.download_url });
          }
          showToast('Opening update in browser...');
          if (btnApplyUpdate) {
            btnApplyUpdate.disabled = false;
            btnApplyUpdate.innerHTML = '<span>Update Now</span>';
          }
        } else {
          showToast('Updated successfully! Reloading...');
          setTimeout(() => {
            chrome.runtime.reload();
          }, 1200);
        }
      }
    );
  } catch (err) {
    if (latestUpdateData.download_url) {
      chrome.tabs.create({ url: latestUpdateData.download_url });
    }
    showToast('Opening update in browser...');
    if (btnApplyUpdate) {
      btnApplyUpdate.disabled = false;
      btnApplyUpdate.innerHTML = '<span>Update Now</span>';
    }
  }
}

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', async () => {
  await loadGroups();
  updateCounters();
  renderGroupsList();
  checkForGitHubUpdate();

  copyAllTabsBtn.addEventListener('click', handleCopyAllTabs);
  downloadBtn.addEventListener('click', handleDownload);
  toggleAllBtn.addEventListener('click', handleToggleAll);
  clearAllBtn.addEventListener('click', openClearModal);
  copyEverythingBtn.addEventListener('click', handleCopyEverything);
  if (btnApplyUpdate) btnApplyUpdate.addEventListener('click', handleApplyUpdate);

  modalCancelBtn.addEventListener('click', closeClearModal);
  modalConfirmBtn.addEventListener('click', handleConfirmClear);

  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
      closeClearModal();
    }
  });

  searchInput.addEventListener('input', () => {
    renderGroupsList();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    renderGroupsList();
    searchInput.focus();
  });
});
