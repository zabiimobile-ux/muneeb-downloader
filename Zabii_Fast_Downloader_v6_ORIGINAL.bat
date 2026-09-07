@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Zabii Fast Downloader v6

REM ===================================================
REM CONFIGURATION
REM ===================================================
set "CURRENT_DIR=%~dp0"
set "LINKS_FILE=%CURRENT_DIR%links.txt"
set "CLEANED_FILE=%CURRENT_DIR%cleaned_links.txt"
set "FAILED_FILE=%CURRENT_DIR%failed_links.txt"
set "BASE_DIR=%USERPROFILE%\Desktop"
set "DOWNLOAD_DIR=%BASE_DIR%\Zabii_Downloads"
set /a COUNT=1

REM ===================================================
REM STEP 0: ASK FOR LINKS (MANUAL PASTE MODE)
REM ===================================================
echo ==================================================
echo Zabii Mobile Shop Downloader (Manual Input Mode)
echo ==================================================
echo.
echo Paste YouTube links below (one per line).
echo When finished, type: DONE
echo.

if exist "%LINKS_FILE%" del "%LINKS_FILE%"

:link_input
set "USERLINK="
set /p "USERLINK=> "

if /i "!USERLINK!"=="DONE" goto start_clean
if /i "!USERLINK!"=="done" goto start_clean

if not "!USERLINK!"=="" echo !USERLINK!>>"%LINKS_FILE%"
goto link_input

REM ===================================================
REM STEP 1: CLEAN LINKS
REM ===================================================
:start_clean

if not exist "%LINKS_FILE%" (
    echo No links found! Exiting...
    pause
    exit /b
)

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

echo.
echo Links Saved.
echo.

REM ===================================================
REM STEP 2: CREATE UNIQUE DOWNLOAD FOLDER
REM ===================================================
:check_folder

if exist "%DOWNLOAD_DIR%" (
    set /a COUNT+=1
    set "DOWNLOAD_DIR=%BASE_DIR%\Zabii Downloads !COUNT!"
    goto check_folder
)

mkdir "%DOWNLOAD_DIR%"

REM ===================================================
REM STEP 3: DOWNLOAD PROCESS
REM ===================================================
if not exist "%CURRENT_DIR%yt-dlp.exe" (
    echo yt-dlp.exe not found in %CURRENT_DIR%!
    pause
    exit /b
)

set /a total_count=0
for /f "usebackq delims=" %%A in ("%CLEANED_FILE%") do (
    if not "%%A"=="" set /a total_count+=1
)

echo Total links found: !total_count!
echo.

set /a current_count=0
for /f "usebackq delims=" %%A in ("%CLEANED_FILE%") do (
    set "LINK=%%A"
    if not "!LINK!"=="" (
        set /a current_count+=1
        echo -----------------------------------------------
        echo [!current_count!/!total_count!] Downloading:
        echo !LINK!
        echo -----------------------------------------------
        call :download_safe "!LINK!"
    )
)

if exist "%FAILED_FILE%" (
    echo.
    echo Some downloads failed:
    type "%FAILED_FILE%"
    echo.
    set /p RETRY="Retry failed links? (Y/N): "
    if /i "!RETRY!"=="Y" (
        echo.
        echo Retrying failed links...
        for /f "usebackq delims=" %%B in ("%FAILED_FILE%") do (
            call :download_safe "%%B"
        )
        echo Retry process complete.
    )
)

if exist "%FAILED_FILE%" (
    echo.
    echo Some downloads failed. Check failed_links.txt
    pause >nul
) else (
    echo.
    echo All downloads completed successfully!
    echo Saved to: %DOWNLOAD_DIR%
    timeout /t 3 >nul
)

exit /b

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

"%CURRENT_DIR%yt-dlp.exe" -f 18 --no-part --no-continue --force-overwrites --no-check-certificate --no-warnings --extractor-args "youtube:player_client=android" -o "%DOWNLOAD_DIR%\%%(title)s (Zabii Mobile Shop).%%(ext)s" "!LINK!"

if errorlevel 1 (
    if !retry! lss 5 (
        echo Failed attempt !retry!, retrying...
        timeout /t 2 >nul
        set /a retry+=1
        goto retry_loop
    ) else (
        echo Download failed after 5 attempts: !LINK!
        echo !LINK!>>"%FAILED_FILE%"
    )
) else (
    echo.
    echo Success: !LINK!
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
