@echo off
if exist "C:\Users\Muneeb Mobile Shop\Desktop\Youtube Download.bat" (
    start "" "C:\Users\Muneeb Mobile Shop\Desktop\Youtube Download.bat"
    exit /b
)
if exist "C:\Users\Muneeb Mobile Shop\Desktop\Youtube Download.lnk" (
    start "" "C:\Users\Muneeb Mobile Shop\Desktop\Youtube Download.lnk"
    exit /b
)
if exist "D:\Youtube video download\Youtube Download.bat" (
    start "" "D:\Youtube video download\Youtube Download.bat"
    exit /b
)
if exist "D:\project\Youtube video download\Youtube Download.bat" (
    start "" "D:\project\Youtube video download\Youtube Download.bat"
    exit /b
)
if exist "D:\Youtube video download\Youtube Download - Shortcut.lnk" (
    start "" "D:\Youtube video download\Youtube Download - Shortcut.lnk"
    exit /b
)
echo Youtube Download.bat was not found on Desktop or D:\!
pause
