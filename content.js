// Muneeb Link Grabber - content.js (YouTube Video Cards & Watch Page Integration)

function isWatchPage() {
  const url = window.location.href;
  return url.includes('/watch') || url.includes('/shorts/');
}

function normalizeUrl(href) {
  if (!href) return '';
  try {
    const parsed = new URL(href, window.location.origin);
    const v = parsed.searchParams.get('v');
    if (v) {
      return `https://www.youtube.com/watch?v=${v}`;
    }
    if (parsed.pathname.includes('/shorts/')) {
      const parts = parsed.pathname.split('/');
      const id = parts[parts.indexOf('shorts') + 1];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
    return parsed.href;
  } catch (e) {
    return href;
  }
}

// -------------------------------------------------------------
// 1. INJECT ACTION BAR ON ACTIVE PLAYING WATCH PAGE
// -------------------------------------------------------------
function injectWatchPageBar() {
  if (!isWatchPage()) {
    const existing = document.getElementById('muneeb-yt-action-bar');
    if (existing) existing.remove();
    return;
  }

  let bar = document.getElementById('muneeb-yt-action-bar');
  if (bar) return;

  const targetParent =
    document.querySelector('#above-the-fold') ||
    document.querySelector('ytd-watch-metadata #title') ||
    document.querySelector('#primary-inner #title') ||
    document.querySelector('ytd-video-primary-info-renderer') ||
    document.querySelector('#player');

  if (!targetParent) return;

  bar = document.createElement('div');
  bar.id = 'muneeb-yt-action-bar';
  bar.innerHTML = `
    <div class="muneeb-bar-left">
      <span class="muneeb-badge">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        Muneeb Link Grabber
      </span>
    </div>
    <div class="muneeb-bar-actions">
      <button id="muneebCopyBtn" class="muneeb-btn muneeb-btn-copy" title="Copy clean video link">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span class="btn-text">Copy Link</span>
      </button>

      <button id="muneebDlBtn" class="muneeb-btn muneeb-btn-download" title="Download this video immediately">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span class="btn-text">Download</span>
      </button>
    </div>
  `;

  targetParent.insertBefore(bar, targetParent.firstChild);

  const copyBtn = bar.querySelector('#muneebCopyBtn');
  copyBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const cleanUrl = normalizeUrl(window.location.href);
    try {
      await navigator.clipboard.writeText(cleanUrl);
      const textSpan = copyBtn.querySelector('.btn-text');
      textSpan.textContent = '✓ Copied!';
      copyBtn.classList.add('success');
      setTimeout(() => {
        textSpan.textContent = 'Copy Link';
        copyBtn.classList.remove('success');
      }, 2000);
    } catch (err) {
      console.warn('Clipboard failed:', err);
    }
  });

  const dlBtn = bar.querySelector('#muneebDlBtn');
  dlBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const cleanUrl = normalizeUrl(window.location.href);
    const textSpan = dlBtn.querySelector('.btn-text');
    const originalText = textSpan.textContent;

    textSpan.textContent = 'Starting Download...';
    dlBtn.classList.add('loading');

    chrome.runtime.sendMessage(
      { action: 'download_youtube_video', url: cleanUrl, mode: 'single' },
      (response) => {
        dlBtn.classList.remove('loading');
        if (chrome.runtime.lastError || (response && response.status === 'error')) {
          const err = (response && response.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message) || '';
          textSpan.textContent = err && err.toLowerCase().includes('native')
            ? '⚠️ Run Register_Downloader_Button.bat'
            : '⚠️ Download failed';
          setTimeout(() => {
            textSpan.textContent = originalText;
          }, 4000);
        } else {
          textSpan.textContent = '✓ Downloading!';
          dlBtn.classList.add('success');
          setTimeout(() => {
            textSpan.textContent = originalText;
            dlBtn.classList.remove('success');
          }, 3000);
        }
      }
    );
  });
}

