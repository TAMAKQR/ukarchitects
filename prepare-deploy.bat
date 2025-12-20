@echo off
echo ========================================
echo   UK Architects - Prepare for Deploy
echo ========================================
echo.

echo [1/5] Checking Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git not installed! Install from https://git-scm.com
    pause
    exit /b 1
)
echo ✓ Git installed

echo.
echo [2/5] Initializing Git repository...
if not exist ".git" (
    git init
    echo ✓ Git initialized
) else (
    echo ✓ Git already initialized
)

echo.
echo [3/5] Creating .gitignore...
if not exist ".gitignore" (
    (
        echo node_modules/
        echo *.log
        echo .env
        echo .DS_Store
        echo Thumbs.db
        echo server/database.db
        echo server/uploads/*
        echo !server/uploads/.gitkeep
    ) > .gitignore
    echo ✓ .gitignore created
) else (
    echo ✓ .gitignore exists
)

echo.
echo [4/5] Adding files to Git...
git add .
echo ✓ Files added

echo.
echo [5/5] Creating initial commit...
git commit -m "Initial commit: UK Architects website" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Commit created
) else (
    echo ℹ No changes to commit or already committed
)

echo.
echo ========================================
echo   ✅ Project ready for deploy!
echo ========================================
echo.
echo Next steps:
echo 1. Create repository on GitHub
echo 2. Run: git remote add origin https://github.com/YOUR-USERNAME/uk-architects.git
echo 3. Run: git push -u origin main
echo 4. Follow DEPLOY.md instructions
echo.
pause
