@echo off
REM GitHub OAuth Setup Script for ONYX (Windows)
REM This script handles the critical setup step

setlocal enabledelayedexpansion

echo.
echo 🚀 ONYX GitHub OAuth Setup
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

if not exist "package.json" (
    echo ❌ Error: Must run from web\ directory
    echo Usage: cd web && setup.bat
    exit /b 1
)

echo 📁 Creating NextAuth directory structure...

REM Create directories
if not exist "app\api\auth\[...nextauth]" mkdir "app\api\auth\[...nextauth]"
if not exist "app\api\github" mkdir "app\api\github"

echo ✅ Directories created:
echo    • app\api\auth\[...nextauth]\
echo    • app\api\github\
echo.

REM Run Node setup script
if exist "setup-nextauth.js" (
    echo 🔧 Running setup script...
    node setup-nextauth.js
    if %errorlevel% equ 0 (
        echo ✅ Setup script completed
    ) else (
        echo ⚠️  Setup script had issues, trying alternative...
        if exist "setup-nextauth-alt.js" (
            node setup-nextauth-alt.js
        )
    )
) else (
    echo ⚠️  setup-nextauth.js not found, skipping
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✅ NextAuth Setup Complete!
echo.
echo 📋 Next steps:
echo.
echo 1. Create .env.local:
echo    copy .env.example .env.local
echo.
echo 2. Edit .env.local with your GitHub OAuth credentials:
echo    GITHUB_ID=your-app-id
echo    GITHUB_SECRET=your-app-secret
echo    NEXTAUTH_SECRET=your-secret-here
echo.
echo 3. Start the development server:
echo    npm run dev
echo.
echo 4. Test the OAuth flow at:
echo    http://localhost:3000
echo.
echo 📚 Documentation:
echo    • QUICK_START.md - Quick reference
echo    • GITHUB_OAUTH_CHECKLIST.md - Complete guide
echo    • VERIFICATION_CHECKLIST.md - Verify installation
echo.
pause
