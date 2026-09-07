======================================================================
               MUNEEB LINK GRABBER (v1.2.0) - README
======================================================================

OVERVIEW:
---------
Muneeb Link Grabber is a high-performance Google Chrome Extension
(Manifest V3) designed for grabbing, organizing, searching, and downloading
links with zero friction.

KEY FEATURES:
-------------
1. WINDOW-SPECIFIC TAB GRABBER:
   - "Copy All Tabs" grabs open web tabs from the CURRENT window only.
   - Automatically filters out browser pages (chrome://, devtools://, etc.).
   - Stores links as organized, collapsible groups with timestamps.
   - Automatically copies all captured URLs to clipboard (one per line).

2. COLLAPSIBLE GROUP MANAGEMENT & SEARCH:
   - Groups persist across browser restarts in chrome.storage.local.
   - Collapsed by default for clean presentation; newest groups first.
   - "Latest" tag on the newest group.
   - Relative time indicators (e.g., "Just now", "5m ago") + date/time.
   - Colored domain avatar for each link.
   - Real-time search instantly filters groups, domains, and URLs.
   - Individual link copy/delete and group copy/delete.
   - Clear All with blurred confirmation modal.
   - "Copy All Links" footer button copies all URLs across all groups.
   - Direct WhatsApp support link: https://wa.me/923147062603 (03147062603).

3. 1-CLICK DOWNLOAD TO ZABII FAST DOWNLOADER:
   - Click "Download" to automatically send the latest group's links
     to your local YouTube downloader (Zabii Fast Downloader).
   - URLs are automatically normalized (short links, mobile links, shorts).
   - Writes links.txt directly next to yt-dlp.exe.
   - Launches Zabii_Fast_Downloader_AUTO.bat MINIMIZED in the taskbar.
   - No manual pasting or typing DONE needed!

4. PREMIUM DARK GUI:
   - Sized at ~370px × 620px with deep dark theme (#0b0f1a).
   - Ambient indigo/orange glow accents.
   - Button shine sweep animation on primary button.
   - Toast notifications with success and error indicators.
   - Zero external font dependencies (native system font stack).

----------------------------------------------------------------------
HOW TO INSTALL & USE:
----------------------------------------------------------------------

STEP 1: LOAD EXTENSION IN CHROME
1. Open Google Chrome and visit: chrome://extensions
2. In the top right corner, switch on "Developer mode".
3. Click the "Load unpacked" button.
4. Select this extension folder:
   D:\extension copy
5. Pin "Muneeb Link Grabber" to your Chrome toolbar.
6. Note the 32-letter Extension ID shown on the extension card.

STEP 2: CONNECT THE DOWNLOAD BUTTON (NATIVE MESSAGING)
1. Double-click "Register_Downloader_Button.bat".
2. Paste or type your Chrome Extension ID when prompted.
3. Confirm or enter the folder path containing your yt-dlp.exe
   (e.g., D:\Youtube video download).
4. The script will configure Windows Registry, copy the AUTO batch script,
   and generate the native messaging manifest.

STEP 3: START GRABBING & DOWNLOADING
1. Open tabs in any Chrome window.
2. Click the extension icon.
3. Click "Copy All Tabs" to save and copy.
4. Click "Download" to launch Zabii Fast Downloader minimized!

----------------------------------------------------------------------
FILES IN THIS DIRECTORY:
----------------------------------------------------------------------
- manifest.json                      Manifest V3 extension manifest
- popup.html                         Extension popup markup
- popup.css                          Premium dark theme styling
- popup.js                           Main extension controller logic
- icons/icon16.png, 48.png, 128.png  Extension app icons
- native_host.py                     Native messaging host (Python)
- native_host.bat                    Silent launcher using pythonw
- native_host.json                   Chrome native host manifest template
- native_host_registered.json        Registered manifest with your Extension ID
- Register_Downloader_Button.bat     1-Click registration & registry tool
- Zabii_Fast_Downloader_AUTO.bat     Automated downloader (reads links.txt, minimized)
- Zabii_Fast_Downloader_v6_ORIGINAL.bat Manual paste version (type DONE)
- INSTALL.bat                        Quick setup assistant
- README.txt                         This documentation file

----------------------------------------------------------------------
TROUBLESHOOTING:
----------------------------------------------------------------------
Q: "Host not registered" error when clicking Download?
A: Run Register_Downloader_Button.bat and make sure your Chrome Extension ID
   matches the ID shown in chrome://extensions.

Q: yt-dlp.exe not found error?
A: Place yt-dlp.exe in your designated download folder
   (e.g. D:\Youtube video download\yt-dlp.exe) or update the path by running
   Register_Downloader_Button.bat again.

Q: Python is not recognized?
A: Download and install Python 3 from https://www.python.org/
   Be sure to check "Add Python to PATH" during installation.

----------------------------------------------------------------------
SUPPORT:
----------------------------------------------------------------------
WhatsApp: +92 314 7062603
Muneeb Mobile Shop / Zabii Mobile Shop
======================================================================
