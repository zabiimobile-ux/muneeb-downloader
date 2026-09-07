@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Zabii Fast Downloader v6 AUTO

REM ===================================================
REM Zabii Fast Downloader - AUTO Mode (Manifest V3 Extension)
REM Single downloads -> Directly on Desktop
REM Group downloads  -> Dedicated Zabii Downloads folder
REM ===================================================
set "CURRENT_DIR=%~dp0"
set "LINKS_FILE=%CURRENT_DIR%links.txt"
set "CLEANED_FILE=%CURRENT_DIR%cleaned_links.txt"
set "FAILED_FILE=%CURRENT_DIR%failed_links.txt"
set "BASE_DIR=%USERPROFILE%\Desktop"
set "DOWNLOAD_DIR=%BASE_DIR%\Zabii_Downloads"
set "MODE=%~1"
set /a COUNT=1

echo ==================================================
echo Zabii Mobile Shop Downloader [AUTO MODE]
echo ==================================================
echo.

if not exist "%LINKS_FILE%" (
    echo [ERROR] No links.txt found! Click 'Download' in the Chrome extension first.
    timeout /t 4 >nul
    exit
)

REM ===================================================
REM STEP 1: CLEAN LINKS (Keep watch?v= and strip after &)
REM ===================================================
if exist "%CLEANED_FILE%" del "%CLEANED_FILE%"
if exist "%FAILED_FILE%" del "%FAILED_FILE%"

> "%CLEANED_FILE%" (
    for /f "usebackq delims=" %%A in ("%LINKS_FILE%") do (
        set "line=%%A"
        echo !line! | find "watch?v=" >nul
        if !errorlevel! == 0 (
            for /f "delims=&" %%B in ("!line!") do (
                echo %%~B
            )
        )
    )
)

echo Links successfully verified and cleaned.
echo.

REM ===================================================
REM STEP 2: COUNT LINKS & DETERMINE DOWNLOAD DESTINATION
REM ===================================================
set /a total_count=0
for /f "usebackq delims=" %%A in ("%CLEANED_FILE%") do (
    if not "%%A"=="" set /a total_count+=1
)

if !total_count! lss 1 (
    echo [WARNING] No valid YouTube watch?v= links after cleaning.
    timeout /t 4 >nul
    exit
)

REM If single mode OR only 1 link: save directly to Desktop!
if /i "%MODE%"=="single" (
    set "DOWNLOAD_DIR=%BASE_DIR%"
    echo [MODE: SINGLE VIDEO] Saving directly to Desktop.
    goto start_download_process
)

if /i "%MODE%"=="" (
    if !total_count! equ 1 (
        set "DOWNLOAD_DIR=%BASE_DIR%"
        echo [MODE: SINGLE VIDEO] Saving directly to Desktop.
        goto start_download_process
    )
)

REM If group mode / multiple links: create unique folder!
echo [MODE: GROUP DOWNLOAD] Creating separate folder.
:check_folder
if exist "%DOWNLOAD_DIR%" (
    set /a COUNT+=1
    set "DOWNLOAD_DIR=%BASE_DIR%\Zabii Downloads !COUNT!"
    goto check_folder
)
mkdir "%DOWNLOAD_DIR%"

:start_download_process
REM ===================================================
REM STEP 3: DOWNLOAD PROCESS
REM ===================================================
if not exist "%CURRENT_DIR%yt-dlp.exe" (
    echo [ERROR] yt-dlp.exe not found in %CURRENT_DIR%
    echo Please make sure yt-dlp.exe is placed in this folder.
    timeout /t 5 >nul
    exit
)

echo Total links to download: !total_count!
echo Destination: %DOWNLOAD_DIR%
echo.

set /a current_count=0
for /f "usebackq delims=" %%A in ("%CLEANED_FILE%") do (
    set "LINK=%%A"
    if not "!LINK!"=="" (
        set /a current_count+=1
        echo --------------------------------------------------
        echo [!current_count!/!total_count!] Downloading:
        echo !LINK!
        echo --------------------------------------------------
        call :download_safe "!LINK!"
    )
)

REM ===================================================
REM STEP 4: AUTO RETRY FAILED LINKS
REM ===================================================
if exist "%FAILED_FILE%" (
    echo.
    echo --------------------------------------------------
    echo Retrying failed links automatically...
    echo --------------------------------------------------
    for /f "usebackq delims=" %%B in ("%FAILED_FILE%") do (
        call :download_safe "%%B"
    )
    echo Retry process complete.
)

if exist "%FAILED_FILE%" (
    echo.
    echo Some downloads failed. See failed_links.txt for details.
) else (
    echo.
    echo ==================================================
    echo All downloads completed successfully!
    echo Saved to: %DOWNLOAD_DIR%
    echo ==================================================
)
exit

REM ===================================================
REM FUNCTION: download_safe
REM ===================================================
:download_safe
set "LINK=%~1"
set /a retry=1

:retry_loop
echo.
echo Attempt !retry!/5
echo.

"%CURRENT_DIR%yt-dlp.exe" -f 18 --no-playlist --no-part --no-continue --force-overwrites --no-check-certificate --no-warnings --extractor-args "youtube:player_client=android" -o "%DOWNLOAD_DIR%\%%(title)s (Muneeb).%%(ext)s" "!LINK!"

if errorlevel 1 (
    if !retry! lss 5 (
        echo Attempt !retry! failed, retrying in 2 seconds...
        timeout /t 2 >nul
        set /a retry+=1
        goto retry_loop
    ) else (
        echo Download failed after 5 attempts: !LINK!
        echo !LINK!>>"%FAILED_FILE%"
    )
) else (
    echo.
    echo [SUCCESS] !LINK!
    echo.
    call :remove_downloaded "!LINK!"
)
exit /b

REM ===================================================
REM FUNCTION: remove_downloaded
REM ===================================================
:remove_downloaded
set "DONE_LINK=%~1"
set "TEMP_FILE=%CURRENT_DIR%cleaned_links_temp.txt"

if exist "%TEMP_FILE%" del "%TEMP_FILE%"

for /f "usebackq delims=" %%L in ("%CLEANED_FILE%") do (
    if not "%%L"=="%DONE_LINK%" echo %%L>>"%TEMP_FILE%"
)

if exist "%TEMP_FILE%" move /y "%TEMP_FILE%" "%CLEANED_FILE%" >nul
exit /b
