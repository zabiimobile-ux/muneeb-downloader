@echo off
setlocal EnableDelayedExpansion
title Muneeb Link Grabber - Easy Installer

echo ======================================================================
echo             WELCOME TO MUNEEB LINK GRABBER INSTALLER
echo ======================================================================
echo.

:: 1. Check Python
echo [1/3] Checking Python installation...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Python was not detected in PATH!
    echo Please install Python 3 from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
) else (
    for /f "tokens=*" %%V in ('python --version 2^>^&1') do echo [OK] Found %%V
)

:: 2. Launch Chrome Extensions page
echo.
echo [2/3] Opening Chrome Extensions page...
start chrome.exe "chrome://extensions" 2>nul || start "" "chrome://extensions"

echo.
echo ----------------------------------------------------------------------
echo INSTRUCTIONS TO LOAD EXTENSION IN CHROME:
echo 1. In Chrome, enable "Developer mode" (toggle in top right corner).
echo 2. Click "Load unpacked".
echo 3. Select this folder:
echo    %~dp0
echo 4. Note the Extension ID that appears under "Muneeb Link Grabber".
echo ----------------------------------------------------------------------
echo.

:: 3. Offer to run Register script
set /p "RUN_REG=Would you like to register the Download button now? (Y/N): "
if /i "!RUN_REG!"=="Y" (
    call "%~dp0Register_Downloader_Button.bat"
) else (
    echo.
    echo You can run "Register_Downloader_Button.bat" anytime later to connect
    echo the 1-Click Download button!
    pause
)
