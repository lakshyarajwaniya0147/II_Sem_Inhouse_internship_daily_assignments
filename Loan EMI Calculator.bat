@echo off
setlocal
set "APP_DIR=%~dp0"

rem If the local web server is already running, simply open the site.
netstat -ano | findstr /R /C:":8001 .*LISTENING" >nul
if not errorlevel 1 goto open_site

rem Start the app without keeping this launcher window open.
start "Loan EMI Calculator Server" /B php -S 127.0.0.1:8001 "%APP_DIR%router.php"
timeout /t 2 /nobreak >nul

:open_site
start "" "http://localhost:8001"
endlocal
