// Muneeb Link Grabber - background.js (Manifest V3 Service Worker)

const NATIVE_HOST_NAME = 'com.muneeb.linkgrabber';

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download_youtube_video' || request.action === 'launch_downloader') {
    const urls = request.urls || (request.url ? [request.url] : []);
    if (!urls || urls.length === 0) {
      sendResponse({ status: 'error', error: 'No URL provided' });
      return true;
    }

    const mode = request.mode || (urls.length === 1 ? 'single' : 'group');

    try {
      chrome.runtime.sendNativeMessage(
        NATIVE_HOST_NAME,
        { action: 'launch_downloader', urls: urls, mode: mode },
        (response) => {
          if (chrome.runtime.lastError) {
            const errMsg = chrome.runtime.lastError.message || 'Host not connected';
            console.warn('Native host error in background:', errMsg);
            sendResponse({ status: 'error', error: 'Native host not registered. Run Register_Downloader_Button.bat' });
          } else if (response && response.status === 'ok') {
            sendResponse({ status: 'ok', count: response.count || urls.length, path: response.path });
          } else {
            sendResponse({ status: 'error', error: (response && response.error) || 'Failed to start downloader' });
          }
        }
      );
    } catch (err) {
      console.error('Background sendNativeMessage exception:', err);
      sendResponse({ status: 'error', error: 'Native messaging failed' });
    }
    return true; // Keep message channel open for async sendResponse
  }
});
