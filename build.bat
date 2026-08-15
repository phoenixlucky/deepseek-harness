@echo off
setlocal

cd /d "%~dp0"

echo [DeepSeek Harness] 开始构建...
pnpm run build
if errorlevel 1 (
    echo.
    echo 构建失败，错误代码：%errorlevel%
    pause
    exit /b %errorlevel%
)

echo.
echo 构建完成。
pause
exit /b 0
