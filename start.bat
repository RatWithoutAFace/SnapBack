@echo off
SETLOCAL
where node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Please install NodeJS from https://nodejs.org
timeout /t 5 /NOBREAK > nul
    exit /b 1
)
npm i
npm run start
ENDLOCAL
