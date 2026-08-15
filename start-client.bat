@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

title DeepSeek Harness Client

rem ============================================================
rem  DeepSeek Harness desktop client - one-click launcher
rem  Usage:  start-client.bat [--skip-build]
rem ============================================================

echo [0/3] DeepSeek Harness client launcher
echo.

rem ---------- 0. pin Node version ----------
call nvm use 24
if errorlevel 1 (
  echo [WARN] "nvm use 24" failed; falling back to the Node on PATH.
)

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

rem ---------- 3. build what is missing or stale ----------
set SKIP_BUILD=0
if /I "%~1"=="--skip-build" set SKIP_BUILD=1

rem Probe: is any package/app source newer than the built CLI entry? The CLI
rem loads plugin packages by name from their own lib/ artifacts, so a source
rem edit without a rebuild leaves the client running stale plugin code (e.g.
rem wallpaper routes). A build is needed when the CLI entry is missing, the
rem web dist is missing, or the newest source under packages/ or apps/cli/src
rem is newer than the built CLI entry.
if "%SKIP_BUILD%"=="0" (
  set NEEDS_BUILD=0
  if not exist "apps\cli\lib\bin.js" set NEEDS_BUILD=1
  if not exist "apps\web\dist\index.html" set NEEDS_BUILD=1
  if "%NEEDS_BUILD%"=="0" (
    for /f "usebackq delims=" %%t in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$s = Get-ChildItem packages -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\src\\' -and $_.Extension -in '.ts','.tsx','.css' } | Measure-Object -Property LastWriteTime -Maximum; $c = Get-ChildItem apps/cli/src -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property LastWriteTime -Maximum; $n = @($s.Maximum, $c.Maximum) | Measure-Object -Maximum; $b = (Get-Item apps/cli/lib/bin.js -ErrorAction SilentlyContinue).LastWriteTime; if ($n.Maximum -gt $b) { 'STALE' } else { 'FRESH' }"`) do set BUILD_STATE=%%t
    if "!BUILD_STATE!"=="STALE" set NEEDS_BUILD=1
  )
  if "!NEEDS_BUILD!"=="1" (
    echo [2/3] Source changed since the last build; rebuilding ^(see start-client.bat --skip-build to force-skip^)...
    call pnpm run build
    if errorlevel 1 (
      echo.
      echo [ERROR] Build failed. See the log above.
      pause
      exit /b 1
    )
  ) else (
    echo [2/3] Build artifacts are up to date.
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
