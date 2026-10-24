@echo off
echo ======================================
echo BoxGuard - Starting Development Servers
echo ======================================
echo.

set "PYTHON=python"
if exist "%~dp0Backend\venv\Scripts\python.exe" set "PYTHON=%~dp0Backend\venv\Scripts\python.exe"

echo [1/2] Starting Backend on port 5000...
start "BoxGuard Backend" cmd /k "cd /d "%~dp0Backend" && "%PYTHON%" -m core.app"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend on port 5173...
start "BoxGuard Frontend" cmd /k "cd /d "%~dp0Frontend" && npm run dev"

echo.
echo ======================================
echo Servers Started!
echo ======================================
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to stop all servers...
pause > nul

taskkill /FI "WindowTitle eq BoxGuard Backend*" /T /F
taskkill /FI "WindowTitle eq BoxGuard Frontend*" /T /F

echo.
echo Servers stopped.
pause
