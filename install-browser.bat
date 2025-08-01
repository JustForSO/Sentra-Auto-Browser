@echo off
echo ========================================
echo Installing Playwright Browser
echo ========================================

echo Installing Chromium browser for Playwright...
npx playwright install chromium

if errorlevel 1 (
    echo ERROR: Failed to install browser!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
) else (
    echo SUCCESS: Browser installed successfully!
    echo You can now run the application.
)

echo.
pause
