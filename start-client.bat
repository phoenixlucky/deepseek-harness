@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title DeepSeek Harness Client

rem ============================================================
rem  DeepSeek Harness desktop client - one-click launcher
rem  Usage:  start-client.bat [--skip-build]
rem ============================================================

echo [0/3] DeepSeek Harness client launcher
echo.

rem ---------- 1. prerequisites ----------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js ^(^>= 22.19^) was not found on PATH.
  echo         Install it from https://nodejs.org/ and reopen this window.
  pause
  exit /b 1
)
where pnpm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] pnpm was not found on PATH.
  echo         Enable it with:  corepack enable pnpm
  pause
  exit /b 1
)

rem ---------- 2. install dependencies ----------
if not exist "node_modules" (
  echo [1/3] Installing dependencies ^(first run, may take a while^)...
  call pnpm install
  if errorlevel 1 (
    echo.
    echo [ERROR] pnpm install failed. If the Electron binary download failed,
    echo         set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
    echo         in your environment and run this script again.
    pause
    exit /b 1
  )
) else (
  echo [1/3] Dependencies already installed.
)

rem ---------- 3. build what is missing ----------
set SKIP_BUILD=0
if /I "%~1"=="--skip-build" set SKIP_BUILD=1

if "%SKIP_BUILD%"=="0" (
  if not exist "apps\cli\lib\bin.js" (
    echo [2/3] Building the dsh CLI and web UI ^(first run, may take several minutes^)...
    call pnpm run build
    if errorlevel 1 (
      echo.
      echo [ERROR] Build failed. See the log above.
      pause
      exit /b 1
    )
  ) else if not exist "apps\web\dist\index.html" (
    echo [2/3] Building the web UI...
    call pnpm run build:web
    if errorlevel 1 (
      echo.
      echo [ERROR] Web UI build failed. See the log above.
      pause
      exit /b 1
    )
  ) else (
    echo [2/3] Build artifacts already present.
  )
)

rem ---------- 4. launch ----------
echo [3/3] Starting the DeepSeek Harness client...
call pnpm --filter @deepseek-ai/dsh-desktop start
if errorlevel 1 (
  echo.
  echo [ERROR] The client exited with an error. If the dsh server reported a
  echo         missing API key, set DEEPSEEK_API_KEY in .env at the repository
  echo         root, or configure a provider in the client's onboarding UI.
  pause
  exit /b 1
)

endlocal
