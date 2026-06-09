@echo off
echo Starting local web server...
PowerShell.exe -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
