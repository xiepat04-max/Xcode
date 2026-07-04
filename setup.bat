@echo off
:: setup.bat — Double-click this if you prefer not to use PowerShell directly.
:: It calls setup.ps1 with the correct execution policy bypass.

echo.
echo  ASX Finance Projects — Windows Setup
echo  ======================================
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  Setup failed. See errors above.
    pause
    exit /b 1
)

pause
