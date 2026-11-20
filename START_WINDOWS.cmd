@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  where py >nul 2>nul
  if errorlevel 1 goto missing
  start "" "http://localhost:8080/"
  py -m http.server 8080
  goto end
)
node server.js --open
goto end
:missing
echo https://nodejs.org/
:end
pause