// -------------------------------------------------------------
// 2. INJECT ACTION BUTTONS ON EVERY VIDEO CARD ACROSS YOUTUBE
// -------------------------------------------------------------
function processVideoCards() {
  // Find all titles / headings across modern and classic YouTube layouts
  const titleSelectors = [
    'h3.ytLockupMetadataViewModelHeadingReset',
    'a.ytLockupMetadataViewModelTitle',
    'h3.ytd-rich-grid-media',
    '#video-title-link',
    'a#video-title',
    'ytd-video-renderer #video-title',
    'ytd-compact-video-renderer #video-title',
    'ytd-grid-video-renderer #video-title',
    'h3.ytd-compact-video-renderer',
    'a.ytd-thumbnail[href*="/watch?v="]'
  ];

  const candidateNodes = document.querySelectorAll(titleSelectors.join(','));

  candidateNodes.forEach((node) => {
    // Find closest card container
    const card =
      node.closest('ytd-rich-item-renderer') ||
      node.closest('yt-lockup-view-model') ||
      node.closest('ytd-video-renderer') ||
      node.closest('ytd-compact-video-renderer') ||
      node.closest('ytd-grid-video-renderer') ||
      node.closest('ytd-playlist-video-renderer') ||
      node.closest('.ytLockupViewModelHost') ||
      node.closest('#content') ||
      node.parentElement;

    if (!card) return;

    // Skip if this card already has our action buttons
    if (card.querySelector('.muneeb-card-actions')) return;

    // Find the link anchor
    const linkEl =
      card.querySelector('a.ytLockupMetadataViewModelTitle') ||
      card.querySelector('h3.ytLockupMetadataViewModelHeadingReset a') ||
      card.querySelector('a#video-title') ||
      card.querySelector('a#video-title-link') ||
      card.querySelector('a[href*="/watch?v="]') ||
      card.querySelector('a[href*="/shorts/"]') ||
      (node.tagName === 'A' && node.getAttribute('href') ? node : null);

    if (!linkEl) return;

    const rawHref = linkEl.getAttribute('href') || linkEl.href;
    if (!rawHref || (!rawHref.includes('/watch') && !rawHref.includes('/shorts/'))) {
      return;
    }

    const cleanUrl = normalizeUrl(rawHref);
    if (!cleanUrl) return;

    // Find best insertion spot right after title/heading
    const insertAfterEl =
      card.querySelector('h3.ytLockupMetadataViewModelHeadingReset') ||
      card.querySelector('a.ytLockupMetadataViewModelTitle') ||
      card.querySelector('#title-wrapper') ||
      card.querySelector('#video-title') ||
      card.querySelector('yt-lockup-metadata-view-model') ||
      node;

    if (!insertAfterEl || !insertAfterEl.parentNode) return;

    const actionDiv = document.createElement('div');
    actionDiv.className = 'muneeb-card-actions';
    actionDiv.innerHTML = `
      <button class="muneeb-card-btn muneeb-card-copy" title="Copy video URL">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span class="muneeb-card-txt">Copy</span>
      </button>
      <button class="muneeb-card-btn muneeb-card-download" title="Download this video">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span class="muneeb-card-txt">Download</span>
      </button>
    `;

    // Insert right after the title element
    insertAfterEl.insertAdjacentElement('afterend', actionDiv);

    // Card Copy Click
    const copyBtn = actionDiv.querySelector('.muneeb-card-copy');
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(cleanUrl);
        const txt = copyBtn.querySelector('.muneeb-card-txt');
        txt.textContent = '✓ Copied';
        copyBtn.classList.add('success');
        setTimeout(() => {
          txt.textContent = 'Copy';
          copyBtn.classList.remove('success');
        }, 2000);
      } catch (err) {
        console.warn('Card copy failed:', err);
      }
    });

    // Card Download Click
    const dlBtn = actionDiv.querySelector('.muneeb-card-download');
    dlBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const txt = dlBtn.querySelector('.muneeb-card-txt');
      const originalText = txt.textContent;
      txt.textContent = 'Starting...';
      dlBtn.classList.add('loading');

      chrome.runtime.sendMessage(
        { action: 'download_youtube_video', url: cleanUrl, mode: 'single' },
        (response) => {
          dlBtn.classList.remove('loading');
          if (chrome.runtime.lastError || (response && response.status === 'error')) {
            txt.textContent = '⚠️ Error';
            setTimeout(() => {
              txt.textContent = originalText;
            }, 3000);
          } else {
            txt.textContent = '✓ Done!';
            dlBtn.classList.add('success');
            setTimeout(() => {
              txt.textContent = originalText;
              dlBtn.classList.remove('success');
            }, 3000);
          }
        }
      );
    });
  });
}

// -------------------------------------------------------------
// 3. MUTATION OBSERVER & RUNNERS
// -------------------------------------------------------------
let debounceTimeout = null;
function runAllInjections() {
  injectWatchPageBar();
  processVideoCards();
}

const observer = new MutationObserver(() => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(runAllInjections, 100);
});

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true
});

// Periodic fallback check for dynamically lazy-loaded feed items
setInterval(runAllInjections, 1000);

window.addEventListener('yt-navigate-finish', () => {
  setTimeout(runAllInjections, 100);
});
window.addEventListener('spfdone', runAllInjections);
window.addEventListener('popstate', runAllInjections);

// Initial run
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllInjections);
} else {
  runAllInjections();
}
