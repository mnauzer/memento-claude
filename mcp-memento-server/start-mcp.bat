@echo off
set LOGFILE=C:\Users\rasto\AppData\Local\Temp\memento-mcp-start.log
echo [%date% %time%] Starting memento MCP >> %LOGFILE%
echo [%date% %time%] CWD: %CD% >> %LOGFILE%
echo [%date% %time%] Python: >> %LOGFILE%
C:\Python312\python.exe --version >> %LOGFILE% 2>&1
echo [%date% %time%] Running server... >> %LOGFILE%
C:\Python312\python.exe -m src.server 2>> %LOGFILE%
echo [%date% %time%] Server exited with code %ERRORLEVEL% >> %LOGFILE%
