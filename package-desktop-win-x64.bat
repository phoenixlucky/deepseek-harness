@echo off
setlocal

cd /d "%~dp0" || exit /b 1
call pnpm run package:desktop:win:x64:unsigned
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" goto :finish

if not exist "releases" mkdir "releases"
if errorlevel 1 goto :copy_failed
copy /Y "apps\desktop\.desktop-build\targets\win-x64\unsigned-artifacts\deepseek-harness-*-win-x64-unsigned.exe" "releases\"
if errorlevel 1 goto :copy_failed
echo Installer copied to releases.
goto :finish

:copy_failed
set "RESULT=%ERRORLEVEL%"

:finish
pause
exit /b %RESULT%
