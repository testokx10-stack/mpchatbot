@echo off
setlocal
cd /d "%~dp0"
start "" /min cmd /c "cd /d ""%~dp0"" && node dashboard-server.js"
timeout /t 2 /nobreak >nul
start "" "http://localhost:3001"
