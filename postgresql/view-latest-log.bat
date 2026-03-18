@echo off
REM View latest Memento sync log
REM Usage: view-latest-log.bat [library_name] [lines]

set API_URL=http://192.168.5.241:8889
set API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

set LIBRARY_NAME=%1
set LINES=%2
if "%LINES%"=="" set LINES=100

if "%LIBRARY_NAME%"=="" (
    echo === Latest log (all libraries) ===
    curl -s "%API_URL%/api/memento/logs/latest?tail=%LINES%" -H "X-API-Key: %API_KEY%" | python -m json.tool
) else (
    echo === Latest log for: %LIBRARY_NAME% ===
    curl -s "%API_URL%/api/memento/logs/latest?library_name=%LIBRARY_NAME%&tail=%LINES%" -H "X-API-Key: %API_KEY%" | python -m json.tool
)

pause
