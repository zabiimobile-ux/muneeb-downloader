@echo off
set PYTHONDONTWRITEBYTECODE=1
where pythonw >nul 2>nul
if %errorlevel% equ 0 (
    pythonw -B "%~dp0native_host.py"
) else (
    python -B "%~dp0native_host.py"
)
