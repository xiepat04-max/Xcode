@echo off
:: start-all.bat — Double-click to launch all 10 projects.

echo.
echo  ASX Finance Projects — Starting All Services
echo  =============================================
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"

pause
