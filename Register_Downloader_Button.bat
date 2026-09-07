@echo off
setlocal EnableDelayedExpansion
title Muneeb Link Grabber - Setup Native Host

echo ======================================================================
echo          MUNEEB LINK GRABBER - 1-CLICK DOWNLOAD SETUP
echo ======================================================================
echo.
echo This utility connects your Chrome Extension directly to your local
echo Zabii Fast Downloader so clicking [Download] automatically sends links
echo and launches the downloader minimized!
echo.
echo ----------------------------------------------------------------------
echo STEP 1: Chrome Extension ID
echo ----------------------------------------------------------------------
echo 1. Open Google Chrome and go to: chrome://extensions
echo 2. Enable "Developer mode" in the top-right corner.
echo 3. Click "Load unpacked" and select this extension folder:
echo    %~dp0
echo 4. Copy the generated Extension ID (a 32-character string).
echo ----------------------------------------------------------------------
echo.

set "EXT_ID="
set /p "EXT_ID=Enter your Chrome Extension ID: "
if "%EXT_ID%"=="" (
    echo [ERROR] Extension ID cannot be empty!
    pause
    exit /b
)

:: Trim spaces
for /f "tokens=* delims= " %%A in ("%EXT_ID%") do set "EXT_ID=%%A"

echo.
echo ----------------------------------------------------------------------
echo STEP 2: yt-dlp.exe Folder Path
echo ----------------------------------------------------------------------

:: Check for common default paths
set "DETECTED_FOLDER="
if exist "D:\Youtube video download\yt-dlp.exe" (
    set "DETECTED_FOLDER=D:\Youtube video download"
) else if exist "%USERPROFILE%\Desktop\yt-dlp.exe" (
    set "DETECTED_FOLDER=%USERPROFILE%\Desktop"
) else if exist "D:\project\Youtube video download\yt-dlp.exe" (
    set "DETECTED_FOLDER=D:\project\Youtube video download"
)

if not "%DETECTED_FOLDER%"=="" (
    echo Auto-detected yt-dlp.exe at:
    echo "!DETECTED_FOLDER!"
    echo Press ENTER to use this folder, or paste a different path below.
) else (
    echo Enter the folder path where your yt-dlp.exe is located.
    echo (Example: D:\Youtube video download)
)
echo.

set "YTDLP_DIR="
set /p "YTDLP_DIR=yt-dlp folder path: "

if "%YTDLP_DIR%"=="" (
    if not "%DETECTED_FOLDER%"=="" (
        set "YTDLP_DIR=%DETECTED_FOLDER%"
    ) else (
        echo [ERROR] Folder path cannot be empty!
        pause
        exit /b
    )
)

:: Remove surrounding quotes if user dragged & dropped folder
set "YTDLP_DIR=%YTDLP_DIR:"=%"

if not exist "%YTDLP_DIR%" (
    echo [WARNING] The folder "%YTDLP_DIR%" does not exist yet.
    set /p "MK_DIR=Create this folder now? (Y/N): "
    if /i "!MK_DIR!"=="Y" (
        mkdir "%YTDLP_DIR%"
    ) else (
        echo Setup cancelled.
        pause
        exit /b
    )
)

:: Save folder configuration for native_host.py
echo %YTDLP_DIR%> "%~dp0downloader_folder.txt"

:: Copy Zabii_Fast_Downloader_AUTO.bat to yt-dlp folder
if exist "%~dp0Zabii_Fast_Downloader_AUTO.bat" (
    copy /y "%~dp0Zabii_Fast_Downloader_AUTO.bat" "%YTDLP_DIR%\Zabii_Fast_Downloader_AUTO.bat" >nul
    echo [OK] Copied Zabii_Fast_Downloader_AUTO.bat to "%YTDLP_DIR%"
)

echo.
echo ----------------------------------------------------------------------
echo STEP 3: Register Chrome Native Messaging Host
echo ----------------------------------------------------------------------

:: Build escaped path for JSON manifest
set "BAT_PATH=%~dp0native_host.bat"
set "ESCAPED_BAT_PATH=%BAT_PATH:\=\\%"

:: Generate native_host_registered.json
(
    echo {
    echo   "name": "com.muneeb.linkgrabber",
    echo   "description": "Muneeb Link Grabber Native Host",
    echo   "path": "!ESCAPED_BAT_PATH!",
    echo   "type": "stdio",
    echo   "allowed_origins": [
    echo     "chrome-extension://!EXT_ID!/"
    echo   ]
    echo }
) > "%~dp0native_host_registered.json"

:: Also update native_host.json for completeness
(
    echo {
    echo   "name": "com.muneeb.linkgrabber",
    echo   "description": "Muneeb Link Grabber Native Host",
    echo   "path": "!ESCAPED_BAT_PATH!",
    echo   "type": "stdio",
    echo   "allowed_origins": [
    echo     "chrome-extension://!EXT_ID!/"
    echo   ]
    echo }
) > "%~dp0native_host.json"

:: Add registry key for Google Chrome Native Messaging
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.muneeb.linkgrabber" /ve /d "%~dp0native_host_registered.json" /f >nul

if %errorlevel% equ 0 (
    echo [OK] Registered in Chrome Registry successfully!
) else (
    echo [ERROR] Failed to add registry key. Please run this script as Administrator.
    pause
    exit /b
)

echo.
echo ======================================================================
echo                      CONFIGURATION COMPLETE!
echo ======================================================================
echo Extension ID: %EXT_ID%
echo Downloader Folder: %YTDLP_DIR%
echo Native Host Manifest: %~dp0native_host_registered.json
echo.
echo You can now open the Chrome Extension and click [Download]!
echo Links will automatically flow to Zabii Fast Downloader.
echo ======================================================================
echo.
pause
